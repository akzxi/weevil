import { expect, test, type Page } from '@playwright/test'

// Reduced motion makes sprites idle in place and disables transform animations,
// so positions and screenshots are deterministic.
test.use({ reducedMotion: 'reduce' })

const sprite = (page: Page) => page.getByTestId('sprite-clawd')

async function dragBy(page: Page, dx: number, dy: number) {
  const box = (await sprite(page).boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 12 })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(sprite(page)).toBeVisible()
})

test('selecting Clawd opens the character select view', async ({ page }) => {
  await sprite(page).click()
  const dialog = page.getByRole('dialog', { name: 'Clawd' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Anthropic')).toBeVisible()
  await expect(dialog.getByText('Claude Opus 5.5')).toBeVisible()
  await expect(dialog.getByRole('meter')).toHaveCount(5)
  await expect(dialog.getByTestId('item-slot')).toHaveCount(4)
  await expect(dialog.getByTestId('item-slot').first()).toContainText('Frontend Design')
  await expect(dialog.getByRole('button', { name: /chat with clawd/i })).toBeVisible()
})

test('Escape, the close button and the backdrop all return Clawd to the world', async ({ page }) => {
  const dialog = page.getByRole('dialog')

  await sprite(page).click()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  await sprite(page).click()
  await page.getByRole('button', { name: /close character select/i }).click()
  await expect(dialog).toBeHidden()

  await sprite(page).click()
  await page.getByTestId('select-backdrop').click({ position: { x: 10, y: 10 } })
  await expect(dialog).toBeHidden()
  await expect(sprite(page)).toBeFocused()
})

test('keyboard users can select Clawd', async ({ page }) => {
  await sprite(page).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('button', { name: /close character select/i })).toBeFocused()
})

test('dragging moves Clawd and does not select him', async ({ page }) => {
  const before = (await sprite(page).boundingBox())!
  await dragBy(page, -150, -120)
  const after = (await sprite(page).boundingBox())!
  expect(after.x).toBeCloseTo(before.x - 150, -1)
  expect(after.y).toBeCloseTo(before.y - 120, -1)
  await expect(page.getByRole('dialog')).toBeHidden()
  // Clicking after a drop still selects.
  await sprite(page).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('dropping outside the screen keeps Clawd inside it', async ({ page }) => {
  await dragBy(page, -5000, -5000)
  const box = (await sprite(page).boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
})

test('theme toggle switches and remembers the theme', async ({ page }) => {
  const html = page.locator('html')
  const start = await html.getAttribute('data-theme')
  await page.getByRole('button', { name: /switch to .* theme/i }).click()
  await expect(html).not.toHaveAttribute('data-theme', start!)
  const chosen = await html.getAttribute('data-theme')
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', chosen!)
})

for (const theme of ['light', 'dark'] as const) {
  test(`looks right — ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await page.reload()
    await page.evaluate(() => document.fonts.ready)
    await expect(page).toHaveScreenshot(`world-${theme}.png`)
    await sprite(page).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page).toHaveScreenshot(`selected-${theme}.png`)
  })
}

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('Clawd wanders on his own', async ({ page }) => {
    const start = (await sprite(page).boundingBox())!
    await expect
      .poll(async () => (await sprite(page).boundingBox())!.x, { timeout: 8000 })
      .not.toBeCloseTo(start.x, 0)
  })
})
