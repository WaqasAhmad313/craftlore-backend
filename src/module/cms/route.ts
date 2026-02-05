import { Router } from "express";
import { ContentController } from "./controller.ts";

const router = Router();

/* ===================== PAGES ===================== */
/**
 * Order matters:
 * - Static routes first
 * - Then param routes
 * Otherwise `/pages/resolve` gets eaten by `/pages/:pageId`
 */
router.get("/pages", ContentController.listPages);
router.get("/pages/resolve", ContentController.getPageByPath);

router.post("/pages", ContentController.createPage);

router.post("/pages/:pageId/publish", ContentController.publishPage);
router.post("/pages/:pageId/unpublish", ContentController.unpublishPage);

router.get("/pages/:pageId", ContentController.getPageById);
router.patch("/pages/:pageId", ContentController.updatePage);
router.delete("/pages/:pageId", ContentController.deletePage);

/* ===================== ENTITIES ===================== */
/**
 * Same issue here: `/entities/resolve` must come before `/entities/:entityId`
 */
router.get("/entities", ContentController.listEntities);
router.get("/entities/resolve", ContentController.getEntityByKey);

router.post("/entities", ContentController.createEntity);

router.get("/entities/:entityId", ContentController.getEntityById);
router.patch("/entities/:entityId", ContentController.updateEntity);
router.delete("/entities/:entityId", ContentController.deleteEntity);

/* ===================== FORMS ===================== */
/**
 * No ambiguity here, but keep listing first for consistency.
 */
router.get("/forms/submissions", ContentController.listSubmissions);
router.post("/forms/submissions", ContentController.createSubmission);
router.get("/forms/submissions/:submissionId", ContentController.getSubmissionById);

/* ===================== EVENTS ===================== */
router.get("/events", ContentController.listEvents);
router.post("/events", ContentController.createEvent);

export default router;
