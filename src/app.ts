import express, { Application, Request, Response } from 'express';

interface IDatabaseManager {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

class App {
  public readonly instance: Application;
  private dbManager: IDatabaseManager;

  constructor(dbManager: IDatabaseManager) {
    this.instance = express();
    this.dbManager = dbManager;
    
    this.initializeMiddlewares();
    this.initializeRoutes();
  }

  private initializeMiddlewares() {
    this.instance.use(express.json());
    this.instance.use(express.urlencoded({ extended: true }));
  }

  private initializeRoutes() {
    this.instance.get('/', (_req: Request, res: Response) => {
      res.send('Pan-Atlantic Learning Management System API service.');
    });


    this.instance.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({ success: true, message: 'Pan-Atlantic Learning Management System is Live!' });
    });
  }

  // Gracefully shuts down all application dependencies.
  public async shutdown(): Promise<void> {
    console.log('Shutting down application layers cleanly...');
    await this.dbManager.disconnect();
  }
}

export default App;