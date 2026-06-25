---
titulo: "GitOps con ArgoCD: De Zero a Producción en AWS EKS"
descripcion: "Guía completa para implementar GitOps con ArgoCD en AWS EKS. Instalación, configuración, multi-environment con Helm y 5 mejores prácticas de producción."
fecha: 2026-06-25
tags: ["GitOps", "ArgoCD", "Kubernetes", "AWS", "EKS", "DevOps"]
draft: false
---

## Qué es GitOps y por qué ArgoCD sobre Flux

GitOps es una metodología que utiliza Git como única fuente de verdad para la infraestructura y las aplicaciones. En lugar de ejecutar `kubectl apply` manualmente o lanzar pipelines que empujan cambios al clúster, el estado deseado vive en un repositorio Git y un agente en el clúster reconcilia continuamente el estado real con el deseado.

La diferencia entre ArgoCD y Flux es principalmente de arquitectura y experiencia de operación:

- **ArgoCD** tiene una UI web madura, soporte nativo para Helm, Kustomize y directorios planos, y un modelo de RBAC bien documentado. Es más fácil de operar si tienes un equipo que prefiere visibilidad visual del estado del clúster.
- **Flux** es más ligero, 100% GitOps nativo (no tiene UI por defecto), y está construido sobre el Toolkit de CNCF. Es mejor para equipos que prefieren todo desde la línea de comandos.

Para entornos empresariales donde la visibilidad y la auditoría son críticas, ArgoCD es la elección más común. Esta guía cubre ArgoCD en detalle.

## Arquitectura de referencia

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                          │
│   /apps/webapp/                                                  │
│     Chart.yaml    values-dev.yaml    values-prod.yaml           │
│   /appsets/                                                       │
│     applicationset.yaml                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Git pull (30s interval)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       AWS EKS Cluster                             │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              argocd namespace                            │   │
│   │   ArgoCD Server → Application Controller → Repo Server  │   │
│   └──────────────────────┬──────────────────────────────────┘   │
│                           │ reconcile                            │
│   ┌──────────────┐   ┌────▼─────────┐   ┌────────────────────┐  │
│   │  dev namespace│   │prod namespace│   │monitoring namespace│  │
│   │  webapp:v1.2  │   │ webapp:v1.1  │   │prometheus+grafana  │  │
│   └──────────────┘   └──────────────┘   └────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerrequisitos

Antes de comenzar necesitas:

- Un clúster EKS activo (versión >= 1.28)
- `kubectl` configurado con acceso al clúster
- `helm` v3.x instalado
- `argocd` CLI instalado
- Un repositorio Git con tus manifiestos o Helm Charts

## Instalación paso a paso de ArgoCD en EKS

### 1. Crear el namespace y aplicar los manifiestos oficiales

```bash
kubectl create namespace argocd

kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 2. Verificar que todos los pods estén Running

```bash
kubectl get pods -n argocd

# Debes ver:
# argocd-application-controller-0       Running
# argocd-applicationset-controller-xxx  Running
# argocd-dex-server-xxx                 Running
# argocd-notifications-controller-xxx   Running
# argocd-redis-xxx                      Running
# argocd-repo-server-xxx                Running
# argocd-server-xxx                     Running
```

### 3. Obtener la contraseña inicial del admin

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d && echo
```

### 4. Acceder a la UI mediante port-forward (desarrollo) o LoadBalancer (producción)

```bash
# Desarrollo local
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Producción: exponer mediante ALB Ingress
kubectl patch svc argocd-server -n argocd \
  -p '{"spec": {"type": "LoadBalancer"}}'
```

### 5. Login desde la CLI

```bash
argocd login localhost:8080 \
  --username admin \
  --password <password-del-paso-3> \
  --insecure
```

## Configuración de una aplicación

### Ejemplo básico: desplegar una app con Helm

```yaml
# apps/webapp/application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: webapp-dev
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/lra-cloud-ops/webapp
    targetRevision: HEAD
    path: helm/webapp
    helm:
      valueFiles:
        - values-dev.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: dev
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

### Aplicar el manifiesto

```bash
kubectl apply -f apps/webapp/application.yaml

