import { Router } from "express";
import {
  ThemeController,
  PageContentController,
  PageMetaController,
  TeamMemberController,
} from "./controller.ts";

const router = Router();

// Frontend route - get active theme
router.get("/theme/active", ThemeController.getActiveTheme);

// Admin routes - theme management
router.get("/theme", ThemeController.getAllThemes);
router.get("/theme/:id", ThemeController.getThemeById);
router.post("/theme", ThemeController.createTheme);
router.put("/theme/:id", ThemeController.updateTheme);
router.delete("/theme/:id", ThemeController.deleteTheme);
router.post("/theme/:id/activate", ThemeController.activateTheme);

// Frontend route - get content by page slug
router.get("/content/page/:pageSlug", PageContentController.getContentByPage);

// Admin routes - content management
router.get("/content", PageContentController.getAllContent);
router.get("/content/:id", PageContentController.getContentById);
router.post("/content", PageContentController.createContent);
router.put("/content/:id", PageContentController.updateContent);
router.delete("/content/:id", PageContentController.deleteContent);
router.post("/content/:id/toggle", PageContentController.toggleContent);

// Frontend route - get meta by page slug
router.get("/meta/page/:pageSlug", PageMetaController.getMetaByPage);

// Admin routes - meta management
router.get("/meta", PageMetaController.getAllMeta);
router.get("/meta/:id", PageMetaController.getMetaById);
router.post("/meta", PageMetaController.createMeta);
router.put("/meta/:id", PageMetaController.updateMeta);
router.delete("/meta/:id", PageMetaController.deleteMeta);

// Frontend route - get active team members
router.get("/team/active", TeamMemberController.getActiveMembers);

// Admin routes - team management
router.get("/team", TeamMemberController.getAllMembers);
router.get("/team/:id", TeamMemberController.getMemberById);
router.post("/team", TeamMemberController.createMember);
router.put("/team/:id", TeamMemberController.updateMember);
router.delete("/team/:id", TeamMemberController.deleteMember);
router.post("/team/:id/toggle", TeamMemberController.toggleMember);

export default router;
