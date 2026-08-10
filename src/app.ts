import express, { Application, Request, Response } from "express";
import cors from "cors";
import swaggerUI from "swagger-ui-express";
import morgan from "morgan";
import { ErrorMiddleware } from "./middlewares/error.middleware";
import { env } from "./config/env";
import { CryptoService } from "./services/crypto.service";
import { UserRepository } from "./repositories/user.repository";
import { User } from "./models/user.model";
import { Otp } from "./models/otp.model";
import { OtpRepository } from "./repositories/otp.repository";
import { MailService, ResendProvider, SMTPProvider } from "./services/mail.service";
import { AuthController } from "./controllers/auth.controller";
import { AuthService } from "./services/auth.service";
import { UserService } from "./services/user.service";
import { AuthMiddleware } from "./middlewares/auth.middleware";
import { UserController } from "./controllers/user.controller";
import { AuthRouter } from "./routes/auth.route";
import { AdminRouter } from "./routes/admin.route";
import { CourseRepository } from "./repositories/course.repository";
import { Course, Enrollment, InstructorAssignment } from "./models/course.model";
import { CourseContentRepository } from "./repositories/courseModule.repository";
import { CourseLesson, CourseModule } from "./models/courseModule.model";
import { CloudinaryService } from "./services/storage.service";
import { CourseService } from "./services/course.service";
import { CourseController } from "./controllers/course.controller";
import { CourseRouter } from "./routes/course.route";
import { getOpenApiDocument } from "./openapi/document";
import { apiReference } from "@scalar/express-api-reference";
import { NoteRepository } from "./repositories/note.repository";
import { DiscussionRepository } from "./repositories/discussion.repository";
import { Note } from "./models/note.model";
import { Discussion, DiscussionReply } from "./models/discussion.model";
import { AssignmentSubmissionRepository } from "./repositories/assignment.repository";
import { AssignmentSubmission } from "./models/assignment.model";
import { CertificateRepository } from "./repositories/certificate.repository";
import { Certificate } from "./models/certificate.model";
import { BadgeRepository } from "./repositories/badge.repository";
import { Badge, UserBadge } from "./models/badge.model";
import { LessonProgressRepository } from "./repositories/lessonProgress.repository";
import { LessonProgress } from "./models/lessonProgress.model";
import { StatsRepository } from "./repositories/stats.repository";
import { NoteService } from "./services/note.service";
import { DiscussionService } from "./services/discussion.service";
import { AssignmentSubmissionService } from "./services/assignment.service";
import { CertificateService } from "./services/certificate.service";
import { BadgeService } from "./services/badge.service";
import { ProgressService } from "./services/lessonProgress.service";
import { StatsService } from "./services/stats.service";
import { NoteController } from "./controllers/note.controller";
import { DiscussionController } from "./controllers/discussion.controller";
import { AssignmentSubmissionController } from "./controllers/assignment.controller";
import { CertificateController } from "./controllers/certificate.controller";
import { BadgeController } from "./controllers/badge.controller";
import { ProgressController } from "./controllers/progress.controller";
import { StatsController } from "./controllers/stats.controller";
import { NoteRouter } from "./routes/note.route";
import { DiscussionRouter } from "./routes/discussion.route";
import { AssignmentRouter } from "./routes/assignment.route";
import { CertificateRouter } from "./routes/certificate.route";
import { BadgeRouter } from "./routes/badge.route";
import { ProgressRouter } from "./routes/progress.route";

class App {
  public readonly instance: Application;
  private readonly errorMiddleware: ErrorMiddleware;

  constructor() {
    this.instance = express();
    this.errorMiddleware = new ErrorMiddleware(env.nodeEnv);

    this.initializeMiddlewares();
    this.initializeApiDocs();
    this.initializeBaseRoutes();
    this.initializeApiRoutes();
    this.initialize404Handling();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.instance.use(cors());
    this.instance.use(express.json());
    this.instance.use(express.urlencoded({ extended: true }));
    this.instance.use(morgan("dev"));
  }

  private initializeApiDocs(): void {
    const document = {
      ...getOpenApiDocument(),
      servers: [
        {
          url: env.apiUrl,
          description: env.nodeEnv === "production" ? "Production Server" : "Local Development Server",
        },
      ],
    };
  
    // Raw spec — useful for Postman import, codegen, etc.
    this.instance.get("/docs/openapi.json", (_req, res) => res.json(document));
  
    // Swagger UI — was at /docs before, now at /docs/swagger to make room for Scalar
    this.instance.use("/docs/swagger", swaggerUI.serve, swaggerUI.setup(document));
  
    // Scalar UI
    this.instance.use("/docs", apiReference({ theme: "purple", content: document }));
  }

