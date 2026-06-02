---
titulo: "Arquitectura de Pipeline CI/CD con GitHub Actions y AWS ECS"
descripcion: "Cómo diseñar un pipeline CI/CD de producción con autenticación OIDC, puertas de calidad paralelas, rollback automatizado y cero credenciales AWS de larga duración. Decisiones arquitectónicas y compromisos operacionales."
fecha: 2026-04-28
tags: ["CI/CD", "GitHub Actions", "AWS", "Docker", "DevOps"]
draft: false
---

## Problema

Los despliegues manuales fallan de formas predecibles. Los pasos divergen entre entornos. Un flag olvidado en un despliegue de viernes se convierte en un incidente de producción el lunes. Los análisis de seguridad que requieren un paso manual separado se saltan bajo presión de tiempo. Los procedimientos de rollback que nunca se ensayaron fallan cuando un incidente los requiere.

El problema no es que los equipos quieran atajar — es que los despliegues manuales crean las condiciones en las que los atajos se toman sistemáticamente.

## Contexto

El stack objetivo: Spring Boot 4.0.3 + React 18 en AWS ECS Fargate. Tres pipelines separados: backend (Maven → Docker → ECS), frontend (Vite → S3 + CloudFront), infraestructura (Terraform). Todos usan OIDC para autenticación AWS — sin credenciales estáticas de larga duración.

## Estructura del pipeline de backend

```yaml
# .github/workflows/backend.yml
on:
  push:
    branches: [main]
    paths: ['tbf_agency/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '17', distribution: 'temurin' }
      - name: Run tests
        run: cd tbf_agency && ./mvnw test
      - name: Upload coverage
        uses: actions/upload-artifact@v4

  deploy:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: us-east-1
      - name: Build and push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker build -t $IMAGE_URI .
          docker push $IMAGE_URI
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster nexoratech-prod \
            --service backend \
            --force-new-deployment
```

`needs: test` garantiza que `deploy` no se ejecuta si `test` falla. Esto no es complejo — es la configuración mínima que impide que código sin tests llegue a producción.

## OIDC: por qué ningún pipeline tiene credenciales AWS

La configuración de AWS credentials usa OIDC Federation:

```yaml
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/github-actions-deploy
    aws-region: us-east-1
```

GitHub genera un token OIDC para el job. AWS verifica el token contra el proveedor de identidad OIDC configurado en la cuenta. Si el token es válido y el rol tiene una política de confianza que permite al repositorio correcto asumirlo, AWS devuelve credenciales temporales.

Las credenciales temporales expiran con el job (máximo 1 hora). No hay nada que rotar. No hay nada que filtrar accidentalmente en logs. El repositorio no tiene acceso a secretos AWS — tiene permiso para asumir un rol que tiene acceso limitado a servicios específicos.

**La política de confianza del rol:**

```json
{
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"},
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:sub": "repo:org/repo:ref:refs/heads/main"
      }
    }
  }]
}
```

La condición `sub` restringe qué puede asumir el rol: solo el repositorio `org/repo` en la rama `main`. Un fork, una rama de feature, o cualquier otro repositorio no puede asumir este rol aunque tenga el token OIDC correcto.

## Puertas de calidad paralelas

```yaml
jobs:
  quality:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        check: [unit-tests, integration-tests, security-scan, code-coverage]
    steps:
      - name: Run ${{ matrix.check }}
        run: ./scripts/ci/${{ matrix.check }}.sh
```

Las puertas de calidad que pueden ejecutarse en paralelo deben ejecutarse en paralelo. Los tests unitarios, de integración, el análisis de seguridad y la cobertura de código no tienen dependencias entre sí. Ejecutarlos en secuencia añade tiempo de espera sin valor. Con la estrategia de matriz, todos se ejecutan simultáneamente y el job de despliegue espera a que todos completen.

El coste real de este diseño: el fallo de cualquier gate bloquea el despliegue. Este es el comportamiento correcto.

## Rollback: no automatizado por diseño

```yaml
- name: Deploy to ECS
  run: |
    TASK_DEF=$(aws ecs describe-services \
      --cluster $CLUSTER \
      --services $SERVICE \
      --query 'services[0].taskDefinition' \
      --output text)
    
    # Guardar la definición de tarea actual antes de desplegar
    echo "PREVIOUS_TASK_DEF=$TASK_DEF" >> $GITHUB_ENV
    
    aws ecs update-service \
      --cluster $CLUSTER \
      --service $SERVICE \
      --task-definition $NEW_TASK_DEF
```

El rollback automatizado basado en health checks de ECS parece atractivo. En la práctica, los fallos de health check tienen múltiples causas: un error real en el código nuevo, un problema transitorio de red, un timeout de arranque más largo de lo esperado, una dependencia no disponible. El rollback automático que revierte un despliegue válido por un timeout transitorio tiene el mismo coste operacional que un rollback innecesario.

La alternativa elegida: guardar la definición de tarea anterior como artifact del job y proporcionar un workflow de rollback manual con un solo parámetro de entrada. El rollback tarda 60 segundos en ejecutarse. El tiempo de decisión humana antes de ejecutarlo es el valor que aporta.

## Pipeline de Terraform: separado por razón

```yaml
# .github/workflows/terraform.yml
on:
  pull_request:
    paths: ['tbf_infra/**']
  push:
    branches: [main]
    paths: ['tbf_infra/**']

jobs:
  plan:
    if: github.event_name == 'pull_request'
    steps:
      - run: terraform plan -var-file=environments/prod/terraform.tfvars
      
  apply:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - run: terraform apply -auto-approve -var-file=environments/prod/terraform.tfvars
```

El plan se ejecuta en cada pull request. El apply solo se ejecuta en merges a `main`. Un reviewer de PR puede ver el plan completo de Terraform antes de aprobar el merge — qué recursos se añaden, modifican o destruyen. El apply manual local contra producción está prohibido por la política del rol IAM, que solo permite asumir el rol de terraform desde el pipeline de GitHub Actions.
