---
titulo: "GitOps con ArgoCD en Kubernetes: GitHub como única fuente de verdad"
descripcion: "Implementación real del patrón GitOps con ArgoCD en un cluster KinD de 3 nodos. Qué es GitOps, cómo configuramos auto-sync con prune y selfHeal, por qué eliminamos kubectl apply del flujo de trabajo y las lecciones que aprendimos."
fecha: 2026-05-01
tags: ["Kubernetes", "GitOps", "ArgoCD", "KinD", "Kustomize", "DevOps", "CI/CD"]
draft: false
---

## El problema con el deploy tradicional de Kubernetes

El flujo de trabajo habitual al operar Kubernetes es directo: modificas un manifest YAML, ejecutas `kubectl apply -f deployment.yaml` y el cambio se aplica al cluster. Funciona perfectamente para un desarrollador trabajando solo. Se rompe silenciosamente cuando trabaja un equipo.

El problema es de trazabilidad y divergencia. Si un ingeniero modifica una configuración directamente en el cluster —quizás durante un incidente a las 2am— ese cambio no queda en Git. La próxima persona que hace `kubectl apply` desde el repositorio sobreescribe ese cambio sin saberlo. El cluster acaba en un estado que nadie conoce exactamente y que nadie puede reproducir.

GitOps resuelve este problema invirtiendo el flujo: en lugar de que los humanos empujen cambios al cluster, un controlador (ArgoCD) continuamente verifica que el cluster coincida con el repositorio Git y corrige cualquier diferencia automáticamente.

## Qué implementamos

El proyecto **k8s-devops-platform** es una implementación de referencia del patrón GitOps usando ArgoCD sobre un cluster Kubernetes local creado con KinD (Kubernetes in Docker). El repositorio contiene todos los manifests del cluster y ArgoCD es el único mecanismo autorizado para aplicar cambios.

## La arquitectura GitOps

```
Desarrollador
    ↓ git push
GitHub (fuente de verdad)
    ↓ ArgoCD detecta cambio (polling o webhook)
ArgoCD Controller
    ↓ kubectl apply del estado deseado
KinD Cluster (estado real)
```

Con esta arquitectura:

- **Todo cambio pasa por Git** — hay un commit, un autor y un mensaje para cada modificación
- **El cluster es reproducible** — si se pierde, se recrea aplicando los manifests del repositorio
- **Las modificaciones manuales son imposibles de mantener** — ArgoCD las revierte automáticamente

## Cluster local con KinD

KinD (Kubernetes in Docker) permite crear un cluster Kubernetes completo dentro de contenedores Docker. El cluster de desarrollo usa la configuración en `clusters/local/kind-config.yaml`:

```bash
kind create cluster --config clusters/local/kind-config.yaml
```

La ventaja principal es el costo cero y la velocidad: un cluster de 3 nodos (1 control-plane + 2 workers) arranca en menos de 2 minutos. Esto permite iterar sobre configuraciones de Kubernetes, probar overlays de Kustomize y validar el comportamiento de ArgoCD sin gastar en infraestructura cloud.

La desventaja es que KinD no persiste datos entre reinicios de Docker. Es un entorno de desarrollo, no de producción — para producción usaríamos EKS (que tenemos en el proyecto aws-terraform-devops).

## Instalación y configuración de ArgoCD

ArgoCD se instala en su propio namespace dentro del cluster:

```bash
kubectl create namespace argocd
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Una vez instalado, las aplicaciones se definen como recursos Kubernetes del tipo `Application`. Esta es la configuración de la aplicación NGINX del repositorio:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/Liquenson/k8s-devops-platform
    targetRevision: HEAD
    path: apps/nginx
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

Los tres parámetros críticos son `automated`, `prune` y `selfHeal`.

## Auto-sync, prune y selfHeal: lo que hacen exactamente

### `automated`

Activa la sincronización automática. Sin esto, ArgoCD detecta diferencias entre Git y el cluster pero no las aplica — hay que hacerlo manualmente desde la UI o CLI. Con `automated`, ArgoCD aplica automáticamente cualquier cambio que detecta en el repositorio.

### `prune: true`

Sin prune, eliminar un recurso del repositorio lo pone en estado "OutOfSync" pero el recurso sigue existiendo en el cluster. Con prune habilitado, si el manifest desaparece de Git, el recurso se elimina del cluster.

Esto es el comportamiento correcto para GitOps — Git define el estado deseado completo, no solo las adiciones. Pero requiere cuidado: si eliminas accidentalmente un YAML del repositorio, el recurso desaparece del cluster.

### `selfHeal: true`

Si alguien modifica el cluster directamente con `kubectl edit` o `kubectl patch`, ArgoCD detecta la diferencia y revierte el cambio al estado de Git en el siguiente ciclo de reconciliación.

Este comportamiento es lo que hace que GitOps sea una garantía y no solo una convención. No es "deberíamos usar Git para todo" — es "los cambios fuera de Git son físicamente imposibles de mantener".

## La política de retry

```yaml
retry:
  limit: 5
  backoff:
    duration: 5s
    factor: 2
    maxDuration: 3m
