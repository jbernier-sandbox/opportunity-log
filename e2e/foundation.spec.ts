import { expect, test } from '@playwright/test';

test('logs in and uses the primary shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Opportunity Log');
  await page.getByLabel(/username/i).fill('demo');
  await page.getByLabel(/password/i).fill('opportunity');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('dialog', { name: /welcome/i })).toBeVisible();
  await page.getByRole('button', { name: /get started/i }).click();
  await expect(page.getByText('Alex Morgan', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /new opportunity/i }).click();
  await page.getByLabel(/^title/i).fill('Reduce packing waste');
  await page
    .getByLabel(/^description/i)
    .fill('Replace single-use packing material.');
  await page.getByRole('checkbox', { name: /assign to me/i }).check();
  await page.getByRole('button', { name: /create opportunity/i }).click();
  await expect(page.getByText('OPP-0001', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: /open OPP-0001: Reduce packing waste/i })
    .click();
  await expect(
    page.getByRole('dialog', { name: /opportunity details/i }),
  ).toBeVisible();
  await page.getByLabel(/add note/i).fill('Verified during walkthrough.');
  await page.getByRole('button', { name: /^add note$/i }).click();
  await expect(page.getByText('Verified during walkthrough.')).toBeVisible();
  await page
    .getByRole('button', { name: /close opportunity details/i })
    .click();
  await page.getByRole('button', { name: /help/i }).click();
  await expect(page.getByRole('dialog', { name: /help/i })).toBeVisible();
});
