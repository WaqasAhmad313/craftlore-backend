import { Router } from "express";
import { ContentController } from "./controller.ts";

const router = Router();

/* ===================== FRONTEND READS (STATIC FIRST) ===================== */
router.get("/pages/resolve/meta", ContentController.resolvePageMeta);
router.get("/pages/resolve/sections", ContentController.resolvePageSections);
router.get("/pages/resolve/sections-by-type", ContentController.resolvePageSectionsByType);
router.get("/pages/resolve/sections/:sectionId", ContentController.resolvePageSectionById);

/* ===================== DASHBOARD / ADMIN ===================== */
router.get("/pages", ContentController.listPages);
router.post("/pages", ContentController.createPage);

router.post("/pages/:pageId/publish", ContentController.publishPage);
router.post("/pages/:pageId/unpublish", ContentController.unpublishPage);

router.get("/pages/:pageId", ContentController.getPageById);
router.patch("/pages/:pageId", ContentController.updatePage);
router.delete("/pages/:pageId", ContentController.deletePage);

export default router;
