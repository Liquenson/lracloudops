---
titulo: "Mejores prácticas para Helm Charts"
descripcion: "Mejores prácticas para Helm Charts: guía práctica para ingenieros DevOps y equipos de plataforma."
fecha: "2026-06-29"
tags: ["Kubernetes","Helm","DevOps"]
draft: false
---

# Mejores Prácticas para Helm Charts en Entornos de Producción

## Problema y Contexto

Helm se ha convertido en el gestor de paquetes de facto para Kubernetes, pero su flexibilidad puede convertirse en un arma de doble filo. Muchos equipos adoptan Helm rápidamente para sus primeros despliegues, pero con el tiempo acumulan charts mal estructurados, valores sin documentar y releases difíciles de auditar. El resultado es una deuda técnica que se manifiesta en forma de fallos en producción, inconsistencias entre entornos y pipelines de CI/CD frágiles.

El problema se agrava cuando múltiples equipos colaboran sobre el mismo chart sin convenciones claras. Los values files crecen de forma descontrolada, las dependencias entre charts quedan implícitas, y los rollbacks se vuelven impredecibles. En organizaciones que gestionan decenas o cientos de aplicaciones, la falta de estandarización en Helm puede traducirse directamente en incidentes de producción y horas de trabajo de ingeniería desperdiciadas.

En LRA Cloud Operations hemos aprendido estas lecciones de la forma difícil. Este artículo recoge las prácticas que hemos consolidado tras gestionar más de 150 releases en producción, desde microservicios simples hasta plataformas de datos complejas con múltiples dependencias. El objetivo es que puedas aplicar estas prácticas desde el primer día, antes de que la deuda técnica se acumule.

---

## Enfoque de Solución

### 1. Estructura de Directorios Clara y Consistente

El punto de partida es una estructura de ficheros bien definida. Helm impone una estructura mínima, pero las decisiones sobre cómo organizarla internamente marcan la diferencia.

```bash
mi-aplicacion/
├── Chart.yaml
├── README.md
├── values.yaml
├── values-dev.yaml
├── values-staging.yaml
├── values-prod.yaml
├── charts/                  # Dependencias empaquetadas
├── templates/
│   ├── _helpers.tpl         # Funciones y helpers reutilizables
│   ├── NOTES.txt            # Instrucciones post-instalación
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── hpa.yaml
│   └── tests/
│       └── test-connection.yaml
└── .helmignore
```

Cada fichero de `values-{entorno}.yaml` debe contener **únicamente las sobreescrituras** respecto a `values.yaml`, nunca duplicar toda la configuración.

### 2. Chart.yaml con Metadatos Completos

```yaml
# Chart.yaml
apiVersion: v2
name: mi-aplicacion
description: API REST para gestión de pedidos de LRA Commerce
type: application
version: 1.4.2          # Versión del chart (SemVer estricto)
appVersion: "2.1.0"     # Versión de la aplicación que despliega

keywords:
  - api
  - commerce
  - pedidos

maintainers:
  - name: Equipo Platform Engineering
    email: platform@lra-cloud.com
    url: https://wiki.lra-cloud.com/teams/platform

dependencies:
  - name: postgresql
    version: "12.5.6"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
  - name: redis
    version: "17.11.3"
    repository: "https://charts.bitnami.com/bitnami"
    condition: redis.enabled
```

La versión del chart y la versión de la aplicación son **conceptos distintos** y deben versionarse de forma independiente. Usa SemVer en ambos casos.

### 3. Values.yaml Documentado y con Valores Sensatos

Un `values.yaml` bien documentado es la mejor documentación que puede tener un chart. Cada parámetro debe tener un comentario que explique su propósito y los valores aceptados.

```yaml
# values.yaml

## @section Configuración de la aplicación
##

## Número de réplicas del Deployment
## Si hpa.enabled=true, este valor actúa como punto de partida
replicaCount: 2

image:
  ## Repositorio de la imagen Docker
  repository: registry.lra-cloud.com/commerce/mi-aplicacion
  ## Política de pull: Always | IfNotPresent | Never
  pullPolicy: IfNotPresent
  ## Tag de la imagen. Por defecto usa .Chart.AppVersion
  tag: ""

## @section Recursos y límites
## Siempre define requests y limits para garantizar QoS
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

## @section Configuración del servicio
service:
  type: ClusterIP
  port: 8080
  ## Anotaciones adicionales para el servicio (ej: para NLB en AWS)
  annotations: {}

## @section Autoescalado horizontal
hpa:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

## @section Configuración de base de datos
postgresql:
  ## Habilitar PostgreSQL como dependencia del chart
  enabled: true
  auth:
    database: commerce_db
    username: app_user
    ## NUNCA pongas la contraseña real aquí
    ## Usa existingSecret en producción
    existingSecret: "mi-aplicacion-db-secret"
    secretKeys:
      adminPasswordKey: postgres-password
      userPasswordKey: password
```

### 4. Helpers Reutilizables en _helpers.tpl

El fichero `_helpers.tpl` es el lugar para centralizar la lógica de nombrado y etiquetado. Esto evita inconsistencias entre recursos.

```go
{{/* templates/_helpers.tpl */}}

{{/*
Nombre completo del release, truncado a 63 caracteres
*/}}
{{- define "mi-aplicacion.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Labels estándar que deben aparecer en TODOS los recursos
*/}}
{{- define "mi-aplicacion.labels" -}}
helm.sh/chart: {{ include "mi-aplicacion.chart" . }}
{{ include "mi-aplicacion.selectorLabels" . }}
app.kubernetes.io/version: {{ .Values.image.tag | default .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: lra-commerce-platform
environment: {{ .Values.global.environment | default "unknown" }}
{{- end }}

{{/*
Selector labels (inmutables, no cambiar en actualizaciones)
*/}}
{{- define "mi-aplicacion.selectorLabels" -}}
app.kubernetes.io/name: {{ include "mi-aplicacion.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Nombre de la imagen con tag correcto
