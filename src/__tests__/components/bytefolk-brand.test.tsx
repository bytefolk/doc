import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomePage from '@/app/[locale]/page'
import Footer from '@/components/footer'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import englishMessages from '../../../messages/en.json'
import chineseMessages from '../../../messages/zh-cn.json'

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: keyof typeof englishMessages.home) => englishMessages.home[key],
}))

vi.mock('@/lib/session', () => ({
  getUserInfo: async () => null,
}))

describe('ByteFolk visible brand copy', () => {
  afterEach(cleanup)

  it('keeps the English and Chinese landing-page eyebrow aligned', () => {
    expect(englishMessages.home.eyebrow).toBe('ByteFolk / doc')
    expect(chineseMessages.home.eyebrow).toBe('ByteFolk / doc')
  })

  it('renders ByteFolk on the landing page without the retired organization name', async () => {
    const { container } = render(<NextIntlClientProviderWrapper>{await HomePage()}</NextIntlClientProviderWrapper>)

    expect(screen.getByText('ByteFolk / doc')).toBeTruthy()
    expect(screen.getByText('· ByteFolk')).toBeTruthy()
    expect(container.textContent).not.toContain(['fullstack', 'ai', 'infra'].join('-'))
  })

  it('renders ByteFolk in the shared footer', async () => {
    render(await Footer({}))

    expect(screen.getByText(/ByteFolk \/ doc$/)).toBeTruthy()
  })
})
