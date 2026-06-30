---
titulo: "Despliegues sin downtime con Kubernetes"
descripcion: "Despliegues sin downtime con Kubernetes: guía práctica para ingenieros DevOps y equipos de plataforma."
fecha: "2026-06-30"
tags: ["Kubernetes","DevOps","SRE"]
draft: false
---

# Despliegues sin downtime con Kubernetes

## El problema del tiempo de inactividad en producción

Uno de los mayores desafíos en entornos de producción modernos es garantizar que las actualizaciones de software lleguen a los usuarios sin interrupciones. En arquitecturas tradicionales, un despliegue implicaba detener el servicio, reemplazar los binarios y volver a iniciarlo, generando ventanas de mantenimiento que afectaban directamente la experiencia del usuario y, en muchos casos, los ingresos del negocio. A medida que las expectativas de disponibilidad aumentan, el modelo de "apagar y encender" se vuelve simplemente inaceptable.

Kubernetes nació precisamente para resolver este tipo de problemas a escala. Su modelo declarativo y su orquestador de contenedores permiten implementar estrategias de despliegue sofisticadas que garantizan continuidad del servicio durante las actualizaciones. Sin embargo, conocer las herramientas disponibles no es suficiente: es necesario entender **cuándo y cómo aplicar cada estrategia** según el contexto de la aplicación, el riesgo tolerable y los recursos disponibles en el clúster.

En este artículo exploraremos las estrategias más utilizadas para lograr despliegues sin downtime en Kubernetes: **Rolling Update**, **Blue/Green** y **Canary**. Veremos ejemplos prácticos de configuración y las consideraciones clave que debes tener en cuenta antes de elegir una estrategia para tu equipo.

---

## Estrategias de despliegue y su implementación

### 1. Rolling Update (la estrategia predeterminada)

La estrategia `RollingUpdate` es el comportamiento por defecto en Kubernetes. Reemplaza los pods de la versión anterior de forma gradual, asegurando que siempre haya una cantidad mínima de réplicas disponibles durante el proceso.

```yaml
# deployment-rolling.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-backend
  namespace: production
spec:
  replicas: 6
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2          # Pods extra permitidos durante el update
      maxUnavailable: 1    # Pods que pueden estar fuera de servicio
  selector:
    matchLabels:
      app: api-backend
  template:
    metadata:
      labels:
        app: api-backend
        version: "2.1.0"
    spec:
      containers:
        - name: api
          image: lracloud/api-backend:2.1.0
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 20
            periodSeconds: 10
```

> **⚠️ Punto crítico:** Las `readinessProbe` son **obligatorias** para un rolling update seguro. Sin ellas, Kubernetes puede enviar tráfico a pods que aún no están listos para responder.

Para verificar el progreso del despliegue en tiempo real:

```bash
# Monitorear el estado del rollout
kubectl rollout status deployment/api-backend -n production

# Ver el historial de revisiones
kubectl rollout history deployment/api-backend -n production

# Revertir al estado anterior si algo falla
kubectl rollout undo deployment/api-backend -n production

# Revertir a una revisión específica
kubectl rollout undo deployment/api-backend --to-revision=3 -n production
```

---

### 2. Blue/Green Deployment

La estrategia Blue/Green mantiene **dos entornos idénticos** en paralelo: el ambiente activo (blue) y el nuevo ambiente (green). El tráfico se redirige de manera instantánea una vez que el entorno green está validado.

```yaml
# service-selector.yaml - El Service apunta a "blue" o "green" según el label
apiVersion: v1
kind: Service
metadata:
  name: api-backend-svc
  namespace: production
spec:
  selector:
    app: api-backend
    slot: blue          # Cambia a "green" para el cutover
  ports:
    - port: 80
      targetPort: 8080
---
# deployment-blue.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-backend-blue
  namespace: production
spec:
  replicas: 6
  selector:
    matchLabels:
      app: api-backend
      slot: blue
  template:
    metadata:
      labels:
        app: api-backend
        slot: blue
        version: "2.0.0"
    spec:
      containers:
        - name: api
          image: lracloud/api-backend:2.0.0
          ports:
            - containerPort: 8080
---
# deployment-green.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-backend-green
  namespace: production
spec:
  replicas: 6
  selector:
    matchLabels:
      app: api-backend
      slot: green
  template:
    metadata:
      labels:
        app: api-backend
        slot: green
        version: "2.1.0"
    spec:
      containers:
        - name: api
          image: lracloud/api-backend:2.1.0
          ports:
            - containerPort: 8080
```

El proceso de cutover es tan simple como un `patch` sobre el Service:

```bash
# Validar que el entorno green está saludable antes del cutover
kubectl get pods -n production -l slot=green

# Ejecutar el cambio de tráfico (cutover instantáneo)
kubectl patch service api-backend-svc -n production \
  -p '{"spec":{"selector":{"slot":"green"}}}'

# Verificar que el service ahora apunta a green
kubectl describe service api-backend-svc -n production | grep Selector

# Si todo va bien, eliminar el deployment blue
kubectl delete deployment api-backend-blue -n production
```

---

### 3. Canary Deployment

La estrategia Canary es ideal cuando quieres **exponer la nueva versión a un porcentaje reducido del tráfico** antes de hacer un despliegue completo. Permite detectar errores con impacto mínimo.

```yaml
# deployment-canary.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-backend-canary
  namespace: production
  annotations:
    deployment.kubernetes.io/revision: "1"
spec:
  replicas: 1             # 1 de 7 pods totales = ~14% del tráfico
  selector:
    matchLabels:
      app: api-backend    # Mismo selector que el deployment estable
      track: canary
  template:
    metadata:
      labels:
        app: api-backend
        track: canary
        version: "2.1.0"
    spec:
      containers:
        - name: api
          image: lracloud/api-backend:2.1.0
          ports:
            - containerPort: 8080
          env:
            - name: FEATURE_FLAGS
              value: "new-checkout-flow=true"
```

Para un control más granular del tráfico, puedes usar **Ingress con pesos** mediante NGINX Ingress Controller:

```yaml
# ingress-canary.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-backend-canary
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
