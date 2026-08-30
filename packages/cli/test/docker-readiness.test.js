import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runCli } from '../src/cli.js'
import { checkDockerReadiness, hasDesktopExeCredsStore, DOCKER_READINESS_CODES } from '../src/docker-readiness.js'

function outputStream() {
  let content = ''
  return {
    write(chunk) {
      content += typeof chunk === 'string' ? chunk : String(chunk)
    },
    read() {
      return content
    },
  }
}

function fakeRunner(captureImpl) {
  const calls = []
  return {
    calls,
    async run(command, args, options) {
      calls.push({ type: 'run', command, args })
      return { code: 0 }
    },
    async capture(command, args, options) {
      calls.push({ type: 'capture', command, args })
      if (captureImpl) {
        const overridden = captureImpl(command, args)
        if (overridden) return overridden
      }
      return { code: 0, stdout: '24.0.0', stderr: '' }
    },
  }
}

async function invoke(args, options = {}) {
  const stdout = outputStream()
  const stderr = outputStream()
  const code = await runCli(args, {
    cwd: options.cwd,
    runner: options.runner,
    env: options.env ?? {},
    homeDirectory: options.homeDirectory,
    platform: options.platform,
    stdout,
    stderr,
  })
  return { code, stdout: stdout.read(), stderr: stderr.read() }
}

async function createProject() {
  const root = await mkdtemp(join(tmpdir(), 'doc-cli-'))
  await mkdir(join(root, 'prisma'), { recursive: true })
  await mkdir(join(root, 'services', 'collaboration'), { recursive: true })
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: '@fullstack-ai-infra/doc', version: '0.1.0' }))
  await writeFile(join(root, 'docker-compose.yml'), 'services: {}\n')
  await writeFile(join(root, 'prisma', 'schema.prisma'), 'generator client { provider = "prisma-client-js" }\n')
  await writeFile(
    join(root, '.env.example'),
    [
      'DOC_WEB_PORT=3100',
      'DOC_COLLABORATION_PORT=1234',
      'DOC_POSTGRES_PORT=5432',
      'DOC_MAILPIT_SMTP_PORT=1025',
      'DOC_MAILPIT_UI_PORT=8025',
      'DOC_MAILPIT_URL=http://localhost:8025',
      'NEXT_PUBLIC_APP_URL=http://localhost:3100',
      'AUTH_SECRET=replace-with-a-random-secret',
      'DATABASE_URL=postgresql://doc:doc@localhost:5432/doc?schema=public',
      'EMAIL_FROM=doc@example.test',
      'EMAIL_HOST=127.0.0.1',
      'EMAIL_PORT=1025',
      'EMAIL_CONTAINER_HOST=mailpit',
      'EMAIL_CONTAINER_PORT=1025',
      'EMAIL_SECURE=false',
      'COLLABORATE_EDIT_HTTP_URL=http://localhost:1234',
      'COLLABORATE_API_AUTH_KEY=replace-with-a-shared-token-key',
      'COLLABORATE_INTERNAL_API_KEY=replace-with-an-internal-service-key',
      '',
    ].join('\n')
  )
  await writeFile(
    join(root, 'services', 'collaboration', '.env.example'),
    [
      'PORT=1234',
      'DATABASE_URL=postgresql://doc:doc@localhost:5432/doc',
      'API_AUTH_KEY=x',
      'INTERNAL_API_KEY=y',
      '',
    ].join('\n')
  )
  return root
}

async function makeHomeWithCredsStore(credsStore) {
  const home = await mkdtemp(join(tmpdir(), 'doc-home-'))
  await mkdir(join(home, '.docker'), { recursive: true })
  await writeFile(join(home, '.docker', 'config.json'), JSON.stringify({ credsStore }))
  return home
}

test('checkDockerReadiness: daemon reachable and no trap -> ready', async () => {
  const home = await mkdtemp(join(tmpdir(), 'doc-home-'))
  const runner = fakeRunner()
  const result = await checkDockerReadiness({ runner, platform: 'linux', homeDir: home })
  assert.equal(result.ok, true)
  assert.equal(result.code, DOCKER_READINESS_CODES.ready)
  assert.equal(result.guidance, null)
})

