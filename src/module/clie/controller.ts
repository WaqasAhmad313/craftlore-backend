import type { Response, Request, NextFunction } from "express";
import { CLIEService, StatService } from "./service.ts";
import type { AuthenticatedRequest } from "../../middleware/auth.ts";
import type { AnonymousUserData } from "./model.ts";

/* ===== Typed Params ===== */
interface CourseIdParams {
  courseId: string;
  [key: string]: string;
}

interface LessonIdParams {
  lessonId: string;
  [key: string]: string;
}

/* ===== Extended Request Types ===== */
interface AuthRequestWithCourseId extends AuthenticatedRequest {
  params: CourseIdParams;
}

interface AuthRequestWithLessonId extends AuthenticatedRequest {
  params: LessonIdParams;
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
      console.log('📊 [CLIE] Dashboard request received');
      console.log('📊 [CLIE] req.user:', req.user);
      
      const userId = req.user?.id;

      if (!userId) {
        console.error('❌ [CLIE] Dashboard: No user ID in req.user');
        return res.status(401).json({
          success: false,
          message: "Unauthorized - No user ID",
        });
      }

      console.log('✅ [CLIE] Dashboard: User ID found:', userId);

      const data = await CLIEService.getDashboardData(userId);

      return res.json({
        success: true,
        data,
      });
    } catch (error: unknown) {
      console.error('❌ [CLIE] Dashboard error:', error);
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }

  /* ===== COURSE ENROLLMENT ===== */

  /**
   * POST /clie/courses/:courseId/enroll
   * Enroll in a course
   */
  static async enrollInCourse(
    req: AuthRequestWithCourseId,
    res: Response
  ): Promise<Response> {
    try {
      console.log('📝 [CLIE] Enroll request received');
      console.log('📝 [CLIE] req.user:', req.user);
      
      const userId = req.user?.id;

      if (!userId) {
        console.error('❌ [CLIE] Enroll: No user ID in req.user');
        return res.status(401).json({
          success: false,
          message: "Unauthorized - No user ID",
        });
      }

      const { courseId } = req.params;
      console.log('✅ [CLIE] Enrolling user:', userId, 'in course:', courseId);

      const result = await CLIEService.enrollInCourse(userId, courseId);

      return res.status(201).json({
        success: true,
        message: result.message,
      });
    } catch (error: unknown) {
      console.error('❌ [CLIE] Enroll error:', error);
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
        console.error('❌ [CLIE] Can-enroll: No user ID in req.user');
        return res.status(401).json({
          success: false,
          message: "Unauthorized - No user ID",
        });
      }

      const { courseId } = req.params;
      const result = await CLIEService.canEnrollInCourse(userId, courseId);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      console.error('❌ [CLIE] Can-enroll error:', error);
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
        console.error('❌ [CLIE] Enrollments: No user ID in req.user');
        return res.status(401).json({
          success: false,
          message: "Unauthorized - No user ID",
        });
      }

      const enrollments = await CLIEService.getUserEnrollments(userId);

      return res.json({
        success: true,
        data: enrollments,
      });
    } catch (error: unknown) {
      console.error('❌ [CLIE] Enrollments error:', error);
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
    req: AuthRequestWithCourseId,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        console.error('❌ [CLIE] Course progress: No user ID in req.user');
        return res.status(401).json({
          success: false,
          message: "Unauthorized - No user ID",
        });
      }

      const { courseId } = req.params;
      const progress = await CLIEService.getCourseProgress(userId, courseId);

      return res.json({
        success: true,
        data: progress,
      });
    } catch (error: unknown) {
      console.error('❌ [CLIE] Course progress error:', error);
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
        console.error('❌ [CLIE] Start lesson: No user ID in req.user');
        return res.status(401).json({
          success: false,
          message: "Unauthorized - No user ID",
        });
      }

      const { lessonId } = req.params;
      const progress = await CLIEService.startLesson(userId, lessonId);

      return res.json({
        success: true,
        data: progress,
      });
    } catch (error: unknown) {
      console.error('❌ [CLIE] Start lesson error:', error);
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
      console.log('📝 [CLIE] ========================================');
      console.log('📝 [CLIE] QUIZ SUBMISSION REQUEST');
      console.log('📝 [CLIE] ========================================');
      console.log('📝 [CLIE] req.user object:', JSON.stringify(req.user, null, 2));
      console.log('📝 [CLIE] Lesson ID:', req.params.lessonId);
      console.log('📝 [CLIE] Answers count:', req.body.answers?.length);
      console.log('📝 [CLIE] Time taken:', req.body.time_taken);

      const userId = req.user?.id;

      // ✅ CRITICAL CHECK with detailed logging
      if (!userId) {
        console.error('❌ [CLIE] QUIZ SUBMIT FAILED: No user ID!');
        console.error('❌ [CLIE] req.user:', req.user);
        console.error('❌ [CLIE] req.user?.id:', req.user?.id);
        console.error('❌ [CLIE] typeof req.user?.id:', typeof req.user?.id);
        return res.status(401).json({
          success: false,
          message: "Unauthorized - User ID not found",
        });
      }

      // ✅ Additional check for empty string
      if (userId.trim() === '') {
        console.error('❌ [CLIE] QUIZ SUBMIT FAILED: User ID is empty string!');
        return res.status(401).json({
          success: false,
          message: "Unauthorized - User ID is empty",
        });
      }

      console.log('✅ [CLIE] User ID extracted successfully:', {
        userId: userId,
        userIdLength: userId.length,
        userIdType: typeof userId
      });

      const { lessonId } = req.params;
      const { answers, time_taken } = req.body;

      if (!answers || !Array.isArray(answers)) {
        console.error('❌ [CLIE] Invalid answers format');
        return res.status(400).json({
          success: false,
          message: "Answers array is required",
        });
      }

      console.log('✅ [CLIE] Calling CLIEService.submitQuiz with:', {
        userId,
        lessonId,
        answersCount: answers.length,
        timeTaken: time_taken
      });

      const result = await CLIEService.submitQuiz(
        userId,
        lessonId,
        answers,
        time_taken
      );

      console.log('✅ [CLIE] Quiz submitted successfully:', {
        passed: result.passed,
        points: result.points_earned,
        score: result.score_percentage
      });
      console.log('📝 [CLIE] ========================================');

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      console.error('❌ [CLIE] ========================================');
      console.error('❌ [CLIE] QUIZ SUBMIT ERROR:', error);
      console.error('❌ [CLIE] Error message:', (error as Error).message);
      console.error('❌ [CLIE] Error stack:', (error as Error).stack);
      console.error('❌ [CLIE] ========================================');
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
      console.error('❌ [CLIE] Randomized quizzes error:', error);
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
    req: Request,
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
      console.error('❌ [CLIE] Leaderboard error:', error);
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
        console.error('❌ [CLIE] Sync anonymous: No user ID in req.user');
        return res.status(401).json({
          success: false,
          message: "Unauthorized - No user ID",
        });
      }

      const anonymousData = req.body as AnonymousUserData;
      const result = await CLIEService.syncAnonymousData(
        userId,
        anonymousData
      );

      return res.json({
        success: true,
        message: result.message,
      });
    } catch (error: unknown) {
      console.error('❌ [CLIE] Sync anonymous error:', error);
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }
}

export class StatController {
  static async getStats(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const stats = await StatService.getDashboardStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}