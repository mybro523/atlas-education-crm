import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Global realtime bus. Exported so PrismaService (and any service that wants to
 * push an explicit event) can inject {@link RealtimeGateway}. JwtModule is
 * registered locally for the handshake token verification.
 */
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
