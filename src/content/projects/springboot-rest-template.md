---
titulo: "Spring Boot REST Template"
descripcion: "Template production-ready de API REST con Spring Boot preconfigurado con Spring Security, JPA, documentación Swagger automática y generación de imagen Docker via Jib sin necesitar Dockerfile."
fecha: 2025-12-01
categoria: "Templates"
madurez: "Template"
stack: ["Java 8", "Spring Boot 2.7", "Spring Security", "Spring Data JPA", "H2", "Swagger", "MapStruct", "Jib", "JaCoCo", "Maven"]
cicd: false
github: "https://github.com/Liquenson/springboot-rest-template"
featured: false
iconPath: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
draft: false
metricas:
  - { label: "Java", value: "8" }
  - { label: "Swagger", value: "Auto-generado" }
  - { label: "Docker", value: "via Jib (sin Dockerfile)" }
  - { label: "Cobertura", value: "JaCoCo" }
highlights:
  - "Spring Security preconfigurado: autenticación y autorización desde el primer commit"
  - "Spring Data JPA + H2 in-memory: persistencia lista sin configurar base de datos"
  - "Swagger UI auto-generado en /swagger-ui.html con springdoc-openapi"
  - "MapStruct para mapping DTO↔Entidad generado en compilación, sin reflection"
  - "Jib Maven plugin: genera imagen Docker optimizada sin necesitar Dockerfile ni Docker local"
  - "JaCoCo para reporte de cobertura de tests integrado en el build Maven"
arquitectura:
  - { nombre: "Spring Boot 2.7", descripcion: "Framework Java con auto-configuración para REST APIs de producción" }
  - { nombre: "Spring Security", descripcion: "Autenticación y autorización integrada con configuración base desde el inicio" }
  - { nombre: "Spring Data JPA + H2", descripcion: "ORM completo con H2 in-memory para desarrollo sin setup de base de datos externa" }
  - { nombre: "MapStruct", descripcion: "Generación de mappers DTO↔Entidad en tiempo de compilación, sin overhead de reflection" }
  - { nombre: "Jib (Maven plugin)", descripcion: "Construye imagen Docker en capas optimizada directamente desde Maven sin Docker daemon" }
---

## Descripción del proyecto

Spring Boot REST Template es un punto de partida para APIs REST con Java que tiene todas las piezas fundamentales preconfiguradas. La selección de qué incluir está basada en lo que se necesita en el 90% de los proyectos: autenticación, persistencia, documentación y containerización.

El objetivo es eliminar el tiempo de setup inicial: en un proyecto nuevo, configurar Spring Security, JPA, Swagger y el Dockerfile puede tomar medio día si partes desde cero. Con este template, ese tiempo se reduce a minutos.

## Por qué Jib en lugar de Dockerfile

Jib es el elemento menos convencional del template y el que más tiempo ahorra. La mayoría de los proyectos Java tienen un Dockerfile que básicamente hace: copiar el JAR, exponer un puerto, ejecutar `java -jar`. Jib elimina ese boilerplate.

```bash
# Genera imagen Docker localmente sin necesitar Dockerfile
mvn compile jib:dockerBuild

# Publica directamente a un registro remoto (Docker Hub, ECR, GCR)
mvn jib:build -Djib.to.image=my-repo/my-app:latest
```

Jib analiza la aplicación y genera una imagen en capas: las dependencias de Maven en una capa, el código propio en otra. Cuando solo cambia el código fuente, solo se transfiere esa capa — no el JAR completo. Esto reduce los tiempos de push en CI/CD significativamente.

## Swagger sin configuración adicional

`springdoc-openapi` genera la documentación de la API automáticamente basándose en las anotaciones de Spring MVC. Cada endpoint nuevo queda documentado automáticamente en `/swagger-ui.html` sin escribir YAML de OpenAPI ni mantener documentación separada.

La documentación siempre refleja el estado actual del código — no puede quedarse desactualizada.

## MapStruct vs reflection-based mappers

MapStruct genera el código de mapping en tiempo de compilación, no en runtime. Alternativas como ModelMapper usan reflection en runtime, que es más lento y más difícil de debuggear cuando hay errores de mapping.

Un mapper generado por MapStruct es código Java normal que el IDE puede navegar y el compilador puede verificar. Si cambias el nombre de un campo en la entidad sin actualizar el DTO, el build falla en compilación — no en producción.

## Cómo usar el template

1. Fork o copia el repositorio
2. Renombra el package base en tu IDE
3. Añade tus entidades JPA con anotaciones `@Entity`
4. Crea las interfaces de repositorio extendiendo `JpaRepository`
5. Define los DTOs y las interfaces `@Mapper` de MapStruct — el código se genera en compilación
6. Los endpoints aparecen automáticamente en `/swagger-ui.html`

## Limitaciones conocidas

Java 8 y Spring Boot 2.7 son versiones estables pero no las más recientes. Spring Boot 2.x alcanzará end-of-life; los proyectos nuevos que puedan usar Java 17 o 21 deberían considerar Spring Boot 3.x, que incluye soporte nativo para virtual threads, mejoras de rendimiento y Jakarta EE 9+.

Este template prioriza la familiaridad y estabilidad sobre la modernidad — útil en entornos con restricciones de versión de Java.
