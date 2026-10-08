import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ApiError } from '../common/api-error';
import { loadConfig } from '../config';

export const MAX_SIGNATURE_SKEW_SECONDS = 300;

/** Firma esperada: HMAC-SHA256(secreto, timestamp + "." + cuerpo crudo), en hexadecimal. */
export function signErpPayload(secret: string, timestamp: number, rawBody: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

/** Verifica que el webhook viene del ERP: firma correcta y timestamp reciente. */
@Injectable()
export class ErpSignatureGuard implements CanActivate {
  private readonly secret = loadConfig().erpWebhookSecret;

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      rawBody?: string | Buffer;
    }>();
    const timestamp = Number(req.headers['x-erp-timestamp']);
    const received = req.headers['x-erp-signature'] ?? '';

    if (!this.secret) {
      throw new ApiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'WEBHOOK_NOT_CONFIGURED',
        'La integración con el ERP no está configurada',
      );
    }
    if (
      !Number.isFinite(timestamp) ||
      Math.abs(Date.now() / 1000 - timestamp) > MAX_SIGNATURE_SKEW_SECONDS
    ) {
      throw new ApiError(
        HttpStatus.UNAUTHORIZED,
        'STALE_SIGNATURE',
        'La firma del ERP está vencida',
      );
    }

    const body = req.rawBody ? req.rawBody.toString() : '';
    const expected = signErpPayload(this.secret, timestamp, body);
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'INVALID_SIGNATURE', 'Firma no válida');
    }
    return true;
  }
}
