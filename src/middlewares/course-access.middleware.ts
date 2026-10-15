import { Request, Response, NextFunction } from "express";
import { ICourseAccessService } from "../services/course-access.service";
import { UnauthorizedError } from "../errors/error";

// Works out which course a request targets (from a URL param, the body, or a nested resource)
export type CourseResolver = (req: Request) => Promise<string>;

type AsyncMiddleware = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export interface ICourseAccessMiddleware {
  requireLearnAccess(resolve: CourseResolver): AsyncMiddleware;
  requireManageAccess(resolve: CourseResolver): AsyncMiddleware;

  fromParam(name: string): CourseResolver;
  fromBody(field: string): CourseResolver;
  fromModuleParam(name: string): CourseResolver;
  fromLessonParam(name: string): CourseResolver;
  fromQuizParam(name: string): CourseResolver;
  fromAttemptParam(name: string): CourseResolver;
  fromSubmissionParam(name: string): CourseResolver;
  fromDiscussionParam(name: string, courseParam: string): CourseResolver;
}

// Must run after AuthMiddleware.requireAuth, which sets req.user
export class CourseAccessMiddleware implements ICourseAccessMiddleware {
  constructor(private readonly courseAccessService: ICourseAccessService) {}

  public requireLearnAccess(resolve: CourseResolver): AsyncMiddleware {
    return async (req, _res, next) => {
      if (!req.user) throw new UnauthorizedError();
      const courseId = await resolve(req);
      await this.courseAccessService.assertCanLearn(req.user, courseId);
      next();
    };
  }

  public requireManageAccess(resolve: CourseResolver): AsyncMiddleware {
    return async (req, _res, next) => {
      if (!req.user) throw new UnauthorizedError();
      const courseId = await resolve(req);
      await this.courseAccessService.assertCanManage(req.user, courseId);
      next();
    };
  }

  public fromParam(name: string): CourseResolver {
    return async (req) => String(req.params[name]);
  }

  public fromBody(field: string): CourseResolver {
    return async (req) => String(req.body?.[field]);
  }

  public fromModuleParam(name: string): CourseResolver {
    return (req) => this.courseAccessService.courseIdForModule(String(req.params[name]));
  }

  public fromLessonParam(name: string): CourseResolver {
    return (req) => this.courseAccessService.courseIdForLesson(String(req.params[name]));
  }

  public fromQuizParam(name: string): CourseResolver {
    return (req) => this.courseAccessService.courseIdForQuiz(String(req.params[name]));
  }

  public fromAttemptParam(name: string): CourseResolver {
    return (req) => this.courseAccessService.courseIdForAttempt(String(req.params[name]), req.user!);
  }

  public fromSubmissionParam(name: string): CourseResolver {
    return (req) => this.courseAccessService.courseIdForSubmission(String(req.params[name]));
  }

  public fromDiscussionParam(name: string, courseParam: string): CourseResolver {
    return (req) =>
      this.courseAccessService.courseIdForDiscussion(String(req.params[name]), String(req.params[courseParam]));
  }
}
