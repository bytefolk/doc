// @vitest-environment node

import { once } from 'node:events'
import { createRequire } from 'node:module'
import { createServer, type Socket } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'

// These tests exercise server code under Node; only the client-import sentinel is mocked.
vi.mock('server-only', () => ({}))
const rootRequire = createRequire(new URL('../../../package.json', import.meta.url))
const collaborationRequire = createRequire(new URL('../../../services/collaboration/package.json', import.meta.url))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.resetModules()
})

async function smtpFixture(rejectRecipient = false) {
  const sockets = new Set<Socket>()
  const commands: string[] = []
  const messages: string[] = []
  const server = createServer((socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    socket.setEncoding('utf8')
    socket.write('220 localhost SMTP fixture\r\n')
    let pending = ''
    let readingMessage = false
    let message: string[] = []
    socket.on('data', (chunk) => {
      pending += chunk
      let end: number
      while ((end = pending.indexOf('\r\n')) >= 0) {
        const line = pending.slice(0, end)
        pending = pending.slice(end + 2)
        if (readingMessage) {
          if (line === '.') {
            messages.push(message.join('\r\n'))
            message = []
            readingMessage = false
            socket.write('250 message accepted\r\n')
          } else {
            message.push(line)
          }
          continue
        }
        commands.push(line)
        if (line.startsWith('EHLO')) socket.write('250-localhost\r\n250 AUTH PLAIN\r\n')
        else if (line.startsWith('AUTH')) socket.write('235 authenticated\r\n')
        else if (line.startsWith('RCPT') && rejectRecipient) socket.write('550 rejected\r\n')
        else if (line === 'DATA') {
          readingMessage = true
          socket.write('354 end with dot\r\n')
        } else if (line === 'QUIT') socket.end('221 goodbye\r\n')
        else socket.write('250 OK\r\n')
      }
    })
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('SMTP fixture did not bind')
  vi.stubEnv('EMAIL_HOST', '127.0.0.1')
  vi.stubEnv('EMAIL_PORT', String(address.port))
  vi.stubEnv('EMAIL_USER', 'sender@example.invalid')
  vi.stubEnv('EMAIL_PASSWORD', 'fixture-only-password')
  vi.stubEnv('EMAIL_TO', 'recipient@example.invalid')
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  return {
    port: address.port,
    commands,
    messages,
    async close() {
      for (const socket of sockets) socket.destroy()
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
    },
  }
}

describe('collaboration mailer with the installed Nodemailer', () => {
  it('rejects a recipient list above the explicit security backstop before transport', async () => {
    const nodemailer = collaborationRequire('nodemailer') as typeof import('nodemailer')
    const transporter = nodemailer.createTransport({ jsonTransport: true })
    const mail = {
      from: 'sender@example.invalid',
      to: ['one@example.invalid', 'two@example.invalid', 'three@example.invalid'],
      subject: 'recipient limit fixture',
      text: 'never delivered',
      maxRecipients: 2,
    }
    try {
      await expect(transporter.sendMail(mail)).rejects.toMatchObject({ code: 'EMAXRECIPIENTS' })
    } finally {
      transporter.close()
    }
  })

  it('sends the configured plain-text message through a loopback SMTP server', async () => {
    const smtp = await smtpFixture()
    try {
      const { sendEmail } = await import('../../../services/collaboration/src/lib/mailer.js')
      const result = await sendEmail({ subject: 'doc notification', text: 'collaboration fixture body' })
      expect(result?.accepted).toEqual(['recipient@example.invalid'])
      expect(result?.messageId).toEqual(expect.any(String))
      expect(smtp.commands).toContain('MAIL FROM:<sender@example.invalid>')
      expect(smtp.commands).toContain('RCPT TO:<recipient@example.invalid>')
      expect(smtp.commands.some((command) => command.startsWith('AUTH PLAIN '))).toBe(true)
      expect(smtp.messages).toHaveLength(1)
      expect(smtp.messages[0]).toContain('Subject: doc notification')
      expect(smtp.messages[0]).toContain('collaboration fixture body')
    } finally {
      await smtp.close()
    }
  })

  it('does not connect or send when the subject is absent', async () => {
    const smtp = await smtpFixture()
    try {
      const { sendEmail } = await import('../../../services/collaboration/src/lib/mailer.js')
      await expect(sendEmail({ text: 'no subject' })).resolves.toBeUndefined()
      expect(smtp.commands).toEqual([])
      expect(smtp.messages).toEqual([])
    } finally {
      await smtp.close()
    }
  })

  it('propagates SMTP recipient rejection without reporting delivery', async () => {
    const smtp = await smtpFixture(true)
    try {
      const { sendEmail } = await import('../../../services/collaboration/src/lib/mailer.js')
      await expect(sendEmail({ subject: 'doc notification', text: 'rejected' })).rejects.toMatchObject({
        code: 'EENVELOPE',
        responseCode: 550,
      })
      expect(smtp.messages).toEqual([])
    } finally {
      await smtp.close()
    }
  })
})

describe('root mail consumers with the installed Nodemailer', () => {
  it('honors file-access restrictions through the legacy content resolver', async () => {
    const nodemailer = rootRequire('nodemailer') as typeof import('nodemailer')
    const MailMessage = rootRequire('nodemailer/lib/mailer/mail-message')
    const transporter = nodemailer.createTransport({ jsonTransport: true, disableFileAccess: true })
    // This is public package metadata, never a credential file. No network transport is used.
    const mail = new MailMessage(transporter, {
      html: { path: rootRequire.resolve('nodemailer/package.json') },
    })
    try {
      await expect(
        new Promise((resolve, reject) => {
          mail.resolveContent(mail.data, 'html', (error: Error | null, value: unknown) => {
            if (error) reject(error)
            else resolve(value)
          })
        })
      ).rejects.toMatchObject({ code: 'EFILEACCESS' })
    } finally {
      transporter.close()
    }
  })

  it('enforces the recipient security backstop for root and Auth.js resolution', async () => {
    const authRequire = createRequire(rootRequire.resolve('@auth/core/providers/nodemailer'))
    for (const requireFromConsumer of [rootRequire, authRequire]) {
      const nodemailer = requireFromConsumer('nodemailer') as typeof import('nodemailer')
      const transporter = nodemailer.createTransport({ jsonTransport: true })
      const mail = {
        from: 'sender@example.invalid',
        to: ['one@example.invalid', 'two@example.invalid', 'three@example.invalid'],
        subject: 'root recipient limit fixture',
        text: 'never delivered',
        maxRecipients: 2,
      }
      try {
        await expect(transporter.sendMail(mail)).rejects.toMatchObject({ code: 'EMAXRECIPIENTS' })
      } finally {
        transporter.close()
      }
    }
  })

  it('sends a root application notification through loopback SMTP', async () => {
    const smtp = await smtpFixture()
    vi.stubEnv('EMAIL_FROM', 'sender@example.invalid')
    try {
      const { sendEmail } = await import('../../../src/lib/mailer.js')
      const result = await sendEmail({
        subject: 'root notification',
        text: 'root fixture body',
        toEmail: 'recipient@example.invalid',
      })
      expect(result?.accepted).toEqual(['recipient@example.invalid'])
      expect(smtp.messages).toHaveLength(1)
      expect(smtp.messages[0]).toContain('Subject: root notification')
      expect(smtp.messages[0]).toContain('root fixture body')
    } finally {
      await smtp.close()
    }
  })

  it.each([false, true])('preserves Auth.js verification email behavior (rejection=%s)', async (rejectRecipient) => {
    const smtp = await smtpFixture(rejectRecipient)
    try {
      const { default: Email } = await import('next-auth/providers/nodemailer')
      const options = {
        from: 'sender@example.invalid',
        server: {
          host: '127.0.0.1',
          port: smtp.port,
          secure: false,
          auth: { user: 'sender@example.invalid', pass: 'fixture-only-password' },
        },
      }
      const provider = { ...Email(options), ...options }
      const request = provider.sendVerificationRequest({
        identifier: 'recipient@example.invalid',
        url: 'https://doc.example.invalid/api/auth/callback/nodemailer?token=fixture-only',
        expires: new Date('2030-01-01T00:00:00Z'),
        provider,
        token: 'fixture-only',
        theme: {},
        request: new Request('https://doc.example.invalid'),
      })
      if (rejectRecipient) {
        await expect(request).rejects.toMatchObject({ code: 'EENVELOPE', responseCode: 550 })
        expect(smtp.messages).toEqual([])
      } else {
        await expect(request).resolves.toBeUndefined()
        expect(smtp.messages).toHaveLength(1)
        expect(smtp.messages[0]).toContain('Subject: Sign in to doc.example.invalid')
        expect(smtp.messages[0]).toContain('Content-Type: multipart/alternative')
        expect(smtp.messages[0]).toContain('fixture-only')
        expect(smtp.commands).toContain('RCPT TO:<recipient@example.invalid>')
      }
    } finally {
      await smtp.close()
    }
  })
})
