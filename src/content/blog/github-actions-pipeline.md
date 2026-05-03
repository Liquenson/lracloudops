---
titulo: "GitHub Actions: el pipeline CI/CD que todo proyecto necesita"
descripcion: "Un pipeline completo con build, tests y deploy automático a AWS ECS usando GitHub Actions."
fecha: 2026-04-28
tags: ["CI/CD", "GitHub Actions", "AWS", "Docker", "DevOps"]
draft: false
---

## Por qué GitHub Actions

Jenkins es potente pero requiere infraestructura propia y mantenimiento. GitHub Actions vive donde ya está tu código — sin servidores que mantener, gratis para repos públicos.

## Los tres principios del pipeline

**1. Fail fast** — los tests van primero. Si fallan, no se construye la imagen ni se hace deploy.

**2. Secrets en GitHub, no en el código** — nunca hardcodees credenciales. Usa variables de entorno para todo lo sensible.

**3. Deploy solo desde main** — las PRs ejecutan build y tests, pero el deploy solo ocurre cuando el código llega a la rama principal.

## Estructura del pipeline

Un pipeline típico tiene estos jobs en orden:

- **build-and-test** — compila el código y ejecuta los tests
- **quality** — análisis estático con SonarQube
- **docker** — construye la imagen y la sube a ECR
- **deploy** — actualiza el servicio en ECS

## OIDC en lugar de access keys

En lugar de guardar AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY como secrets, configura OIDC para que GitHub Actions asuma un rol de IAM directamente. Más seguro y sin credenciales de larga duración.

La configuración requiere tres pasos en AWS: crear un Identity Provider de tipo OIDC apuntando a GitHub, crear un rol IAM que confíe en ese provider, y añadir los permisos necesarios para ECR y ECS.

## Conclusión

Un buen pipeline CI/CD es la diferencia entre desplegar con confianza y desplegar con miedo. Empieza con build y test, añade calidad de código, y automatiza el deploy cuando tengas confianza en tus tests.
