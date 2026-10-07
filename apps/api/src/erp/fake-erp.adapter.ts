import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Member, MemberPage, MemberProvider, MemberStatus } from '@pulsofm/shared';

interface FixtureMember {
  id: string;
  username: string;
  password: string;
  fullName: string;
  status: MemberStatus;
  updatedAt: string;
}

/**
 * ERP ficticio para desarrollo y pruebas. Lee socios desde un JSON.
 * Las contraseñas están en texto plano porque son datos de prueba.
 */
export class FakeErpAdapter implements MemberProvider {
  private readonly members: FixtureMember[];

  constructor(members: FixtureMember[] = FakeErpAdapter.loadDefault()) {
    this.members = members.map((m) => ({ ...m }));
  }

  static loadDefault(): FixtureMember[] {
    const file = join(__dirname, '..', '..', 'fixtures', 'erp-members.json');
    return (JSON.parse(readFileSync(file, 'utf8')) as { members: FixtureMember[] }).members;
  }

  async validateCredentials(username: string, password: string): Promise<Member | null> {
    const found = this.members.find((m) => m.username === username);
    if (!found || found.password !== password) return null;
    return this.toMember(found);
  }

  async getMember(externalId: string): Promise<Member | null> {
    const found = this.members.find((m) => m.id === externalId);
    return found ? this.toMember(found) : null;
  }

  async listUpdatedSince(since: Date): Promise<MemberPage> {
    const items = this.members
      .filter((m) => new Date(m.updatedAt) > since)
      .map((m) => this.toMember(m));
    return { items };
  }

  /** Solo para pruebas: simula que el ERP cambia el estado de un socio. */
  setStatus(externalId: string, status: MemberStatus, updatedAt = new Date()): void {
    const found = this.members.find((m) => m.id === externalId);
    if (!found) throw new Error(`Socio ${externalId} no existe en el ERP ficticio`);
    found.status = status;
    found.updatedAt = updatedAt.toISOString();
  }

  private toMember(m: FixtureMember): Member {
    return {
      externalId: m.id,
      fullName: m.fullName,
      username: m.username,
      status: m.status,
      updatedAt: new Date(m.updatedAt),
    };
  }
}
