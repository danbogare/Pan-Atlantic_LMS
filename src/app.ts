import express, { Application, Request, Response } from "express";
import cors from "cors";
import swaggerUI from "swagger-ui-express";
import * as swaggerDocument from "./config/swagger.json";
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

class App {
  public readonly instance: Application;
  private readonly errorMiddleware: ErrorMiddleware;

  constructor() {
    this.instance = express();
    this.errorMiddleware = new ErrorMiddleware(env.nodeEnv);

    this.initializeMiddlewares();
    this.initializeSwaggerUI();
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

  private initializeSwaggerUI(): void {
    const dynamicSwaggerDoc = {
      ...swaggerDocument,
      servers: [
        {
          url: env.apiUrl,
          description: env.nodeEnv === "production" ? "Production Server" : "Local Development Server",
        },
      ],
    };
    this.instance.use(
      "/docs",
      swaggerUI.serve,
      swaggerUI.setup(dynamicSwaggerDoc)
    );
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
    const userRepository = new UserRepository(User);
    const otpRepository = new OtpRepository(Otp);

    // seed admin


    // services
    const cryptoService = new CryptoService(env.jwtSecret);
    const resendProvider = new ResendProvider(env.resendApiKey);
    const smtpProvider = new SMTPProvider(env.smtp);
    const mailProvider = env.nodeEnv === "production" ? resendProvider : smtpProvider;
    const mailService = new MailService(mailProvider);
    const authService = new AuthService(userRepository, otpRepository, mailService, cryptoService);
    const userService = new UserService(userRepository, mailService, cryptoService);

    // middlware
    const authMiddleware = new AuthMiddleware(cryptoService);

    // controllers
    const authController = new AuthController(authService);
    const userController = new UserController(userService);

    // routes
    const authRouter = new AuthRouter(authController, authMiddleware);
    const adminRouter = new AdminRouter(userController, authMiddleware);

    this.instance.use("/auth", authRouter.getRouter());
    this.instance.use("/admin", adminRouter.getRouter());
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