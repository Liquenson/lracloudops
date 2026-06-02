---
titulo: "GitOps en Kubernetes: Git como Fuente Autoritativa del Estado del Clúster"
descripcion: "Cómo ArgoCD implementa GitOps: comportamiento de auto-sync, prune y selfHeal, por qué kubectl apply es incompatible con GitOps, y las restricciones operacionales que esta arquitectura impone a los equipos."
fecha: 2026-05-01
tags: ["Kubernetes", "GitOps", "ArgoCD", "KinD", "Kustomize", "DevOps", "CI/CD"]
draft: false
---

## Problema

El flujo de trabajo estándar de Kubernetes — modificar un manifiesto, ejecutar `kubectl apply -f deployment.yaml` — falla silenciosamente en entornos de equipo. No falla porque el comando sea incorrecto, sino porque no tiene memoria.

Un ingeniero modifica una configuración directamente en el clúster durante un incidente a las 2am. Ese cambio no está en Git. La próxima persona que ejecute `kubectl apply` desde el repositorio lo sobreescribe sin saberlo. El clúster termina en un estado que nadie conoce completamente y que nadie puede reproducir. Los registros de auditoría muestran qué se aplicó pero no qué contiene el clúster ahora mismo, ni cómo divergió.

GitOps invierte este modelo. En lugar de que los humanos empujen cambios al clúster, un controlador verifica continuamente que el clúster coincide con el repositorio y corrige cualquier diferencia automáticamente. El repositorio no es documentación de lo que debería estar desplegado — es la definición autoritativa de lo que está desplegado.

## Cómo ArgoCD implementa GitOps

ArgoCD opera como un bucle de reconciliación. Cada Application CRD apunta a un repositorio Git, una ruta y un clúster destino. ArgoCD compara el estado deseado (Git) con el estado actual (clúster) en un intervalo configurable (por defecto 3 minutos) y, con auto-sync habilitado, aplica cualquier diferencia.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: webapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/k8s-platform
    targetRevision: main
    path: apps/webapp
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
```

**prune: true** significa que los recursos eliminados de Git son eliminados del clúster. Sin prune, el clúster acumula recursos obsoletos indefinidamente. Con prune, el estado del clúster converge hacia el repositorio tanto por adición como por eliminación.

**selfHeal: true** significa que los cambios manuales al clúster son revertidos. Si alguien ejecuta `kubectl edit deployment webapp` y modifica un campo, ArgoCD detecta la divergencia en el siguiente ciclo de reconciliación y restaura el estado de Git. Esto no es una característica de seguridad — es un mecanismo de integridad del estado.

## Por qué kubectl apply es incompatible con GitOps

`kubectl apply` y ArgoCD pueden coexistir técnicamente. No deberían coexistir operacionalmente.

`kubectl apply` no crea una referencia a qué repositorio, commit o pipeline autorizó el cambio. No puede ser revertido automáticamente. No activa notificaciones de sincronización. Si se ejecuta después de un comando ArgoCD, el próximo ciclo de selfHeal lo revierte — el cambio manual desaparece sin dejar rastro en el estado del repositorio.

La consecuencia práctica: en un sistema GitOps, `kubectl apply` directo en producción no es una operación de emergencia — es un cambio no rastreado que ArgoCD sobrescribirá. El procedimiento de emergencia correcto es un commit de emergencia en una rama con revisión acelerada, no omitir el proceso.

## Kustomize para promoción de entornos

```
apps/webapp/
  base/
    deployment.yaml
    service.yaml
    kustomization.yaml
  overlays/
    dev/
      kustomization.yaml   # patches dev-specific values
    prod/
      kustomization.yaml   # patches prod-specific values
```

La base define los recursos compartidos. Los overlays aplican patches específicos del entorno — réplicas, límites de recursos, variables de entorno. La aplicación ArgoCD para dev apunta a `apps/webapp/overlays/dev`; la de prod a `apps/webapp/overlays/prod`.

La ventaja operacional: dev y prod comparten la misma definición base. Las diferencias están explícitas en los patches. No hay archivos de configuración separados para dev y prod que puedan divergir silenciosamente.

## HPA y comportamiento de autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

El HPA es un recurso Kubernetes estándar gestionado como código en el repositorio. ArgoCD lo incluye en el scope de reconciliación junto con Deployments y Services. Si alguien modifica directamente `minReplicas` en el clúster, selfHeal lo restaura al valor de Git en el siguiente ciclo.

## Restricciones operacionales

GitOps impone restricciones que no son negociables si se quieren los beneficios:

**El repositorio es la única fuente de verdad.** No hay estado paralelo en scripts locales, documentos de wiki o herramientas de despliegue separadas. Lo que está en Git es lo que está en el clúster.

**Los secretos requieren gestión separada.** Los secretos en texto plano no deben estar en Git. El patrón es usar Sealed Secrets, External Secrets Operator o referencias a AWS Secrets Manager — recursos que contienen referencias a secretos, no los secretos en sí.

**Los despliegues de emergencia siguen el proceso.** La velocidad del proceso de revisión puede ajustarse. El proceso no puede omitirse sin romper la garantía de trazabilidad.

La restricción que la mayoría de equipos infravalora hasta experimentarla: con selfHeal habilitado, cualquier "arreglo rápido" directamente en el clúster desaparece en el próximo ciclo de reconciliación. Esto es por diseño. El dolor de este comportamiento es la señal de que el proceso de actualización necesita ser más rápido, no que GitOps deba deshabilitarse.
