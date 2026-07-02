---
titulo: "Mejores prácticas para gestionar el estado en Terraform"
descripcion: "Mejores prácticas para gestionar el estado en Terraform: guía práctica para ingenieros DevOps y equipos de plataforma."
fecha: "2026-07-02"
tags: ["Terraform","IaC","DevOps"]
draft: false
---

# Mejores Prácticas para Gestionar el Estado en Terraform

## Problema y Contexto

Terraform es una de las herramientas de infraestructura como código (IaC) más adoptadas en la industria. Sin embargo, uno de los aspectos que más problemas genera en equipos de desarrollo y operaciones es la gestión del **state file** (`terraform.tfstate`). Este archivo contiene una representación completa de la infraestructura gestionada: recursos, dependencias, metadatos y valores sensibles como contraseñas o tokens de acceso. Un manejo inadecuado puede derivar en inconsistencias, conflictos entre miembros del equipo o, en el peor de los casos, en la destrucción accidental de recursos productivos.

Cuando los equipos comienzan con Terraform, es común almacenar el estado localmente en el repositorio de código. Este enfoque funciona para pruebas individuales, pero se vuelve un problema serio en entornos colaborativos. Si dos ingenieros ejecutan `terraform apply` simultáneamente sobre el mismo estado local, ambos pueden sobrescribir los cambios del otro, generando una vista corrupta de la infraestructura real. Además, incluir el `tfstate` en Git expone información sensible y provoca conflictos de merge difíciles de resolver.

En entornos empresariales con múltiples equipos, workspaces y pipelines de CI/CD, la gestión del estado debe tratarse con el mismo rigor que la gestión de bases de datos en producción: con backups, bloqueos, control de acceso y auditoría. En este artículo exploramos las mejores prácticas para lograr exactamente eso.

---

## Enfoque de Solución

### 1. Usar un Backend Remoto

El primer paso es mover el estado a un backend remoto. Esto centraliza el archivo de estado, permite el trabajo colaborativo y habilita el bloqueo automático. Los backends más comunes son **AWS S3 + DynamoDB**, **Azure Blob Storage**, **Google Cloud Storage** y **Terraform Cloud**.

#### Ejemplo: Backend con AWS S3 y DynamoDB

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "lra-terraform-state-prod"
    key            = "networking/vpc/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "lra-terraform-locks"
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/mrk-abc123"
  }
}
```

#### Crear la infraestructura del backend con un script de bootstrap

```bash
#!/bin/bash
# bootstrap-backend.sh

AWS_REGION="us-east-1"
BUCKET_NAME="lra-terraform-state-prod"
DYNAMO_TABLE="lra-terraform-locks"

echo "➡️  Creando bucket S3 para estado remoto..."
aws s3api create-bucket \
  --bucket "$BUCKET_NAME" \
  --region "$AWS_REGION" \
  --create-bucket-configuration LocationConstraint="$AWS_REGION"

echo "➡️  Habilitando versionado en el bucket..."
aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled

echo "➡️  Habilitando cifrado por defecto (SSE-S3)..."
aws s3api put-bucket-encryption \
  --bucket "$BUCKET_NAME" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms"
      }
    }]
  }'

echo "➡️  Bloqueando acceso público al bucket..."
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "➡️  Creando tabla DynamoDB para bloqueo de estado..."
aws dynamodb create-table \
  --table-name "$DYNAMO_TABLE" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$AWS_REGION"

echo "✅  Backend de Terraform configurado correctamente."
```

---

### 2. Separar el Estado por Entorno y Componente

Usar un único archivo de estado para toda la infraestructura es un antipatrón. Si el estado se corrompe o una operación falla, el radio de impacto es máximo. La recomendación es **segmentar el estado** por entorno (dev, staging, prod) y por componente funcional (networking, compute, databases).

```
infrastructure/
├── environments/
│   ├── dev/
│   │   ├── networking/
│   │   │   ├── main.tf
│   │   │   └── backend.tf       # key = "dev/networking/terraform.tfstate"
│   │   └── compute/
│   │       ├── main.tf
│   │       └── backend.tf       # key = "dev/compute/terraform.tfstate"
│   ├── staging/
│   │   └── ...
│   └── prod/
│       ├── networking/
│       │   └── backend.tf       # key = "prod/networking/terraform.tfstate"
│       └── compute/
│           └── backend.tf       # key = "prod/compute/terraform.tfstate"
└── modules/
    ├── vpc/
    └── eks-cluster/
```

Para referenciar outputs entre componentes, usa `terraform_remote_state`:

```hcl
# En compute/main.tf - referenciando el VPC creado en networking
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "lra-terraform-state-prod"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app_server" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  # Usando el VPC ID del estado remoto de networking
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_id

  tags = {
    Name        = "lra-app-server"
    Environment = "prod"
  }
}
```

---

### 3. Habilitar y Respetar el Bloqueo de Estado

El mecanismo de **state locking** previene que múltiples procesos modifiquen el estado simultáneamente. Con el backend S3 + DynamoDB, el bloqueo es automático. Sin embargo, hay situaciones donde un proceso falla y deja el estado bloqueado. Para estos casos:

```bash
# Ver el bloqueo activo en DynamoDB
aws dynamodb scan \
  --table-name "lra-terraform-locks" \
  --query "Items[*]" \
  --output table

# Forzar la eliminación del bloqueo (usar con extrema precaución)
# Primero, verifica que no haya ningún proceso activo de Terraform
terraform force-unlock <LOCK_ID>

# Ejemplo práctico
terraform force-unlock "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

> ⚠️ **Advertencia:** Solo ejecuta `force-unlock` si estás completamente seguro de que no hay ningún proceso de Terraform corriendo. De lo contrario, puedes corromper el estado.

---

### 4.
