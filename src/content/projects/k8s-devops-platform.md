---
titulo: "Kubernetes DevOps Platform"
descripcion: "Plataforma GitOps sobre Kubernetes con ArgoCD. GitHub actúa como única fuente de verdad: cada cambio en el repositorio se sincroniza automáticamente al cluster con prune y selfHeal habilitados."
fecha: 2026-05-01
categoria: "Kubernetes & GitOps"
madurez: "Demo"
stack: ["Kubernetes 1.29", "ArgoCD", "KinD", "Docker", "Kustomize", "GitOps", "YAML"]
cicd: true
github: "https://github.com/Liquenson/k8s-devops-platform"
featured: false
iconPath: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
draft: false
metricas:
  - { label: "Nodos KinD", value: "3" }
  - { label: "Retry ArgoCD", value: "5 intentos" }
  - { label: "Sync policy", value: "Auto + Prune" }
  - { label: "Fuente de verdad", value: "Git" }
highlights:
  - "ArgoCD como controlador declarativo: ningún cambio manual sobrevive al siguiente sync"
  - "Auto-sync con prune: recursos eliminados en Git se eliminan del cluster automáticamente"
  - "SelfHeal: modificaciones manuales al cluster son revertidas al estado de Git"
  - "Retry policy de 5 intentos con backoff: tolerancia a fallos transitorios en sincronización"
  - "Cluster local KinD con 3 nodos para desarrollo y testing sin costo de cloud"
  - "Kustomize para overlays base/dev/prod en la app de ejemplo"
arquitectura:
  - { nombre: "GitHub Repository", descripcion: "Fuente de verdad: todos los manifests YAML y overlays Kustomize viven aquí" }
  - { nombre: "ArgoCD", descripcion: "Controlador GitOps que detecta cambios en Git y sincroniza el estado al cluster" }
  - { nombre: "KinD Cluster", descripcion: "Kubernetes in Docker: cluster local de 3 nodos sin necesidad de cloud" }
  - { nombre: "Kustomize", descripcion: "Gestión de configuración con patrón base/overlays para diferentes entornos" }
  - { nombre: "apps/nginx/", descripcion: "App de ejemplo NGINX con 2 réplicas y NodePort service para validar el flujo GitOps" }
---

## Descripción del proyecto

Kubernetes DevOps Platform es una implementación de referencia del patrón GitOps usando ArgoCD. El principio central es simple pero poderoso: el repositorio Git es la única fuente de verdad para el estado del cluster. Si no está en Git, no debería estar en el cluster.

## Por qué GitOps

El enfoque tradicional de `kubectl apply` tiene un problema fundamental: el estado del cluster puede divergir de lo que está documentado en el repositorio. Un operador puede hacer cambios de emergencia directamente al cluster que nadie más conoce, y la próxima vez que alguien haga apply desde el repositorio, esos cambios se pierden sin trazabilidad.

GitOps invierte este flujo: en lugar de que los humanos empujen cambios al cluster, ArgoCD continuamente verifica que el cluster coincida con el repositorio y corrige cualquier diferencia automáticamente.

## Cómo funciona la sincronización

```
Desarrollador → git push → GitHub
                               ↓
                    ArgoCD detecta cambio (polling)
                               ↓
                    kubectl apply del estado deseado
                               ↓
                    Cluster converge al estado de Git
```

Con `selfHeal: true`, si alguien modifica el cluster manualmente con `kubectl edit`, ArgoCD revertirá el cambio en el siguiente ciclo de reconciliación. Todos los cambios pasan por Git y quedan auditados en el historial de commits.

Con `prune: true`, si un recurso se elimina del repositorio, ArgoCD lo elimina del cluster. El cluster siempre refleja exactamente lo que está en Git.

## Cluster local con KinD

KinD (Kubernetes in Docker) permite crear un cluster Kubernetes completo en Docker en menos de 2 minutos. La configuración usa 3 nodos: 1 control plane + 2 workers, lo que permite testear comportamientos de scheduling, toleraciones y afinidad de pods sin infraestructura cloud.

```bash
kind create cluster --config clusters/local/kind-config.yaml
```

## App de ejemplo con Kustomize

El repositorio incluye una aplicación NGINX que demuestra el patrón base/overlays de Kustomize. La configuración base define el Deployment y Service. Los overlays especifican diferencias por entorno: dev con 1 réplica, prod con 3 réplicas y recursos diferentes.

```
apps/sample-app/
├── base/          # Deployment + Service base
└── overlays/
    ├── dev/       # 1 réplica, recursos mínimos
    └── prod/      # 3 réplicas, resource limits
```

## La regla de oro

**Nunca usar `kubectl apply` directamente en el cluster gestionado por ArgoCD.** Cualquier cambio aplicado manualmente será sobreescrito por ArgoCD en el siguiente sync. El único camino correcto es hacer commit al repositorio y esperar que ArgoCD sincronice.

## Validar manifests antes de push

```bash
# Dry-run local para detectar errores de YAML antes de push
kubectl apply --dry-run=client -f apps/nginx/
```

Este comando valida la sintaxis y estructura de los manifests sin aplicarlos al cluster real.

## Lessons learned

La mayor confusión inicial fue con `prune: true`. Sin prune, eliminar un recurso del repositorio lo pone en estado "OutOfSync" pero no lo elimina del cluster. Con prune habilitado, los recursos sin correspondencia en Git se eliminan automáticamente. Es poderoso pero requiere cuidado: borrar accidentalmente un manifest de Git elimina el recurso del cluster.

La segunda lección: el tiempo de polling de ArgoCD puede sentirse lento en desarrollo activo. Para forzar una sincronización inmediata sin esperar el ciclo de polling: `argocd app sync <app-name>`. Esto es útil durante el desarrollo iterativo de manifests.
