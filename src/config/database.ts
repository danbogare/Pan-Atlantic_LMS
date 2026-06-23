import mongoose from 'mongoose';
import { env } from './env';

class DatabaseManager {
  private static instance: DatabaseManager;

  // Private constructor prevents direct instantiation via `new`
  private constructor() {
    this.registerEventListeners();
  }

  // Retrieves the singleton instance of the DatabaseManager.
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }


  // Listens to connection lifecycle events for better observability.
  private registerEventListeners(): void {
    mongoose.connection.on('connected', () => {
      console.log('🍃 MongoDB connected successfully.');
    });

    mongoose.connection.on('error', (error) => {
      console.error(`MongoDB connection error: ${error}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected.');
    });
  }

  // Establishes the connection to MongoDB.
  public async connect(): Promise<void> {
    try {
      await mongoose.connect(env.mongoUri);
    } catch (error) {
      console.error('Failed to connect to MongoDB initialization:', error);
      process.exit(1); // Crash gracefully; a server without its DB is a sitting duck
    }
  }

  // Gracefully closes the connection.
  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      console.log('MongoDB connection closed gracefully.');
    } catch (error) {
      console.error('Error during MongoDB disconnection:', error);
    }
  }
}

// Export the singleton instance directly
export const dbManager = DatabaseManager.getInstance();