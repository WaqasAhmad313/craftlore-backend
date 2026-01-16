import type { Request, Response } from "express";
import { CourseService } from "./service.ts";
import type {
  CreateCourseInput,
  CreateLessonInput,
  CreateQuizInput,
  BulkLessonInput,
} from "./model.ts";

/* ===== Typed Express Params ===== */
interface CourseIdParams {
  courseId: string;
}

interface LessonIdParams {
  lessonId: string;
}

export class CourseController {
  /* -------- COURSES -------- */

  static async createCourse(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body as CreateCourseInput;
      const course = await CourseService.createCourse(payload);
      return res.status(201).json(course);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async getCourse(
    req: Request<CourseIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const { courseId } = req.params;
      const course = await CourseService.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      return res.json(course);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  /* -------- MANUAL LESSONS & QUIZZES -------- */

  static async createLesson(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body as CreateLessonInput;
      const lesson = await CourseService.createLesson(payload);
      return res.status(201).json(lesson);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async createQuiz(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body as CreateQuizInput;
      const quiz = await CourseService.createQuiz(payload);
      return res.status(201).json(quiz);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  /* -------- BULK LESSONS + QUIZZES -------- */

  static async bulkCreateLessons(
    req: Request<CourseIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const { courseId } = req.params;
      const lessons = req.body.lessons as BulkLessonInput[];

      if (!lessons || !Array.isArray(lessons)) {
        return res.status(400).json({ message: "Lessons array is required" });
      }

      const createdLessons = await CourseService.bulkCreateLessonsWithQuizzes(
        courseId,
        lessons
      );
      return res.status(201).json(createdLessons);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  /* -------- GETTERS -------- */

  static async getLessonsByCourse(
    req: Request<CourseIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const { courseId } = req.params;
      const lessons = await CourseService.getLessonsByCourse(courseId);
      return res.json(lessons);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async getQuizzesByLesson(
    req: Request<LessonIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const { lessonId } = req.params;
      const quizzes = await CourseService.getQuizzesByLesson(lessonId);
      return res.json(quizzes);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async getAllCourses(req: Request, res: Response): Promise<Response> {
    try {
      const courses = await CourseService.getAllCourses();
      return res.json(courses);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }
}
