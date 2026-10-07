import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { setAccessToken } from '../api/client';

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Pantalla de login', () => {
  beforeEach(() => {
    setAccessToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra el error del ERP cuando las credenciales no son válidas', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/auth/refresh') return jsonResponse(401, { code: 'SESSION_EXPIRED' });
      if (url === '/auth/login') return jsonResponse(401, { code: 'INVALID_CREDENTIALS' });
      throw new Error(`URL inesperada ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await userEvent.type(await screen.findByLabelText('Usuario'), 'maria.lopez');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mal');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos.');
  });

  it('entra y muestra el saludo con el nombre del socio', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/auth/refresh') return jsonResponse(401, { code: 'SESSION_EXPIRED' });
      if (url === '/auth/login') {
        return jsonResponse(200, {
          accessToken: 'token',
          user: {
            id: '1',
            externalId: 'M-10482',
            name: 'María López',
            username: 'maria.lopez',
            role: 'member',
          },
        });
      }
      throw new Error(`URL inesperada ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await userEvent.type(await screen.findByLabelText('Usuario'), 'maria.lopez');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'gym-1234');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(screen.getByText('Hola, María López')).toBeInTheDocument());
  });
});
