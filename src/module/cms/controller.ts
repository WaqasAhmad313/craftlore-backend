import type { Request, Response } from "express";
import { ContentService } from "./service.ts";
import type {
  CreatePageInput,
  UpdatePageInput,
  CreateEntityInput,
  UpdateEntityInput,
  CreateSubmissionInput,
  CreateEventInput,
  PublishStatus,
} from "./model.ts";
import type { MulterFilesMap } from "./cloudinary.ts";

/* ===== Typed Params ===== */
interface PageIdParams {
  pageId: string;
}
interface EntityIdParams {
  entityId: string;
}
interface SubmissionIdParams {
  submissionId: string;
}

/* ===== Type guards ===== */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFilesMap(value: unknown): value is MulterFilesMap {
  if (!isPlainObject(value)) return false;

  for (const v of Object.values(value)) {
    if (!Array.isArray(v)) return false;

    for (const f of v) {
      if (!isPlainObject(f)) return false;

      // minimal checks for multer memory storage file
      if (!("buffer" in f) || !("mimetype" in f) || !("originalname" in f)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Supports:
 * - JSON request: req.body is the payload
 * - multipart/form-data: req.body.data is JSON string
 */
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

/**
 * Multer can populate req.files in multiple shapes.
 * We support the common `multer.fields()` shape:
 *   Record<string, File[]>
 */
function getFiles<P extends object>(req: Request<P>): MulterFilesMap | undefined {
  const filesUnknown: unknown = (req as unknown as { files?: unknown }).files;

  if (filesUnknown === undefined || filesUnknown === null) return undefined;
  if (isFilesMap(filesUnknown)) return filesUnknown;

  throw new Error("Invalid files format. Use multer.fields() with named fields.");
}

export class ContentController {
  /* ===================== PAGES ===================== */

  static async createPage(req: Request, res: Response): Promise<Response> {
    try {
      const payload = getJsonPayload<object, CreatePageInput>(req);
      const files = getFiles<object>(req);

      const page = await ContentService.createPage(payload, files);
      return res.status(201).json(page);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async listPages(req: Request, res: Response): Promise<Response> {
    try {
      const locale = req.query.locale as string | undefined;
      const status = req.query.status as PublishStatus | undefined;

      const pages = await ContentService.listPages({ locale, status });
      return res.status(200).json(pages);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async getPageById(
    req: Request<PageIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const page = await ContentService.getPageById(req.params.pageId);
      if (!page) return res.status(404).json({ message: "Page not found." });
      return res.status(200).json(page);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async getPageByPath(req: Request, res: Response): Promise<Response> {
    try {
      const path = (req.query.path as string | undefined) ?? "";
      const locale = req.query.locale as string | undefined;

      const page = await ContentService.getPageByPath(path, locale);
      if (!page) return res.status(404).json({ message: "Page not found." });
      return res.status(200).json(page);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async updatePage(
    req: Request<PageIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const patch = getJsonPayload<PageIdParams, UpdatePageInput>(req);
      const files = getFiles<PageIdParams>(req);

      const page = await ContentService.updatePage(req.params.pageId, patch, files);
      return res.status(200).json(page);
    } catch (error: unknown) {
      const message = (error as Error).message;
      const status = message.toLowerCase().includes("not found") ? 404 : 400;
      return res.status(status).json({ message });
    }
  }

  static async publishPage(
    req: Request<PageIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const page = await ContentService.publishPage(req.params.pageId);
      return res.status(200).json(page);
    } catch (error: unknown) {
      const message = (error as Error).message;
      const status = message.toLowerCase().includes("not found") ? 404 : 400;
      return res.status(status).json({ message });
    }
  }

  static async unpublishPage(
    req: Request<PageIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const page = await ContentService.unpublishPage(req.params.pageId);
      return res.status(200).json(page);
    } catch (error: unknown) {
      const message = (error as Error).message;
      const status = message.toLowerCase().includes("not found") ? 404 : 400;
      return res.status(status).json({ message });
    }
  }

  static async deletePage(
    req: Request<PageIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      await ContentService.deletePage(req.params.pageId);
      return res.status(204).send();
    } catch (error: unknown) {
      const message = (error as Error).message;
      const status = message.toLowerCase().includes("not found") ? 404 : 400;
      return res.status(status).json({ message });
    }
  }

  /* ===================== ENTITIES ===================== */

  static async createEntity(req: Request, res: Response): Promise<Response> {
    try {
      const payload = getJsonPayload<object, CreateEntityInput>(req);
      const files = getFiles<object>(req);

      const entity = await ContentService.createEntity(payload, files);
      return res.status(201).json(entity);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async listEntities(req: Request, res: Response): Promise<Response> {
    try {
      const locale = req.query.locale as string | undefined;
      const status = req.query.status as PublishStatus | undefined;
      const entity_type = req.query.entity_type as string | undefined;

      const entities = await ContentService.listEntities({ locale, status, entity_type });
      return res.status(200).json(entities);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async getEntityById(
    req: Request<EntityIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const entity = await ContentService.getEntityById(req.params.entityId);
      if (!entity) return res.status(404).json({ message: "Entity not found." });
      return res.status(200).json(entity);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async getEntityByKey(req: Request, res: Response): Promise<Response> {
    try {
      const key = (req.query.key as string | undefined) ?? "";
      const locale = req.query.locale as string | undefined;

      const entity = await ContentService.getEntityByKey(key, locale);
      if (!entity) return res.status(404).json({ message: "Entity not found." });
      return res.status(200).json(entity);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async updateEntity(
    req: Request<EntityIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const patch = getJsonPayload<EntityIdParams, UpdateEntityInput>(req);
      const files = getFiles<EntityIdParams>(req);

      const entity = await ContentService.updateEntity(req.params.entityId, patch, files);
      return res.status(200).json(entity);
    } catch (error: unknown) {
      const message = (error as Error).message;
      const status = message.toLowerCase().includes("not found") ? 404 : 400;
      return res.status(status).json({ message });
    }
  }

  static async deleteEntity(
    req: Request<EntityIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      await ContentService.deleteEntity(req.params.entityId);
      return res.status(204).send();
    } catch (error: unknown) {
      const message = (error as Error).message;
      const status = message.toLowerCase().includes("not found") ? 404 : 400;
      return res.status(status).json({ message });
    }
  }

  /* ===================== FORMS ===================== */

  static async createSubmission(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body as CreateSubmissionInput;
      const submission = await ContentService.createSubmission(payload);
      return res.status(201).json(submission);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async listSubmissions(req: Request, res: Response): Promise<Response> {
    try {
      const page_id = req.query.page_id as string | undefined;
      const form_key = req.query.form_key as string | undefined;

      const submissions = await ContentService.listSubmissions({ page_id, form_key });
      return res.status(200).json(submissions);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async getSubmissionById(
    req: Request<SubmissionIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const submission = await ContentService.getSubmissionById(req.params.submissionId);
      if (!submission) return res.status(404).json({ message: "Submission not found." });
      return res.status(200).json(submission);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  /* ===================== EVENTS ===================== */

  static async createEvent(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body as CreateEventInput;
      const event = await ContentService.createEvent(payload);
      return res.status(201).json(event);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async listEvents(req: Request, res: Response): Promise<Response> {
    try {
      const page_id = req.query.page_id as string | undefined;
      const event_type = req.query.event_type as string | undefined;

      const events = await ContentService.listEvents({ page_id, event_type });
      return res.status(200).json(events);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }
}
