import { expect, test } from '@playwright/test';

test('logs in and uses the primary shell', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
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
  await page.getByRole('button', { name: /^move OPP-0001$/i }).click();
  await expect(
    page.getByRole('dialog', { name: /opportunity details/i }),
  ).toBeHidden();
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
  await page.getByRole('button', { name: /close help/i }).click();
  await page.getByRole('button', { name: /switch to manager/i }).click();
  await page.getByRole('button', { name: /confirm switch/i }).click();
  await page.getByRole('button', { name: /load sample data/i }).click();
  await expect(page.getByText('Improve machine guarding')).toBeVisible();
  await page.getByRole('button', { name: /audit log/i }).click();
  await expect(page.getByText(/sample data loaded/i)).toBeVisible();
  await page.getByRole('button', { name: /close audit log/i }).click();
  await page.getByRole('button', { name: /clear all data/i }).click();
  await page
    .getByRole('dialog', { name: /clear all application data/i })
    .getByRole('button', { name: /clear all data/i })
    .click();
  await expect(page.getByRole('dialog', { name: /welcome/i })).toBeVisible();
});

test('recovers corrupted data at a smaller landscape viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.addInitScript({
    content: "localStorage.setItem('opportunity-log:state', '{')",
  });
  await page.goto('/');

  await expect(
    page.getByText(/saved application data.*corrupted/i),
  ).toBeVisible();
  const reset = page.getByRole('button', { name: /reset application data/i });
  await expect(reset).toBeVisible();
  await expect(reset).toHaveCSS('min-height', '44px');
  await reset.click();

  await expect(
    page.getByText(/saved application data.*corrupted/i),
  ).toBeHidden();
  await expect(
    page.getByRole('heading', { name: /welcome back/i }),
  ).toBeVisible();
});
