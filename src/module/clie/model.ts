import { db } from "../../config/db.ts";

export interface CLIEUser {
  id: string;
  user_id: string;
  total_points: number;
  points_by_category: Record<string, number>;
  enrollments: EnrollmentData[];
  category_progress: CategoryProgress;
  redemptions: RedemptionData[];
  certificates: CertificateData[];
  achievements: AchievementData[];
  total_courses_enrolled: number;
  total_courses_completed: number;
  total_lessons_completed: number;
  total_quizzes_passed: number;
  created_at: string;
  updated_at: string;
  last_active_at: string;
}

export interface EnrollmentData {
  course_id: string;
  category: string;
  difficulty: string;
  enrolled_at: string;
  status: "enrolled" | "in_progress" | "completed";
  progress_percentage: number;
  lessons_completed: number;
  points_earned: number;
  completed_at?: string;
}

export interface CategoryProgress {
  [category: string]: {
    [difficulty: string]: {
      completed: boolean;
      completed_at?: string;
    };
  };
}

export interface RedemptionData {
  redeemed_at: string;
  points_spent: number;
  item: string;
}

export interface CertificateData {
  category: string;
  issued_at: string;
  certificate_url: string;
}

export interface AchievementData {
  badge_id: string;
  earned_at: string;
  title: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  status: "not_started" | "in_progress" | "completed";
  quiz_attempted: boolean;
  quiz_passed: boolean;
  last_attempt_score: number;
  total_attempts: number;
  points_earned: number;
  started_at: string | null;
  completed_at: string | null;
  last_accessed_at: string;
  created_at: string;
  updated_at: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  lesson_id: string;
  attempt_number: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  score_percentage: number;
  passed: boolean;
  answers: QuizAnswerDetail[];
  points_earned: number;
  time_taken_seconds: number | null;
  attempted_at: string;
  created_at: string;
}

export interface QuizAnswerDetail {
  quiz_id: string;
  question: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  question_order: number;
  points_earned: number;
}

export interface CreateCLIEUserInput {
  user_id: string;
}

export interface CreateLessonProgressInput {
  user_id: string;
  lesson_id: string;
  course_id: string;
}

export interface UpdateLessonProgressInput {
  status?: "not_started" | "in_progress" | "completed";
  quiz_attempted?: boolean;
  quiz_passed?: boolean;
  last_attempt_score?: number;
  total_attempts?: number;
  points_earned?: number;
  started_at?: string;
  completed_at?: string;
}

export interface CreateQuizAttemptInput {
  user_id: string;
  lesson_id: string;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  score_percentage: number;
  passed: boolean;
  answers: QuizAnswerDetail[];
  points_earned: number;
  time_taken_seconds?: number;
}

export interface AnonymousUserData {
  enrollments: Array<{
    course_id: string;
    enrolled_at: string;
  }>;
  quiz_attempts: Array<{
    lesson_id: string;
    score: number;
    correct: number;
    total: number;
    answers: QuizAnswerDetail[];
  }>;
  lesson_progress: Record<
    string,
    {
      status: string;
      quiz_passed: boolean;
    }
  >;
}

/* ===== CLIE USER MODEL ===== */

export class CLIEUserModel {
  /**
   * Create a new CLIE user record
   */
  static async create(payload: CreateCLIEUserInput): Promise<CLIEUser> {
    const query = `
      INSERT INTO clie_users (
        user_id
      )
      VALUES ($1)
      RETURNING *
    `;

    const values = [payload.user_id];

    const result = await db.query<CLIEUser>(query, values);
    return result.rows[0]!;
  }

