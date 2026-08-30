import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const runFullLoop = process.env.DOC_E2E_FULL_LOOP === '1'
const mailpitBase = process.env.DOC_E2E_MAILPIT_URL || 'http://127.0.0.1:8025'

test.skip(!runFullLoop, 'Requires the zero-credential Docker stack; run npm run test:e2e:full after doc up.')
test.setTimeout(120_000)

test('authenticated workspace remains usable, persistent, responsive, and localized', async ({ page, request }) => {
  const email = `doc-e2e-${Date.now()}@example.test`
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.addInitScript(() => localStorage.setItem('theme', 'light'))
  await signInWithMailpit(page, request, email)
  await page.goto('/en/work')

  await expect(page).toHaveURL(/\/en\/user-info$/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Complete your profile' })).toBeVisible()
  await expect(page.getByLabel('Email')).toHaveValue(email)
  await page.getByLabel('Name', { exact: true }).fill('Doc E2E')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page).toHaveURL(/\/en\/work\/[\w-]+/, { timeout: 30_000 })
  const docId = page.url().split('/').at(-1)!
  const contentPanel = page.locator('#work-content-panel')
  await expect(contentPanel).toBeVisible()
  await expect(page.locator('#work-content-scroll-container')).toBeVisible()
  await expect(page.locator('#work-content-container')).toBeVisible()
  await expect(page.locator('main#workspace-main')).toBeVisible()
  const editor = page.locator('[contenteditable="true"]')
  await expect(editor).toBeVisible()
  await expect(page.getByRole('banner', { name: 'Document toolbar' })).toBeVisible()
  await expect(page.locator('[role="collaborative-state"]')).toHaveAttribute('data-title', 'connected', {
    timeout: 30_000,
  })

  const marker = 'browser-loop-persisted'
  const title = `First document ${marker}`
  await page.locator('#DOC_TITLE_INPUT_ID').fill(title)
  await editor.locator('p').last().click()
  await page.keyboard.press('End')
  await page.keyboard.type(marker)
  await expect(editor).toContainText(marker)

  await expect
    .poll(async () => documentIsPersisted(page, docId, title, marker), {
      timeout: 30_000,
      intervals: [250, 500, 1_000],
      message: 'title and collaborative body are persisted by the server APIs',
    })
    .toBe(true)

  const iconResponse = await page.request.patch(`/api/doc/${encodeURIComponent(docId)}`, {
    data: { icon: '📄' },
  })
  expect(iconResponse.ok()).toBe(true)
  expect(await iconResponse.json()).toMatchObject({ errno: 0 })
  await page.reload()
  await expect(page.locator('#DOC_TITLE_INPUT_ID')).toHaveValue(title)
  await expect(page.locator('[contenteditable="true"]')).toContainText(marker)
  await expect(page).toHaveURL(/\/en\/work\/[\w-]+/)
  await expect(page.locator('[role="collaborative-state"]')).toHaveAttribute('data-title', 'connected', {
    timeout: 30_000,
  })

  await page.locator('footer').evaluate((footer) => {
    Array.from(footer.children).forEach((child) => ((child as HTMLElement).style.visibility = 'hidden'))
  })
  const screenshotOptions = { fullPage: true }
  await expectNoHorizontalClipping(page)
  await expect(page).toHaveScreenshot('workspace-desktop-light.png', screenshotOptions)
  await chooseTheme(page, 'Dark')
  await expect(page).toHaveScreenshot('workspace-desktop-dark.png', screenshotOptions)
  await chooseTheme(page, 'Light')

  await page.setViewportSize({ width: 704, height: 900 })
  await assertCompactTopbar(page)
  const navigationButton = page.getByRole('button', { name: 'Open document navigation' })
  await expect(navigationButton).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByText('Documents')).toHaveCount(0)

  await navigationButton.click()
  const navigationDialog = page.getByRole('dialog', { name: 'Document navigation' })
  await expect(navigationDialog).toBeVisible()
  await navigationDialog.getByRole('button', { name: 'Search' }).click()
  const searchDialog = page.getByRole('dialog', { name: 'Search' })
  await expect(searchDialog).toBeVisible()
  const searchInput = searchDialog.locator('input')
  await expect(searchInput).toBeFocused()
  await page.keyboard.press('Tab')
  expect(await searchDialog.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(searchDialog).toBeHidden()
  await expect(navigationDialog).toBeVisible()
  await navigationDialog.getByRole('button', { name: 'Close document navigation' }).click()
  await expect(navigationDialog).toBeHidden()
  await expect(navigationButton).toBeFocused()

  await exerciseAiDrawer(page, 704)

  await navigationButton.click()
  await expect(navigationDialog).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(page.getByRole('button', { name: 'Open document navigation' })).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Document navigation' })).toHaveCount(0)
  await page.setViewportSize({ width: 704, height: 900 })
  await expect(page.getByRole('button', { name: 'Open document navigation' })).toHaveAttribute('aria-expanded', 'false')

  await page.setViewportSize({ width: 390, height: 844 })
  await assertCompactTopbar(page)
  await expect(page).toHaveScreenshot('workspace-phone-390-light.png', screenshotOptions)
  await chooseTheme(page, 'Dark')
  await expect(page).toHaveScreenshot('workspace-phone-390-dark.png', screenshotOptions)
  await exerciseAiDrawer(page, 390)

  await page.getByRole('button', { name: 'Change language, current en' }).click()
  await page.getByRole('menuitem', { name: /中文/ }).click()
  await expect(page).toHaveURL(/\/zh-cn\/work\/[\w-]+/)
  await page.getByRole('button', { name: 'AI 写作' }).click()
  await expect(page.getByPlaceholder('输入 AI 指令，如：根据标题写大纲')).toBeVisible()
  await page.getByRole('button', { name: '关闭' }).click()
  await expectNoHorizontalClipping(page)
})

