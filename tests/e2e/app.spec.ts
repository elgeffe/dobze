import { expect, test } from '@playwright/test';

test('onboards, reviews, and persists progress', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('What are you')).toBeVisible();
  await page.getByRole('button', { name: /Polski Polish/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Start first review' }).click();
  await expect(page.getByText(/Review · 1 of 20/)).toBeVisible();
  await page.getByRole('button', { name: /Show answer/ }).click();
  await page.getByRole('button', { name: /Easy/ }).click();
  await expect(page.getByText(/Review · 2 of 20/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Review · 1 of 20/)).toBeVisible();
});

test('changes language from home without resetting progress and exits settings clearly', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('dobze.v1', JSON.stringify({
      settings: { language: 'pl', homeLanguage: 'en', onboarded: true, theme: 'light' },
      words: { 'pl:1': { state: 'known', fsrs: { s: 1, d: 5, reps: 1, lapses: 0, lastReviewAt: 1, dueAt: 2 } } },
    }));
  });
  await page.goto('/#/hub');
  await page.getByRole('button', { name: /Learning language/ }).click();
  await expect(page.getByRole('button', { name: /English English/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Nederlands Dutch/ }).click();
  await expect(page.getByText('Learning Nederlands · Dutch')).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dobze.v1')!).words['pl:1'].state)).toBe('known');

  await page.goto('/#/settings');
  await expect(page.getByRole('link', { name: 'Exit settings and return home' })).toBeVisible();
  await page.getByRole('link', { name: 'Exit settings and return home' }).click();
  await expect(page.getByText('Make the words stick.')).toBeVisible();
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

/** Everything the build ships, as the worker's install step should have stored it. */
async function cachedUrls(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const name = (await caches.keys()).find((key) => key.startsWith('dobze-app-'));
    if (!name) return [];
    const requests = await (await caches.open(name)).keys();
    return requests.map((request) => new URL(request.url).pathname);
  });
}

test('installs the whole app for offline use and runs the full journey with the network cut', async ({ page, context }, testInfo) => {
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

  // The precache is only useful if it holds the shell, the styles, and every
  // script chunk — a missing chunk is a blank screen on the first flight.
  await expect.poll(() => cachedUrls(page)).toEqual(
    expect.arrayContaining([expect.stringMatching(/index\.html$/), expect.stringMatching(/\.css$/)]),
  );
  const scripts = (await cachedUrls(page)).filter((path) => path.endsWith('.js'));
  expect(scripts.length).toBeGreaterThanOrEqual(5);

  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByText('Make the words stick.')).toBeVisible();
    await expect(page.getByText('Learning Polski · Polish')).toBeVisible();

    // A whole review card, rated, with the offline corpus behind it.
    await page.getByRole('link', { name: /Start review/ }).click();
    await expect(page.getByText(/Review · 1 of 20/)).toBeVisible();
    await page.getByRole('button', { name: /Show answer/ }).click();
    await page.getByRole('button', { name: /Good/ }).click();
    await expect(page.getByText(/Review · 2 of 20/)).toBeVisible();

    // Browsing and the settings screen, still with no network.
    await page.goto('/#/list');
    await page.getByRole('button', { name: /001/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.goto('/#/settings');
    await expect(page.getByText('Offline install')).toBeVisible();
    await expect(page.getByText('Ready')).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test('keeps content clear of the Dynamic Island and the home indicator', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Geometry only needs checking once');
  await page.addInitScript(() => {
    localStorage.setItem('dobze.v1', JSON.stringify({
      settings: { language: 'pl', homeLanguage: 'en', onboarded: true, theme: 'light' },
      words: {},
    }));
  });
  // Playwright cannot emulate safe-area insets, so drive the same custom
  // properties the insets feed and assert the layout responds.
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/#/hub');
  await page.addStyleTag({
    content: ':root { --safe-top: 59px; --safe-bottom: 34px; --safe-left: 0px; --safe-right: 0px; }',
  });

  // Fixed elements need viewport coordinates, which only the page can give.
  const rect = (selector: string) => page.evaluate((target) => {
    const { top, bottom, left, width, height } = document.querySelector(target)!.getBoundingClientRect();
    return { top, bottom, left, width, height, viewport: window.innerHeight };
  }, selector);

  const islandBottom = 59;
  expect((await rect('.masthead')).top).toBeGreaterThanOrEqual(islandBottom);
  expect((await rect('.status-bar-backdrop')).height).toBe(islandBottom);

  // The tab bar has to float above the home indicator, not under it.
  const tabbar = await rect('.tabbar');
  expect(tabbar.bottom).toBeLessThanOrEqual(tabbar.viewport - 34);
  expect(tabbar.height).toBeGreaterThanOrEqual(44);

  // Each tab needs a finger-sized target even though its label is small, so a
  // tap anywhere in the bar's height has to land on the tab, not the bar.
  const tab = await rect('.tabbar > a:nth-child(2)');
  const hitAt = (y: number) => page.evaluate(({ x, y: pointY }) => {
    const element = document.elementFromPoint(x, pointY);
    return element?.closest('.tabbar > a')?.textContent?.trim() ?? null;
  }, { x: tab.left + tab.width / 2, y });

  expect(await hitAt(tabbar.top + 3)).toBe('Review');
  expect(await hitAt(tabbar.bottom - 3)).toBe('Review');
});
