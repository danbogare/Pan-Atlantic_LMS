import express, { Application, Request, Response } from "express";
import swaggerUI from "swagger-ui-express";
import * as swaggerDocument from "./config/swagger.json";
import morgan from "morgan";
import { ErrorMiddleware } from "./middlewares/error.middleware";

class App {
  public readonly instance: Application;

  constructor(private errorMiddleware: ErrorMiddleware) {
    this.instance = express();

    this.initializeMiddlewares();
    this.initializeSwaggerUI();
    this.initializeBaseRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.instance.use(express.json());
    this.instance.use(express.urlencoded({ extended: true }));
    this.instance.use(morgan("dev"));
  }

  private initializeSwaggerUI(): void {
    this.instance.use(
      "/docs",
      swaggerUI.serve,
      swaggerUI.setup(swaggerDocument)
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

    // 404
    this.instance.use((_req, res) => {
      res.status(404).json({
        success: false,
        message: "Route not found",
      });
    });
  }

  private initializeErrorHandling(): void {
    this.instance.use(this.errorMiddleware.handle);
  }
}

export default App;