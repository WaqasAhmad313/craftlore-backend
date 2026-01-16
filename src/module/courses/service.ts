import CourseModel from "./model.ts";
import type {
  CreateCourseInput,
  CreateLessonInput,
  CreateQuizInput,
  BulkCourseContentInput,
  BulkLessonInput,
  Course,
  Lesson,
  Quiz,
} from "./model.ts";

export class CourseService {
  private static MAX_LESSONS = 6;
  private static MAX_QUIZZES = 6;

  /* -------- COURSES -------- */

  static async createCourse(payload: CreateCourseInput): Promise<Course> {
    // No extra validation for now, just call model
    return CourseModel.createCourse(payload);
  }

  static async getCourseById(id: string): Promise<Course | null> {
    return CourseModel.getCourseById(id);
  }

  /* -------- MANUAL LESSON & QUIZ CREATION --------
     These methods wrap the bulk method internally
     to unify insert logic.
  */

  static async createLesson(payload: CreateLessonInput): Promise<Lesson> {
    // Wrap manual lesson as bulk of length 1
    const bulkPayload: BulkCourseContentInput = {
      course_id: payload.course_id,
      lessons: [
        {
          title: payload.title,
          content: payload.content,
          duration_minutes: payload.duration_minutes ?? null,
          points_reward: payload.points_reward ?? null,
          quizzes: [],
        },
      ],
    };

    const createdLessons = await CourseModel.bulkUpsertCourseContent(
      bulkPayload
    );

    if (!createdLessons[0]) {
      throw new Error("Failed to create lesson");
    }

    return createdLessons[0];
  }

  static async createQuiz(payload: CreateQuizInput): Promise<Quiz> {
    // Wrap manual quiz as bulk of length 1
    const bulkPayload: BulkCourseContentInput = {
      course_id: "", // course_id not used here
      lessons: [
        {
          title: "temp", // temp title ignored, will not create new lesson
          content: "temp",
          quizzes: [
            {
              question: payload.question,
              options: payload.options,
              correct_answer: payload.correct_answer,
              explanation: payload.explanation ?? null,
            },
          ],
        },
      ],
    };

    // Direct call to model is cleaner for single quiz
    // We'll call model.createQuiz directly to avoid fake lesson insert
    return CourseModel.createQuiz(payload);
  }

  /* -------- BULK CREATION: LESSONS + QUIZZES -------- */

  static async bulkCreateLessonsWithQuizzes(
    courseId: string,
    lessons: BulkLessonInput[]
  ): Promise<Lesson[]> {
    if (lessons.length > this.MAX_LESSONS) {
      throw new Error(
        `Cannot add more than ${this.MAX_LESSONS} lessons at once`
      );
    }

    // Validate quizzes per lesson
    for (const lesson of lessons) {
      if (lesson.quizzes && lesson.quizzes.length > this.MAX_QUIZZES) {
        throw new Error(
          `Lesson "${lesson.title}" cannot have more than ${this.MAX_QUIZZES} quizzes`
        );
      }
    }

    const bulkPayload: BulkCourseContentInput = {
      course_id: courseId,
      lessons,
    };

    return CourseModel.bulkUpsertCourseContent(bulkPayload);
  }

  /* -------- GETTERS -------- */

  static async getLessonsByCourse(courseId: string): Promise<Lesson[]> {
    return CourseModel.getLessonsByCourse(courseId);
  }

  static async getQuizzesByLesson(lessonId: string): Promise<Quiz[]> {
    return CourseModel.getQuizzesByLesson(lessonId);
  }

  static async getAllCourses(): Promise<Course[]> {
    return CourseModel.getAllCourses();
  }
}
