import {
  CLIEUserModel,
  LessonProgressModel,
  QuizAttemptModel,
  StatModel,
  type CLIEUser,
  type CreateCLIEUserInput,
  type LessonProgress,
  type QuizAnswerDetail,
  type AnonymousUserData,
  type EnrollmentData,
  type CategoryProgress,
} from "./model.ts";
import CourseModel from "../courses/model.ts";
import type { Course, Lesson, Quiz } from "../courses/model.ts";

export class CLIEService {
  /* ===== CLIE USER MANAGEMENT ===== */

  /**
   * Get or create CLIE user
   * If user doesn't exist in clie_users, create it
   */
  static async getOrCreateUser(
    userId: string,
    initialData?: CreateCLIEUserInput,
  ): Promise<CLIEUser> {
    let clieUser = await CLIEUserModel.getByUserId(userId);

    if (!clieUser) {
      clieUser = await CLIEUserModel.create({
        user_id: userId,
        ...initialData,
      });
    }

    // Update last active
    await CLIEUserModel.updateLastActive(userId);

    return clieUser;
  }
  /**
   * Get user dashboard data
   */
  static async getDashboardData(userId: string): Promise<{
    user: {
      id: string;
      total_points: number;
      lessons_completed: number;
      quizzes_passed: number;
      courses_completed: number;
    };
    enrollments: EnrollmentData[];
    categoryProgress: CategoryProgress;
  }> {
    console.log("📊 [SERVICE] Getting dashboard data for user:", userId);

    // Get or create CLIE user (this has EVERYTHING we need!)
    const clieUser = await this.getOrCreateUser(userId);

    // Build categoryProgress from enrollments if empty
    let categoryProgress = clieUser.category_progress || {};

    if (
      Object.keys(categoryProgress).length === 0 &&
      clieUser.enrollments.length > 0
    ) {
      console.log("🔧 [SERVICE] Building categoryProgress from enrollments");

      categoryProgress = {};
      for (const enrollment of clieUser.enrollments) {
        if (!categoryProgress[enrollment.category]) {
          categoryProgress[enrollment.category] = {};
        }

        const category = categoryProgress[enrollment.category];
        if (category) {
          category[enrollment.difficulty] = {
            completed: enrollment.status === "completed",
            completed_at: enrollment.completed_at || undefined,
          };
        }
      }
    }

    console.log("✅ [SERVICE] Dashboard data loaded");

    return {
      user: {
        id: clieUser.id,
        total_points: clieUser.total_points || 0,
        lessons_completed: clieUser.total_lessons_completed || 0,
        quizzes_passed: clieUser.total_quizzes_passed || 0,
        courses_completed: clieUser.total_courses_completed || 0,
      },
      enrollments: clieUser.enrollments || [],
      categoryProgress: categoryProgress,
    };
  }

  /* ===== COURSE ENROLLMENT ===== */

  /**
   * Check if user can enroll in a course (prerequisite checking)
   */
  static async canEnrollInCourse(
    userId: string,
    courseId: string,
  ): Promise<{ can_enroll: boolean; reason?: string }> {
    const course = await CourseModel.getCourseById(courseId);
    if (!course) {
      return { can_enroll: false, reason: "Course not found" };
    }

    const clieUser = await CLIEUserModel.getByUserId(userId);
    if (!clieUser) {
      // New user - can only enroll in beginner
      if (course.difficulty_level === "beginner") {
        return { can_enroll: true };
      }
      return {
        can_enroll: false,
        reason: "Complete beginner courses first",
      };
    }

    // Check if already enrolled
    const existingEnrollment = clieUser.enrollments.find(
      (e) => e.course_id === courseId,
    );
    if (existingEnrollment) {
      return {
        can_enroll: false,
        reason: "Already enrolled in this course",
      };
    }

    // Beginner courses are always available
    if (course.difficulty_level === "beginner") {
      return { can_enroll: true };
    }

    const categoryProgress =
      clieUser.category_progress[course.craft_category] || {};

    // For intermediate: check beginner completion
    if (course.difficulty_level === "intermediate") {
      const beginnerCompleted = categoryProgress.beginner?.completed || false;
      if (!beginnerCompleted) {
        return {
          can_enroll: false,
          reason: `Complete ${course.craft_category} Beginner courses first`,
        };
      }
      return { can_enroll: true };
    }

    // For advanced: check beginner AND intermediate completion
    if (course.difficulty_level === "advanced") {
      const beginnerCompleted = categoryProgress.beginner?.completed || false;
      const intermediateCompleted =
        categoryProgress.intermediate?.completed || false;

      if (!beginnerCompleted || !intermediateCompleted) {
        return {
          can_enroll: false,
          reason: `Complete ${course.craft_category} Beginner and Intermediate courses first`,
        };
      }
      return { can_enroll: true };
    }

    return { can_enroll: false, reason: "Unknown error" };
  }

