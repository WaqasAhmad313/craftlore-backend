import { Router } from "express";
import { CLIEController } from "./controller.ts";
import { authenticate } from "../../middleware/auth.ts";

const router = Router();

/* ===== USER MANAGEMENT ===== */

// Get user dashboard
router.get("/dashboard", authenticate, CLIEController.getDashboard);

/* ===== COURSE ENROLLMENT ===== */

// Enroll in a course
router.post(
  "/courses/:courseId/enroll",
  authenticate,
  CLIEController.enrollInCourse
);

// Check if user can enroll in a course
router.get(
  "/courses/:courseId/can-enroll",
  authenticate,
  CLIEController.canEnrollInCourse
);

// Get user's enrollments
router.get("/enrollments", authenticate, CLIEController.getEnrollments);

/* ===== LESSON PROGRESS ===== */

// Get user's progress for a course
router.get(
  "/courses/:courseId/progress",
  authenticate,
  CLIEController.getCourseProgress
);

// Mark lesson as started
router.post(
  "/lessons/:lessonId/start",
  authenticate,
  CLIEController.startLesson
);

/* ===== QUIZ SUBMISSION ===== */

// Submit quiz answers
router.post(
  "/lessons/:lessonId/submit-quiz",
  authenticate,
  CLIEController.submitQuiz
);

// Get randomized quizzes for retry
router.get(
  "/lessons/:lessonId/quizzes/randomized",
  authenticate,
  CLIEController.getRandomizedQuizzes
);

/* ===== LEADERBOARD ===== */

// Get leaderboard
router.get("/leaderboard", CLIEController.getLeaderboard);

/* ===== ANONYMOUS USER SYNC ===== */

// Sync anonymous user data after login
router.post("/sync-anonymous", authenticate, CLIEController.syncAnonymousData);

export default router;
