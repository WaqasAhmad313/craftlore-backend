import { db } from "../../config/db.ts";

/* =========================
   Interfaces
========================= */

export interface User {
  id: string;
  name: string;
  email?: string;
  password_hash?: string | null;
  google_id?: string | null;
  email_verified: boolean;
  role: "user" | "admin";
  created_at: Date;
  updated_at: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export interface EmailVerificationCode {
  id: string;
  user_id: string;
  code_hash: string;
  expires_at: Date;
  created_at: Date;
}

/* =========================
   User Model
========================= */

export class UserModel {
  static async findById(id: string): Promise<User | null> {
    const result = await db.query(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await db.query(
      `SELECT * FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    return result.rows[0] ?? null;
  }

  static async findByGoogleId(googleId: string): Promise<User | null> {
    const result = await db.query(
      `SELECT * FROM users WHERE google_id = $1 LIMIT 1`,
      [googleId]
    );
    return result.rows[0] ?? null;
  }

  static async create(data: {
    name: string;
    email?: string | null;
    password_hash?: string | null;
    google_id?: string | null;
    email_verified: boolean;
    role?: "user" | "admin";
  }): Promise<User> {
    const result = await db.query(
      `INSERT INTO users
       (name, email, password_hash, google_id, email_verified, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.name,
        data.email ?? null,
        data.password_hash ?? null,
        data.google_id ?? null,
        data.email_verified,
        data.role ?? "user",
      ]
    );
    return result.rows[0];
  }

  static async update(
    id: string,
    data: Partial<{
      name: string;
      email?: string;
      password_hash?: string | null;
      google_id?: string | null;
      email_verified?: boolean;
      role?: "user" | "admin";
    }>
  ): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    for (const key in data) {
      fields.push(`${key} = $${index}`);
      values.push((data as any)[key]);
      index++;
    }

    if (!fields.length) return this.findById(id);

    values.push(id);

    const result = await db.query(
      `UPDATE users
       SET ${fields.join(", ")}, updated_at = now()
       WHERE id = $${index}
       RETURNING *`,
      values
    );

    return result.rows[0] ?? null;
  }
}

/* =========================
   Refresh Token Model
========================= */

export class RefreshTokenModel {
  static async create(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<RefreshToken> {
    const result = await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, token, expiresAt]
    );
    return result.rows[0];
  }

  static async find(token: string): Promise<RefreshToken | null> {
    const result = await db.query(
      `SELECT * FROM refresh_tokens WHERE token = $1 LIMIT 1`,
      [token]
    );
    return result.rows[0] ?? null;
  }

  static async delete(token: string): Promise<void> {
    await db.query(`DELETE FROM refresh_tokens WHERE token = $1`, [token]);
  }

  static async deleteByUser(userId: string): Promise<void> {
    await db.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
  }
}

/* =========================
   Email Verification Model
========================= */

export class EmailVerificationModel {
  static async create(
    userId: string,
    codeHash: string,
    expiresAt: Date
  ): Promise<EmailVerificationCode> {
    const result = await db.query(
      `INSERT INTO email_verification_codes
       (user_id, code_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, codeHash, expiresAt]
    );
    return result.rows[0];
  }

  static async findLatest(
    userId: string
  ): Promise<EmailVerificationCode | null> {
    const result = await db.query(
      `SELECT *
       FROM email_verification_codes
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] ?? null;
  }

  static async deleteByUser(userId: string): Promise<void> {
    await db.query(
      `DELETE FROM email_verification_codes WHERE user_id = $1`,
      [userId]
    );
  }
}
