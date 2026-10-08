import { describe, expect, it, vi } from 'vitest';
import { ErpUnavailableError, GymErpAdapter } from './gymerp.adapter';

function json(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const member = {
  id: 'M-10482',
  fullName: 'María López',
  username: 'maria.lopez',
  status: 'active',
  updatedAt: '2026-10-06T18:22:10Z',
};

describe('GymErpAdapter', () => {
  it('valida credenciales y envía la API key', async () => {
    const fetchImpl = vi.fn(async () => json(200, { valid: true, member }));
    const erp = new GymErpAdapter(
      'https://erp.test/api/v1',
      'key-1',
      fetchImpl as unknown as typeof fetch,
    );

    const result = await erp.validateCredentials('maria.lopez', 'gym-1234');

    expect(result).toMatchObject({ externalId: 'M-10482', status: 'active' });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://erp.test/api/v1/auth/validate');
    expect((init.headers as Record<string, string>)['X-Api-Key']).toBe('key-1');
  });

  it('devuelve null cuando las credenciales no son válidas', async () => {
    const erp = new GymErpAdapter('https://erp.test/api/v1', 'k', (async () =>
      json(200, { valid: false })) as unknown as typeof fetch);
    expect(await erp.validateCredentials('x', 'y')).toBeNull();
  });

  it('devuelve null para un socio que no existe (404)', async () => {
    const erp = new GymErpAdapter('https://erp.test/api/v1', 'k', (async () =>
      json(404, {})) as unknown as typeof fetch);
    expect(await erp.getMember('M-0')).toBeNull();
  });

  it('recorre todas las páginas al sincronizar', async () => {
    const pages = [
      json(200, { items: [member], nextCursor: 'p2' }),
      json(200, { items: [{ ...member, id: 'M-2', username: 'otro' }] }),
    ];
    const fetchImpl = vi.fn(async () => pages.shift()!);
    const erp = new GymErpAdapter(
      'https://erp.test/api/v1',
      'k',
      fetchImpl as unknown as typeof fetch,
    );

    const first = await erp.listUpdatedSince(new Date('2026-10-01T00:00:00Z'));
    const second = await erp.listUpdatedSince(new Date('2026-10-01T00:00:00Z'), first.nextCursor);

    expect(first.items).toHaveLength(1);
    expect(second.items[0]?.externalId).toBe('M-2');
    expect(String((fetchImpl.mock.calls[1] as unknown as [string])[0])).toContain('cursor=p2');
  });

  it('falla de forma explícita si el ERP responde con error', async () => {
    const erp = new GymErpAdapter('https://erp.test/api/v1', 'k', (async () =>
      json(500, {})) as unknown as typeof fetch);
    await expect(erp.getMember('M-1')).rejects.toBeInstanceOf(ErpUnavailableError);
  });

  it('no guarda respuestas fuera del contrato', async () => {
    const erp = new GymErpAdapter('https://erp.test/api/v1', 'k', (async () =>
      json(200, { valid: true, member: { id: 'M-1', status: 'vip' } })) as unknown as typeof fetch);
    await expect(erp.validateCredentials('x', 'y')).rejects.toThrow('fuera del contrato');
  });

  it('falla si no hay conexión', async () => {
    const erp = new GymErpAdapter('https://erp.test/api/v1', 'k', (async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch);
    await expect(erp.getMember('M-1')).rejects.toBeInstanceOf(ErpUnavailableError);
  });
});
