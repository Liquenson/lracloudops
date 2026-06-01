---
titulo: "Medical Appointment System"
descripcion: "Role-based appointment management platform with JDBC authentication for Admin, Doctor and Patient roles, mandatory email verification and multi-profile database support: H2 in-memory locally, PostgreSQL 15 in production."
fecha: 2026-05-01
categoria: "Backend Platform"
madurez: "In Development"
stack: ["Java 17", "Spring Boot 3.2.5", "Spring Security 6", "Thymeleaf 3", "Spring Mail", "PostgreSQL 15", "H2", "Docker", "Maven"]
cicd: true
github: "https://github.com/Liquenson/medical-appointment-system"
featured: false
iconPath: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
draft: false
metricas:
  - { label: "User Roles", value: "3" }
  - { label: "Spring Profiles", value: "local / staging / prod" }
  - { label: "Authentication", value: "JDBC + Spring Security 6" }
  - { label: "Local DB", value: "H2 in-memory" }
highlights:
  - "Three roles with distinct permissions: ADMIN, DOCTOR and USER (Patient)"
  - "JDBC authentication with Spring Security 6 against the users table in the database"
  - "Mandatory email verification on registration: account inactive until confirmed"
  - "Multi-profile: H2 in-memory locally, PostgreSQL 15 in staging/prod via Docker Compose"
  - "Patient geolocation to surface nearby available doctors"
  - "Password strength evaluation with Zxcvbn library"
arquitectura:
  - { nombre: "Spring MVC + Thymeleaf 3", descripcion: "Server-side rendering architecture with HTML templates processed on the server" }
  - { nombre: "Spring Security 6 JDBC", descripcion: "Role-based authentication via JdbcUserDetailsManager against the users table" }
  - { nombre: "Spring Mail", descripcion: "Transactional email for account verification and appointment notifications" }
  - { nombre: "H2 / PostgreSQL 15", descripcion: "H2 in-memory for local development without external dependencies; PostgreSQL 15 in Docker for staging and production" }
  - { nombre: "Docker Compose", descripcion: "Full stack with PostgreSQL 15 and the Spring Boot application in containers with health checks" }
---

## Platform overview

A role-based appointment management platform covering the full appointment lifecycle: patient registration with email verification, specialist booking and system administration. Three distinct user roles with isolated access paths. Multi-profile database configuration for local development without external dependencies.

## Architecture

Spring MVC server-side rendering with Thymeleaf 3 templates. The browser receives complete HTML — no JavaScript framework on the frontend.

```
Browser → Thymeleaf views ← Spring MVC Controllers
                                    ↓
                        Spring Security (auth/authz)
                                    ↓
                            Service Layer
                                    ↓
                        JPA Repositories → H2 / PostgreSQL
```

## Role model

Authentication uses Spring Security 6 with `JdbcUserDetailsManager`, validating credentials against the users table in the database:

- **ADMIN** — full system management: users, doctors and global configuration
- **DOCTOR** — own schedule, assigned appointments and clinical notes
- **USER (Patient)** — registration, doctor search, appointment booking and history

Test users for all three roles are pre-loaded via `data.sql` in the local profile, enabling role validation without manual setup.

## Multi-profile database strategy

Three Spring profiles with different database configurations:

- **`local`** — H2 in-memory with seed data in `data.sql`. No Docker, no external setup. For iterative development.
- **`staging`** — PostgreSQL 15 in Docker Compose. Matches the production database engine without cloud cost.
- **`prod`** — PostgreSQL 15 with secure configuration, no seed data, no test users.

This separation allows local development without any external dependencies while ensuring that staging tests run against the actual production database engine.

**Known constraint** — H2 in-memory accepts SQL that PostgreSQL rejects, particularly around constraint handling and certain function availability. CI runs tests with the `local` profile using H2. Tests that pass locally can fail against PostgreSQL on staging if there are dialect differences. The correct mitigation is to run at least one CI pipeline stage against PostgreSQL directly rather than relying on H2 compatibility.

## Email verification

Registration triggers an email with a verification link via Spring Mail. The account remains inactive until the link is confirmed. This prevents registrations with invalid email addresses and ensures appointment notification emails reach the correct recipient.

## CI configuration

GitHub Actions runs Maven tests with the `local` Spring profile, which uses H2 in-memory. No external database is required in the CI runner. Test execution is self-contained and reproducible across environments.
