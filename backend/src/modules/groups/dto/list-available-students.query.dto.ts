import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/**
 * Query for GET /groups/:id/available-students — the pool of students that can
 * still be enrolled into the group. Extends the shared pagination DTO.
 *
 * `search` matches student first/last name or phone (case-insensitive, contains).
 * NOTE: this list is intentionally NOT filtered by the group's branch — a
 * student may be enrolled into a group in any branch. The only exclusion is
 * students who already hold an ACTIVE membership (`leftAt = null`) in this group.
 */
export class ListAvailableStudentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
