import { Module } from '@nestjs/common';
import { CourseTypesService } from './course-types.service';
import { CourseTypesController } from './course-types.controller';

@Module({
  controllers: [CourseTypesController],
  providers: [CourseTypesService],
  exports: [CourseTypesService],
})
export class CourseTypesModule {}
