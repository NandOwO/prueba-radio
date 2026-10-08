import { expect, test } from '@playwright/test';
import { resetDatabase } from './helpers';
import { loginUi, requestSong } from './session';

test.beforeEach(() => {
  resetDatabase();
});

test('pide una canción desde el móvil y la ve sonar', async ({ page }) => {
  await loginUi(page, 'maria.lopez');
  await page.getByRole('link', { name: 'Buscar canciones' }).click();

  await page.getByLabel('Canción o artista').fill('queen');
  const row = page.locator('li', { hasText: 'Don' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Pedir' }).click();

  await expect(row.getByText('#1')).toBeVisible();

  await page.goto('/mis-solicitudes');
  await expect(page.getByText('Sonando ahora')).toBeVisible();
});

test('explica el cooldown cuando el socio pide demasiado seguido', async ({ page, request }) => {
  await requestSong(request, 'maria.lopez', 'e2e-trk-2');
  await loginUi(page, 'maria.lopez');
  await page.getByRole('link', { name: 'Buscar canciones' }).click();
  await page.getByLabel('Canción o artista').fill('queen');
  await page.locator('li', { hasText: 'Don' }).getByRole('button', { name: 'Pedir' }).click();

  await expect(page.getByRole('alert')).toContainText('Espera');
});

test('guarda la canción que suena en una playlist nueva', async ({ page, request }) => {
  await requestSong(request, 'maria.lopez', 'e2e-trk-1');
  await loginUi(page, 'maria.lopez');
  await page.goto('/cola');

  await page.getByRole('button', { name: 'Guardar canción' }).click();
  await page.getByLabel('Nueva playlist').fill('Cardio');
  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.getByRole('button', { name: /Cardio/ })).toBeVisible();

  await page.goto('/biblioteca');
  await expect(page.getByRole('link', { name: /Cardio/ })).toBeVisible();
});
