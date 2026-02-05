import { db } from "../../config/db.ts";

/* ===== Shared Types ===== */

export type PublishStatus = "draft" | "published";

export interface ContentPage {
  id: string;
  path: string;
  slug: string | null;
  locale: string;
  status: PublishStatus;
  published_at: string | null;
  meta: Record<string, unknown>;
  sections: unknown[]; // structured JSON, validated in service
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

export interface ContentEntity {
  id: string;
  entity_type: string;
  key: string | null;
  locale: string;
  status: PublishStatus;
  data: Record<string, unknown>;
  created_at: string;
}

export interface CreateEntityInput {
  entity_type: string;
  key?: string | null;
  locale?: string;
  status?: PublishStatus;
  data?: Record<string, unknown>;
}

export interface UpdateEntityInput {
  entity_type?: string;
  key?: string | null;
  locale?: string;
  status?: PublishStatus;
  data?: Record<string, unknown>;
}

export interface FormSubmission {
  id: string;
  page_id: string | null;
  form_key: string;
  payload: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface CreateSubmissionInput {
  page_id?: string | null;
  form_key?: string;
  payload: Record<string, unknown>;
  ip?: string | null;
  user_agent?: string | null;
}

export interface ContentEvent {
  id: string;
  page_id: string;
  section_id: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
}

export interface CreateEventInput {
  page_id: string;
  section_id?: string | null;
  event_type: string;
  event_data?: Record<string, unknown>;
}

/**
 * Generic update builder that works with typed patch objects
 * (no index signature required).
 */
function buildUpdateQuery<T extends object>(
  table: string,
  idColumn: string,
  idValue: string,
  patch: Partial<T>,
  jsonbColumns: Set<keyof T & string>
): { sql: string; values: unknown[] } {
  const keys = (Object.keys(patch) as Array<keyof T & string>).filter(
    (k) => (patch as any)[k] !== undefined
  );

  if (keys.length === 0) {
    throw new Error("No fields provided to update.");
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const key of keys) {
    const value = (patch as any)[key];

    if (jsonbColumns.has(key)) {
      sets.push(`${key} = $${idx}::jsonb`);
      values.push(JSON.stringify(value));
    } else {
      sets.push(`${key} = $${idx}`);
      values.push(value);
    }
    idx += 1;
  }

  values.push(idValue);

  const sql = `
    UPDATE ${table}
    SET ${sets.join(", ")}
    WHERE ${idColumn} = $${idx}
    RETURNING *
  `;

  return { sql, values };
}

class ContentModel {
  /* ===================== PAGES ===================== */

  static async createPage(payload: CreatePageInput): Promise<ContentPage> {
    const query = `
      INSERT INTO content.content_pages (
        path,
        slug,
        locale,
        status,
        published_at,
        meta,
        sections
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

  static async getPageByPath(
    path: string,
    locale: string
  ): Promise<ContentPage | null> {
    const result = await db.query<ContentPage>(
      `SELECT * FROM content.content_pages WHERE path = $1 AND locale = $2 LIMIT 1`,
      [path, locale]
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

  /* ===================== ENTITIES ===================== */

  static async createEntity(payload: CreateEntityInput): Promise<ContentEntity> {
    const query = `
      INSERT INTO content.content_entities (
        entity_type,
        key,
        locale,
        status,
        data
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING *
    `;

    const values = [
      payload.entity_type,
      payload.key ?? null,
      payload.locale ?? "en",
      payload.status ?? "draft",
      JSON.stringify(payload.data ?? {}),
    ];

    const result = await db.query<ContentEntity>(query, values);
    return result.rows[0]!;
  }

  static async getEntityById(id: string): Promise<ContentEntity | null> {
    const result = await db.query<ContentEntity>(
      `SELECT * FROM content.content_entities WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  static async getEntityByKey(
    key: string,
    locale: string
  ): Promise<ContentEntity | null> {
    const result = await db.query<ContentEntity>(
      `SELECT * FROM content.content_entities WHERE key = $1 AND locale = $2 LIMIT 1`,
      [key, locale]
    );
    return result.rows[0] ?? null;
  }

  static async listEntities(filters?: {
    locale?: string;
    status?: PublishStatus;
    entity_type?: string;
  }): Promise<ContentEntity[]> {
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
    if (filters?.entity_type) {
      clauses.push(`entity_type = $${idx}`);
      values.push(filters.entity_type);
      idx += 1;
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await db.query<ContentEntity>(
      `SELECT * FROM content.content_entities ${where} ORDER BY created_at DESC`,
      values
    );
    return result.rows;
  }

  static async updateEntity(
    id: string,
    patch: UpdateEntityInput
  ): Promise<ContentEntity> {
    const { sql, values } = buildUpdateQuery<UpdateEntityInput>(
      "content.content_entities",
      "id",
      id,
      patch,
      new Set<keyof UpdateEntityInput & string>(["data"])
    );

    const result = await db.query<ContentEntity>(sql, values);
    return result.rows[0]!;
  }

  static async deleteEntity(id: string): Promise<void> {
    await db.query(`DELETE FROM content.content_entities WHERE id = $1`, [id]);
  }

  /* ===================== FORM SUBMISSIONS ===================== */

  static async createSubmission(
    payload: CreateSubmissionInput
  ): Promise<FormSubmission> {
    const query = `
      INSERT INTO content.form_submissions (
        page_id,
        form_key,
        payload,
        ip,
        user_agent
      )
      VALUES ($1, $2, $3::jsonb, $4, $5)
      RETURNING *
    `;

    const values = [
      payload.page_id ?? null,
      payload.form_key ?? "contact",
      JSON.stringify(payload.payload),
      payload.ip ?? null,
      payload.user_agent ?? null,
    ];

    const result = await db.query<FormSubmission>(query, values);
    return result.rows[0]!;
  }

  static async listSubmissions(filters?: {
    page_id?: string;
    form_key?: string;
  }): Promise<FormSubmission[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.page_id) {
      clauses.push(`page_id = $${idx}`);
      values.push(filters.page_id);
      idx += 1;
    }
    if (filters?.form_key) {
      clauses.push(`form_key = $${idx}`);
      values.push(filters.form_key);
      idx += 1;
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await db.query<FormSubmission>(
      `SELECT * FROM content.form_submissions ${where} ORDER BY created_at DESC`,
      values
    );

    return result.rows;
  }

  static async getSubmissionById(id: string): Promise<FormSubmission | null> {
    const result = await db.query<FormSubmission>(
      `SELECT * FROM content.form_submissions WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  /* ===================== EVENTS ===================== */

  static async createEvent(payload: CreateEventInput): Promise<ContentEvent> {
    const query = `
      INSERT INTO content.content_events (
        page_id,
        section_id,
        event_type,
        event_data
      )
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING *
    `;

    const values = [
      payload.page_id,
      payload.section_id ?? null,
      payload.event_type,
      JSON.stringify(payload.event_data ?? {}),
    ];

    const result = await db.query<ContentEvent>(query, values);
    return result.rows[0]!;
  }

  static async listEvents(filters?: {
    page_id?: string;
    event_type?: string;
  }): Promise<ContentEvent[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.page_id) {
      clauses.push(`page_id = $${idx}`);
      values.push(filters.page_id);
      idx += 1;
    }
    if (filters?.event_type) {
      clauses.push(`event_type = $${idx}`);
      values.push(filters.event_type);
      idx += 1;
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await db.query<ContentEvent>(
      `SELECT * FROM content.content_events ${where} ORDER BY created_at DESC`,
      values
    );
    return result.rows;
  }
}

export default ContentModel;
