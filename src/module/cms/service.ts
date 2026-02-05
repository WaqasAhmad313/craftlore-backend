import ContentModel from "./model.ts";
import type {
  ContentPage,
  CreatePageInput,
  UpdatePageInput,
  PublishStatus,
  ContentEntity,
  CreateEntityInput,
  UpdateEntityInput,
  FormSubmission,
  CreateSubmissionInput,
  ContentEvent,
  CreateEventInput,
} from "./model.ts";

import type { MulterFilesMap } from "./cloudinary.ts";
import { uploadFiles, applyUploads } from "./cloudinary.ts";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidPath(path: string): boolean {
  if (path === "/") return true;
  return /^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*\/?$/.test(path);
}

function normalizeLocale(locale?: string): string {
  const val = (locale ?? "en").trim();
  return val.length ? val : "en";
}

function normalizeStatus(status?: PublishStatus): PublishStatus {
  return status ?? "draft";
}

function safeFolderSegment(input: string): string {
  // Cloudinary folders hate chaos. Keep it boring.
  return input
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9/_-]+/g, "-")
    .replace(/\/+/g, "/")
    .toLowerCase();
}

export class ContentService {
  /* ===================== PAGES ===================== */

  static async createPage(
    payload: CreatePageInput,
    files?: MulterFilesMap
  ): Promise<ContentPage> {
    if (!payload.path?.trim()) throw new Error("path is required.");
    const path = payload.path.trim();
    if (!isValidPath(path)) throw new Error("Invalid path format.");

    if (payload.meta !== undefined && !isPlainObject(payload.meta)) {
      throw new Error("meta must be a JSON object.");
    }
    if (payload.sections !== undefined && !Array.isArray(payload.sections)) {
      throw new Error("sections must be an array.");
    }

    const locale = normalizeLocale(payload.locale);
    const status = normalizeStatus(payload.status);
    const published_at = status === "published" ? new Date().toISOString() : null;

    // Cloudinary upload (optional)
    const folderBase = `cms/pages/${locale}/${safeFolderSegment(path || "root")}`;
    const uploads = await uploadFiles(files, folderBase);

    const meta = applyUploads(payload.meta ?? {}, uploads);
    const sections = applyUploads(payload.sections ?? [], uploads);

    return ContentModel.createPage({
      ...payload,
      path,
      locale,
      status,
      published_at,
      meta,
      sections,
    });
  }

  static async getPageById(id: string): Promise<ContentPage | null> {
    return ContentModel.getPageById(id);
  }

  static async getPageByPath(path: string, locale?: string): Promise<ContentPage | null> {
    if (!path?.trim()) throw new Error("path is required.");
    const normalizedPath = path.trim();
    if (!isValidPath(normalizedPath)) throw new Error("Invalid path format.");
    return ContentModel.getPageByPath(normalizedPath, normalizeLocale(locale));
  }

  static async listPages(filters?: {
    locale?: string;
    status?: PublishStatus;
  }): Promise<ContentPage[]> {
    const locale = filters?.locale ? normalizeLocale(filters.locale) : undefined;
    const status = filters?.status;
    return ContentModel.listPages({ locale, status });
  }

  static async updatePage(
    id: string,
    patch: UpdatePageInput,
    files?: MulterFilesMap
  ): Promise<ContentPage> {
    const existing = await ContentModel.getPageById(id);
    if (!existing) throw new Error("Page not found.");

    const update: UpdatePageInput = {};

    // If path changes, folder changes too (fine).
    const nextPath = patch.path !== undefined ? patch.path.trim() : existing.path;
    if (!isValidPath(nextPath)) throw new Error("Invalid path format.");

    if (patch.path !== undefined) update.path = nextPath;
    if (patch.slug !== undefined) update.slug = patch.slug ?? null;
    if (patch.locale !== undefined) update.locale = normalizeLocale(patch.locale);

    if (patch.status !== undefined) {
      const status = normalizeStatus(patch.status);
      update.status = status;
      update.published_at = status === "published" ? new Date().toISOString() : null;
    }

    // Cloudinary uploads
    const locale = patch.locale !== undefined ? normalizeLocale(patch.locale) : existing.locale;
    const folderBase = `cms/pages/${locale}/${safeFolderSegment(nextPath || "root")}`;
    const uploads = await uploadFiles(files, folderBase);

    if (patch.meta !== undefined) {
      if (!isPlainObject(patch.meta)) throw new Error("meta must be a JSON object.");
      update.meta = applyUploads(patch.meta, uploads);
    }

    if (patch.sections !== undefined) {
      if (!Array.isArray(patch.sections)) throw new Error("sections must be an array.");
      update.sections = applyUploads(patch.sections, uploads);
    }

    return ContentModel.updatePage(id, update);
  }

  static async publishPage(id: string): Promise<ContentPage> {
    const existing = await ContentModel.getPageById(id);
    if (!existing) throw new Error("Page not found.");
    return ContentModel.updatePage(id, {
      status: "published",
      published_at: new Date().toISOString(),
    });
  }

  static async unpublishPage(id: string): Promise<ContentPage> {
    const existing = await ContentModel.getPageById(id);
    if (!existing) throw new Error("Page not found.");
    return ContentModel.updatePage(id, { status: "draft", published_at: null });
  }

