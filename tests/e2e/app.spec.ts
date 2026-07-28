import { expect, test } from '@playwright/test';

test('onboards, reviews, and persists progress', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('What are you')).toBeVisible();
  await page.getByRole('button', { name: /English English/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /Polski Polish/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Start first review' }).click();
  await expect(page.getByText(/Review · 1 of 20/)).toBeVisible();
  await page.getByRole('button', { name: /Show answer/ }).click();
  await page.getByRole('button', { name: /Easy/ }).click();
  await expect(page.getByText(/Review · 2 of 20/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Review · 1 of 20/)).toBeVisible();
});

test('browses and updates a word state in an accessible dialog', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('dobze.v1', JSON.stringify({
      settings: { language: 'pl', homeLanguage: 'en', onboarded: true, theme: 'light' },
      words: {},
    }));
  });
  await page.goto('/#/list');
  await page.getByRole('button', { name: /001/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Known' }).click();
  await expect(dialog.getByLabel('State: known')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('reloads the app shell offline after the service worker warms the cache', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One stateful PWA smoke test is sufficient');
  await page.addInitScript(() => {
    localStorage.setItem('dobze.v1', JSON.stringify({
      settings: { language: 'pl', homeLanguage: 'en', onboarded: true, theme: 'light' },
      words: {},
    }));
  });
  await page.goto('/#/hub');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.reload();
  await expect.poll(() => page.evaluate(async () =>
    (await (await caches.open('dobze-app-v1')).keys()).length,
  )).toBeGreaterThanOrEqual(10);
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByText('Make the words stick.')).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