  /**
   * Enroll user in a course
   */
  static async enrollInCourse(
    userId: string,
    courseId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Check if user can enroll
    const { can_enroll, reason } = await this.canEnrollInCourse(
      userId,
      courseId,
    );
    if (!can_enroll) {
      throw new Error(reason || "Cannot enroll in this course");
    }

    // Get course details
    const course = await CourseModel.getCourseById(courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    // Get all lessons in the course
    const lessons = await CourseModel.getLessonsByCourse(courseId);

    // Ensure user exists in clie_users
    await this.getOrCreateUser(userId);

    // Create enrollment data
    const enrollmentData: EnrollmentData = {
      course_id: courseId,
      category: course.craft_category,
      difficulty: course.difficulty_level,
      enrolled_at: new Date().toISOString(),
      status: "enrolled",
      progress_percentage: 0,
      lessons_completed: 0,
      points_earned: 0,
    };

    // Add enrollment to user
    await CLIEUserModel.addEnrollment(userId, enrollmentData);

    // Create lesson progress records for all lessons
    for (const lesson of lessons) {
      await LessonProgressModel.create({
        user_id: userId,
        lesson_id: lesson.id,
        course_id: courseId,
      });
    }

    return {
      success: true,
      message: "Successfully enrolled in course",
    };
  }

  /**
   * Get user's enrollments with course details
   */
  static async getUserEnrollments(userId: string): Promise<any[]> {
    const clieUser = await CLIEUserModel.getByUserId(userId);
    if (!clieUser) {
      return [];
    }

    // Enrich enrollments with course data
    const enrichedEnrollments = await Promise.all(
      clieUser.enrollments.map(async (enrollment) => {
        const course = await CourseModel.getCourseById(enrollment.course_id);
        return {
          ...enrollment,
          course_title: course?.title,
          course_description: course?.description,
        };
      }),
    );

    return enrichedEnrollments;
  }

  /* ===== LESSON PROGRESS ===== */

  /**
   * Get user's progress for a specific course
   */
  static async getCourseProgress(
    userId: string,
    courseId: string,
  ): Promise<{
    course: Course | null;
    lessons: Array<Lesson & { progress: LessonProgress | null }>;
    enrollment: EnrollmentData | null;
  }> {
    const course = await CourseModel.getCourseById(courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    const lessons = await CourseModel.getLessonsByCourse(courseId);
    const progressRecords = await LessonProgressModel.getByCourseAndUser(
      userId,
      courseId,
    );

    // Merge lessons with progress
    const lessonsWithProgress = lessons.map((lesson) => ({
      ...lesson,
      progress: progressRecords.find((p) => p.lesson_id === lesson.id) || null,
    }));

    // Get enrollment data
    const clieUser = await CLIEUserModel.getByUserId(userId);
    const enrollment =
      clieUser?.enrollments.find((e) => e.course_id === courseId) || null;

    return {
      course,
      lessons: lessonsWithProgress,
      enrollment,
    };
  }

  /**
   * Mark lesson as started
   */
  static async startLesson(
    userId: string,
    lessonId: string,
  ): Promise<LessonProgress> {
    let progress = await LessonProgressModel.getByUserAndLesson(
      userId,
      lessonId,
    );

    if (!progress) {
      throw new Error("Lesson progress not found. Enroll in course first.");
    }

    if (progress.status === "not_started") {
      progress = await LessonProgressModel.update(userId, lessonId, {
        status: "in_progress",
        started_at: new Date().toISOString(),
      });
    }

    return progress;
  }

  static async submitQuiz(
    userId: string,
    lessonId: string,
    answers: Array<{
      quiz_id: string;
      selected_answer: string;
    }>,
    timeTaken?: number,
  ): Promise<{
    passed: boolean;
    score_percentage: number;
    correct_answers: number;
    wrong_answers: number;
    points_earned: number;
    answers: QuizAnswerDetail[];
    attempt_number: number;
  }> {
    console.log("📝 [SERVICE] submitQuiz called:", {
      userId,
      lessonId,
      answersCount: answers.length,
    });

    // ✅ FIX 1: First get all quizzes to find the lesson details
    const quizzes = await CourseModel.getQuizzesByLesson(lessonId);
    if (quizzes.length === 0) {
      throw new Error("No quizzes found for this lesson");
    }
    console.log("✅ [SERVICE] Quizzes loaded:", quizzes.length);

    // ✅ FIX 2: Get lesson progress to find course_id
    const progress = await LessonProgressModel.getByUserAndLesson(
      userId,
      lessonId,
    );
    if (!progress) {
      throw new Error(
        "Lesson progress not found. Please start the lesson first.",
      );
    }

    const courseId = progress.course_id;
    if (!courseId) {
      throw new Error("Course ID not found in lesson progress");
    }
    console.log("✅ [SERVICE] Course ID found:", courseId);

    // ✅ FIX 3: Now get the lesson with valid course_id (not empty string!)
    const lessonResult = await CourseModel.getLessonsByCourse(courseId);
    const lesson = lessonResult.find((l) => l.id === lessonId);
    if (!lesson) {
      throw new Error("Lesson not found");
    }
    console.log("✅ [SERVICE] Lesson found:", {
      id: lesson.id,
      points: lesson.points_reward,
    });

    // Process answers
    const answerDetails: QuizAnswerDetail[] = [];
    let correctCount = 0;

    for (let i = 0; i < answers.length; i++) {
      const userAnswer = answers[i];
      const quiz = quizzes.find((q) => q.id === userAnswer!.quiz_id);

      if (!quiz) continue;

      const isCorrect = userAnswer!.selected_answer === quiz.correct_answer;
      if (isCorrect) correctCount++;

      answerDetails.push({
        quiz_id: quiz.id,
        question: quiz.question,
        selected_answer: userAnswer!.selected_answer,
        correct_answer: quiz.correct_answer,
        is_correct: isCorrect,
        question_order: i + 1,
        points_earned: 0, // Will calculate later
      });
    }

    const totalQuestions = answers.length;
    const wrongCount = totalQuestions - correctCount;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = scorePercentage >= 50; // 50% = 3 out of 6

    console.log("📊 [SERVICE] Quiz graded:", {
      correct: correctCount,
      total: totalQuestions,
      score: scorePercentage,
      passed,
    });

    // Calculate points
    const lessonPoints = lesson.points_reward || 0;
    const pointsPerQuestion =
      totalQuestions > 0 ? lessonPoints / totalQuestions : 0;
    const pointsEarned = Math.round(pointsPerQuestion * correctCount);

    // Update points in answer details
    answerDetails.forEach((detail) => {
      if (detail.is_correct) {
        detail.points_earned = Math.round(pointsPerQuestion);
      }
    });

    // Create quiz attempt
    const attempt = await QuizAttemptModel.create({
      user_id: userId,
      lesson_id: lessonId,
      total_questions: totalQuestions,
      correct_answers: correctCount,
      wrong_answers: wrongCount,
      score_percentage: scorePercentage,
      passed,
      answers: answerDetails,
      points_earned: pointsEarned,
      time_taken_seconds: timeTaken ?? undefined,
    });

    console.log("✅ [SERVICE] Quiz attempt created:", attempt.id);

    // Update lesson progress - we already have progress from earlier
    const currentAttempts = progress.total_attempts + 1;

    await LessonProgressModel.update(userId, lessonId, {
      quiz_attempted: true,
      quiz_passed: passed,
      last_attempt_score: scorePercentage,
      total_attempts: currentAttempts,
      points_earned: passed ? pointsEarned : progress.points_earned,
      status: passed ? "completed" : "in_progress",
      completed_at: passed ? new Date().toISOString() : undefined,
    });

    console.log("✅ [SERVICE] Lesson progress updated");

    // If passed, award points and update user stats
    if (passed) {
      const course = await CourseModel.getCourseById(courseId);
      if (course) {
        await CLIEUserModel.addPoints(
          userId,
          pointsEarned,
          course.craft_category,
        );
        await CLIEUserModel.incrementLessonsCompleted(userId);
        await CLIEUserModel.incrementQuizzesPassed(userId);

        console.log("✅ [SERVICE] User stats updated:", {
          pointsAdded: pointsEarned,
          category: course.craft_category,
        });

        // Check if course is completed
        await this.checkAndUpdateCourseCompletion(userId, courseId);
      }
    }

    console.log("✅ [SERVICE] Quiz submission complete!");

    return {
      passed,
      score_percentage: scorePercentage,
      correct_answers: correctCount,
      wrong_answers: wrongCount,
      points_earned: pointsEarned,
      answers: answerDetails,
      attempt_number: attempt.attempt_number,
    };
  }

  /**
   * Check if course is completed and update accordingly
   */
  private static async checkAndUpdateCourseCompletion(
    userId: string,
    courseId: string,
  ): Promise<void> {
    const course = await CourseModel.getCourseById(courseId);
    if (!course) return;

    const lessons = await CourseModel.getLessonsByCourse(courseId);
    const totalLessons = lessons.length;

    const allCompleted = await LessonProgressModel.areAllLessonsCompleted(
      userId,
      courseId,
      totalLessons,
    );

    if (allCompleted) {
      const completedCount = await LessonProgressModel.getCompletedCount(
        userId,
        courseId,
      );
      const progressPercentage = 100;

      // Update enrollment status
      await CLIEUserModel.updateEnrollment(userId, courseId, {
        status: "completed",
        progress_percentage: progressPercentage,
        lessons_completed: completedCount,
        completed_at: new Date().toISOString(),
      });

      // Increment courses completed
      await CLIEUserModel.incrementCoursesCompleted(userId);

      // Check if all courses in category+difficulty are completed
      await this.checkAndUpdateCategoryProgress(
        userId,
        course.craft_category,
        course.difficulty_level,
      );
    } else {
      // Update progress percentage
      const completedCount = await LessonProgressModel.getCompletedCount(
        userId,
        courseId,
      );
      const progressPercentage = Math.round(
        (completedCount / totalLessons) * 100,
      );

      await CLIEUserModel.updateEnrollment(userId, courseId, {
        status: "in_progress",
        progress_percentage: progressPercentage,
        lessons_completed: completedCount,
      });
    }
  }

  /**
   * Check if all courses in a category+difficulty are completed
   */
  private static async checkAndUpdateCategoryProgress(
    userId: string,
    category: string,
    difficulty: string,
  ): Promise<void> {
    const clieUser = await CLIEUserModel.getByUserId(userId);
    if (!clieUser) return;

    // Get all courses in this category+difficulty
    const allCourses = await CourseModel.getAllCourses();
    const categoryCourses = allCourses.filter(
      (c) => c.craft_category === category && c.difficulty_level === difficulty,
    );

    // Check if user completed all of them
    const completedInCategory = clieUser.enrollments.filter(
      (e) =>
        e.category === category &&
        e.difficulty === difficulty &&
        e.status === "completed",
    );

    if (completedInCategory.length === categoryCourses.length) {
      await CLIEUserModel.updateCategoryProgress(
        userId,
        category,
        difficulty,
        true,
      );
    }
  }

  /* ===== LEADERBOARD ===== */

  /**
   * Get leaderboard
   */
  static async getLeaderboard(limit: number = 10): Promise<any[]> {
    return CLIEUserModel.getLeaderboard(limit);
  }

  /* ===== ANONYMOUS USER SYNC ===== */

  /**
   * Sync anonymous user data after login
   */
  static async syncAnonymousData(
    userId: string,
    anonymousData: AnonymousUserData,
  ): Promise<{ success: boolean; message: string }> {
    // Ensure user exists
    await this.getOrCreateUser(userId);

    // Process enrollments
    for (const enrollment of anonymousData.enrollments) {
      try {
        await this.enrollInCourse(userId, enrollment.course_id);
      } catch (error) {
        // If enrollment fails (already enrolled, etc.), continue
        console.error(
          `Failed to enroll in ${enrollment.course_id}:`,
          (error as Error).message,
        );
      }
    }

    // Process quiz attempts
    for (const attempt of anonymousData.quiz_attempts) {
      try {
        const answers = attempt.answers.map((a, index) => ({
          quiz_id: a.quiz_id,
          selected_answer: a.selected_answer,
        }));

        await this.submitQuiz(userId, attempt.lesson_id, answers);
      } catch (error) {
        console.error(
          `Failed to sync quiz for ${attempt.lesson_id}:`,
          (error as Error).message,
        );
      }
    }

    return {
      success: true,
      message: "Anonymous data synced successfully",
    };
  }

  /* ===== QUIZ RETRY (RANDOMIZATION) ===== */

  /**
   * Get randomized quiz questions for retry
   */
  static async getRandomizedQuizzes(lessonId: string): Promise<Quiz[]> {
    const quizzes = await CourseModel.getQuizzesByLesson(lessonId);

    // Shuffle quiz order
    const shuffledQuizzes = this.shuffleArray([...quizzes]);

    // Shuffle options within each quiz
    return shuffledQuizzes.map((quiz) => ({
      ...quiz,
      options: this.shuffleArray([...quiz.options]),
    }));
  }

  /**
   * Utility: Shuffle array (Fisher-Yates algorithm)
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  }
}
export class StatService {
  static async getDashboardStats() {
    const [totalCourses, activeLearners, totalLessons, totalPoints] =
      await Promise.all([
        StatModel.getTotalCourses(),
        StatModel.getActiveLearnersCount(),
        StatModel.getTotalLessons(),
        StatModel.getTotalPoints(),
      ]);

    return {
      totalCourses,
      activeLearners,
      totalLessons,
      totalPoints,
    };
  }
}
