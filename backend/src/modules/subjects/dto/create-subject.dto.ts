import { IsNotEmpty, IsString } from 'class-validator';

/** Body for creating a Subject (§2). `name` is unique → 409 on duplicate. */
export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
