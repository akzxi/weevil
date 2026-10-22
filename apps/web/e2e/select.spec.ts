import { expect, test, type Locator, type Page } from '@playwright/test'

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

test('selecting Claude opens the character select view', async ({ page }) => {
  await sprite(page).click()
  const dialog = page.getByRole('dialog', { name: 'Claude' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Anthropic')).toBeVisible()
  await expect(dialog.getByText('Claude Opus 5.5')).toBeVisible()
  await expect(dialog.getByRole('meter')).toHaveCount(5)
  await expect(dialog.getByTestId('worn-head').locator('[data-item="frontend-design"]')).toBeVisible()
  await expect(dialog.getByTestId('grid-skill').locator('.mc-slot')).toHaveCount(12)
  await expect(dialog.getByTestId('grid-mcp').locator('.mc-slot')).toHaveCount(12)
  await expect(dialog.getByTestId('worn-column').locator('.mc-slot')).toHaveCount(4)
  await expect(dialog.getByRole('button', { name: /chat with claude/i })).toBeVisible()
})

test('Escape, the close button and the backdrop all return Claude to the world', async ({ page }) => {
  const dialog = page.getByRole('dialog')

  await sprite(page).click()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  await sprite(page).click()
  await page.getByRole('button', { name: /close character select/i }).click()
  await expect(dialog).toBeHidden()

  await sprite(page).click()
  await page.mouse.click(8, 300)
  await expect(dialog).toBeHidden()
  await expect(sprite(page)).toBeFocused()
})

test('keyboard users can select Claude', async ({ page }) => {
  await sprite(page).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('button', { name: /close character select/i })).toBeFocused()
})

test('dragging moves Claude and does not select him', async ({ page }) => {
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

test('dropping outside the screen keeps Claude inside it', async ({ page }) => {
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

/** Drag the centre of `from` to the centre of `to` (or to a point). */
async function dragTo(page: Page, from: Locator, to: Locator | { x: number; y: number }) {
  await from.scrollIntoViewIfNeeded()
  const a = (await from.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2, { steps: 4 })
  let point = to as { x: number; y: number }
  if ('boundingBox' in to) {
    // Like a person: hold the item at the screen edge until the target scrolls into view.
    const { height } = page.viewportSize()!
    for (let b = (await to.boundingBox())!; b.y < 0 || b.y + b.height > height; b = (await to.boundingBox())!) {
      await page.mouse.move(a.x + a.width / 2, b.y < 0 ? 10 : height - 10, { steps: 3 })
      await page.waitForTimeout(50)
    }
    const b = (await to.boundingBox())!
    point = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  }
  await page.mouse.move(point.x, point.y, { steps: 12 })
  await page.mouse.up()
}

const openShop = (page: Page) => page.getByText('Shop', { exact: true }).click()
const shopItem = (page: Page, id: string) => page.locator(`[data-testid="shop-item"][data-item="${id}"]`)

test.describe('inventory', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('shop search filters skills and MCPs', async ({ page }) => {
    await openShop(page)
    await page.getByPlaceholder('Search skills').fill('browser')
    await expect(page.getByTestId('shop-item')).toHaveCount(1)
    await expect(shopItem(page, 'webapp-testing')).toBeVisible()
    await page.getByRole('button', { name: 'MCPs' }).click()
    await page.getByPlaceholder('Search MCP servers').fill('browser')
    await expect(shopItem(page, 'playwright')).toBeVisible()
    await page.getByPlaceholder('Search MCP servers').fill('zzz')
    await expect(page.getByText(/nothing matches/i)).toBeVisible()
  })

  test('the main-screen shop has no per-character equip state', async ({ page }) => {
    await openShop(page)
    await expect(shopItem(page, 'frontend-design')).toBeVisible()
    await expect(page.getByRole('button', { name: /equip/i })).toHaveCount(0)
  })

  test('dragging from the shop onto Claude equips the item', async ({ page }) => {
    await openShop(page)
    await dragTo(page, shopItem(page, 'pdf'), sprite(page))
    await expect(page.getByRole('dialog', { name: 'Shop' })).toBeHidden()
    await sprite(page).click()
    await expect(page.getByTestId('grid-skill').locator('[data-item="pdf"]')).toBeVisible()
  })

  test('items can be dropped from the shop straight into the select-screen grid', async ({ page }) => {
    await sprite(page).click()
    // On phones the grids are below the fold; bring the target on screen before the shop covers it.
    await page.getByTestId('grid-mcp').scrollIntoViewIfNeeded()
    await openShop(page)
    await page.getByRole('button', { name: 'MCPs' }).click()
    await dragTo(page, shopItem(page, 'github'), page.getByTestId('grid-mcp'))
    await expect(page.getByTestId('grid-mcp').locator('[data-item="github"]')).toBeVisible()
  })

  test('wear by dragging to a slot, remove by dragging out, and it persists', async ({ page }) => {
    await sprite(page).click()
    await page.getByRole('button', { name: /empty skill slot/i }).first().click()
    await page.getByRole('button', { name: 'Equip PDF on Claude' }).click()
    await page.getByRole('button', { name: 'MCPs' }).click()
    await page.getByRole('button', { name: 'Equip GitHub on Claude' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Shop' })).toHaveCount(0)

    const dialog = page.getByTestId('select-dialog')
    await dragTo(page, dialog.getByTestId('grid-skill').locator('[data-item="pdf"]'), dialog.getByTestId('worn-hand'))
    await expect(dialog.getByTestId('worn-hand').locator('[data-item="pdf"]')).toBeVisible()
    await expect(dialog.getByTestId('grid-skill').locator('[data-item="pdf"]')).toHaveCount(0)
    // Worn items are drawn on the character too.
    await expect(dialog.locator('svg [data-item="pdf"]')).toHaveCount(1)

    await dragTo(page, dialog.getByTestId('grid-mcp').locator('[data-item="github"]'), { x: 8, y: 8 })
    await expect(dialog.getByTestId('grid-mcp').locator('[data-item]')).toHaveCount(0)

    await page.reload()
    await sprite(page).click()
    await expect(page.getByTestId('worn-hand').locator('[data-item="pdf"]')).toBeVisible()
  })

  test('keyboard: Enter wears a grid item, Delete removes it', async ({ page }) => {
    await sprite(page).click()
    // An empty MCP slot opens the shop on the MCPs tab.
    await page.getByRole('button', { name: /empty mcp slot/i }).first().press('Enter')
    await page.getByRole('button', { name: 'Equip Linear on Claude' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Shop' })).toHaveCount(0)
    await page.getByTestId('grid-mcp').locator('[data-item="linear"]').focus()
    await page.keyboard.press('Enter')
    const feet = page.getByTestId('worn-feet').locator('[data-item="linear"]')
    await expect(feet).toBeVisible()
    await feet.focus()
    await page.keyboard.press('Delete')
    await expect(page.locator('[data-item="linear"]')).toHaveCount(0)
  })
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

  test('Claude wanders on his own', async ({ page }) => {
    const start = (await sprite(page).boundingBox())!
    await expect
      .poll(async () => (await sprite(page).boundingBox())!.x, { timeout: 8000 })
      .not.toBeCloseTo(start.x, 0)
  })
})
