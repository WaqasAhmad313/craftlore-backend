import { Router } from "express";
import { CourseController } from "./controller.ts";

const router = Router();

/* ===== COURSES ===== */
router.get("/courses", CourseController.getAllCourses);

// Create a new course
router.post("/courses", CourseController.createCourse);

// Get a course by ID
router.get("/courses/:courseId", CourseController.getCourse);

// Get all lessons for a course
router.get("/courses/:courseId/lessons", CourseController.getLessonsByCourse);

// Bulk create lessons + quizzes for a course
router.post("/courses/:courseId/lessons/bulk", CourseController.bulkCreateLessons);

/* ===== LESSONS ===== */

// Create a single lesson manually
router.post("/lessons", CourseController.createLesson);

// Get quizzes by lesson ID
router.get("/lessons/:lessonId/quizzes", CourseController.getQuizzesByLesson);

/* ===== QUIZZES ===== */

// Create a single quiz manually
router.post("/quizzes", CourseController.createQuiz);

export default router;
