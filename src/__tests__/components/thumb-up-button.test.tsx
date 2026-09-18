import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ThumbUpButton from '@/components/thumb-up-button'

const patch = vi.hoisted(() => vi.fn())

vi.mock('@/lib/ajax', () => ({ patch }))

describe('ThumbUpButton', () => {
  afterEach(() => {
    localStorage.clear()
    patch.mockReset()
  })

  it('restores the count when like cancellation fails', async () => {
    localStorage.setItem('thumbUp-pub-1', 'true')
    patch.mockResolvedValue({ errno: -1, msg: 'Unable to update like count' })

    render(<ThumbUpButton initialCount={4} publishId="pub-1" />)
    const button = await screen.findByRole('button')
    expect(button.textContent).toContain('4')

    fireEvent.click(button)
    await waitFor(() => {
      expect(patch).toHaveBeenCalledWith('/api/pub/thumb-up-decrease/pub-1', {})
    })
    await waitFor(() => {
      expect(screen.getByRole('button').textContent).toContain('4')
    })
    expect(localStorage.getItem('thumbUp-pub-1')).toBe('true')
  })
})
