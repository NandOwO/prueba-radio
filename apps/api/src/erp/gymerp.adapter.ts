import type { Member, MemberPage, MemberProvider, MemberStatus } from '@pulsofm/shared';
import { z } from 'zod';

/** Error al hablar con el ERP: timeout, caída o respuesta fuera del contrato. */
export class ErpUnavailableError extends Error {
  constructor(reason: string) {
    super(`ERP_UNAVAILABLE: ${reason}`);
  }
}

const erpMemberSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1),
  username: z.string().min(1).optional(),
  status: z.enum(['active', 'suspended', 'inactive']),
  updatedAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
});

const validateSchema = z.union([
  z.object({ valid: z.literal(false) }),
  z.object({ valid: z.literal(true), member: erpMemberSchema }),
]);

const pageSchema = z.object({
  items: z.array(erpMemberSchema),
  nextCursor: z.string().optional(),
});

/**
 * Adaptador del contrato de docs/erp-integration.md (GymERP).
 * Valida cada respuesta: si el ERP cambia de forma, falla en lugar de guardar datos mal formados.
 */
export class GymErpAdapter implements MemberProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async validateCredentials(username: string, password: string): Promise<Member | null> {
    const body = await this.request('/auth/validate', validateSchema, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    return body.valid ? this.toMember(body.member) : null;
  }

  async getMember(externalId: string): Promise<Member | null> {
    const body = await this.request(
      `/members/${encodeURIComponent(externalId)}`,
      erpMemberSchema.nullable(),
      {},
      [404],
    );
    return body ? this.toMember(body) : null;
  }

  async listUpdatedSince(since: Date, cursor?: string): Promise<MemberPage> {
    const qs = new URLSearchParams({ updatedSince: since.toISOString(), limit: '200' });
    if (cursor) qs.set('cursor', cursor);
    const body = await this.request(`/members?${qs}`, pageSchema);
    return {
      items: body.items.map((m) => this.toMember(m)),
      nextCursor: body.nextCursor,
    };
  }

  private async request<T extends z.ZodTypeAny>(
    path: string,
    schema: T,
    init: RequestInit = {},
    allowedStatuses: number[] = [],
  ): Promise<z.infer<T>> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.apiKey },
        signal: AbortSignal.timeout(5000),
      });
    } catch (err) {
      throw new ErpUnavailableError(err instanceof Error ? err.message : 'sin conexión');
    }
    if (allowedStatuses.includes(res.status)) return null;
    if (!res.ok) throw new ErpUnavailableError(`HTTP ${res.status}`);

    const parsed = schema.safeParse(await res.json().catch(() => undefined));
    if (!parsed.success) throw new ErpUnavailableError('respuesta fuera del contrato');
    return parsed.data;
  }

  private toMember(m: z.infer<typeof erpMemberSchema>): Member {
    return {
      externalId: m.id,
      fullName: m.fullName,
      username: m.username ?? m.id,
      status: m.status as MemberStatus,
      updatedAt: new Date(m.updatedAt),
    };
  }
}
