import { db } from "../../../config/db.ts";

// Types
export interface AuthorizedUser {
  authorizedUserNo: string;
  authorizedUserName: string;
  authorizedUserAddress: string;
}

export interface UpsertAuthorizedUsersResult {
  success: boolean;
  message: string;
  totalReceived: number;
  alreadyExisted: number;
  newlyInserted: number;
  newEntries: Array<{
    id: number;
    authorizedUserNo: string;
    authorizedUserName: string;
    authorizedUserAddress: string;
  }>;
}

export interface AuthorizedUserWithCategory {
  authorizedUserName: string;
  authorizedUserAddress: string;
  category: string;
}
export class AuthorizedUserModel {
  /**
   * Upsert authorized users by calling PostgreSQL function
   */
  static async upsert(
    giApplicationNumber: number,
    authorizedUsers: AuthorizedUser[]
  ): Promise<UpsertAuthorizedUsersResult> {
    const sql = `
      SELECT upsert_authorized_users($1::integer, $2::jsonb) as result
    `;

    const values = [giApplicationNumber, JSON.stringify(authorizedUsers)];

    const result = await db.query(sql, values);

    const row = result.rows[0] as
      | { result: UpsertAuthorizedUsersResult }
      | undefined;

    if (!row) {
      throw new Error("upsert_authorized_users returned no result");
    }

    return row.result;
  }

  /**
   * Get all authorized users for a specific application number
   */
  static async getByApplicationNumber(giApplicationNumber: number) {
    const sql = `
      SELECT 
        id,
        gi_application_number,
        authorized_user_no,
        authorized_user_name,
        authorized_user_address,
        created_at,
        updated_at
      FROM authorized_users
      WHERE gi_application_number = $1::integer
      ORDER BY id
    `;

    const values = [giApplicationNumber];

    const result = await db.query(sql, values);

    return result.rows;
  }

  static async getByAuthNumber(
    searchValue: string
  ): Promise<AuthorizedUserWithCategory> {
    // Remove all spaces from search value for consistent matching
    const cleanSearchValue = searchValue.replace(/\s+/g, "");

    const sql = `
      SELECT 
        au.authorized_user_name as "authorizedUserName",
        au.authorized_user_address as "authorizedUserAddress",
        gp.category,
        gp.name as "productName"
      FROM authorized_users au
      INNER JOIN gi_products gp ON au.gi_application_number = gp.gi_application_number
      WHERE 
        REPLACE(au.authorized_user_no, ' ', '') = $1::varchar
        OR
        REPLACE(au.authorized_user_no, ' ', '') LIKE 'AU/' || $1::varchar || '/GI/%'
    `;

    const values = [cleanSearchValue];

    const result = await db.query(sql, values);

    const row = result.rows[0] as AuthorizedUserWithCategory | undefined;

    if (!row) {
      throw new Error("Authorized user not found");
    }

    return row;
  }
}
