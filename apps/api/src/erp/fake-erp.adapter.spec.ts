import { describe, expect, it } from 'vitest';
import { FakeErpAdapter } from './fake-erp.adapter';

describe('FakeErpAdapter', () => {
  it('acepta credenciales válidas y devuelve el socio', async () => {
    const erp = new FakeErpAdapter();
    const member = await erp.validateCredentials('maria.lopez', 'gym-1234');
    expect(member).toMatchObject({ externalId: 'M-10482', status: 'active' });
  });

  it('rechaza contraseña incorrecta o usuario inexistente con el mismo resultado', async () => {
    const erp = new FakeErpAdapter();
    expect(await erp.validateCredentials('maria.lopez', 'mal')).toBeNull();
    expect(await erp.validateCredentials('no.existe', 'gym-1234')).toBeNull();
  });

  it('refleja el cambio de estado de un socio', async () => {
    const erp = new FakeErpAdapter();
    erp.setStatus('M-10482', 'suspended', new Date('2026-10-08T00:00:00Z'));
    const member = await erp.getMember('M-10482');
    expect(member?.status).toBe('suspended');
  });

  it('lista solo socios modificados después de la fecha indicada', async () => {
    const erp = new FakeErpAdapter();
    const page = await erp.listUpdatedSince(new Date('2026-10-06T00:00:00Z'));
    expect(page.items.map((m) => m.externalId).sort()).toEqual(['M-10482', 'M-10517']);
  });
});
