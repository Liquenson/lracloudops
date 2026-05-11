---
titulo: "Infraestructura AWS production-ready con Terraform: EKS, RDS Multi-AZ y CI/CD completo"
descripcion: "Cómo diseñamos e implementamos una infraestructura AWS completa con Terraform modular, EKS con autoscaling, RDS MySQL Multi-AZ y pipelines duales con SonarCloud. Decisiones técnicas reales y lessons learned."
fecha: 2026-05-03
tags: ["Terraform", "AWS", "EKS", "Kubernetes", "IaC", "CI/CD", "Jenkins", "GitHub Actions"]
draft: false
---

## Por qué este proyecto existe

Hay una diferencia importante entre "usar AWS" y "diseñar infraestructura AWS production-ready". El primero implica crear recursos desde la consola, uno por uno, con configuración manual. El segundo implica que cada recurso está definido como código, versionado en Git, reproducible en cualquier momento y desplegable en menos de 30 minutos en un ambiente nuevo.

El proyecto **aws-terraform-devops** nació de la necesidad de tener una referencia real y funcional que combinara todas las piezas del stack DevOps moderno: infraestructura como código modular, containerización, orquestación Kubernetes, análisis de calidad obligatorio y pipelines automatizados. No otro tutorial de "crea una EC2 con Terraform", sino una arquitectura completa que refleje cómo funciona realmente en producción.

## La arquitectura que construimos

El stack despliega una aplicación Flask (Python 3.11 + Gunicorn) sobre Kubernetes en AWS, con base de datos relacional gestionada y pipeline CI/CD dual:

```
Internet → ALB → EKS (pods Flask + Gunicorn) → RDS MySQL Multi-AZ
                      ↑
               ECR (imágenes Docker)
```

Todos los componentes están en una VPC multi-AZ con subnets públicas para el load balancer y privadas para el cluster EKS y la base de datos. Ningún componente de backend tiene IP pública.

## Estructura Terraform: 7 módulos independientes

La decisión más importante fue la modularidad. El directorio `modules/` contiene 7 módulos con responsabilidades bien delimitadas:

```
modules/
├── vpc/          # VPC, subnets públicas/privadas, IGW, NAT Gateway
├── eks/          # Cluster EKS, node groups, HPA
├── rds/          # MySQL Multi-AZ, backups, security groups
├── ecr/          # Registro privado Docker con lifecycle policies
├── iam/          # Roles EKS cluster, roles nodos, OIDC provider
├── s3_bucket/    # Buckets con configuración de lifecycle
└── cloudwatch/   # Alarmas, dashboards, log groups
```

Y el `main.tf` que los orquesta:

```hcl
module "vpc" {
  source             = "../modules/vpc"
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  public_subnets     = var.public_subnets
  private_subnets    = var.private_subnets
  availability_zones = var.availability_zones
}

module "eks" {
  source               = "../modules/eks"
  environment          = var.environment
  kubernetes_version   = var.kubernetes_version
  private_subnet_ids   = module.vpc.private_subnet_ids
  vpc_id               = module.vpc.vpc_id
  instance_type        = var.instance_type
  desired_capacity     = var.desired_capacity
  min_capacity         = var.min_capacity
  max_capacity         = var.max_capacity
  eks_cluster_role_arn = module.iam.eks_cluster_role_arn
  eks_nodes_role_arn   = module.iam.eks_nodes_role_arn
}

module "rds" {
  source             = "../modules/rds"
  environment        = var.environment
  instance_class     = var.rds_instance
  private_subnet_ids = module.vpc.private_subnet_ids
  vpc_id             = module.vpc.vpc_id
}
```

La separación de IAM en su propio módulo fue una decisión consciente. Los roles que necesita EKS (cluster role y node role) son recursos IAM, no recursos EKS, y tenerlos en un módulo separado hace que el módulo EKS sea más limpio y que los roles puedan evolucionar independientemente.

## EKS con autoscaling horizontal

El módulo EKS expone variables de capacidad que el `terraform.tfvars` de cada ambiente configura de forma diferente:

