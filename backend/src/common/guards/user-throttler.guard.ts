import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

interface TrackedRequest {
  user?: { id?: string };
  ip?: string;
  ips?: string[];
}

/**
 * Rate-limit key: the authenticated USER, falling back to IP for anonymous
 * requests.
 *
 * Why: every staff member of one academy typically sits behind a single office
 * router, so a plain per-IP budget is shared by the whole team — five people
 * working normally would throttle each other (proven under load: 100 users on
 * one egress IP produced thousands of 429s while latency stayed at ~150ms).
 * Anonymous traffic (login, webhooks) still tracks by IP, which is what the
 * strict 5/min credential throttle in AuthController relies on.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: TrackedRequest): Promise<string> {
    const userId = req?.user?.id;
    if (userId) return `user:${userId}`;
    const ip = req?.ips?.length ? req.ips[0] : req?.ip;
    return `ip:${ip ?? 'unknown'}`;
  }
}
