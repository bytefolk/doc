import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GitHubAccountConnection from '@/components/github-account-connection'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'

const authMocks = vi.hoisted(() => ({ signIn: vi.fn() }))
vi.mock('next-auth/react', () => authMocks)

function renderConnection() {
  return render(
    <NextIntlClientProviderWrapper>
      <GitHubAccountConnection />
    </NextIntlClientProviderWrapper>
  )
}

describe('GitHub account connection', () => {
  beforeEach(() => authMocks.signIn.mockReset())
  afterEach(() => vi.unstubAllGlobals())

  it('starts the existing OAuth flow while retaining the signed-in account', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ data: { github: { enabled: true, connected: false } } }))
    )
    renderConnection()
    fireEvent.click(await screen.findByRole('button', { name: 'Connect GitHub' }))
    await waitFor(() => expect(authMocks.signIn).toHaveBeenCalledWith('github', { callbackUrl: '/en/user-info' }))
  })

  it('shows the persisted connected state without offering a second connection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ data: { github: { enabled: true, connected: true } } }))
    )
    renderConnection()
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'GitHub is connected.')
    expect(screen.queryByRole('button', { name: 'Connect GitHub' })).toBeNull()
  })

  it('explains unavailable OAuth without presenting a broken connection action', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ data: { github: { enabled: false, connected: false } } }))
    )
    renderConnection()
    expect(await screen.findByText('GitHub sign-in is not configured for this instance.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Connect GitHub' })).toBeNull()
  })

  it('reports lookup failure instead of offering to connect an unknown account', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))
    renderConnection()
    expect((await screen.findByRole('alert')).textContent).toBe('Could not load the account connection.')
    expect(screen.queryByRole('button', { name: 'Connect GitHub' })).toBeNull()
  })

  it('does not start OAuth when an authenticated linking intent cannot be issued', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ data: { github: { enabled: true, connected: false } } }))
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
    )
    renderConnection()
    fireEvent.click(await screen.findByRole('button', { name: 'Connect GitHub' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Could not connect GitHub. Please try again.')
    expect(authMocks.signIn).not.toHaveBeenCalled()
  })
})
