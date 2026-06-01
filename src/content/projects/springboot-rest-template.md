---
titulo: "Spring Boot REST Starter"
descripcion: "Production-ready Spring Boot REST API starter with Spring Security, JPA, auto-generated Swagger documentation and Docker image generation via Jib without requiring a Dockerfile or local Docker daemon."
fecha: 2026-05-01
categoria: "Templates"
madurez: "Starter"
stack: ["Java 8", "Spring Boot 2.7.13", "Spring Security 5", "Spring Data JPA", "H2", "springdoc-openapi", "MapStruct", "Jib", "JaCoCo", "Maven"]
cicd: false
github: "https://github.com/Liquenson/springboot-rest-template"
featured: false
iconPath: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
draft: false
metricas:
  - { label: "Java", value: "8" }
  - { label: "Swagger", value: "Auto-generated" }
  - { label: "Docker", value: "via Jib (no Dockerfile)" }
  - { label: "Coverage", value: "JaCoCo" }
highlights:
  - "Spring Security pre-configured: authentication and authorization from the first commit without boilerplate setup"
  - "Spring Data JPA + H2 in-memory: persistence ready without external database configuration"
  - "Swagger UI auto-generated at /swagger-ui.html via springdoc-openapi — documentation cannot drift from the code"
  - "MapStruct compile-time DTO↔Entity mapping: no reflection, no runtime overhead, compiler-verified correctness"
  - "Jib Maven plugin: produces an optimized layered Docker image without a Dockerfile or local Docker daemon"
  - "JaCoCo coverage reporting integrated into the Maven build lifecycle"
arquitectura:
  - { nombre: "Spring Boot 2.7", descripcion: "Java framework with auto-configuration for production REST APIs" }
  - { nombre: "Spring Security", descripcion: "Authentication and authorization with baseline configuration from the first commit" }
  - { nombre: "Spring Data JPA + H2", descripcion: "Full ORM with H2 in-memory for development without external database setup" }
  - { nombre: "MapStruct", descripcion: "Compile-time DTO↔Entity mapper generation: no reflection overhead, build fails on field mismatches" }
  - { nombre: "Jib (Maven plugin)", descripcion: "Builds an optimized layered Docker image directly from Maven without a Docker daemon" }
---

## Platform overview

A production-ready starting point for Java REST APIs with the foundational components pre-configured: authentication, persistence, documentation and containerization. The selection covers what is required in the majority of service implementations. Teams fork, rename the base package, add JPA entities and repository interfaces, and operate a documented, containerizable service without spending a day on initial setup.

## Jib over Dockerfile

Most Java services have a Dockerfile that copies a JAR, exposes a port, and runs `java -jar`. Jib eliminates that boilerplate while producing a better image.

```bash
# Generate Docker image locally without a Dockerfile
mvn compile jib:dockerBuild

# Publish directly to a remote registry (Docker Hub, ECR, GCR)
mvn jib:build -Djib.to.image=my-repo/my-app:latest
```

Jib analyzes the application and generates a layered image: Maven dependencies in one layer, application code in another. When only source code changes, only that layer transfers — not the full JAR. In CI/CD environments with frequent pushes, this reduces push times significantly.

Jib runs without a Docker daemon. The Maven build can produce a registry-ready image on any CI runner without requiring Docker-in-Docker or socket mounting.

## Swagger without configuration

`springdoc-openapi` generates API documentation automatically from Spring MVC annotations. Every endpoint registered in the application context appears at `/swagger-ui.html` without writing OpenAPI YAML or maintaining separate documentation files.

Documentation reflects the current state of the code. A new endpoint added to a controller is immediately visible in Swagger on the next build. A removed endpoint disappears. Documentation cannot become stale because it is derived from the code, not maintained separately.

## MapStruct vs reflection-based mapping

MapStruct generates mapping code at compile time. Reflection-based alternatives like ModelMapper resolve mappings at runtime, which introduces overhead and makes errors harder to diagnose — a field name change surfaces as a runtime NullPointerException rather than a build failure.

A MapStruct mapper is generated Java code: navigable in the IDE, verifiable by the compiler. A field renamed in the entity without updating the DTO fails the build at compilation. The error surfaces at the earliest possible point in the development cycle.

## Known constraint

This starter uses Java 8 and Spring Boot 2.7, which is stable but not current. Spring Boot 2.x has reached end-of-life. New services with the option to use Java 17 or 21 should target Spring Boot 3.x, which includes native virtual thread support, Jakarta EE 10 and improved GraalVM native image compatibility.

This starter is appropriate for teams operating under Java version constraints or migrating existing Java 8 codebases. Greenfield services without version restrictions should evaluate the Spring Boot 3.x equivalent.
