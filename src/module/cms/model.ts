import { db } from "../../config/db.ts";

export type PublishStatus = "draft" | "published";

export interface ContentPage {
  id: string;
  path: string;
  slug: string | null;
  locale: string;
  status: PublishStatus;
  published_at: string | null;
  meta: Record<string, unknown>;
  sections: unknown[];
  created_at: string;
}

/** Lighter payload for frontend "meta only" */
export interface ContentPageMeta {
  id: string;
  path: string;
  slug: string | null;
  locale: string;
  status: PublishStatus;
  published_at: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface CreatePageInput {
  path: string;
  slug?: string | null;
  locale?: string;
  status?: PublishStatus;
  meta?: Record<string, unknown>;
  sections?: unknown[];
  published_at?: string | null;
}

export interface UpdatePageInput {
  path?: string;
  slug?: string | null;
  locale?: string;
  status?: PublishStatus;
  meta?: Record<string, unknown>;
  sections?: unknown[];
  published_at?: string | null;
}

function buildUpdateQuery<T extends object>(
  table: string,
  idColumn: string,
  idValue: string,
  patch: Partial<T>,
  jsonbColumns: Set<keyof T & string>
): { sql: string; values: unknown[] } {
  const patchRecord = patch as unknown as Record<string, unknown>;
  const keys = Object.keys(patchRecord).filter((k) => patchRecord[k] !== undefined);

  if (keys.length === 0) throw new Error("No fields provided to update.");

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const key of keys) {
    const value = patchRecord[key];

    if (jsonbColumns.has(key as keyof T & string)) {
      sets.push(`${key} = $${idx}::jsonb`);
      values.push(JSON.stringify(value));
    } else {
      sets.push(`${key} = $${idx}`);
      values.push(value);
    }
    idx += 1;
  }

  values.push(idValue);

  return {
    sql: `
      UPDATE ${table}
      SET ${sets.join(", ")}
      WHERE ${idColumn} = $${idx}
      RETURNING *
    `,
    values,
  };
}

class ContentModel {
  /* ===================== WRITE / DASHBOARD ===================== */

  static async createPage(payload: CreatePageInput): Promise<ContentPage> {
    const query = `
      INSERT INTO content.content_pages (
        path, slug, locale, status, published_at, meta, sections
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
      RETURNING *
    `;

    const values = [
      payload.path,
      payload.slug ?? null,
      payload.locale ?? "en",
      payload.status ?? "draft",
      payload.published_at ?? null,
      JSON.stringify(payload.meta ?? {}),
      JSON.stringify(payload.sections ?? []),
    ];

    const result = await db.query<ContentPage>(query, values);
    return result.rows[0]!;
  }

  static async getPageById(id: string): Promise<ContentPage | null> {
    const result = await db.query<ContentPage>(
      `SELECT * FROM content.content_pages WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  static async listPages(filters?: {
    locale?: string;
    status?: PublishStatus;
  }): Promise<ContentPage[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.locale) {
      clauses.push(`locale = $${idx}`);
      values.push(filters.locale);
      idx += 1;
    }
    if (filters?.status) {
      clauses.push(`status = $${idx}`);
      values.push(filters.status);
      idx += 1;
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await db.query<ContentPage>(
      `SELECT * FROM content.content_pages ${where} ORDER BY created_at DESC`,
      values
    );
    return result.rows;
  }

  static async updatePage(id: string, patch: UpdatePageInput): Promise<ContentPage> {
    const { sql, values } = buildUpdateQuery<UpdatePageInput>(
      "content.content_pages",
      "id",
      id,
      patch,
      new Set<keyof UpdatePageInput & string>(["meta", "sections"])
    );

    const result = await db.query<ContentPage>(sql, values);
    return result.rows[0]!;
  }

  static async deletePage(id: string): Promise<void> {
    await db.query(`DELETE FROM content.content_pages WHERE id = $1`, [id]);
  }

  /* ===================== FRONTEND READS (PATH-BASED) ===================== */

  static async getPageMetaByPath(path: string, locale: string): Promise<ContentPageMeta | null> {
    const result = await db.query<ContentPageMeta>(
      `
      SELECT id, path, slug, locale, status, published_at, meta, created_at
      FROM content.content_pages
      WHERE path = $1 AND locale = $2
      LIMIT 1
      `,
      [path, locale]
    );
    return result.rows[0] ?? null;
  }

  static async getPageSectionsByPath(path: string, locale: string): Promise<unknown[] | null> {
    const result = await db.query<{ sections: unknown[] }>(
      `
      SELECT sections
      FROM content.content_pages
      WHERE path = $1 AND locale = $2
      LIMIT 1
      `,
      [path, locale]
    );
    return result.rows[0]?.sections ?? null;
  }

  static async getPageSectionById(
    path: string,
    locale: string,
    sectionId: string
  ): Promise<Record<string, unknown> | null> {
    const result = await db.query<{ section: Record<string, unknown> | null }>(
      `
      SELECT elem AS section
      FROM content.content_pages p
      CROSS JOIN LATERAL jsonb_array_elements(p.sections::jsonb) elem
      WHERE p.path = $1
        AND p.locale = $2
        AND elem->>'id' = $3
      LIMIT 1
      `,
      [path, locale, sectionId]
    );

    return result.rows[0]?.section ?? null;
  }

  static async getPageSectionsByType(
    path: string,
    locale: string,
    type: string
  ): Promise<unknown[] | null> {
    const result = await db.query<{ sections: unknown[] | null }>(
      `
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) AS sections
      FROM content.content_pages p
      CROSS JOIN LATERAL jsonb_array_elements(p.sections::jsonb) elem
      WHERE p.path = $1
        AND p.locale = $2
        AND elem->>'type' = $3
      `,
      [path, locale, type]
    );

    return result.rows[0]?.sections ?? null;
  }
}

export default ContentModel;