# Verificar el estado
argocd app get webapp-dev
argocd app sync webapp-dev  # solo si no hay auto-sync
```

## Auto-sync y Self-Healing

Los campos clave en `syncPolicy` son:

- **`automated.prune: true`**: elimina recursos del clúster que ya no existen en Git. Sin esto, los recursos huérfanos se acumulan.
- **`automated.selfHeal: true`**: reconcilia automáticamente si alguien modifica el clúster manualmente. Esto es lo que hace GitOps real: el estado del clúster siempre refleja Git, no comandos ad-hoc.
- **`retry`**: reintenta sincronizaciones fallidas con backoff exponencial. Esencial para despliegues con dependencias de CRDs.

## Multi-environment con Helm values overlays

La estrategia más limpia para multi-entorno es un único Chart con `values` separados por entorno:

```
helm/webapp/
├── Chart.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── hpa.yaml
│   └── ingress.yaml
├── values.yaml          # valores por defecto (dev)
├── values-dev.yaml      # overrides para dev
└── values-prod.yaml     # overrides para prod
```

```yaml
# values-dev.yaml
replicaCount: 1
image:
  tag: "latest"
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "250m"
    memory: "256Mi"
ingress:
  host: dev.webapp.lracloudops.com
```

```yaml
# values-prod.yaml
replicaCount: 3
image:
  tag: "v1.2.0"  # tag fijo, nunca 'latest' en prod
resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    cpu: "1000m"
    memory: "1Gi"
ingress:
  host: webapp.lracloudops.com
hpa:
  minReplicas: 3
  maxReplicas: 10
```

Para gestionar múltiples entornos sin duplicar manifiestos, usa `ApplicationSet`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: webapp-environments
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: dev
            namespace: dev
          - env: prod
            namespace: prod
  template:
    metadata:
      name: 'webapp-{{env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/lra-cloud-ops/webapp
        targetRevision: HEAD
        path: helm/webapp
        helm:
          valueFiles:
            - 'values-{{env}}.yaml'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

## 5 mejores prácticas de producción

### 1. RBAC: principio de mínimo privilegio

Crea proyectos de ArgoCD para cada equipo y limita qué repositorios y namespaces puede gestionar cada uno:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: backend-team
  namespace: argocd
spec:
  description: "Backend team applications"
  sourceRepos:
    - "https://github.com/lra-cloud-ops/backend-*"
  destinations:
    - namespace: "backend-*"
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: ""
      kind: Namespace
  namespaceResourceBlacklist:
    - group: ""
      kind: ResourceQuota
```

### 2. Network Policies para el namespace de ArgoCD

El servidor de ArgoCD necesita acceso a la API de Kubernetes y a los repositorios Git. Nada más:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-server-policy
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - ports:
        - port: 8080
        - port: 8443
  egress:
    - ports:
        - port: 443   # Git (HTTPS)
        - port: 6443  # Kubernetes API
```

### 3. Image update policies con Argo Image Updater

En lugar de modificar manualmente el tag de imagen en Git, usa Argo Image Updater para actualizar automáticamente basándose en políticas semver:

```yaml
metadata:
  annotations:
    argocd-image-updater.argoproj.io/image-list: webapp=your-ecr/webapp
    argocd-image-updater.argoproj.io/webapp.update-strategy: semver
    argocd-image-updater.argoproj.io/webapp.allow-tags: regexp:^v[0-9]+\.[0-9]+\.[0-9]+$
    argocd-image-updater.argoproj.io/write-back-method: git
```

### 4. Notificaciones en Slack o PagerDuty

Configura ArgoCD Notifications para alertar en cada degradación de estado:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [slack-sync-failed]
  template.slack-sync-failed: |
    message: |
      :red_circle: App {{.app.metadata.name}} falló en sincronización.
      Motivo: {{.app.status.operationState.message}}
```

### 5. Rollback automatizado con estrategia de release

Define límites de historial para poder revertir rápidamente:

```yaml
spec:
  revisionHistoryLimit: 10
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Para revertir a una versión anterior:

```bash
# Ver historial
argocd app history webapp-prod

# Revertir a la revisión anterior
argocd app rollback webapp-prod <revision-id>
```

## Conclusión

ArgoCD en EKS elimina la brecha entre lo que está en Git y lo que corre en producción. Con auto-sync y self-healing activos, los cambios manuales al clúster son automáticamente revertidos, la configuración drift desaparece y el historial de cambios es auditable desde el repositorio Git.

La clave no está en instalar ArgoCD — está en diseñar la estructura de repositorios y los values de Helm para que la promoción entre entornos sea un simple cambio de tag con una pull request revisada.

¿Quieres implementar GitOps en tu organización? [Contáctanos](/contacto) para una evaluación técnica sin compromiso.
