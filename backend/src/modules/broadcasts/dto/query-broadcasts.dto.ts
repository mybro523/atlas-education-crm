import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/**
 * Query for GET /broadcasts — the shared pagination (page / pageSize) is enough;
 * this alias exists so the contract and validation stay explicit for this route.
 */
export class QueryBroadcastsDto extends PaginationQueryDto {}
