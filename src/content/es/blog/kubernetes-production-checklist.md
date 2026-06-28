---
titulo: "Kubernetes en Producción: 20 Verificaciones Antes del Go-Live"
descripcion: "Checklist completo de 20 verificaciones críticas para Kubernetes en producción: resource limits, HPA, network policies, RBAC, secrets y observabilidad."
fecha: 2026-06-15
tags: ["Kubernetes", "EKS", "Production", "DevOps", "SRE"]
draft: false
---

## Por qué los clústeres Kubernetes fallan en producción

La mayoría de los fallos en clústeres Kubernetes de producción no son causados por bugs en Kubernetes. Son causados por configuraciones incorrectas que funcionan perfectamente en staging y explotan bajo carga real, con múltiples réplicas, o durante un nodo failure.

Los patrones más comunes que vemos en auditorías:

- Deployments sin `resources.limits` que consumen todo el CPU del nodo (CPU throttling en cascada)
- Ausencia de `PodDisruptionBudgets` que permite que los cluster autoscaler drene demasiados nodos simultáneamente
- Secrets en variables de entorno visibles en `kubectl describe pod`
- Network policies ausentes que permiten tráfico lateral entre namespaces
- Liveness probes mal configurados que reinician pods en picos de carga normales

Este checklist cubre las 20 verificaciones que revisamos antes de declarar cualquier clúster listo para producción.

---

## 1. Resource requests y limits (obligatorio)

**El problema**: sin `requests`, el scheduler no puede tomar decisiones informadas. Sin `limits`, un pod puede consumir todos los recursos del nodo.

```yaml
resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"
```

**Verifica** que ningún deployment en producción tiene `resources: {}` con:

```bash
kubectl get pods -A -o json | jq '.items[] | select(.spec.containers[].resources.limits == null) | .metadata.name'
```

## 2. Namespace LimitRange como red de seguridad

Define un `LimitRange` en cada namespace para que los pods sin `resources` definidos reciban defaults razonables:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    - default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      type: Container
```

## 3. HPA y Cluster Autoscaler

El `HorizontalPodAutoscaler` escala pods basándose en métricas. El Cluster Autoscaler escala nodos cuando no hay capacidad para los pods pendientes.

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
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

**Verifica** que el Cluster Autoscaler está instalado y configurado con los grupos de nodos correctos.

## 4. Network Policies como default-deny

Sin Network Policies, cualquier pod puede comunicarse con cualquier otro pod en el clúster. Esto es inaceptable en entornos regulados.

```yaml
# Default-deny para todo el tráfico en el namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}  # aplica a todos los pods
  policyTypes:
    - Ingress
    - Egress
```

```yaml
# Permitir tráfico desde el ingress controller al backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-to-webapp
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: webapp
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 8080
```

## 5. RBAC mínimo con ejemplos

Nunca uses `ClusterRole` con `*` en producción para aplicaciones de usuario. Define roles específicos:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: webapp-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list"]
    resourceNames: ["webapp-config", "webapp-secrets"]  # limitar a recursos específicos
```

```bash
# Auditar permisos de un ServiceAccount
kubectl auth can-i --list --as=system:serviceaccount:production:webapp-sa -n production
```

## 6. Secrets con External Secrets Operator

Las variables de entorno en los manifiestos de Kubernetes son base64, no cifradas. Cualquiera con acceso de lectura al clúster puede decodificarlas.

La solución correcta es External Secrets Operator, que sincroniza secrets desde AWS Secrets Manager o HashiCorp Vault:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: production/database
        property: password
    - secretKey: DB_USERNAME
      remoteRef:
        key: production/database
        property: username
```

## 7. Health checks: liveness vs readiness vs startup

Tres probes con propósitos distintos:

- **Startup probe**: espera a que la aplicación arranque. Evita que liveness mate el pod durante el inicio lento.
- **Readiness probe**: controla si el pod recibe tráfico del Service. Un pod failing readiness no recibe requests pero no se reinicia.
- **Liveness probe**: reinicia el pod si la app está en estado irrecuperable.

```yaml
startupProbe:
  httpGet:
    path: /health/startup
    port: 8080
  failureThreshold: 30    # 30 * 10s = 5 min para arrancar
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3

livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 60   # después del startup probe
  periodSeconds: 10
  failureThreshold: 5       # 5 fallos antes de reiniciar