```

Si un sync falla (por ejemplo, porque un CRD aún no está disponible o hay un race condition al crear namespaces), ArgoCD reintenta con backoff exponencial: 5s, 10s, 20s, 40s, hasta 3 minutos. Después de 5 intentos fallidos, marca la aplicación como `Degraded` y requiere intervención humana.

Esta política evita la falsa alarma de un sync fallido por un problema transitorio, mientras que sigue alertando sobre fallos persistentes.

## La aplicación de ejemplo: NGINX con Kustomize

El repositorio incluye dos aplicaciones de ejemplo:

**`apps/nginx/`** — La más simple posible: un Deployment con 2 réplicas y un Service NodePort:

```yaml
# apps/nginx/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
```

**`apps/sample-app/`** — Demuestra el patrón base/overlays de Kustomize:

```
apps/sample-app/
├── base/         # Deployment + Service con configuración base
└── overlays/
    ├── dev/      # 1 réplica, resources mínimos
    └── prod/     # 3 réplicas, resource limits, HPA
```

Con Kustomize, los overlays solo definen lo que cambia respecto a la base. El overlay de dev no duplica el Service — solo sobreescribe el número de réplicas. Cuando cambias algo en la base, se propaga automáticamente a ambos overlays.

## Por qué nunca usamos kubectl apply directamente

Esta es la regla de oro del proyecto y la que más confunde a ingenieros acostumbrados al flujo de trabajo tradicional:

**Nunca ejecutar `kubectl apply` directamente en el cluster gestionado por ArgoCD.**

Si lo haces, el cambio existe — hasta que ArgoCD ejecuta el siguiente ciclo de reconciliación (por defecto cada 3 minutos). Entonces ArgoCD detecta que el cluster difiere de Git, calcula el diff y revierte el cambio. Todo lo que hiciste manualmente desaparece.

El único `kubectl` que está permitido es el dry-run de validación antes de hacer push:

```bash
# Validar sintaxis antes de hacer commit
kubectl apply --dry-run=client -f apps/nginx/

# Verificar el estado actual de la sincronización
argocd app get nginx-app

# Forzar sync inmediato (en lugar de esperar el polling)
argocd app sync nginx-app
```

## Monitoreo: lo que hay en platform/

El directorio `platform/` contiene configuraciones que extienden la plataforma base:

```
platform/
├── argocd/       # Configuración del propio ArgoCD
├── ingress/      # Ingress controller para routing HTTP
├── logging/      # Stack de logging centralizado
├── monitoring/   # Prometheus + Grafana
└── policies/     # Network policies y OPA constraints
```

Esta estructura separa las aplicaciones de negocio (en `apps/`) de la infraestructura de la plataforma (en `platform/`). ArgoCD puede gestionar ambas — el cluster se auto-configura completamente desde Git.

## Validar antes de push: el pre-commit de GitOps

El flujo de trabajo que recomendamos para contribuir al repositorio tiene estos pasos:

```bash
# 1. Hacer el cambio en el YAML
vim apps/nginx/deployment.yaml

# 2. Validar sintaxis localmente
kubectl apply --dry-run=client -f apps/nginx/

# 3. Si usas Kustomize, validar el output
kubectl kustomize apps/sample-app/overlays/dev | kubectl apply --dry-run=client -f -

# 4. Hacer commit y push
git add apps/nginx/deployment.yaml
git commit -m "feat: aumentar replicas nginx a 3"
git push

# 5. ArgoCD detecta el cambio y sincroniza automáticamente
argocd app get nginx-app  # verificar estado
```

El dry-run local detecta errores de sintaxis YAML y referencias a recursos inexistentes antes de que lleguen al cluster real.

## Ventajas reales sobre el deploy manual

**Auditoría completa:** Cada cambio en el cluster tiene un commit con autor, mensaje y fecha. Git es el log de auditoría de la infraestructura.

**Recuperación ante desastres:** Si el cluster se pierde por cualquier razón, se crea uno nuevo con KinD, se instala ArgoCD y se registran las Applications apuntando al repositorio. El cluster se reconstruye solo en minutos.

**Revisión de cambios:** Los cambios de infraestructura pasan por Pull Request con revisión de código, igual que el código de aplicación. No hay cambios de producción sin aprobación.

**Consistencia garantizada:** El cluster siempre refleja exactamente lo que está en el repositorio. No hay "estado especial" ni "configuraciones de emergencia" que nadie documentó.

## Lecciones aprendidas

**La mayor confusión inicial fue con `prune: true`.** Varios miembros del equipo asumían que archivar un YAML (moverlo a una carpeta `_backup/`) dejaría el recurso intacto. Con prune habilitado, si el path configurado en la Application no ve el recurso, lo elimina. La solución correcta es usar ramas de Git para trabajo en progreso, no renombrar directorios.

**El polling de ArgoCD puede sentirse lento en desarrollo activo.** El intervalo por defecto es 3 minutos. Para acelerar el desarrollo, usamos `argocd app sync app-name` para forzar sincronización inmediata. En entornos de producción, configurar webhooks de GitHub hacia ArgoCD elimina el polling completamente y la sincronización es casi instantánea.

**KinD y Kubernetes en Docker tienen limitaciones de red.** Los servicios NodePort funcionan diferente en KinD que en un cluster cloud. Mapear los puertos del cluster al host requiere configuración explícita en `kind-config.yaml`. Es un detalle que toma tiempo resolver la primera vez pero es parte del aprendizaje de cómo funciona la red en Kubernetes.

Si tu equipo está gestionando Kubernetes con `kubectl apply` y quieres migrar a un flujo GitOps con ArgoCD, [contáctanos](/contacto). La migración es más sencilla de lo que parece y los beneficios son inmediatos.

Puedes explorar la arquitectura completa del proyecto en la [página del proyecto](/projects/k8s-devops-platform).
