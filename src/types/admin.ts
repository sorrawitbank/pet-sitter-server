import { GetOwnersQuery } from "./owner";
import { GetSittersQuery, SitterStatus } from "./sitter";
import { UserStatus } from "./user";

export interface AdminGetOwnersQuery extends GetOwnersQuery {
  status?: UserStatus;
}

export interface AdminGetSittersQuery extends GetSittersQuery {
  status?: SitterStatus | Extract<UserStatus, "Banned">;
  hasPendingUpdate?: string;
}

export interface RejectUpdateSitterBody {
  adminNote: string;
}
