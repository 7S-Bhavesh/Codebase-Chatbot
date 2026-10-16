import { test, expect } from '@playwright/test';

async function mockSession(page, handle) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'browser-test-token');
    localStorage.setItem('user', JSON.stringify({ email: 'browser@example.invalid', name: 'Browser Test' }));
  });
  await page.route('**/api/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: {
      'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*',
    } });
    const response = await handle(new URL(route.request().url()).pathname, route.request());
    await route.fulfill({ json: response, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
}

test('first answer stays visible when new-chat history arrives after submission', async ({ page }) => {
  let saved = false;
  let reads = 0;
  await mockSession(page, async path => {
    if (path.includes('get-all-chats')) return saved ? [{ chat_id: 10 }] : [];
    if (path.includes('save-prompt')) { saved = true; return { chat_id: 10, prompt_id: 101 }; }
    if (path.includes('get-prompts')) {
      reads++;
      await new Promise(resolve => setTimeout(resolve, 250));
      return [{ prompt_id: 101, prompt: 'First question', response: reads > 1 ? 'First answer' : null, status: reads > 1 ? 'done' : 'processing' }];
    }
    throw new Error(`Unexpected API request: ${path}`);
  });
  await page.goto('/chat/1');
  await page.getByRole('complementary').getByRole('button', { name: 'New Chat', exact: true }).click();
  await page.getByPlaceholder('Ask something about your codebase...').fill('First question');
  await page.getByPlaceholder('Ask something about your codebase...').press('Enter');
  await expect(page.getByText('Processing…', { exact: true })).toBeVisible();
  await expect(page.getByText('First answer', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('First question', { exact: true })).toHaveCount(1);
  await expect(page.getByText('First answer', { exact: true })).toHaveCount(1);
});

test('switching chats cancels stale updates and resumes pending responses on return', async ({ page }) => {
  let completed = false;
  await mockSession(page, async path => {
    if (path.includes('get-all-chats')) return [{ chat_id: 10 }, { chat_id: 20 }];
    if (path.endsWith('get-prompts/10')) return [{ prompt_id: 101, prompt: 'Pending question', response: completed ? 'Recovered answer' : null, status: completed ? 'done' : 'processing' }];
    if (path.endsWith('get-prompts/20')) return [{ prompt_id: 202, prompt: 'Other question', response: 'Other answer', status: 'done' }];
    throw new Error(`Unexpected API request: ${path}`);
  });
  await page.goto('/chat/1');
  await page.getByRole('button', { name: 'Chat 10', exact: true }).click();
  await expect(page.getByText('Processing…', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chat 20', exact: true }).click();
  completed = true;
  await expect(page.getByText('Other answer', { exact: true })).toBeVisible();
  await expect(page.getByText('Recovered answer', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Chat 10', exact: true }).click();
  await expect(page.getByText('Recovered answer', { exact: true })).toBeVisible();
});

test('failed generation shows its error and leaves the composer usable', async ({ page }) => {
  await mockSession(page, async path => {
    if (path.includes('get-all-chats')) return [{ chat_id: 10 }];
    return [{ prompt_id: 101, prompt: 'Question', response: 'The AI service is temporarily unavailable after several attempts. Please try again shortly.', status: 'failed' }];
  });
  await page.goto('/chat/1');
  await page.getByRole('button', { name: 'Chat 10', exact: true }).click();
  await expect(page.getByText('Request failed', { exact: true })).toBeVisible();
  await page.getByPlaceholder('Ask something about your codebase...').fill('Try again');
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
});
