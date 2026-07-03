import { Module } from '@nestjs/common';
import { JournalService } from './journal.service';
import { JournalController } from './journal.controller';
import { StudentSelfService } from './me/student-self.service';
import { StudentSelfController } from './me/student-self.controller';
import { TeacherSelfService } from './me/teacher-self.service';
import { TeacherSelfController } from './me/teacher-self.controller';

/**
 * Journal module: grades / attendance / remarks + group matrix, plus the
 * student and teacher self ("/me") endpoints. PrismaService is provided
 * globally via PrismaModule (imported in app.module).
 */
@Module({
  controllers: [
    JournalController,
    StudentSelfController,
    TeacherSelfController,
  ],
  providers: [JournalService, StudentSelfService, TeacherSelfService],
  exports: [JournalService, StudentSelfService, TeacherSelfService],
})
export class JournalModule {}
