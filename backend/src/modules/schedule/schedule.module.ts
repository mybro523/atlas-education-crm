import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { ScheduleRoomsController } from './schedule-rooms.controller';

@Module({
  controllers: [ScheduleController, ScheduleRoomsController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
