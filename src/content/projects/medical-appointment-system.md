---
titulo: "Medical Appointment System"
descripcion: "Plataforma web MVC de gestión de citas médicas con autenticación JDBC por roles (Admin, Doctor, Paciente), verificación de email y soporte multi-perfil: H2 in-memory en local, PostgreSQL 15 en producción."
fecha: 2026-03-01
categoria: "Backend & Web"
madurez: "En Desarrollo"
stack: ["Java 17", "Spring Boot 3.2", "Spring Security 6", "Thymeleaf 3", "Spring Mail", "PostgreSQL 15", "H2", "Docker", "Maven"]
cicd: true
github: "https://github.com/Liquenson/medical-appointment-system"
featured: false
iconPath: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
draft: false
metricas:
  - { label: "Roles de usuario", value: "3" }
  - { label: "Perfiles Spring", value: "local / staging / prod" }
  - { label: "Autenticación", value: "JDBC + Spring Security 6" }
  - { label: "DB local", value: "H2 in-memory" }
highlights:
  - "Tres roles con permisos diferenciados: ADMIN, DOCTOR y USER (Paciente)"
  - "Autenticación JDBC con Spring Security 6 contra tabla de usuarios en base de datos"
  - "Verificación de email obligatoria en el registro: cuenta inactiva hasta confirmar"
  - "Multi-perfil: H2 in-memory en local, PostgreSQL 15 en staging/prod via Docker Compose"
  - "Geolocalización de pacientes para mostrar médicos disponibles por proximidad"
  - "Evaluación de fortaleza de contraseña con biblioteca Zxcvbn integrada"
arquitectura:
  - { nombre: "Spring MVC + Thymeleaf 3", descripcion: "Arquitectura server-side rendering con templates HTML procesados en servidor" }
  - { nombre: "Spring Security 6 JDBC", descripcion: "Autenticación por roles via JdbcUserDetailsManager contra tabla de usuarios" }
  - { nombre: "Spring Mail", descripcion: "Envío de emails transaccionales para verificación de cuenta y notificaciones de cita" }
  - { nombre: "H2 / PostgreSQL 15", descripcion: "H2 in-memory para desarrollo local sin setup; PostgreSQL 15 en Docker para staging/prod" }
  - { nombre: "Docker Compose", descripcion: "Stack completo con PostgreSQL 15 y la app Spring Boot en contenedores con healthcheck" }
---

## Descripción del proyecto

Medical Appointment System es una aplicación web MVC que gestiona el ciclo completo de citas médicas: registro de pacientes con verificación de email, reserva de citas con especialistas y administración del sistema. El proyecto demuestra patrones comunes en aplicaciones web empresariales con Spring Boot moderno.

## Arquitectura MVC con Spring Boot 3.2

La arquitectura sigue el patrón clásico de Spring MVC:

```
Browser → Thymeleaf views ← Spring MVC Controllers
                                      ↓
                          Spring Security (autenticación/autorización)
                                      ↓
                              Service Layer
                                      ↓
                          JPA Repositories → H2 / PostgreSQL
```

Thymeleaf 3 renderiza las vistas en el servidor. No hay JavaScript framework en el frontend — el HTML llega completo al navegador.

## Sistema de autenticación por roles

La autenticación usa Spring Security 6 con `JdbcUserDetailsManager`, que valida credenciales directamente contra la tabla de usuarios en la base de datos. Los tres roles tienen accesos diferenciados:

- **ADMIN**: Gestión completa del sistema, usuarios, médicos y configuración global
- **DOCTOR**: Vista de su propia agenda, gestión de citas asignadas y notas clínicas
- **USER (Paciente)**: Registro, búsqueda de médicos, reserva y consulta de sus citas

Los usuarios de prueba pre-cargados via `data.sql` permiten probar los tres roles sin configuración manual.

## Sistema multi-perfil

Una de las decisiones más importantes es el sistema de perfiles de Spring Boot:

- **`local`**: H2 in-memory con datos de seed en `data.sql`. No requiere Docker ni configuración externa. Ideal para desarrollo iterativo.
- **`staging`**: PostgreSQL 15 en Docker Compose. Simula producción sin costos de cloud.
- **`prod`**: PostgreSQL 15 con configuración segura, sin datos de ejemplo, sin usuarios de prueba.

```bash
# Desarrollo local (H2, sin Docker)
mvn spring-boot:run

# Staging con PostgreSQL real
docker compose up --build
```

## Verificación de email y geolocalización

Al registrarse, los pacientes reciben un email de verificación via Spring Mail (SMTP). La cuenta no queda activa hasta confirmar la dirección. Esto previene registros con emails falsos y garantiza que las notificaciones de cita lleguen al destinatario correcto.

El sistema incluye geolocalización de pacientes para mostrar médicos disponibles en su área geográfica, optimizando el proceso de búsqueda y reduciendo desplazamientos innecesarios.

## CI/CD

El pipeline de GitHub Actions ejecuta los tests Maven con el perfil `local` (H2 in-memory, sin dependencias externas). Esto garantiza que los tests corran en un entorno limpio y reproducible sin necesidad de configurar PostgreSQL en el runner de CI.

## Lessons learned

La decisión de usar `JdbcUserDetailsManager` en lugar de una implementación custom de `UserDetailsService` simplifica el código inicial pero limita la flexibilidad. Si necesitas añadir campos propietarios al usuario (foto de perfil, especialidad médica, número de colegiado), JDBC authentication requiere queries SQL custom en lugar de extender una entidad JPA con anotaciones.

La segunda lección: H2 en modo in-memory es conveniente para tests, pero tiene diferencias de sintaxis con PostgreSQL. Si los tests pasan con H2 pero fallan con PostgreSQL en staging, probablemente es un issue de dialect. La solución es configurar `spring.jpa.properties.hibernate.dialect` explícitamente y testear con PostgreSQL real en al menos una etapa del pipeline.
