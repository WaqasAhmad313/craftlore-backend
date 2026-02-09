import { Router } from 'express';
import { ThemeController, PageContentController, PageMetaController, TeamMemberController } from './controller.ts';
import { uploadProfileImage, uploadContentImages, uploadMetaImages } from './multer.ts';

const router = Router();

// Frontend route - get active theme
router.get('/theme/active', ThemeController.getActiveTheme);

// Admin routes - theme management
router.get('/theme', ThemeController.getAllThemes);
router.post('/theme', ThemeController.createTheme);
router.post('/theme/:id/activate', ThemeController.activateTheme); // BEFORE /:id
router.get('/theme/:id', ThemeController.getThemeById);
router.put('/theme/:id', ThemeController.updateTheme);
router.delete('/theme/:id', ThemeController.deleteTheme);

// Frontend route - get content by page slug
router.get('/content/page/:pageSlug', PageContentController.getContentByPage);

// Admin routes - content management
router.get('/content', PageContentController.getAllContent);
router.post('/content/:id/toggle', PageContentController.toggleContent); // BEFORE /:id
router.get('/content/:id', PageContentController.getContentById);
router.post('/content', uploadContentImages, PageContentController.createContent); // WITH MULTER
router.put('/content/:id', uploadContentImages, PageContentController.updateContent); // WITH MULTER
router.delete('/content/:id', PageContentController.deleteContent);

// Frontend route - get meta by page slug
router.get('/meta/page/:pageSlug', PageMetaController.getMetaByPage);

// Admin routes - meta management
router.get('/meta', PageMetaController.getAllMeta);
router.get('/meta/:id', PageMetaController.getMetaById);
router.post('/meta', uploadMetaImages, PageMetaController.createMeta); // WITH MULTER
router.put('/meta/:id', uploadMetaImages, PageMetaController.updateMeta); // WITH MULTER
router.delete('/meta/:id', PageMetaController.deleteMeta);

// Frontend route - get active team members
router.get('/team/active', TeamMemberController.getActiveMembers);

// Admin routes - team management
router.get('/team', TeamMemberController.getAllMembers);
router.post('/team/:id/toggle', TeamMemberController.toggleMember); // BEFORE /:id
router.get('/team/:id', TeamMemberController.getMemberById);
router.post('/team', uploadProfileImage, TeamMemberController.createMember); // WITH MULTER
router.put('/team/:id', uploadProfileImage, TeamMemberController.updateMember); // WITH MULTER
router.delete('/team/:id', TeamMemberController.deleteMember);

export default router;