import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  role: string;
  branchId: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * Injects the authenticated user (populated by JwtStrategy) into a handler param.
 * Optionally extracts a single property: @CurrentUser('id').
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUser = request.user;
    return data ? user?.[data] : user;
  },
);
