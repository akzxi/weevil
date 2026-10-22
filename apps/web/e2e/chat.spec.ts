import { expect, test, type Page } from '@playwright/test'
import { mockApi } from './mockApi.ts'

test.use({ reducedMotion: 'reduce' })

async function openChat(page: Page) {
  await page.goto('/')
  await page.getByTestId('sprite-clawd').click()
  await page.getByRole('button', { name: 'Chat with Claude' }).click()
  await expect(page.getByRole('dialog', { name: 'Chat with Claude' })).toBeVisible()
}

/** On phones the conversation list is a drawer behind the "Chats" button. */
async function showSidebar(page: Page) {
  const toggle = page.getByRole('button', { name: 'Chats' })
  if (await toggle.isVisible()) await toggle.click()
}

const composer = (page: Page) => page.getByRole('textbox', { name: 'Message Claude' })

async function send(page: Page, text: string) {
  await composer(page).fill(text)
  await composer(page).press('Enter')
}

test('the thought bubble opens a chat that streams a markdown reply with collapsible thinking', async ({ page }) => {
  await mockApi(page)
  await openChat(page)
  await expect(page.getByText('Say hello to Claude.')).toBeVisible()

  await send(page, 'hello there')
  const list = page.getByTestId('message-list')
  await expect(list.getByTestId('user-message')).toHaveText('hello there')
  await expect(list.locator('strong', { hasText: 'hello there' })).toBeVisible()

  const thinking = list.locator('details')
  await expect(thinking.locator('summary')).toHaveText('Thought process')
  await expect(thinking).not.toHaveAttribute('open')
  await thinking.locator('summary').click()
  await expect(thinking.getByText('Considering it')).toBeVisible()

  await showSidebar(page)
  await expect(page.getByTestId('conversation')).toHaveText(['hello there'])
})

test('conversations: new, switch, rename and delete', async ({ page }) => {
  await mockApi(page)
  await openChat(page)
  await send(page, 'first chat')
  await expect(page.getByText('You said')).toBeVisible()

  await showSidebar(page)
  await page.getByRole('button', { name: 'New chat' }).click()
  await expect(page.getByText('Say hello to Claude.')).toBeVisible()
  await send(page, 'second chat')
  await showSidebar(page)
  await expect(page.getByTestId('conversation')).toHaveText(['second chat', 'first chat'])

  await page.getByRole('button', { name: 'first chat', exact: true }).click()
  await expect(page.getByTestId('user-message')).toHaveText(['first chat'])

  await showSidebar(page)
  await page.getByRole('button', { name: 'Rename first chat' }).click()
  const title = page.getByRole('textbox', { name: 'Conversation title' })
  await title.fill('Renamed')
  await title.press('Enter')
  await expect(page.getByTestId('conversation')).toHaveText(['second chat', 'Renamed'])

  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Delete Renamed' }).click()
  await expect(page.getByTestId('conversation')).toHaveText(['second chat'])
})

test('Stop ends a reply without saving it', async ({ page }) => {
  await mockApi(page, { holdMs: 5_000 })
  await openChat(page)
  await send(page, 'take your time')
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByText("Stopped. This partial reply isn't saved.")).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send' })).toBeVisible()
})

test('errors and refusals are explained in the conversation', async ({ page }) => {
  await mockApi(page, {
    reply: (text) =>
      text === 'refuse' ? { stop_reason: 'refusal' } : { error: 'Rate limited by the Claude API.' },
  })
  await openChat(page)
  await send(page, 'refuse')
  await expect(page.getByText('Claude declined to answer this one.')).toBeVisible()
  await send(page, 'anything')
  await expect(page.getByRole('alert').filter({ hasText: 'Rate limited by the Claude API.' })).toBeVisible()
})

test('a missing backend shows how to start it', async ({ page }) => {
  await mockApi(page, { offline: true })
  await openChat(page)
  await expect(page.getByRole('alert').filter({ hasText: 'npm run dev:api' })).toBeVisible()
})

test('Back and Escape return to the character select screen', async ({ page }) => {
  await mockApi(page)
  await openChat(page)
  // The select screen underneath is inert while the chat covers it.
  await expect(page.getByTestId('select-dialog')).toHaveAttribute('inert')
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Claude', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Chat with Claude' }).click()
  await expect(page.getByRole('dialog', { name: 'Chat with Claude' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Chat with Claude' })).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Claude', exact: true })).toBeVisible()
})
