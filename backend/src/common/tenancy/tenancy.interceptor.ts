import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Role } from '../enums/role.enum';
import { enterTenancy } from './tenancy.context';

interface AuthedRequest {
  user?: { role?: Role; academyId?: string | null };
}

/**
 * Binds the authenticated user's academy to the async context for the rest of
 * the request, so the Prisma tenancy middleware can scope every query without
 * any per-service wiring. Runs after guards (so req.user is populated).
 *
 * OWNER gets bypass (the owner panel aggregates across academies). Requests
 * without a user (public routes) get bypass too — they don't touch tenant data.
 */
@Injectable()
export class TenancyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const user = req?.user;
    if (user?.role === Role.OWNER || !user?.academyId) {
      enterTenancy({ bypass: true });
    } else {
      enterTenancy({ academyId: user.academyId });
    }
    return next.handle();
  }
}
