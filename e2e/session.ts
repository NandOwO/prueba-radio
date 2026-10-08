import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function loginUi(page: Page, username: string, password = 'gym-1234'): Promise<void> {
  await page.goto('/login');
  await page.fill('input[name=username]', username);
  await page.fill('input[name=password]', password);
  await page.click('button[type=submit]');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/** Pide una canción por API, para preparar el estado sin recorrer la interfaz. */
export async function requestSong(api: APIRequestContext, username: string, trackId: string) {
  const login = await api.post('/auth/login', { data: { username, password: 'gym-1234' } });
  const { accessToken } = await login.json();
  const res = await api.post('/requests', {
    data: { trackId },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.status();
}
