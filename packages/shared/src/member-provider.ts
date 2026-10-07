import type { MemberStatus } from './index';

/** Socio tal como lo devuelve el ERP. El ERP es la fuente de verdad de identidad y estado. */
export interface Member {
  externalId: string;
  fullName: string;
  username: string;
  status: MemberStatus;
  updatedAt: Date;
}

export interface MemberPage {
  items: Member[];
  nextCursor?: string;
}

/** Contrato que cumple cualquier adaptador de ERP (ver docs/erp-integration.md). */
export interface MemberProvider {
  /** Devuelve el socio si usuario y contraseña son válidos; null en caso contrario. */
  validateCredentials(username: string, password: string): Promise<Member | null>;
  getMember(externalId: string): Promise<Member | null>;
  listUpdatedSince(since: Date, cursor?: string): Promise<MemberPage>;
}
