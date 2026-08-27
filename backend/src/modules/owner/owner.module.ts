import { Module } from '@nestjs/common';
import { OwnerController } from './owner.controller';
import { OwnerService } from './owner.service';

/**
 * SaaS owner panel: client academies, subscriptions, sales ledger.
 * SubscriptionGuard is available app-wide (registered as a provider in
 * AppModule with useExisting), so OwnerService can invalidate its cache.
 */
@Module({
  controllers: [OwnerController],
  providers: [OwnerService],
})
export class OwnerModule {}
