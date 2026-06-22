import App from "./app";
import { env } from "./config/env";
import { dbManager } from "./config/database";

async function bootstrap() {
  try {
    await dbManager.connect();

    // Inject the live dbManager into the App instance
    const appClass = new App(dbManager);
    const server = appClass.instance;

    // Start listening
    server.listen(env.port, () => {
      console.log(`Server listening on port ${env.port} in ${env.nodeEnv} mode`);
    });

    // Handle graceful shutdowns
    const gracefulShutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Starting graceful termination...`);
      
      // This tells the App class to wrap up its dependencies
      await appClass.shutdown(); 
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error("Server failed to start:", error);
    process.exit(1);
  }
}

bootstrap();