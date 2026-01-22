import { Router } from "express";
import { CLIEController, StatController } from "./controller.ts";
import { authenticate } from "../../middleware/auth.ts";

const router = Router();
router.get("/stats", StatController.getStats);
router.get("/dashboard", authenticate, CLIEController.getDashboard);
router.post(
  "/courses/:courseId/enroll",
  authenticate,
  CLIEController.enrollInCourse,
);
router.get(
  "/courses/:courseId/can-enroll",
  authenticate,
  CLIEController.canEnrollInCourse,
);
router.get("/enrollments", authenticate, CLIEController.getEnrollments);
router.get(
  "/courses/:courseId/progress",
  authenticate,
  CLIEController.getCourseProgress,
);
router.post(
  "/lessons/:lessonId/start",
  authenticate,
  CLIEController.startLesson,
);
router.post(
  "/lessons/:lessonId/submit-quiz",
  authenticate,
  CLIEController.submitQuiz,
);
router.get(
  "/lessons/:lessonId/quizzes/randomized",
  authenticate,
  CLIEController.getRandomizedQuizzes,
);
router.get("/leaderboard", CLIEController.getLeaderboard);
router.post("/sync-anonymous", authenticate, CLIEController.syncAnonymousData);
export default router;
