import { Router } from "express";

export class UserRouter {
    private readonly router = Router()
    constructor() {
        this.initializeUserRoutes();
    }

    public getRouter(): Router {
        return this.router;
    }

    private initializeUserRoutes(): void {}
}