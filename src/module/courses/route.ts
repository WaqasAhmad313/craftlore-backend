// import { Router } from "express";
// import { CourseController } from "./controller.ts";

// const router = Router();

// /* ===== COURSES ===== */
// router.get("/courses", CourseController.getAllCourses);

// // Create a new course
// router.post("/courses", CourseController.createCourse);

// // Get a course by ID
// router.get("/courses/:courseId", CourseController.getCourse);

// // Get all lessons for a course
// router.get("/courses/:courseId/lessons", CourseController.getLessonsByCourse);

// // Bulk create lessons + quizzes for a course
// router.post("/courses/:courseId/lessons/bulk", CourseController.bulkCreateLessons);

// /* ===== LESSONS ===== */

// // Create a single lesson manually
// router.post("/lessons", CourseController.createLesson);

// // Get quizzes by lesson ID
// router.get("/lessons/:lessonId/quizzes", CourseController.getQuizzesByLesson);

// /* ===== QUIZZES ===== */

// // Create a single quiz manually
// router.post("/quizzes", CourseController.createQuiz);

// export default router;


import { Router } from "express";
import { CourseController } from "./controller.ts";
import { CourseService } from "./service.ts";
import type { BulkLessonInput } from "./model.ts";
import { isInternalRequest } from "../../middleware/internalMiddleware.ts";
import { authMiddleware } from "../../middleware/authMiddleware.ts";
import { requirePermission } from "../../middleware/permissionMiddleware.ts";
import { pendingInterceptor } from "../../middleware/pendingMiddleware.ts";
import { logActivity } from "../../middleware/activityLogMiddleware.ts";

const router = Router();

// ── Untouched ────────────────────────────────────────────────
router.get("/courses", CourseController.getAllCourses);
router.get("/courses/:courseId", CourseController.getCourse);
router.get("/courses/:courseId/lessons", CourseController.getLessonsByCourse);
router.get("/lessons/:lessonId/quizzes", CourseController.getQuizzesByLesson);

// ── Dashboard: POST /courses ─────────────────────────────────
router.post(
  "/courses",
  isInternalRequest,
  authMiddleware,
  requirePermission("clie", "create"),
  pendingInterceptor({
    module:    "clie",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: {
        new: req.body as Record<string, unknown>,
      },
    }),
  }),
  logActivity({
    module: "clie",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  CourseController.createCourse
);

// ── Dashboard: POST /courses/:courseId/lessons/bulk ──────────
router.post(
  "/courses/:courseId/lessons/bulk",
  isInternalRequest,
  authMiddleware,
  requirePermission("clie", "create"),
  pendingInterceptor({
    module:    "clie",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: req.params["courseId"] ?? null,
      payload: {
        new: req.body as Record<string, unknown>,
      },
    }),
  }),
  logActivity({
    module: "clie",
    action: "create",
    extractMeta: (req) => ({
      entityId: req.params["courseId"] ?? null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  async (req, res) => {
    try {
      const courseId = req.params["courseId"] ?? "";
      const lessons = (req.body as { lessons?: BulkLessonInput[] }).lessons;
      if (!lessons || !Array.isArray(lessons)) {
        res.status(400).json({ message: "Lessons array is required" });
        return;
      }
      const created = await CourseService.bulkCreateLessonsWithQuizzes(courseId, lessons);
      res.status(201).json(created);
    } catch (error: unknown) {
      res.status(400).json({ message: (error as Error).message });
    }
  }
);

// ── Dashboard: POST /lessons ─────────────────────────────────
router.post(
  "/lessons",
  isInternalRequest,
  authMiddleware,
  requirePermission("clie", "create"),
  pendingInterceptor({
    module:    "clie",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: {
        new: req.body as Record<string, unknown>,
      },
    }),
  }),
  logActivity({
    module: "clie",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  CourseController.createLesson
);

// ── Dashboard: POST /quizzes ─────────────────────────────────
router.post(
  "/quizzes",
  isInternalRequest,
  authMiddleware,
  requirePermission("clie", "create"),
  pendingInterceptor({
    module:    "clie",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: {
        new: req.body as Record<string, unknown>,
      },
    }),
  }),
  logActivity({
    module: "clie",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  CourseController.createQuiz
);

export default router;