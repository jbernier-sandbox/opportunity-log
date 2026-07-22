import { expect, test } from '@playwright/test';

test('logs in and uses the primary shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Opportunity Log');
  await page.getByLabel(/username/i).fill('demo');
  await page.getByLabel(/password/i).fill('opportunity');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('dialog', { name: /welcome/i })).toBeVisible();
  await page.getByRole('button', { name: /get started/i }).click();
  await expect(page.getByText(/alex morgan/i)).toBeVisible();
  await page.getByRole('button', { name: /help/i }).click();
  await expect(page.getByRole('dialog', { name: /help/i })).toBeVisible();
});
