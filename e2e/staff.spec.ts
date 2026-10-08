import { expect, test } from '@playwright/test';
import { resetDatabase } from './helpers';
import { loginUi, requestSong } from './session';

test.beforeEach(() => {
  resetDatabase();
});

test('el staff ve quién pidió cada canción y puede saltarla', async ({ page, request }) => {
  await requestSong(request, 'maria.lopez', 'e2e-trk-1');
  await requestSong(request, 'ana.ruiz', 'e2e-trk-2');

  await loginUi(page, 'ana.ruiz');
  await page.goto('/panel');
  await expect(page.getByText(/pedida por María López/)).toBeVisible();

  await page.getByRole('button', { name: 'Saltar' }).click();

  // El socio ve que ahora suena la siguiente canción
  await page.context().clearCookies();
  await loginUi(page, 'maria.lopez');
  await page.goto('/cola');
  await expect(page.getByText('Bohemian Rhapsody').first()).toBeVisible();
});

test('un socio normal no puede abrir el panel de staff', async ({ page }) => {
  await loginUi(page, 'maria.lopez');
  await page.goto('/panel');
  await expect(page).toHaveURL(/\/$/);
});
