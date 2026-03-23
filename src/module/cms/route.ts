import { Router } from "express";
import { PageContentController, PageMetaController, TeamMemberController } from "./controller.ts";
import { uploadProfileImage, uploadContentImages, uploadMetaImages } from "./multer.ts";
import { logActivity } from "../../middleware/activityLogMiddleware.ts";

const router = Router();

// ── Untouched — public + GET routes ─────────────────────────
router.get("/content/page/:pageSlug", PageContentController.getContentByPage);
router.get("/content", PageContentController.getAllContent);
router.get("/content/:id", PageContentController.getContentById);
router.get("/meta/page/:pageSlug", PageMetaController.getMetaByPage);
router.get("/meta", PageMetaController.getAllMeta);
router.get("/meta/:id", PageMetaController.getMetaById);
router.get("/team/active", TeamMemberController.getActiveMembers);
router.get("/team", TeamMemberController.getAllMembers);
router.get("/team/:id", TeamMemberController.getMemberById);

// ── Content — logs only ──────────────────────────────────────

router.post(
  "/content/:id/toggle",
  logActivity({
    module: "cms",
    action: "update",
    extractMeta: (req) => ({ entityId: req.params["id"] ?? null }),
  }),
  PageContentController.toggleContent
);

router.post(
  "/content",
  uploadContentImages,
  logActivity({
    module: "cms",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  PageContentController.createContent
);

router.put(
  "/content/:id",
  uploadContentImages,
  logActivity({
    module: "cms",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  PageContentController.updateContent
);

router.delete(
  "/content/:id",
  logActivity({
    module: "cms",
    action: "delete",
    extractMeta: (req) => ({ entityId: req.params["id"] ?? null }),
  }),
  PageContentController.deleteContent
);

// ── Meta — logs only ─────────────────────────────────────────

router.post(
  "/meta",
  uploadMetaImages,
  logActivity({
    module: "cms",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  PageMetaController.createMeta
);

router.put(
  "/meta/:id",
  uploadMetaImages,
  logActivity({
    module: "cms",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  PageMetaController.updateMeta
);

router.delete(
  "/meta/:id",
  logActivity({
    module: "cms",
    action: "delete",
    extractMeta: (req) => ({ entityId: req.params["id"] ?? null }),
  }),
  PageMetaController.deleteMeta
);

// ── Team — logs only ─────────────────────────────────────────

router.post(
  "/team/:id/toggle",
  logActivity({
    module: "cms",
    action: "update",
    extractMeta: (req) => ({ entityId: req.params["id"] ?? null }),
  }),
  TeamMemberController.toggleMember
);

router.post(
  "/team",
  uploadProfileImage,
  logActivity({
    module: "cms",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  TeamMemberController.createMember
);

router.put(
  "/team/:id",
  uploadProfileImage,
  logActivity({
    module: "cms",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  TeamMemberController.updateMember
);

router.delete(
  "/team/:id",
  logActivity({
    module: "cms",
    action: "delete",
    extractMeta: (req) => ({ entityId: req.params["id"] ?? null }),
  }),
  TeamMemberController.deleteMember
);

export default router;