  /**
   * Get CLIE user by user_id (from auth)
   */
  static async getByUserId(userId: string): Promise<CLIEUser | null> {
    const result = await db.query<CLIEUser>(
      `SELECT * FROM clie_users WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return result.rows[0] ?? null;
  }

  /**
   * Get CLIE user by id
   */
  static async getById(id: string): Promise<CLIEUser | null> {
    const result = await db.query<CLIEUser>(
      `SELECT * FROM clie_users WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  //   /**
  //    * Update CLIE user profile
  //    */
  //   static async updateProfile(
  //     userId: string,
  //     payload: UpdateCLIEUserInput
  //   ): Promise<CLIEUser> {
  //     const updates: string[] = [];
  //     const values: any[] = [];
  //     let paramIndex = 1;

  //     if (payload.craft_specialty !== undefined) {
  //       updates.push(`craft_specialty = $${paramIndex++}`);
  //       values.push(payload.craft_specialty);
  //     }
  //     if (payload.location !== undefined) {
  //       updates.push(`location = $${paramIndex++}`);
  //       values.push(payload.location);
  //     }
  //     if (payload.bio !== undefined) {
  //       updates.push(`bio = $${paramIndex++}`);
  //       values.push(payload.bio);
  //     }

  //     updates.push(`updated_at = NOW()`);
  //     values.push(userId);

  //     const query = `
  //       UPDATE clie_users
  //       SET ${updates.join(", ")}
  //       WHERE user_id = $${paramIndex}
  //       RETURNING *
  //     `;

  //     const result = await db.query<CLIEUser>(query, values);
  //     return result.rows[0]!;
  //   }

  /**
   * Add enrollment to user's enrollments JSONB array
   */
  static async addEnrollment(
    userId: string,
    enrollment: EnrollmentData
  ): Promise<void> {
    const query = `
      UPDATE clie_users
      SET enrollments = enrollments || $1::jsonb,
          total_courses_enrolled = total_courses_enrolled + 1,
          updated_at = NOW()
      WHERE user_id = $2
    `;

    await db.query(query, [JSON.stringify(enrollment), userId]);
  }

  /**
   * Update specific enrollment in JSONB array
   */
  static async updateEnrollment(
    userId: string,
    courseId: string,
    updates: Partial<EnrollmentData>
  ): Promise<void> {
    // First, get current enrollments
    const result = await db.query<{ enrollments: EnrollmentData[] }>(
      `SELECT enrollments FROM clie_users WHERE user_id = $1`,
      [userId]
    );

    const enrollments = result.rows[0]?.enrollments || [];
    const enrollmentIndex = enrollments.findIndex(
      (e) => e.course_id === courseId
    );

    if (enrollmentIndex === -1) {
      throw new Error("Enrollment not found");
    }

    // Update the enrollment
    enrollments[enrollmentIndex] = {
      ...enrollments[enrollmentIndex]!,
      ...updates,
    } as EnrollmentData;

    // Save back to database
    await db.query(
      `UPDATE clie_users SET enrollments = $1::jsonb, updated_at = NOW() WHERE user_id = $2`,
      [JSON.stringify(enrollments), userId]
    );
  }

  /**
   * Update user's total points
   */
  static async addPoints(
    userId: string,
    points: number,
    category: string
  ): Promise<void> {
    const query = `
      UPDATE clie_users
      SET 
        total_points = total_points + $1,
        points_by_category = jsonb_set(
          points_by_category,
          '{${category}}',
          (COALESCE(points_by_category->>'${category}', '0')::int + $1)::text::jsonb
        ),
        updated_at = NOW()
      WHERE user_id = $2
    `;

    await db.query(query, [points, userId]);
  }

  /**
   * Update category progress
   */
  static async updateCategoryProgress(
    userId: string,
    category: string,
    difficulty: string,
    completed: boolean
  ): Promise<void> {
    const query = `
      UPDATE clie_users
      SET 
        category_progress = jsonb_set(
          jsonb_set(
            COALESCE(category_progress, '{}'::jsonb),
            '{${category}}',
            COALESCE(category_progress->'${category}', '{}'::jsonb)
          ),
          '{${category},${difficulty}}',
          jsonb_build_object(
            'completed', $1::boolean,
            'completed_at', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          )
        ),
        updated_at = NOW()
      WHERE user_id = $2
    `;

    await db.query(query, [completed, userId]);
  }

  /**
   * Increment lesson completed counter
   */
  static async incrementLessonsCompleted(userId: string): Promise<void> {
    await db.query(
      `UPDATE clie_users 
       SET total_lessons_completed = total_lessons_completed + 1,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
  }

  /**
   * Increment quiz passed counter
   */
  static async incrementQuizzesPassed(userId: string): Promise<void> {
    await db.query(
      `UPDATE clie_users 
       SET total_quizzes_passed = total_quizzes_passed + 1,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
  }

  /**
   * Increment course completed counter
   */
  static async incrementCoursesCompleted(userId: string): Promise<void> {
    await db.query(
      `UPDATE clie_users 
       SET total_courses_completed = total_courses_completed + 1,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
  }

  /**
   * Get leaderboard (top users by points)
   */
  static async getLeaderboard(limit: number = 10): Promise<any[]> {
    const query = `
      SELECT 
        cu.user_id,
        u.name,
        u.email,
        cu.total_points,
        cu.total_courses_completed,
        cu.total_lessons_completed,
        cu.total_quizzes_passed,
        RANK() OVER (ORDER BY cu.total_points DESC) as rank
      FROM clie_users cu
      JOIN users u ON cu.user_id = u.id
      ORDER BY cu.total_points DESC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    return result.rows;
  }

  /**
   * Update last active timestamp
   */
  static async updateLastActive(userId: string): Promise<void> {
    await db.query(
      `UPDATE clie_users SET last_active_at = NOW() WHERE user_id = $1`,
      [userId]
    );
  }
}

/* ===== LESSON PROGRESS MODEL ===== */

export class LessonProgressModel {
  /**
   * Create lesson progress record
   */
  static async create(
    payload: CreateLessonProgressInput
  ): Promise<LessonProgress> {
    const query = `
      INSERT INTO lesson_progress (
        user_id,
        lesson_id,
        course_id
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [payload.user_id, payload.lesson_id, payload.course_id];

    const result = await db.query<LessonProgress>(query, values);
    return result.rows[0]!;
  }

  /**
   * Get lesson progress for a user and lesson
   */
  static async getByUserAndLesson(
    userId: string,
    lessonId: string
  ): Promise<LessonProgress | null> {
    const result = await db.query<LessonProgress>(
      `SELECT * FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2 LIMIT 1`,
      [userId, lessonId]
    );
    return result.rows[0] ?? null;
  }

  /**
   * Get all lesson progress for a user in a course
   */
  static async getByCourseAndUser(
    userId: string,
    courseId: string
  ): Promise<LessonProgress[]> {
    const result = await db.query<LessonProgress>(
      `SELECT * FROM lesson_progress 
       WHERE user_id = $1 AND course_id = $2 
       ORDER BY last_accessed_at DESC`,
      [userId, courseId]
    );
    return result.rows;
  }

  /**
   * Update lesson progress
   */
  static async update(
    userId: string,
    lessonId: string,
    payload: UpdateLessonProgressInput
  ): Promise<LessonProgress> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (payload.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(payload.status);
    }
    if (payload.quiz_attempted !== undefined) {
      updates.push(`quiz_attempted = $${paramIndex++}`);
      values.push(payload.quiz_attempted);
    }
    if (payload.quiz_passed !== undefined) {
      updates.push(`quiz_passed = $${paramIndex++}`);
      values.push(payload.quiz_passed);
    }
    if (payload.last_attempt_score !== undefined) {
      updates.push(`last_attempt_score = $${paramIndex++}`);
      values.push(payload.last_attempt_score);
    }
    if (payload.total_attempts !== undefined) {
      updates.push(`total_attempts = $${paramIndex++}`);
      values.push(payload.total_attempts);
    }
    if (payload.points_earned !== undefined) {
      updates.push(`points_earned = $${paramIndex++}`);
      values.push(payload.points_earned);
    }
    if (payload.started_at !== undefined) {
      updates.push(`started_at = $${paramIndex++}`);
      values.push(payload.started_at);
    }
    if (payload.completed_at !== undefined) {
      updates.push(`completed_at = $${paramIndex++}`);
      values.push(payload.completed_at);
    }

    updates.push(`last_accessed_at = NOW()`);
    updates.push(`updated_at = NOW()`);

    values.push(userId, lessonId);

    const query = `
      UPDATE lesson_progress
      SET ${updates.join(", ")}
      WHERE user_id = $${paramIndex++} AND lesson_id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query<LessonProgress>(query, values);
    return result.rows[0]!;
  }

  /**
   * Get count of completed lessons in a course
   */
  static async getCompletedCount(
    userId: string,
    courseId: string
  ): Promise<number> {
    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM lesson_progress 
       WHERE user_id = $1 AND course_id = $2 AND status = 'completed'`,
      [userId, courseId]
    );
    return parseInt(result.rows[0]?.count || "0", 10);
  }

  /**
   * Check if all lessons in course are completed
   */
  static async areAllLessonsCompleted(
    userId: string,
    courseId: string,
    totalLessons: number
  ): Promise<boolean> {
    const completed = await this.getCompletedCount(userId, courseId);
    return completed === totalLessons;
  }
}

/* ===== QUIZ ATTEMPT MODEL ===== */

export class QuizAttemptModel {
  /**
   * Create quiz attempt
   */
  static async create(payload: CreateQuizAttemptInput): Promise<QuizAttempt> {
    // Get current attempt number
    const attemptResult = await db.query<{ attempt_number: number }>(
      `SELECT COALESCE(MAX(attempt_number), 0) + 1 as attempt_number
       FROM quiz_attempts
       WHERE user_id = $1 AND lesson_id = $2`,
      [payload.user_id, payload.lesson_id]
    );

    const attemptNumber = attemptResult.rows[0]?.attempt_number || 1;

    const query = `
      INSERT INTO quiz_attempts (
        user_id,
        lesson_id,
        attempt_number,
        total_questions,
        correct_answers,
        wrong_answers,
        score_percentage,
        passed,
        answers,
        points_earned,
        time_taken_seconds
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
      RETURNING *
    `;

    const values = [
      payload.user_id,
      payload.lesson_id,
      attemptNumber,
      payload.total_questions,
      payload.correct_answers,
      payload.wrong_answers,
      payload.score_percentage,
      payload.passed,
      JSON.stringify(payload.answers),
      payload.points_earned,
      payload.time_taken_seconds ?? null,
    ];

    const result = await db.query<QuizAttempt>(query, values);
    return result.rows[0]!;
  }

  /**
   * Get latest quiz attempt for user and lesson
   */
  static async getLatestAttempt(
    userId: string,
    lessonId: string
  ): Promise<QuizAttempt | null> {
    const result = await db.query<QuizAttempt>(
      `SELECT * FROM quiz_attempts 
       WHERE user_id = $1 AND lesson_id = $2 
       ORDER BY attempt_number DESC 
       LIMIT 1`,
      [userId, lessonId]
    );
    return result.rows[0] ?? null;
  }

  /**
   * Get all attempts for user and lesson
   */
  static async getAllAttempts(
    userId: string,
    lessonId: string
  ): Promise<QuizAttempt[]> {
    const result = await db.query<QuizAttempt>(
      `SELECT * FROM quiz_attempts 
       WHERE user_id = $1 AND lesson_id = $2 
       ORDER BY attempt_number DESC`,
      [userId, lessonId]
    );
    return result.rows;
  }

  /**
   * Get attempt count for user and lesson
   */
  static async getAttemptCount(
    userId: string,
    lessonId: string
  ): Promise<number> {
    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM quiz_attempts 
       WHERE user_id = $1 AND lesson_id = $2`,
      [userId, lessonId]
    );
    return parseInt(result.rows[0]?.count || "0", 10);
  }
}

export default {
  CLIEUserModel,
  LessonProgressModel,
  QuizAttemptModel,
};
