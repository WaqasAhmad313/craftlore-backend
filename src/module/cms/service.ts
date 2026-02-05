import ContentModel from "./model.ts";
import type {
  ContentPage,
  ContentPageMeta,
  CreatePageInput,
  UpdatePageInput,
  PublishStatus,
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
  return input
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9/_-]+/g, "-")
    .replace(/\/+/g, "/")
    .toLowerCase();
}

function normalizePathOrThrow(path: string): string {
  const normalized = path.trim();
  if (!normalized) throw new Error("path is required.");
  if (!isValidPath(normalized)) throw new Error("Invalid path format.");
  return normalized;
}

export class ContentService {
  /* ===================== WRITE / DASHBOARD ===================== */

  static async createPage(payload: CreatePageInput, files?: MulterFilesMap): Promise<ContentPage> {
    const path = normalizePathOrThrow(payload.path);

    if (payload.meta !== undefined && !isPlainObject(payload.meta)) {
      throw new Error("meta must be a JSON object.");
    }
    if (payload.sections !== undefined && !Array.isArray(payload.sections)) {
      throw new Error("sections must be an array.");
    }

    const locale = normalizeLocale(payload.locale);
    const status = normalizeStatus(payload.status);
    const published_at = status === "published" ? new Date().toISOString() : null;

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

  static async listPages(filters?: { locale?: string; status?: PublishStatus }): Promise<ContentPage[]> {
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

    const nextPath = patch.path !== undefined ? normalizePathOrThrow(patch.path) : existing.path;

    if (patch.path !== undefined) update.path = nextPath;
    if (patch.slug !== undefined) update.slug = patch.slug ?? null;
    if (patch.locale !== undefined) update.locale = normalizeLocale(patch.locale);

    if (patch.status !== undefined) {
      const status = normalizeStatus(patch.status);
      update.status = status;
      update.published_at = status === "published" ? new Date().toISOString() : null;
    }

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
    return ContentModel.updatePage(id, { status: "published", published_at: new Date().toISOString() });
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

  /* ===================== FRONTEND READS (PATH-BASED) ===================== */

  static async getPageMetaByPath(path: string, locale?: string): Promise<ContentPageMeta | null> {
    const p = normalizePathOrThrow(path);
    return ContentModel.getPageMetaByPath(p, normalizeLocale(locale));
  }

  static async getPageSectionsByPath(path: string, locale?: string): Promise<unknown[] | null> {
    const p = normalizePathOrThrow(path);
    return ContentModel.getPageSectionsByPath(p, normalizeLocale(locale));
  }

  static async getPageSectionById(
    path: string,
    locale: string | undefined,
    sectionId: string
  ): Promise<Record<string, unknown> | null> {
    const p = normalizePathOrThrow(path);
    const id = sectionId.trim();
    if (!id) throw new Error("sectionId is required.");
    return ContentModel.getPageSectionById(p, normalizeLocale(locale), id);
  }

  static async getPageSectionsByType(
    path: string,
    locale: string | undefined,
    type: string
  ): Promise<unknown[] | null> {
    const p = normalizePathOrThrow(path);
    const t = type.trim();
    if (!t) throw new Error("type is required.");
    return ContentModel.getPageSectionsByType(p, normalizeLocale(locale), t);
  }
}