```hcl
# environments/dev/terraform.tfvars
desired_capacity = 2
min_capacity     = 1
max_capacity     = 4
instance_type    = "t3.medium"

# environments/prod/terraform.tfvars
desired_capacity = 3
min_capacity     = 2
max_capacity     = 8
instance_type    = "t3.large"
```

El Horizontal Pod Autoscaler (HPA) está configurado a nivel de Kubernetes para escalar los pods de la aplicación antes de que el cluster tenga que escalar nodos — la estrategia correcta es escalar pods primero y nodos como último recurso.

## RDS MySQL Multi-AZ: lo que nadie te dice

El módulo RDS despliega MySQL en configuración Multi-AZ. Lo que esto significa en la práctica:

- AWS mantiene una instancia standby en una segunda zona de disponibilidad
- La replicación es síncrona — cada write se confirma solo cuando está en ambas zonas
- En caso de fallo de la zona primaria, el failover automático ocurre en 60-120 segundos sin intervención humana
- La cadena de connection strings no cambia — el endpoint DNS de RDS apunta automáticamente a la instancia activa

La configuración de security groups es estricta: la instancia RDS solo acepta conexiones desde el security group del cluster EKS, no desde el mundo exterior.

## El pipeline dual: GitHub Actions + Jenkins

La decisión de implementar dos pipelines paralelos no fue por capricho técnico — fue para demostrar que la lógica del pipeline no debería estar atada a una plataforma específica. Las organizaciones cambian de herramientas; los principios del pipeline permanecen.

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
jobs:
  test:
    - run: pytest scripts/tests/ docker/src/tests/ --cov --cov-report=xml
    
  sonarcloud:
    - uses: SonarSource/sonarcloud-github-action@master
    
  docker:
    - run: |
        aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REPO
        docker build -t $ECR_REPO:$GITHUB_SHA .
        docker push $ECR_REPO:$GITHUB_SHA
  
  deploy:
    - run: |
        aws eks update-kubeconfig --name devops-cluster --region eu-west-1
        helm upgrade --install webapp helm/webapp \
          --set image.tag=$GITHUB_SHA \
          --wait
```

### Jenkins (Jenkinsfile)

```groovy
pipeline {
  agent any
  environment {
    AWS_REGION  = 'eu-west-1'
    ECR_REPO    = "${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/webapp"
  }
  stages {
    stage('Test')      { steps { sh 'mvn test' } }
    stage('SonarQube') { steps { withSonarQubeEnv('sonar') { sh 'mvn sonar:sonar' } } }
    stage('Docker')    {
      steps {
        sh '''
          aws ecr get-login-password --region $AWS_REGION | \
            docker login --username AWS --password-stdin $ECR_REPO
          docker build -t $ECR_REPO:$BUILD_NUMBER .
          docker push $ECR_REPO:$BUILD_NUMBER
        '''
      }
    }
    stage('Deploy EKS') {
      steps {
        sh '''
          aws eks update-kubeconfig --name devops-cluster --region $AWS_REGION
          helm upgrade --install webapp helm/webapp \
            --set image.tag=$BUILD_NUMBER --wait
        '''
      }
    }
  }
}
```

La estructura es idéntica en ambos pipelines: test → calidad → build de imagen → push a ECR → deploy con Helm. La diferencia son los primitivos de la plataforma (`steps { sh ... }` en Jenkins vs `run: |` en GitHub Actions), no la lógica.

## SonarCloud: calidad no negociable

El pipeline tiene una regla fija: si la cobertura de tests cae por debajo del 80%, el pipeline falla antes de construir la imagen Docker. No hay forma de hacer deploy sin pasar por esta puerta.

La configuración de SonarCloud vive en `sonar-project.properties`:

```properties
sonar.projectKey=aws-terraform-devops
sonar.organization=lracloudops
sonar.sources=docker/src
sonar.tests=docker/src/tests,scripts/tests
sonar.python.coverage.reportPaths=coverage.xml
```

Los tests cubren la aplicación Flask (`docker/src/tests/`) y los scripts de infraestructura (`scripts/tests/`). Tener tests de infraestructura — no solo de aplicación — fue una decisión que salvó tiempo durante varios refactors del código de Terraform.

## Despliegue con Helm: valores por ambiente

Los manifests de Kubernetes están gestionados con Helm. El chart en `helm/webapp/` define el Deployment, Service y HPA con variables configurables por ambiente:

```bash
# Deploy en dev
helm upgrade --install webapp helm/webapp \
  -f helm/webapp/values-dev.yaml \
  --set image.tag=$BUILD_NUMBER