  private initializeBaseRoutes(): void {
    this.instance.get("/", (_req: Request, res: Response) => {
      res.send("Pan-Atlantic Learning Management System API service.");
    });

    this.instance.get("/health", (_req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: "LMS is Live!",
      });
    });
  }

  private initializeApiRoutes(): void {
    // Dependencies Injection
    // repositories
    const userRepository = new UserRepository(User, Enrollment, InstructorAssignment);
    const otpRepository = new OtpRepository(Otp);
    const courseRepository = new CourseRepository(Course, Enrollment, InstructorAssignment);
    const courseContentRepository = new CourseContentRepository(CourseModule, CourseLesson);
    const noteRepository = new NoteRepository(Note);
    const discussionRepository = new DiscussionRepository(Discussion, DiscussionReply);
    const submissionRepository = new AssignmentSubmissionRepository(AssignmentSubmission, CourseLesson, Enrollment);
    const certificateRepository = new CertificateRepository(Certificate);
    const badgeRepository = new BadgeRepository(Badge, UserBadge);
    const lessonProgressRepository = new LessonProgressRepository(LessonProgress, CourseLesson);
    const statsRepository = new StatsRepository(User, Course, Enrollment);

    // services
    const cryptoService = new CryptoService(env.jwtSecret);
    const resendProvider = new ResendProvider(env.resendApiKey);
    const smtpProvider = new SMTPProvider(env.smtp);
    const mailProvider = env.nodeEnv === "production" ? resendProvider : smtpProvider;
    const mailService = new MailService(mailProvider);
    const authService = new AuthService(userRepository, otpRepository, mailService, cryptoService);
    const userService = new UserService(userRepository, courseRepository, mailService, cryptoService);
    const storageService = new CloudinaryService(env.cloudinary);
    const courseService = new CourseService(courseRepository, courseContentRepository, storageService);
    const noteService = new NoteService(noteRepository, courseRepository);
    const discussionService = new DiscussionService(discussionRepository, courseRepository);
    const submissionService = new AssignmentSubmissionService(submissionRepository, courseContentRepository);
    const certificateService = new CertificateService(certificateRepository);
    const badgeService = new BadgeService(badgeRepository, userRepository, courseRepository);
    const progressService = new ProgressService(lessonProgressRepository, courseRepository, certificateService, badgeService);
    const statsService = new StatsService(statsRepository);

    // middlware
    const authMiddleware = new AuthMiddleware(cryptoService);

    // controllers
    const authController = new AuthController(authService);
    const userController = new UserController(userService);
    const courseController = new CourseController(courseService);
    const noteController = new NoteController(noteService);
    const discussionController = new DiscussionController(discussionService);
    const submissionController = new AssignmentSubmissionController(submissionService);
    const certificateController = new CertificateController(certificateService); // now needs courseRepository passed to certificateService below
    const badgeController = new BadgeController(badgeService);
    const progressController = new ProgressController(progressService);
    const statsController = new StatsController(statsService);

    // routes
    const authRouter = new AuthRouter(authController, authMiddleware);
    const adminRouter = new AdminRouter(
      userController,
      badgeController,
      statsController,
      submissionController,
      authMiddleware
    );
    const courseRouter = new CourseRouter(courseController, authMiddleware);
    const noteRouter = new NoteRouter(noteController, authMiddleware);
    const discussionRouter = new DiscussionRouter(discussionController, authMiddleware);
    const assignmentRouter = new AssignmentRouter(submissionController, authMiddleware);
    const certificateRouter = new CertificateRouter(certificateController, authMiddleware);
    const badgeRouter = new BadgeRouter(badgeController, authMiddleware);
    const progressRouter = new ProgressRouter(progressController, authMiddleware);

    this.instance.use("/auth", authRouter.getRouter());
    this.instance.use("/admin", adminRouter.getRouter());
    this.instance.use("/courses", courseRouter.getRouter());
    this.instance.use("/student/notes", noteRouter.getRouter());
    this.instance.use("/courses", discussionRouter.getRouter());
    this.instance.use("/student/assignments", assignmentRouter.getRouter());
    this.instance.use("/student/certificates", certificateRouter.getRouter());
    this.instance.use("/certificates", certificateRouter.getRouter());
    this.instance.use("/student/badges", badgeRouter.getRouter());
    this.instance.use("/student/progress", progressRouter.getRouter());
  }

  private initialize404Handling(): void {
    this.instance.use((_req, res) => {
      res.status(404).json({
        success: false,
        message: "Not found",
      });
    });
  }

  private initializeErrorHandling(): void {
    this.instance.use(this.errorMiddleware.handle);
  }
}

export default App;