import { expect, test } from '@playwright/test';
import { resetDatabase } from './helpers';
import { loginUi } from './session';

test.beforeEach(() => {
  resetDatabase();
});

test('la pantalla del gimnasio ofrece iniciar la radio', async ({ page }) => {
  await loginUi(page, 'pantalla.gym', 'gym-display');
  await page.goto('/display');
  await expect(page.getByRole('button', { name: 'Iniciar radio' })).toBeVisible();
});

test('la app se puede instalar como PWA con su manifest e iconos', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('link[rel=manifest]')).toHaveAttribute('href', /manifest\.webmanifest/);
  const manifest = await page.evaluate(async () => {
    const res = await fetch('/manifest.webmanifest');
    return res.json();
  });
  expect(manifest).toMatchObject({ name: 'PulsoFM', display: 'standalone' });
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

  const registered = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return Boolean(reg.active);
  });
  expect(registered).toBe(true);
});
