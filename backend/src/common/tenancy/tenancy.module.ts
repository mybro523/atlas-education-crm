import { Global, Module } from '@nestjs/common';
import { SubscriptionGuard } from '../guards/subscription.guard';

/**
 * Global home for the SaaS cross-cutting providers. SubscriptionGuard lives
 * here (not in AppModule's provider list alone) so feature modules — e.g.
 * OwnerService, which invalidates the guard's academy cache after extend/
 * block — inject the SAME singleton the APP_GUARD registration uses.
 */
@Global()
@Module({
  providers: [SubscriptionGuard],
  exports: [SubscriptionGuard],
})
export class TenancyModule {}
