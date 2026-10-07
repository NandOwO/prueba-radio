import { HttpException, HttpStatus } from '@nestjs/common';

/** Formato único de error de la API: { code, message, details? }. */
export class ApiError extends HttpException {
  constructor(status: HttpStatus, code: string, message: string, details?: unknown) {
    super({ code, message, details }, status);
  }
}
