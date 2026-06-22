# Pan-Atlantic Learning Management System (LMS) Backend Service
Welcome to the backend engine of the Pan-Atlantic Learning Management System. This project is built using a strict Object-Oriented Programming (OOP) paradigm and enterprise-grade design patterns in TypeScript and Express.


### Key Architectural Features
- *Asynchronous Bootstrapping:* Guarantees that the MongoDB connection pool is completely established before the Express server begins listening for traffic.

- *Dependency Injection (DI):* Structural dependencies (like the database manager and repositories) are injected via class constructors, eliminating global state imports and making components fully decoupled.

- *Repository Pattern:* Separates Mongoose data-access mechanisms from the business domain layer. Swapping database providers down the line requires zero modifications to core business logic.

- *Strict Type Safety & Validation:* Environment variables are strictly parsed and validated at runtime initialization via a fail-fast validator layer.

- *Unified Role-Based Access Control (RBAC):* Manages multiple user tiers (Admins, Supervisors, Instructors, Students) through a consolidated entity profile model coupled with access-guard middlewares.