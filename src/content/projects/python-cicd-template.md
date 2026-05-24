---
titulo: "Python CI/CD Template"
descripcion: "Template production-ready de API REST con Flask diseñado como punto de partida para microservicios Python con DevOps integrado desde el primer commit. Pipeline completo: flake8, pytest con cobertura y verificación del contenedor Docker en CI."
fecha: 2026-05-01
categoria: "Templates"
madurez: "Template"
stack: ["Python 3.11", "Flask 3.0.3", "pytest 8.2.2", "pytest-cov 5.0.0", "flake8 7.1.0", "Docker", "GitHub Actions"]
cicd: true
github: "https://github.com/Liquenson/python-cicd-template"
featured: false
iconPath: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
draft: false
metricas:
  - { label: "Stages CI", value: "3" }
  - { label: "Cobertura mínima", value: "80%" }
  - { label: "Docker tag", value: "github.sha determinístico" }
  - { label: "Complejidad máx.", value: "10 por función" }
highlights:
  - "Pipeline 3 stages: Stage 1 (flake8 + pytest --cov 80%) → Stage 2 (Docker build github.sha + health check) → Stage 3 (Deploy configurable)"
  - "flake8 con selectores explícitos E9/F63/F7/F82 y max-complexity=10: errores bloqueantes, no solo advertencias"
  - "Cobertura mínima 80%: el pipeline falla si no se alcanza el umbral antes de construir la imagen"
  - "Tag Docker determinístico con github.sha: trazabilidad exacta entre imagen y commit que la generó"
  - "Docker build solo en main: el health check solo corre en pushes al branch de producción"
  - "debug=False en producción: Flask no expone stack traces ni el debugger interactivo en prod"
  - "Tres endpoints de referencia listos para reemplazar con la lógica del microservicio"
arquitectura:
  - { nombre: "Flask 3.0.3", descripcion: "Micro-framework web Python con routing declarativo y extensibilidad mínima" }
  - { nombre: "flake8 7.1", descripcion: "Linter PEP8 que detecta errores de estilo y problemas potenciales en el código" }
  - { nombre: "pytest + pytest-cov", descripcion: "Framework de tests con reporte de cobertura de código integrado" }
  - { nombre: "Docker multi-stage", descripcion: "Build en dos stages: dependencias en builder, solo runtime en imagen final" }
  - { nombre: "GitHub Actions", descripcion: "Pipeline CI/CD con 3 stages secuenciales: lint+test → build+healthcheck → deploy" }
---

## Descripción del proyecto

Python CI/CD Template es un punto de partida listo para usar al iniciar un microservicio Python. Incluye todas las herramientas de calidad y el pipeline de CI/CD preconfigurado, para que el equipo pueda concentrarse en la lógica de negocio desde el primer commit en lugar de invertir tiempo en configurar el entorno de calidad.

El mayor costo invisible en proyectos Python es configurar correctamente las herramientas de calidad al principio. Este template elimina ese costo: clonas el repositorio, actualizas los endpoints, y tienes un servicio con CI/CD funcionando en minutos.

## Pipeline de 4 etapas

```
Lint (flake8) → Test (pytest) → Build (docker) → Health Check
```

Cada etapa es condición necesaria para la siguiente. Si el linting falla, los tests no se ejecutan. Si los tests fallan, no se construye la imagen. Si la imagen no compila, no se verifica el health check.

La etapa de health check corre solo en push a `main`: arranca el contenedor y hace `curl http://localhost:5000/health`. Si el endpoint no responde 200, el pipeline falla antes de que el código esté disponible para deploy.

## Endpoints de referencia

```python
GET /           → {"status": "running", "service": "mi-proyecto"}
GET /health     → {"status": "healthy"}
GET /items/<id> → {"id": 1, "name": "Item 1", "price": 10.99}
```

Los endpoints son ejemplos deliberadamente simples. El `/health` es el único que debe mantenerse — el resto se reemplaza con la lógica real del microservicio.

## Configuración de flake8

La configuración por defecto aplica PEP8 con línea máxima de 88 caracteres (compatible con Black si decides añadirlo). Los errores de estilo son bloqueantes: un `E501` (línea demasiado larga) detiene el pipeline.

```bash
# Ejecutar localmente antes de push
flake8 app.py
```

## Cómo usar el template

1. Fork o copia el repositorio
2. Añade tus endpoints en `app.py`
3. Escribe los tests en `tests/test_app.py`
4. El pipeline CI/CD está listo — no es necesario modificar workflows, Dockerfile ni configuración de flake8 para el caso estándar

## Lessons learned

El valor más importante del template no es el código de Flask — es la disciplina de tener lint y tests como prerequisito del build. Los proyectos que empiezan sin linting acumulan deuda técnica rápidamente porque "arreglar el linter después" siempre se posterga.

Incluir el health check en CI detecta problemas de arranque del contenedor que los tests unitarios no pueden ver: imports que fallan en runtime, variables de entorno requeridas que no están definidas, puertos ya ocupados en el entorno de CI.
