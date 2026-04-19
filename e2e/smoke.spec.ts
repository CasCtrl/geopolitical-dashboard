import { test, expect } from '@playwright/test';

test('dashboard shell renders key sections', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Risk Factor Weights').first()).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Scenarios' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Dashboard' })).toBeVisible();
});
