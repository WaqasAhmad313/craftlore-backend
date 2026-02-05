import type { Request, Response } from "express";
import { ContentService } from "./service.ts";
import type { CreatePageInput, UpdatePageInput, PublishStatus } from "./model.ts";
import type { MulterFilesMap } from "./cloudinary.ts";

interface PageIdParams {
  pageId: string;
}

interface SectionIdParams {
  sectionId: string;
}

/* ===== Response helpers ===== */

function ok<T>(res: Response, data: T, message?: string, statusCode = 200): Response {
  return res.status(statusCode).json({ success: true, message: message ?? "OK", data });
}

function fail(res: Response, message: string, statusCode = 400, error?: unknown): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    error: error instanceof Error ? error.message : undefined,
  });
}

/* ===== Guards ===== */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFilesMap(value: unknown): value is MulterFilesMap {
  if (!isPlainObject(value)) return false;

  for (const v of Object.values(value)) {
    if (!Array.isArray(v)) return false;
    for (const f of v) {
      if (!isPlainObject(f)) return false;
      if (!("buffer" in f) || !("mimetype" in f) || !("originalname" in f)) return false;
    }
  }
  return true;
}

function getJsonPayload<P extends object, T>(req: Request<P>): T {
  const bodyUnknown: unknown = req.body;

  if (isPlainObject(bodyUnknown) && typeof bodyUnknown.data === "string") {
    const raw = bodyUnknown.data.trim();
    if (raw.length === 0) throw new Error("Invalid JSON in 'data' field.");
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new Error("Invalid JSON in 'data' field.");
    }
  }

  return req.body as T;
}

function getFiles<P extends object>(req: Request<P>): MulterFilesMap | undefined {
  const filesUnknown: unknown = (req as unknown as { files?: unknown }).files;

  if (filesUnknown === undefined || filesUnknown === null) return undefined;
  if (isFilesMap(filesUnknown)) return filesUnknown;

  throw new Error("Invalid files format. Use multer.fields() with named fields.");
}

export class ContentController {
  /* ===================== DASHBOARD / ADMIN ===================== */

  static async createPage(req: Request, res: Response): Promise<Response> {
    try {
      const payload = getJsonPayload<object, CreatePageInput>(req);
      const files = getFiles<object>(req);
      const page = await ContentService.createPage(payload, files);
      return ok(res, page, "Page created", 201);
    } catch (e: unknown) {
      return fail(res, "Failed to create page", 400, e);
    }
  }

  static async listPages(req: Request, res: Response): Promise<Response> {
    try {
      const locale = req.query.locale as string | undefined;
      const status = req.query.status as PublishStatus | undefined;
      const pages = await ContentService.listPages({ locale, status });
      return ok(res, pages, "Pages fetched");
    } catch (e: unknown) {
      return fail(res, "Failed to list pages", 400, e);
    }
  }

  static async getPageById(req: Request<PageIdParams>, res: Response): Promise<Response> {
    try {
      const page = await ContentService.getPageById(req.params.pageId);
      if (!page) return fail(res, "Page not found", 404);
      return ok(res, page, "Page fetched");
    } catch (e: unknown) {
      return fail(res, "Failed to fetch page", 400, e);
    }
  }

  static async updatePage(req: Request<PageIdParams>, res: Response): Promise<Response> {
    try {
      const patch = getJsonPayload<PageIdParams, UpdatePageInput>(req);
      const files = getFiles<PageIdParams>(req);
      const page = await ContentService.updatePage(req.params.pageId, patch, files);
      return ok(res, page, "Page updated");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update page";
      const status = msg.toLowerCase().includes("not found") ? 404 : 400;
      return fail(res, "Failed to update page", status, e);
    }
  }

  static async publishPage(req: Request<PageIdParams>, res: Response): Promise<Response> {
    try {
      const page = await ContentService.publishPage(req.params.pageId);
      return ok(res, page, "Page published");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to publish page";
      const status = msg.toLowerCase().includes("not found") ? 404 : 400;
      return fail(res, "Failed to publish page", status, e);
    }
  }

  static async unpublishPage(req: Request<PageIdParams>, res: Response): Promise<Response> {
    try {
      const page = await ContentService.unpublishPage(req.params.pageId);
      return ok(res, page, "Page unpublished");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to unpublish page";
      const status = msg.toLowerCase().includes("not found") ? 404 : 400;
      return fail(res, "Failed to unpublish page", status, e);
    }
  }

  static async deletePage(req: Request<PageIdParams>, res: Response): Promise<Response> {
    try {
      await ContentService.deletePage(req.params.pageId);
      return ok(res, null, "Page deleted");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete page";
      const status = msg.toLowerCase().includes("not found") ? 404 : 400;
      return fail(res, "Failed to delete page", status, e);
    }
  }

  /* ===================== FRONTEND READS (PATH-BASED) ===================== */

  static async resolvePageMeta(req: Request, res: Response): Promise<Response> {
    try {
      const path = (req.query.path as string | undefined) ?? "";
      const locale = req.query.locale as string | undefined;

      const meta = await ContentService.getPageMetaByPath(path, locale);
      if (!meta) return fail(res, "Page not found", 404);

      return ok(res, meta, "Page meta fetched");
    } catch (e: unknown) {
      return fail(res, "Failed to resolve page meta", 400, e);
    }
  }

  static async resolvePageSections(req: Request, res: Response): Promise<Response> {
    try {
      const path = (req.query.path as string | undefined) ?? "";
      const locale = req.query.locale as string | undefined;

      const sections = await ContentService.getPageSectionsByPath(path, locale);
      if (sections === null) return fail(res, "Page not found", 404);

      return ok(res, sections, "Sections fetched");
    } catch (e: unknown) {
      return fail(res, "Failed to resolve sections", 400, e);
    }
  }

  static async resolvePageSectionById(
    req: Request<SectionIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const path = (req.query.path as string | undefined) ?? "";
      const locale = req.query.locale as string | undefined;

      const section = await ContentService.getPageSectionById(path, locale, req.params.sectionId);
      if (!section) return fail(res, "Section not found", 404);

      return ok(res, section, "Section fetched");
    } catch (e: unknown) {
      return fail(res, "Failed to resolve section", 400, e);
    }
  }

  static async resolvePageSectionsByType(req: Request, res: Response): Promise<Response> {
    try {
      const path = (req.query.path as string | undefined) ?? "";
      const locale = req.query.locale as string | undefined;
      const type = (req.query.type as string | undefined) ?? "";

      const sections = await ContentService.getPageSectionsByType(path, locale, type);
      if (sections === null) return fail(res, "Page not found", 404);

      return ok(res, sections, "Sections by type fetched");
    } catch (e: unknown) {
      return fail(res, "Failed to resolve sections by type", 400, e);
    }
  }
}
