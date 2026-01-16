import { db } from "../../config/db.ts";
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export interface QuizOption {
  id: string;
  text: string;
}

export interface CreateCourseInput {
  title: string;
  description?: string | null;
  craft_category: string;
  difficulty_level: DifficultyLevel;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  craft_category: string;
  difficulty_level: DifficultyLevel;
  created_at: string;
}

export interface CreateLessonInput {
  course_id: string;
  title: string;
  content: string;
  duration_minutes?: number | null;
  points_reward?: number | null;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content: string;
  duration_minutes: number | null;
  points_reward: number | null;
  created_at: string;
}

export interface CreateQuizInput {
  lesson_id: string;
  question: string;
  options: QuizOption[];
  correct_answer: string;
  explanation?: string | null;
}

export interface Quiz {
  id: string;
  lesson_id: string;
  question: string;
  options: QuizOption[];
  correct_answer: string;
  explanation: string | null;
  created_at: string;
}

export interface BulkQuizInput {
  question: string;
  options: QuizOption[];
  correct_answer: string;
  explanation?: string | null;
}

export interface BulkLessonInput {
  title: string;
  content: string;
  duration_minutes?: number | null;
  points_reward?: number | null;
  quizzes?: BulkQuizInput[];
}

export interface BulkCourseContentInput {
  course_id: string;
  lessons: BulkLessonInput[];
}

class CourseModel {
  static async createCourse(payload: CreateCourseInput): Promise<Course> {
    const query = `
      INSERT INTO courses (
        title,
        description,
        craft_category,
        difficulty_level
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      payload.title,
      payload.description ?? null,
      payload.craft_category,
      payload.difficulty_level,
    ];

    const result = await db.query<Course>(query, values);
    return result.rows[0]!;
  }

  static async getCourseById(id: string): Promise<Course | null> {
    const result = await db.query<Course>(
      `SELECT * FROM courses WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  /* -------- LESSONS -------- */

  static async createLesson(payload: CreateLessonInput): Promise<Lesson> {
    const query = `
      INSERT INTO lessons (
        course_id,
        title,
        content,
        duration_minutes,
        points_reward
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      payload.course_id,
      payload.title,
      payload.content,
      payload.duration_minutes ?? null,
      payload.points_reward ?? null,
    ];

    const result = await db.query<Lesson>(query, values);
    return result.rows[0]!;
  }

  static async getLessonsByCourse(courseId: string): Promise<Lesson[]> {
    const result = await db.query<Lesson>(
      `
      SELECT *
      FROM lessons
      WHERE course_id = $1
      ORDER BY created_at ASC
      `,
      [courseId]
    );
    return result.rows;
  }

  /* -------- QUIZZES -------- */

  static async createQuiz(payload: CreateQuizInput): Promise<Quiz> {
    const query = `
      INSERT INTO lesson_quizzes (
        lesson_id,
        question,
        options,
        correct_answer,
        explanation
      )
      VALUES ($1, $2, $3::jsonb, $4, $5)
      RETURNING *
    `;

    const values = [
      payload.lesson_id,
      payload.question,
      JSON.stringify(payload.options),
      payload.correct_answer,
      payload.explanation ?? null,
    ];

    const result = await db.query<Quiz>(query, values);
    return result.rows[0]!;
  }

  static async getQuizzesByLesson(lessonId: string): Promise<Quiz[]> {
    const result = await db.query<Quiz>(
      `
      SELECT *
      FROM lesson_quizzes
      WHERE lesson_id = $1
      ORDER BY created_at ASC
      `,
      [lessonId]
    );
    return result.rows;
  }

  /* -------- BULK: LESSONS + QUIZZES -------- */

  static async bulkUpsertCourseContent(
    payload: BulkCourseContentInput
  ): Promise<Lesson[]> {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const createdLessons: Lesson[] = [];

      for (const lesson of payload.lessons) {
        const lessonResult = await client.query<Lesson>(
          `
          INSERT INTO lessons (
            course_id,
            title,
            content,
            duration_minutes,
            points_reward
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
          `,
          [
            payload.course_id,
            lesson.title,
            lesson.content,
            lesson.duration_minutes ?? null,
            lesson.points_reward ?? null,
          ]
        );

        const createdLesson = lessonResult.rows[0]!;
        createdLessons.push(createdLesson);

        if (lesson.quizzes?.length) {
          for (const quiz of lesson.quizzes) {
            await client.query(
              `
              INSERT INTO lesson_quizzes (
                lesson_id,
                question,
                options,
                correct_answer,
                explanation
              )
              VALUES ($1, $2, $3::jsonb, $4, $5)
              `,
              [
                createdLesson.id,
                quiz.question,
                JSON.stringify(quiz.options),
                quiz.correct_answer,
                quiz.explanation ?? null,
              ]
            );
          }
        }
      }
      await client.query("COMMIT");
      return createdLessons;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async getAllCourses(): Promise<Course[]> {
    const result = await db.query<Course>(
      `SELECT * FROM courses ORDER BY created_at DESC`
    );
    return result.rows;
  }
}

export default CourseModel;