test('AC-001: daemon down -> docker_daemon_unreachable with actionable guidance', async () => {
  const home = await mkdtemp(join(tmpdir(), 'doc-home-'))
  const runner = fakeRunner(() => ({ code: 1, stdout: '', stderr: 'Cannot connect to the Docker daemon' }))
  const result = await checkDockerReadiness({ runner, platform: 'linux', homeDir: home })
  assert.equal(result.ok, false)
  assert.equal(result.code, DOCKER_READINESS_CODES.daemonUnreachable)
  assert.match(result.guidance, /Start Docker Desktop/)
})

test('AC-002: credsStore desktop.exe under WSL -> docker_credsstore_desktop_exe with remediation', async () => {
  const home = await makeHomeWithCredsStore('desktop.exe')
  const runner = fakeRunner()
  const result = await checkDockerReadiness({ runner, platform: 'linux', homeDir: home })
  assert.equal(result.ok, false)
  assert.equal(result.code, DOCKER_READINESS_CODES.credsStoreDesktopExe)
  assert.match(result.guidance, /credsStore/)
})

test('AC-002: credsStore desktop.exe on native Windows is not flagged', async () => {
  const home = await makeHomeWithCredsStore('desktop.exe')
  const runner = fakeRunner()
  const result = await checkDockerReadiness({ runner, platform: 'win32', homeDir: home })
  assert.equal(result.ok, true)
  assert.equal(result.code, DOCKER_READINESS_CODES.ready)
})

test('AC-002: exec-format error in docker stderr is diagnosed as credsStore trap', async () => {
  const home = await mkdtemp(join(tmpdir(), 'doc-home-'))
  const runner = fakeRunner(() => ({
    code: 1,
    stdout: '',
    stderr: 'fork/exec docker-credential-desktop.exe: exec format error',
  }))
  const result = await checkDockerReadiness({ runner, platform: 'linux', homeDir: home })
  assert.equal(result.ok, false)
  assert.equal(result.code, DOCKER_READINESS_CODES.credsStoreDesktopExe)
})

test('hasDesktopExeCredsStore detects desktop.exe and ignores clean/missing config', async () => {
  const trapped = await makeHomeWithCredsStore('desktop.exe')
  assert.equal(await hasDesktopExeCredsStore(trapped), true)
  const clean = await mkdtemp(join(tmpdir(), 'doc-home-'))
  assert.equal(await hasDesktopExeCredsStore(clean), false)
  const passStore = await makeHomeWithCredsStore('osxkeychain')
  assert.equal(await hasDesktopExeCredsStore(passStore), false)
})

test('AC-003: doc up fails on daemon-down before invoking docker up (no side effects)', async () => {
  const root = await createProject()
  const home = await mkdtemp(join(tmpdir(), 'doc-home-'))
  await invoke(['init', '--root', root], { cwd: tmpdir(), homeDirectory: home, platform: 'linux' })
  const runner = fakeRunner(() => ({ code: 1, stdout: '', stderr: 'Cannot connect to the Docker daemon' }))
  const result = await invoke(['up', '--root', root], {
    cwd: tmpdir(),
    runner,
    homeDirectory: home,
    platform: 'linux',
  })
  assert.equal(result.code, 1)
  assert.match(result.stderr, /docker readiness failed: docker_daemon_unreachable/)
  // No `docker ... up` side effect occurred before the verdict.
  const upCalls = runner.calls.filter((call) => call.type === 'run' && call.args.includes('up'))
  assert.equal(upCalls.length, 0)
})

test('AC-003: doc up fails on credsStore trap before invoking docker up', async () => {
  const root = await createProject()
  const home = await makeHomeWithCredsStore('desktop.exe')
  await invoke(['init', '--root', root], { cwd: tmpdir(), homeDirectory: home, platform: 'linux' })
  const runner = fakeRunner()
  const result = await invoke(['up', '--root', root], {
    cwd: tmpdir(),
    runner,
    homeDirectory: home,
    platform: 'linux',
  })
  assert.equal(result.code, 1)
  assert.match(result.stderr, /docker readiness failed: docker_credsstore_desktop_exe/)
  const upCalls = runner.calls.filter((call) => call.type === 'run' && call.args.includes('up'))
  assert.equal(upCalls.length, 0)
})