```

**Error común**: usar el mismo endpoint para readiness y liveness. Si la DB está caída, readiness debe fallar (dejar de recibir tráfico) pero liveness no debe fallar (el pod no está muerto, solo degradado).

## 8. PodDisruptionBudgets

Un PDB garantiza que el cluster autoscaler o una operación de mantenimiento no drene todos tus pods simultáneamente:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: webapp-pdb
  namespace: production
spec:
  minAvailable: 2   # siempre al menos 2 pods disponibles
  selector:
    matchLabels:
      app: webapp
```

Alternativa: usar `maxUnavailable: 1` en lugar de `minAvailable`.

## 9. Anti-affinity para alta disponibilidad

Asegura que las réplicas no se ejecutan todas en el mismo nodo:

```yaml
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            app: webapp
        topologyKey: kubernetes.io/hostname
```

## 10. ImagePullPolicy y tags de imagen

Nunca uses `latest` en producción ni `imagePullPolicy: Always` en workloads de alto throughput (cada pod restart hace un pull de la imagen).

```yaml
image: your-ecr.amazonaws.com/webapp:v1.2.0   # tag inmutable
imagePullPolicy: IfNotPresent                  # solo pull si no existe localmente
```

## 11. SecurityContext: no root

Ningun pod de producción debe ejecutarse como root:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 3000
  fsGroup: 2000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
```

## 12. Namespace ResourceQuota

Limita el uso total de recursos por namespace:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: "20Gi"
    limits.cpu: "20"
    limits.memory: "40Gi"
    pods: "50"
```

## 13. Topología de nodos multi-AZ

Verifica que los nodos están distribuidos en al menos 2 AZs:

```bash
kubectl get nodes -o custom-columns="NAME:.metadata.name,ZONE:.metadata.labels.topology\.kubernetes\.io/zone"
```

## 14. etcd backups automáticos

En EKS, AWS gestiona etcd. En clústeres self-managed, configura backups automáticos:

```bash
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-$(date +%Y%m%d-%H%M%S).db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key
```

## 15. Ingress con TLS termination

Nunca expongas HTTP sin TLS en producción. Usa cert-manager para gestión automática de certificados:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webapp-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
    - hosts:
        - webapp.lracloudops.com
      secretName: webapp-tls
  rules:
    - host: webapp.lracloudops.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: webapp
                port:
                  number: 80
```

## 16. Observabilidad desde el día 1

Prometheus + Grafana + Alertmanager deben estar configurados **antes** de que llegue el primer usuario. No después del primer incidente.

Reglas de alerta mínimas:
- Pods en CrashLoopBackOff por más de 5 minutos
- Uso de memoria > 85% del límite
- Error rate HTTP > 1% durante 5 minutos
- Latencia P99 > 2 segundos

## 17. Políticas de reintentos y circuit breaker

Configura Istio o un service mesh para circuit breaking, o implementa reintentos a nivel de aplicación con backoff exponencial.

## 18. Límites de tamaño de ConfigMap y Secret

Un ConfigMap o Secret no puede superar 1MiB. Si tus configuraciones son más grandes, usa un sistema externo (AWS AppConfig, HashiCorp Vault).

## 19. Nodes taints y tolerations para workloads críticos

Dedica nodos específicos para cargas de producción críticas:

```bash
kubectl taint nodes <node-name> dedicated=production:NoSchedule
```

```yaml
tolerations:
  - key: "dedicated"
    operator: "Equal"
    value: "production"
    effect: "NoSchedule"
```

## 20. Estrategia de rollback documentada

Antes del go-live, documenta y prueba el procedimiento de rollback:

```bash
# Ver historial de despliegues
kubectl rollout history deployment/webapp -n production

# Revertir al anterior
kubectl rollout undo deployment/webapp -n production

# Revertir a una versión específica
kubectl rollout undo deployment/webapp --to-revision=3 -n production

# Con GitOps (ArgoCD): revertir el commit en Git
git revert HEAD
git push origin main
```

---

## Conclusión

Estas 20 verificaciones no son opcionales en un entorno de producción real — son el estándar mínimo. Kubernetes ofrece los mecanismos para construir infraestructura resiliente, pero ninguno de ellos viene activado por defecto. La responsabilidad de la configuración correcta es del equipo de plataforma.

La buena noticia: una vez implementados correctamente, estos controles se propagan a todos los despliegues futuros sin esfuerzo adicional.

¿Quieres que revisemos tu configuración de Kubernetes antes de pasar a producción? [Contáctanos](/contacto) para un audit técnico.
