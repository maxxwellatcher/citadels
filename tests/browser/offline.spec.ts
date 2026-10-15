import { test, expect, type Page } from '@playwright/test';
import jsQR from 'jsqr';

async function setup(page: Page, name: string) {
  await page.goto('/');
  await page.locator('[data-action="mode-online"]').click();
  await page.locator('[data-online="name"]').fill(name);
}
async function exchange(host: Page, guest: Page, reconnect = false) {
  await host.locator('[data-action="online-invite"]').click();
  await expect(host.locator('.pairing-dialog')).toBeVisible();
  const offer = await host.locator('.pair-output').inputValue();
  expect(offer).toMatch(/^CT1\./);
  // Decode the actual rendered QR, so the optical payload is tested too.
  await expect(host.locator('.pair-qr')).toBeVisible();
  await host.screenshot({ path: 'test-results/pairing-mobile.png' });
  const qr = await host.locator('.pair-qr').evaluate((canvas: HTMLCanvasElement) => {
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
    return { data: Array.from(pixels.data), width: canvas.width, height: canvas.height };
  });
  expect(jsQR(new Uint8ClampedArray(qr.data), qr.width, qr.height)?.data).toBe(offer);
  await guest.locator(`[data-action="${reconnect ? 'online-reconnect' : 'online-join'}"]`).click();
  await guest.locator('.pair-input').fill(offer);
  await guest.locator('.pair-submit').click();
  await expect(guest.locator('.pair-output')).toHaveValue(/^CT1\./);
  await host.locator('.pair-input').fill(await guest.locator('.pair-output').inputValue());
  await host.locator('.pair-submit').click();
  await expect(host.locator('.pairing-dialog')).not.toBeVisible();
  await expect(guest.locator('.pairing-dialog')).not.toBeVisible();
  await expect(guest.locator('.connection-chip')).toContainText('已连接');
}

test('two independent browsers pair without any backend, start and resume after host refresh', async ({ browser }) => {
  const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
  const a = await browser.newContext(mobile), b = await browser.newContext(mobile);
  const host = await a.newPage(), guest = await b.newPage();
  const errors: string[] = [];
  const requests: string[] = [];
  for (const page of [host, guest]) {
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(request.url()));
    page.on('websocket', socket => errors.push('Unexpected WebSocket: ' + socket.url()));
  }
  await setup(host, '房主'); await setup(guest, '玩家');
  await host.locator('[data-online="capacity"]').selectOption('2');
  await host.locator('[data-action="online-create"]').click();
  await expect(host.locator('.online-lobby')).toBeVisible();
  // Block every HTTP request after resources are loaded: pairing must work offline.
  await a.route('**/*', route => route.abort());
  await b.route('**/*', route => route.abort());
  await exchange(host, guest);
  await expect(host.locator('.lobby-seat').filter({ hasText: '玩家' })).toHaveCount(1);
  await host.locator('[data-action="online-ready"]').click();
  await guest.locator('[data-action="online-ready"]').click();
  await expect(host.locator('[data-action="online-start"]')).toBeEnabled();
  await host.locator('[data-action="online-start"]').click();
  await expect(host.locator('.game-shell')).toBeVisible();
  await expect(guest.locator('.game-shell')).toBeVisible();
  await a.unroute('**/*');
  await host.reload();
  await expect(host.locator('.game-shell')).toBeVisible();
  await expect(guest.locator('.connection-chip')).toContainText('重连中');
  // Dismiss role selection overlays to reach reconnect controls.
  await host.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(node => node.remove()));
  await guest.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(node => node.remove()));
  await exchange(host, guest, true);
  expect(errors).toEqual([]);
  expect(requests.some(url => url.includes('/online') || url.includes('googleapis'))).toBe(false);
  await a.close(); await b.close();
});

test('all static resources are precached and reopen with network offline', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await setup(page, '离线玩家');
  await expect(page.locator('.offline-status')).toContainText('离线资源已就绪');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await page.locator('[data-action="mode-online"]').click();
  await expect(page.locator('[data-action="online-create"]')).toBeVisible();
  await page.locator('[data-action="online-create"]').click();
  await expect(page.locator('.online-lobby')).toBeVisible();
  await context.close();
});
