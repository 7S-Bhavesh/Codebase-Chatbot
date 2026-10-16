import { test, expect } from '@playwright/test';

test('shows the first question and processing immediately, before the API acknowledges it', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ email: 'test@example.invalid' }));
  });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path.includes('get-all-chats')) return route.fulfill({ json: [], headers });
    if (path.includes('save-prompt')) {
      await new Promise(resolve => setTimeout(resolve, 2500));
      return route.fulfill({ json: { chat_id: 10, prompt_id: 101 }, headers });
    }
    if (path.includes('get-prompts')) {
      await new Promise(resolve => setTimeout(resolve, 2500));
      return route.fulfill({ json: [{ prompt_id: 101, prompt: 'First delayed question', response: 'Delayed answer', status: 'done' }], headers });
    }
    throw new Error(`Unexpected request ${path}`);
  });
  await page.goto('/chat/1');
  await page.getByRole('complementary').getByRole('button', { name: 'New Chat', exact: true }).click();
  const input = page.getByPlaceholder('Ask something about your codebase...');
  await input.fill('First delayed question');
  await input.press('Enter');
  await expect(page.getByTestId('user-message')).toContainText('First delayed question', { timeout: 1000 });
  await expect(page.getByText('Processing…', { exact: true })).toBeInViewport({ timeout: 1000 });
  // The accepted prompt must remain visible while the first history read is slow.
  await page.waitForResponse(response => response.url().includes('save-prompt'));
  await expect(page.getByText('Processing…', { exact: true })).toBeInViewport();
  await expect(page.getByText('Delayed answer', { exact: true })).toBeVisible({ timeout: 10000 });
});

test('an empty first history snapshot cannot erase the accepted response placeholder', async ({ page }) => {
  let reads = 0;
  await page.addInitScript(() => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ email: 'test@example.invalid' }));
  });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path.includes('get-all-chats')) return route.fulfill({ json: [], headers });
    if (path.includes('save-prompt')) return route.fulfill({ json: { chat_id: 10, prompt_id: 101 }, headers });
    if (path.includes('get-prompts')) return route.fulfill({ json: ++reads === 1 ? [] : [{ prompt_id: 101, prompt: 'Question', status: 'done', response: 'Recovered from stale history' }], headers });
  });
  await page.goto('/chat/1');
  await page.getByRole('complementary').getByRole('button', { name: 'New Chat', exact: true }).click();
  await page.getByPlaceholder('Ask something about your codebase...').fill('Question');
  await page.getByPlaceholder('Ask something about your codebase...').press('Enter');
  await expect(page.getByText('Processing…', { exact: true })).toBeInViewport();
  await expect(page.getByText('Recovered from stale history', { exact: true })).toBeInViewport({ timeout: 10000 });
  await expect(page.getByTestId('user-message')).toHaveCount(1);
});
