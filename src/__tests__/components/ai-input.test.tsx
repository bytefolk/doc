import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import AIInput from '@/components/ai-panel/ai-input'
import enMessages from '../../../messages/en.json'
import zhMessages from '../../../messages/zh-cn.json'

afterEach(cleanup)

function renderInput(locale: 'en' | 'zh-cn') {
  const messages = locale === 'en' ? enMessages : zhMessages
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AIInput
        isFocus={false}
        loading={false}
        onRequestAI={vi.fn()}
        onAbortRequestAI={vi.fn()}
        instruction=""
        setInstruction={vi.fn()}
        delay={0}
      />
    </NextIntlClientProvider>
  )
}

test('uses the English AI input placeholder in the English locale', () => {
  renderInput('en')
  expect(screen.getByPlaceholderText('Input AI command, such as: outline based on title')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Send AI instruction' })).toBeTruthy()
  expect(screen.queryByPlaceholderText(/输入 AI 指令/)).toBeNull()
})

test('uses the Chinese AI input placeholder in the Chinese locale', () => {
  renderInput('zh-cn')
  expect(screen.getByPlaceholderText('输入 AI 指令，如：根据标题写大纲')).toBeTruthy()
  expect(screen.getByRole('button', { name: '发送 AI 指令' })).toBeTruthy()
})
