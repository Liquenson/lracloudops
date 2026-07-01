---
titulo: "Gestión de recursos en Kubernetes y HPA"
descripcion: "Gestión de recursos en Kubernetes y HPA: guía práctica para ingenieros DevOps y equipos de plataforma."
fecha: "2026-07-01"
tags: ["Kubernetes","DevOps","Cloud"]
draft: false
---

# Gestión de Recursos en Kubernetes y Escalado Automático con HPA

## Contexto y Problema

Uno de los desafíos más comunes en entornos de producción con Kubernetes es garantizar que las aplicaciones tengan acceso a los recursos que necesitan —CPU y memoria principalmente— sin desperdiciar capacidad del clúster ni incurrir en costos innecesarios. Muchos equipos configuran valores estáticos de `requests` y `limits` sin un criterio claro, lo que lleva a dos escenarios problemáticos: pods que se quedan sin recursos y son terminados por el *OOMKiller*, o nodos infrautilizados que generan gasto en la nube sin justificación.

El problema se agrava cuando las cargas de trabajo son variables. Una API REST puede recibir tráfico mínimo durante la madrugada y picos extremos durante horario comercial. Mantener réplicas estáticas para cubrir el peor escenario es ineficiente. Aquí es donde el **Horizontal Pod Autoscaler (HPA)** se convierte en una herramienta esencial, pero su efectividad depende directamente de que los recursos del pod estén correctamente definidos desde el principio.

Sin `requests` bien configurados, el *scheduler* de Kubernetes no puede tomar decisiones de ubicación correctas, y el HPA no tiene métricas de referencia confiables para calcular cuántas réplicas necesita. Es un problema en cadena: recursos mal definidos → métricas inestables → escalado impredecible → degradación del servicio.

---

## Enfoque de Solución

### 1. Definición Correcta de Requests y Limits

El primer paso es entender la diferencia semántica entre ambos valores:

- **`requests`**: lo que el pod *necesita garantizado* para funcionar. El scheduler usa esto para decidir en qué nodo colocar el pod.
- **`limits`**: el techo máximo que el pod puede consumir. Si lo supera, CPU se throttlea y memoria provoca el *OOMKill*.

Una regla práctica es: **establece `limits` entre 1.5x y 2x el valor de `requests`** para dar espacio a picos transitorios sin permitir que un pod monopolice el nodo.

```yaml
# deployment.yaml - Configuración recomendada de recursos
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-servicio
  namespace: produccion
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-servicio
  template:
    metadata:
      labels:
        app: api-servicio
    spec:
      containers:
        - name: api-servicio
          image: lracloud/api-servicio:1.4.2
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "250m"       # 0.25 vCPU garantizado
              memory: "256Mi"   # 256 MB garantizados
            limits:
              cpu: "500m"       # Máximo 0.5 vCPU
              memory: "512Mi"   # Máximo 512 MB
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
```

### 2. Configuración del HPA con Métricas de CPU y Memoria

Con los `requests` definidos, el HPA puede calcular el porcentaje de utilización real del pod respecto a su valor garantizado. La API `autoscaling/v2` permite combinar múltiples métricas y afinar el comportamiento del escalado.

```yaml
# hpa.yaml - HPA con múltiples métricas y comportamiento controlado
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-servicio-hpa
  namespace: produccion
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-servicio
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60   # Escala cuando CPU > 60% del request
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 75   # Escala cuando memoria > 75% del request
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60    # Espera 60s antes de escalar arriba
      policies:
        - type: Pods
          value: 4                       # Máximo 4 pods nuevos por ventana
          periodSeconds: 60
        - type: Percent
          value: 100                     # O duplicar el total actual
          periodSeconds: 60
      selectPolicy: Max                  # Toma la política más agresiva
    scaleDown:
      stabilizationWindowSeconds: 300   # Espera 5 min antes de escalar abajo
      policies:
        - type: Pods
          value: 2                       # Máximo 2 pods eliminados por ventana
          periodSeconds: 120
```

> **Nota**: La ventana de estabilización en `scaleDown` (300 segundos) es deliberadamente más conservadora para evitar *flapping* (ciclos rápidos de escalar arriba/abajo).

### 3. Validación con kubectl y Métricas en Tiempo Real

```bash
# Verificar el estado actual del HPA
kubectl get hpa -n produccion

# Salida esperada:
# NAME               REFERENCE                TARGETS              MINPODS   MAXPODS   REPLICAS
# api-servicio-hpa   Deployment/api-servicio  45%/60%, 62%/75%     2         20        4

# Descripción detallada del HPA con historial de eventos
kubectl describe hpa api-servicio-hpa -n produccion

# Ver consumo actual de recursos por pod
kubectl top pods -n produccion --containers | grep api-servicio

# Obtener métricas del pod directamente desde metrics-server
kubectl get --raw "/apis/metrics.k8s.io/v1beta1/namespaces/produccion/pods" | \
  jq '.items[] | select(.metadata.name | startswith("api-servicio")) | 
  {pod: .metadata.name, cpu: .containers[0].usage.cpu, mem: .containers[0].usage.memory}'
```

### 4. LimitRange y ResourceQuota a Nivel de Namespace

Para evitar que un equipo agote los recursos del clúster accidentalmente, es buena práctica añadir controles a nivel de namespace:

```yaml
# limitrange.yaml - Valores por defecto si el desarrollador no especifica recursos
apiVersion: v1
kind: LimitRange
metadata:
  name: limites-default
  namespace: produccion
spec:
  limits:
    - type: Container
      default:
        cpu: "300m"
        memory: "384Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "2"
        memory: "2Gi"
      min:
        cpu: "50m"
        memory: "64Mi"
---
# resourcequota.yaml - Límite total del namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: quota-produccion
  namespace: produccion
spec:
  hard:
    requests.cpu: "20"         # Total de requests CPU en el namespace
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
    pods: "100"                # Máximo 100 pods en el namespace
```

### 5. Script de Auditoría de Recursos

Para identificar