  static async deletePage(id: string): Promise<void> {
    const existing = await ContentModel.getPageById(id);
    if (!existing) throw new Error("Page not found.");
    await ContentModel.deletePage(id);
  }

  /* ===================== ENTITIES ===================== */

  static async createEntity(
    payload: CreateEntityInput,
    files?: MulterFilesMap
  ): Promise<ContentEntity> {
    if (!payload.entity_type?.trim()) throw new Error("entity_type is required.");

    if (payload.data !== undefined && !isPlainObject(payload.data)) {
      throw new Error("data must be a JSON object.");
    }

    const entity_type = payload.entity_type.trim();
    const locale = normalizeLocale(payload.locale);
    const status = normalizeStatus(payload.status);

    const folderBase = `cms/entities/${locale}/${safeFolderSegment(entity_type)}`;
    const uploads = await uploadFiles(files, folderBase);

    const data = applyUploads(payload.data ?? {}, uploads);

    return ContentModel.createEntity({
      entity_type,
      key: payload.key ?? null,
      locale,
      status,
      data,
    });
  }

  static async getEntityById(id: string): Promise<ContentEntity | null> {
    return ContentModel.getEntityById(id);
  }

  static async getEntityByKey(key: string, locale?: string): Promise<ContentEntity | null> {
    if (!key?.trim()) throw new Error("key is required.");
    return ContentModel.getEntityByKey(key.trim(), normalizeLocale(locale));
  }

  static async listEntities(filters?: {
    locale?: string;
    status?: PublishStatus;
    entity_type?: string;
  }): Promise<ContentEntity[]> {
    const locale = filters?.locale ? normalizeLocale(filters.locale) : undefined;
    const status = filters?.status;
    const entity_type = filters?.entity_type?.trim();
    return ContentModel.listEntities({ locale, status, entity_type });
  }

  static async updateEntity(
    id: string,
    patch: UpdateEntityInput,
    files?: MulterFilesMap
  ): Promise<ContentEntity> {
    const existing = await ContentModel.getEntityById(id);
    if (!existing) throw new Error("Entity not found.");

    const update: UpdateEntityInput = {};

    if (patch.entity_type !== undefined) {
      if (!patch.entity_type.trim()) throw new Error("entity_type cannot be empty.");
      update.entity_type = patch.entity_type.trim();
    }
    if (patch.key !== undefined) update.key = patch.key ?? null;
    if (patch.locale !== undefined) update.locale = normalizeLocale(patch.locale);
    if (patch.status !== undefined) update.status = normalizeStatus(patch.status);

    const locale = patch.locale !== undefined ? normalizeLocale(patch.locale) : existing.locale;
    const entityType = patch.entity_type !== undefined ? patch.entity_type.trim() : existing.entity_type;

    const folderBase = `cms/entities/${locale}/${safeFolderSegment(entityType)}`;
    const uploads = await uploadFiles(files, folderBase);

    if (patch.data !== undefined) {
      if (!isPlainObject(patch.data)) throw new Error("data must be a JSON object.");
      update.data = applyUploads(patch.data, uploads);
    }

    return ContentModel.updateEntity(id, update);
  }

  static async deleteEntity(id: string): Promise<void> {
    const existing = await ContentModel.getEntityById(id);
    if (!existing) throw new Error("Entity not found.");
    await ContentModel.deleteEntity(id);
  }

  /* ===================== FORMS ===================== */

  static async createSubmission(payload: CreateSubmissionInput): Promise<FormSubmission> {
    if (!isPlainObject(payload.payload)) throw new Error("payload must be a JSON object.");

    const form_key = (payload.form_key ?? "contact").trim();
    if (!form_key) throw new Error("form_key cannot be empty.");

    return ContentModel.createSubmission({
      page_id: payload.page_id ?? null,
      form_key,
      payload: payload.payload,
      ip: payload.ip ?? null,
      user_agent: payload.user_agent ?? null,
    });
  }

  static async listSubmissions(filters?: {
    page_id?: string;
    form_key?: string;
  }): Promise<FormSubmission[]> {
    const form_key = filters?.form_key?.trim();
    return ContentModel.listSubmissions({
      page_id: filters?.page_id,
      form_key: form_key && form_key.length ? form_key : undefined,
    });
  }

  static async getSubmissionById(id: string): Promise<FormSubmission | null> {
    return ContentModel.getSubmissionById(id);
  }

  /* ===================== EVENTS ===================== */

  static async createEvent(payload: CreateEventInput): Promise<ContentEvent> {
    if (!payload.page_id?.trim()) throw new Error("page_id is required.");
    if (!payload.event_type?.trim()) throw new Error("event_type is required.");

    if (payload.event_data !== undefined && !isPlainObject(payload.event_data)) {
      throw new Error("event_data must be a JSON object.");
    }

    return ContentModel.createEvent({
      page_id: payload.page_id.trim(),
      section_id: payload.section_id ?? null,
      event_type: payload.event_type.trim(),
      event_data: payload.event_data ?? {},
    });
  }

  static async listEvents(filters?: {
    page_id?: string;
    event_type?: string;
  }): Promise<ContentEvent[]> {
    const event_type = filters?.event_type?.trim();
    return ContentModel.listEvents({
      page_id: filters?.page_id,
      event_type: event_type && event_type.length ? event_type : undefined,
    });
  }
}
