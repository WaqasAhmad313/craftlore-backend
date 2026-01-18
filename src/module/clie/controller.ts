import type { Response } from "express";
import { CLIEService } from "./service.ts";
import type { AuthenticatedRequest } from "../../middleware/auth.ts";
import type { AnonymousUserData } from "./model.ts";

/* ===== Typed Params ===== */
interface CourseIdParams {
  courseId: string;
  [key: string]: string;
}

interface AuthRequestWithCourseId extends AuthenticatedRequest {
  params: CourseIdParams;
}

interface AuthRequestWithLessonId extends AuthenticatedRequest {
  params: LessonIdParams;
}

interface LessonIdParams {
  lessonId: string;
  [key: string]: string;
}

interface UserIdParams {
  userId: string;
}

export class CLIEController {
  /* ===== USER MANAGEMENT ===== */

  /**
   * GET /clie/dashboard
   * Get user dashboard data
   */
  static async getDashboard(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const data = await CLIEService.getDashboardData(userId);

      return res.json({
        success: true,
        data,
      });
    } catch (error: unknown) {
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /**
   * POST /clie/courses/:courseId/enroll
   * Enroll in a course
   */
  static async enrollInCourse(
    req: AuthRequestWithCourseId,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { courseId } = req.params;
      const result = await CLIEService.enrollInCourse(userId, courseId);

      return res.status(201).json({
        success: true,
        message: result.message,
      });
    } catch (error: unknown) {
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /**
   * GET /clie/courses/:courseId/can-enroll
   * Check if user can enroll in course
   */
  static async canEnrollInCourse(
    req: AuthRequestWithCourseId,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { courseId } = req.params;
      const result = await CLIEService.canEnrollInCourse(userId, courseId);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /**
   * GET /clie/enrollments
   * Get user's enrollments
   */
  static async getEnrollments(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const enrollments = await CLIEService.getUserEnrollments(userId);

      return res.json({
        success: true,
        data: enrollments,
      });
    } catch (error: unknown) {
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /* ===== LESSON PROGRESS ===== */

  /**
   * GET /clie/courses/:courseId/progress
   * Get user's progress for a course
   */
  static async getCourseProgress(
    req: AuthRequestWithLessonId,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { courseId } = req.params;
      if (!courseId) {
        return res.status(400).json({
          success: false,
          message: "Course ID is required",
        });
      }

      const progress = await CLIEService.getCourseProgress(userId, courseId);

      return res.json({
        success: true,
        data: progress,
      });
    } catch (error: unknown) {
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /**
   * POST /clie/lessons/:lessonId/start
   * Mark lesson as started
   */
  static async startLesson(
    req: AuthRequestWithLessonId,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { lessonId } = req.params;
      const progress = await CLIEService.startLesson(userId, lessonId);

      return res.json({
        success: true,
        data: progress,
      });
    } catch (error: unknown) {
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /* ===== QUIZ SUBMISSION ===== */

  /**
   * POST /clie/lessons/:lessonId/submit-quiz
   * Submit quiz answers
   */
  static async submitQuiz(
    req: AuthRequestWithLessonId,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { lessonId } = req.params;
      const { answers, time_taken } = req.body;

      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({
          success: false,
          message: "Answers array is required",
        });
      }

      const result = await CLIEService.submitQuiz(
        userId,
        lessonId,
        answers,
        time_taken
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /**
   * GET /clie/lessons/:lessonId/quizzes/randomized
   * Get randomized quizzes for retry
   */
  static async getRandomizedQuizzes(
    req: AuthRequestWithLessonId,
    res: Response
  ): Promise<Response> {
    try {
      const { lessonId } = req.params;
      const quizzes = await CLIEService.getRandomizedQuizzes(lessonId);

      return res.json({
        success: true,
        data: quizzes,
      });
    } catch (error: unknown) {
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /* ===== LEADERBOARD ===== */

  /**
   * GET /clie/leaderboard
   * Get leaderboard
   */
  static async getLeaderboard(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await CLIEService.getLeaderboard(limit);

      return res.json({
        success: true,
        data: leaderboard,
      });
    } catch (error: unknown) {
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /* ===== ANONYMOUS USER SYNC ===== */

  /**
   * POST /clie/sync-anonymous
   * Sync anonymous user data after login
   */
  static async syncAnonymousData(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const anonymousData = req.body as AnonymousUserData;
      const result = await CLIEService.syncAnonymousData(userId, anonymousData);

      return res.json({
        success: true,
        message: result.message,
      });
    } catch (error: unknown) {
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }
}
