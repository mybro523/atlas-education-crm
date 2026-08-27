import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Maps known Prisma errors to proper HTTP statuses application-wide.
 *
 * Without this, any service that hits a constraint outside the few hand-mapped
 * places (students/teachers) leaked a raw 500 — e.g. a PATCH racing a DELETE
 * of the same row (P2025) surfaced as "Internal server error" in production.
 * The response body is intentionally generic: Prisma messages embed table and
 * column names, which we do not expose to clients.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let status: number;
    let message: string;
    switch (exception.code) {
      case 'P2025': // record required for the operation was not found
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        break;
      case 'P2002': // unique constraint violation
        status = HttpStatus.CONFLICT;
        message = 'Duplicate value for a unique field';
        break;
      case 'P2003': // foreign key constraint violation
        status = HttpStatus.CONFLICT;
        message = 'Operation violates a relation constraint';
        break;
      default:
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Internal server error';
        this.logger.error(
          `Unmapped Prisma error ${exception.code}: ${exception.message}`,
        );
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
    });
  }
}
