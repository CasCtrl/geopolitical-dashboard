import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('critical scenario journey: open scenarios and inspect historical scenario analysis', async ({ page }) => {
  await page.getByRole('tab', { name: 'Scenarios' }).click();

  await expect(page.getByText('Stress Test Summary')).toBeVisible();
  await expect(page.getByText('Scenario Analysis')).toBeVisible();

  const scenarioButtons = page.locator('button').filter({ hasText: /2008|COVID|Ukraine|Oil|Trade/i });
  await scenarioButtons.first().click();

  await expect(page.getByText('Scenario Description')).toBeVisible();
  await expect(page.getByText('Affected Regions')).toBeVisible();
});

test('critical export flow: generate CSV report from exports tab', async ({ page }) => {
  await page.getByRole('button', { name: 'Export Reports' }).click();

  await expect(page.getByRole('heading', { name: 'Generate Report' })).toBeVisible();

  await page.getByRole('button', { name: 'csv' }).click();
  await page.getByRole('button', { name: 'Generate Report' }).click();

  await expect(page.getByText('CSV report generated successfully!')).toBeVisible();
});

test('critical alerts flow: create and display a new threshold alert', async ({ page }) => {
  await page.getByLabel('Open alerts and updates').click();

  await expect(page.getByText('Alerts & Updates')).toBeVisible();

  await page.getByRole('button', { name: 'Add Alert' }).click();
  await page.getByPlaceholder('e.g., High China Risk').fill('E2E Country Alert');

  const targetInput = page.getByPlaceholder('e.g., China');
  await targetInput.fill('Japan');

  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByText('E2E Country Alert')).toBeVisible();
  await expect(page.getByText(/Japan • Threshold:/)).toBeVisible();

  await page.getByRole('button', { name: 'Close' }).last().click();
  await expect(page.getByText('Alerts & Updates')).not.toBeVisible();
});
