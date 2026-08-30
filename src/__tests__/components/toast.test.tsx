import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast'

test('destructive toast uses shared semantic danger styles and an accessible close action', () => {
  render(
    <ToastProvider>
      <Toast open variant="destructive">
        <ToastTitle>Connection failed</ToastTitle>
        <ToastDescription>Try again</ToastDescription>
        <ToastClose aria-label="Dismiss notification" />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  )

  const toast = screen.getByText('Connection failed').closest('li')
  expect(toast?.className).toContain('bg-danger-soft')
  expect(toast?.className).toContain('border-danger')
  expect(screen.getByRole('button', { name: 'Dismiss notification' })).toBeTruthy()
})