async function assertCompactTopbar(page: Page) {
  const toolbar = page.getByRole('banner', { name: 'Document toolbar' })
  await expect(toolbar).toBeVisible()
  const box = await toolbar.boundingBox()
  expect(box).toBeTruthy()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual((page.viewportSize()?.width || 0) + 1)
  await expectNoHorizontalClipping(page)

  const actionsButton = page.getByRole('button', { name: 'Document actions' })
  await expect(actionsButton).toBeVisible()
  await expect(actionsButton).toBeEnabled()
  await actionsButton.click()
  await expect(page.getByRole('button', { name: 'Duplicate' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Move' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export PDF' })).toBeVisible()
  await page.keyboard.press('Escape')
}

async function exerciseAiDrawer(page: Page, width: number) {
  const contentPanel = page.locator('#work-content-panel')
  const widthBefore = (await contentPanel.boundingBox())?.width || 0
  const trigger = page.getByRole('button', { name: 'AI Writing' })
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const drawer = page.getByTestId('ai-panel-drawer')
  await expect(drawer).toBeVisible()
  expect(await drawer.evaluate((panel) => panel.contains(document.activeElement))).toBe(true)
  await expect(page.getByPlaceholder('Input AI command, such as: outline based on title')).toBeVisible()
  expect((await contentPanel.boundingBox())?.width).toBeGreaterThanOrEqual(widthBefore - 1)
  expect((await drawer.boundingBox())?.width).toBeLessThanOrEqual(width + 1)
  await page.keyboard.press('Tab')
  expect(await drawer.evaluate((panel) => panel.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(trigger).toBeFocused()
}

async function chooseTheme(page: Page, theme: 'Light' | 'Dark') {
  await page.getByRole('button', { name: /theme/i }).click()
  await page.getByRole('menuitem', { name: theme }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme.toLowerCase())
}

async function documentIsPersisted(page: Page, docId: string, title: string, marker: string) {
  const [documentResponse, listResponse] = await Promise.all([
    page.request.get(`/api/doc/${encodeURIComponent(docId)}`),
    page.request.get('/api/doc'),
  ])
  if (!documentResponse.ok() || !listResponse.ok()) return false
  const documentPayload = await documentResponse.json()
  const listPayload = await listResponse.json()
  const content = String(documentPayload?.data?.content || '')
  const savedDoc = Array.isArray(listPayload?.data)
    ? listPayload.data.find((document: { id?: string }) => document.id === docId)
    : null
  return content.includes(marker) && savedDoc?.title === title
}

async function expectNoHorizontalClipping(page: Page) {
  expect(
    await page.evaluate(
      () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= window.innerWidth
    )
  ).toBe(true)
}

async function signInWithMailpit(page: Page, request: APIRequestContext, email: string) {
  const previousIds = new Set((await listMessages(request)).map(messageId))
  await page.goto('/en/signin')
  await page.getByLabel('Email').fill(email)
  await page.locator('button[type="submit"]').click()

  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    const message = (await listMessages(request)).find(
      (item) => !previousIds.has(messageId(item)) && JSON.stringify(item).toLowerCase().includes(email.toLowerCase())
    )
    if (message) {
      const response = await request.get(`${mailpitBase}/api/v1/message/${encodeURIComponent(messageId(message))}`)
      const detail = await response.json()
      const text = collectStrings(detail).join('\n').replaceAll('&amp;', '&')
      const match = text.match(/https?:\/\/[^\s"'<>]+\/api\/auth\/callback\/nodemailer[^\s"'<>]*/i)
      expect(match, 'Mailpit message contains an Auth.js callback').toBeTruthy()
      await page.goto(match![0])
      return
    }
    await page.waitForTimeout(500)
  }
  throw new Error('Mailpit did not receive the sign-in email')
}

async function listMessages(request: APIRequestContext): Promise<unknown[]> {
  const response = await request.get(`${mailpitBase}/api/v1/messages?limit=100`)
  expect(response.ok()).toBe(true)
  const payload = await response.json()
  return Array.isArray(payload?.messages) ? payload.messages : []
}

function messageId(message: any) {
  return String(message?.ID ?? message?.Id ?? message?.id ?? '')
}

function collectStrings(value: unknown, output: string[] = []): string[] {
  if (typeof value === 'string') output.push(value)
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, output))
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectStrings(item, output))
  return output
}