# Deploy en prod
helm upgrade --install webapp helm/webapp \
  -f helm/webapp/values-prod.yaml \
  --set image.tag=$BUILD_NUMBER
```

El flag `--wait` hace que Helm espere a que el Deployment esté healthy antes de marcar el deploy como exitoso. Si los pods no están ready en el tiempo configurado, Helm hace rollback automático a la versión anterior. Esto convierte cada deploy en una operación atómica y segura.

## La aplicación Flask

La aplicación es intencionalmente simple — un servidor Flask con tres endpoints:

```python
@app.route("/")
def index():
    return jsonify({
        "app": "devops-lab-webapp",
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "environment": os.getenv("AWS_REGION", "local"),
        "status": "ok"
    })

@app.route("/health")  # Usado por los health checks de Kubernetes
def health():
    return jsonify({"status": "healthy"}), 200

@app.route("/ready")   # Usado por el readiness probe de EKS
def ready():
    return jsonify({"status": "ready"}), 200
```

Los endpoints `/health` y `/ready` son consumidos por Kubernetes para determinar si un pod está vivo y listo para recibir tráfico. La diferencia es importante: `/health` indica que el proceso está vivo; `/ready` indica que el pod está listo para recibir requests del load balancer.

## Decisiones técnicas y por qué

**¿Por qué RDS MySQL y no Aurora?**
Aurora tiene mejor rendimiento y disponibilidad, pero el costo es notablemente mayor para un laboratorio. Los conceptos que demostramos — Multi-AZ, failover, backups automáticos, security groups — son idénticos en MySQL estándar. Cuando el presupuesto justifica Aurora, la transición desde el módulo RDS es mínima.

**¿Por qué Helm en lugar de kubectl apply directamente?**
Helm gestiona el historial de releases y permite rollback con un solo comando. `kubectl apply` no tiene memoria de versiones anteriores — si el deploy falla, volver al estado anterior requiere saber exactamente qué cambió.

**¿Por qué CloudWatch en un módulo separado?**
Las alarmas y dashboards cambian frecuentemente durante la vida del proyecto — se añaden métricas, se ajustan thresholds, se agregan notificaciones. Tener CloudWatch en su propio módulo permite iterar sobre observabilidad sin tocar el cluster EKS ni la base de datos.

## Lecciones aprendidas

**El tiempo de apply de Terraform no es lineal.** Crear el cluster EKS tarda 15-20 minutos. Crear una RDS Multi-AZ tarda 10-15 minutos. Si ejecutas `terraform apply` con todo junto en el primer deploy, el pipeline tarda más de 30 minutos. La solución que adoptamos es separar la infraestructura base — que cambia raramente — de la configuración de aplicación, que puede cambiar en cada deploy.

**El state remoto en S3 + DynamoDB no es opcional en equipo.** Dos applies simultáneos sin locking pueden corromper el state file y dejar la infraestructura en un estado inconsistente que es difícil de recuperar. El módulo `backend.tf` configura el bucket S3 y la tabla DynamoDB para locking desde el día uno.

**Los permisos IAM de OIDC para GitHub Actions requieren más precisión de lo que parece.** El trust policy del rol necesita especificar exactamente qué repositorio y qué rama puede asumir el rol. Un rol demasiado permisivo permite que cualquier repositorio de GitHub (incluidos forks públicos) asuma el rol y tenga acceso a la cuenta AWS.

Si estás diseñando infraestructura AWS desde cero o refactorizando una arquitectura existente hacia IaC completo, [contáctanos](/contacto) — este es exactamente el tipo de trabajo que hacemos con nuestros clientes.
