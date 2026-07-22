import { expect, test } from '@playwright/test';

test('loads the accessible application shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Opportunity Log');
  await expect(
    page.getByRole('heading', {
      name: /turn workplace ideas into visible progress/i,
    }),
  ).toBeVisible();
});
