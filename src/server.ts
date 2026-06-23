import App from "./app";
import { env } from "./config/env";
import { dbManager } from "./config/database";
import { ErrorMiddleware } from "./middlewares/error.middleware";

async function bootstrap() {
  try {
    // 1. Connect database first (fail fast if DB is down)
    await dbManager.connect();

    // 2. Create shared infrastructure
    const errorMiddleware = new ErrorMiddleware(env.nodeEnv);

    // 3. Initialize app (Express setup only)
    const app = new App(errorMiddleware);

    // 4. Start HTTP server
    const server = app.instance.listen(env.port, () => {
      console.log(
        `Server running on port ${env.port} in ${env.nodeEnv} mode`
      );
    });

    // 5. Graceful shutdown handler
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        try {
          await dbManager.disconnect();
          console.log("Database disconnected");
          process.exit(0);
        } catch (err) {
          console.error("Error during shutdown:", err);
          process.exit(1);
        }
      });
    };

    // 6. OS signals
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();