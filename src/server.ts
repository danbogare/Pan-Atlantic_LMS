import App from "./app";
import { env } from "./config/env";
import { dbManager } from "./config/database";
import { seedAdmin } from "./seeders/admin.seeder";
import { User } from "./models/user.model";
import { UserRepository } from "./repositories/user.repository";

async function bootstrap() {
  try {
    // Connect database first (fail fast if DB is down)
    await dbManager.connect();

    // Seed default admin account (idempotent — safe to run every boot)
    const userRepository = new UserRepository(User);
    await seedAdmin(userRepository, env.admin);

    // Initialize app (Express setup only)
    const app = new App();

    // Start HTTP server
    const server = app.instance.listen(env.port, () => {
      console.log(
        `Server running on port ${env.port} in ${env.nodeEnv} mode`
      );
    });

    // Graceful shutdown handler
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

    // OS signals
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();