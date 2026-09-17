import { expect, test, type Locator } from '@playwright/test'

const providers = {
  nodemailer: { id: 'nodemailer', name: 'Email', type: 'email', signinUrl: '/api/auth/signin/nodemailer' },
}

for (const theme of ['light', 'dark']) {
  for (const width of [390, 1280]) {
    test(`controls have centered labels and readable colors in ${theme} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme)
      await page.route('**/api/auth/providers', (route) => route.fulfill({ json: providers }))
      await page.goto('/en/signin')
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

      const submit = page.getByRole('button', { name: 'Continue with Email' })
      await expect(submit).toBeVisible()
      await expect(submit).toHaveCSS('justify-content', 'center')
      await expect(submit).toHaveCSS('text-align', 'center')
      await expectReadable(submit)
      await submit.hover()
      await expectReadable(submit)

      const input = page.getByLabel('Email')
      await expect(page.locator('label[for="email"]')).toHaveCSS('text-align', /left|start/)
      await expect(input).toHaveCSS('text-align', /left|start/)
      const surface = await input.evaluate((element) => getComputedStyle(element).backgroundColor)
      expect(surface).not.toBe('rgba(0, 0, 0, 0)')
      if (theme === 'dark') expect(surface).not.toBe('rgb(255, 255, 255)')

      await page.goto('/en')
      const signIn = page.locator('a[role="sign-in-link"]').first()
      await expect(signIn).toBeVisible()
      await expect(signIn).toHaveCSS('display', /flex/)
      await expect(signIn).toHaveCSS('justify-content', 'center')
      await expect(signIn).toHaveCSS('text-align', 'center')
      await expectReadable(signIn)
      await signIn.hover()
      await expectReadable(signIn)
      await expectReadable(page.locator('#capabilities .text-primary').first())
      await expect(page.locator('#capabilities h3').first()).toHaveCSS('text-align', /left|start/)
      await page.getByRole('button', { name: 'Change theme' }).click()
      await expect(page.getByRole('menuitem', { name: 'Light', exact: true })).toHaveCSS(
        'justify-content',
        /normal|flex-start/
      )
      await expect(page.getByRole('menuitem', { name: 'Light', exact: true })).toHaveCSS('text-align', /left|start/)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    })
  }
}

async function expectReadable(control: Locator) {
  await expect
    .poll(() =>
      control.evaluate((element) => {
        const style = getComputedStyle(element)
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const context = canvas.getContext('2d')!
        const luminance = () => {
          const channels = Array.from(context.getImageData(0, 0, 1, 1).data)
            .slice(0, 3)
            .map((value) => {
              const channel = value / 255
              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
            })
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
        }
        const ancestors: Element[] = []
        for (let current: Element | null = element; current; current = current.parentElement) ancestors.unshift(current)
        context.fillStyle = 'white'
        context.fillRect(0, 0, 1, 1)
        for (const ancestor of ancestors) {
          context.fillStyle = getComputedStyle(ancestor).backgroundColor
          context.fillRect(0, 0, 1, 1)
        }
        const background = luminance()
        context.fillStyle = style.color
        context.fillRect(0, 0, 1, 1)
        const foreground = luminance()
        return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
      })
    )
    .toBeGreaterThanOrEqual(4.5)
}
