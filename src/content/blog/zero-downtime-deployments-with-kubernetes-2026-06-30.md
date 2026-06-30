---
titulo: "Zero-Downtime Deployments with Kubernetes"
descripcion: "Zero-Downtime Deployments with Kubernetes: practical guide for DevOps engineers and platform teams."
fecha: "2026-06-30"
tags: ["Kubernetes","DevOps","SRE"]
draft: false
---

# Zero-Downtime Deployments with Kubernetes

Running production workloads means your users expect your application to be available around the clock. Whether you're pushing a critical security patch at 2 AM or rolling out a shiny new feature during peak traffic hours, the deployment process itself should be invisible to end users. The reality, however, is that naive deployment strategies — stopping the old version, then starting the new one — introduce service interruptions that erode user trust and damage business metrics. This is the problem that zero-downtime deployments are designed to solve.

Kubernetes provides a rich set of primitives that make zero-downtime deployments achievable without requiring a dedicated platform engineering team or exotic third-party tooling. Out of the box, Kubernetes supports rolling updates, readiness probes, pod disruption budgets, and pre-stop hooks — all of which work together to ensure that traffic is only routed to healthy pods. The challenge is that many teams enable these features partially or misconfigure them, leaving subtle gaps that only surface under load or during an incident. Understanding how each piece fits together is critical to getting deployments right consistently.

In this post, we'll walk through a production-grade deployment configuration, explain the reasoning behind each setting, and highlight the most common pitfalls teams encounter when trying to achieve true zero-downtime behavior. By the end, you'll have a concrete blueprint you can apply to your own workloads today.

---

## The Core Building Blocks

### 1. Rolling Update Strategy

The default Kubernetes deployment strategy is `RollingUpdate`, but the default parameters are often too aggressive. By default, Kubernetes allows up to 25% of pods to be unavailable and spins up 25% extra pods during a rollout. For small deployments (e.g., 2 replicas), this can mean 100% of your capacity is replaced at once.

Configure `maxUnavailable` and `maxSurge` explicitly:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0   # Never remove a pod before a new one is ready
      maxSurge: 1         # Spin up one extra pod at a time
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: registry.example.com/my-app:1.2.3
```

Setting `maxUnavailable: 0` is the single most impactful change most teams can make. It guarantees that Kubernetes will never terminate an existing pod until a replacement is fully healthy and serving traffic.

---

### 2. Readiness Probes — The Gatekeeper

A rolling update is only as safe as your readiness probe. Kubernetes uses readiness probes to decide whether a pod should receive traffic. Without one, Kubernetes assumes a pod is ready the moment the container process starts — which is almost never true for real applications that need to load configuration, warm up caches, or establish database connections.

```yaml
readinessProbe:
  httpGet:
    path: /healthz/ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3
  successThreshold: 1
```

Pair this with a separate liveness probe to detect and restart deadlocked processes:

```yaml
livenessProbe:
  httpGet:
    path: /healthz/live
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 10
  failureThreshold: 3
```

Your `/healthz/ready` endpoint should return HTTP `200` only when the application is genuinely ready to handle requests — database connection pool established, caches populated, downstream dependencies reachable. Your `/healthz/live` endpoint should return `200` as long as the process is not deadlocked, regardless of dependency health.

---

### 3. Graceful Shutdown with preStop Hooks

When Kubernetes terminates a pod, it sends a `SIGTERM` signal to your container and simultaneously removes the pod from the Service endpoints list. The problem is that these two operations happen *concurrently*. There is a brief window where `kube-proxy` or your Ingress controller hasn't yet propagated the endpoint removal, but your application is already shutting down — resulting in dropped requests.

The fix is a `preStop` hook that introduces a small delay before your application begins its shutdown sequence:

```yaml
lifecycle:
  preStop:
    exec:
      command: ["sh", "-c", "sleep 5"]
```

Your full container spec should look like this:

```yaml
containers:
  - name: my-app
    image: registry.example.com/my-app:1.2.3
    ports:
      - containerPort: 8080
    lifecycle:
      preStop:
        exec:
          command: ["sh", "-c", "sleep 5"]
    readinessProbe:
      httpGet:
        path: /healthz/ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
      failureThreshold: 3
    livenessProbe:
      httpGet:
        path: /healthz/live
        port: 8080
      initialDelaySeconds: 15
      periodSeconds: 10
      failureThreshold: 3
    resources:
      requests:
        cpu: "250m"
        memory: "256Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
```

Also ensure your `terminationGracePeriodSeconds` is long enough to accommodate the `preStop` sleep plus your application's actual shutdown time:

```yaml
spec:
  terminationGracePeriodSeconds: 60
```

---

### 4. Pod Disruption Budgets

Node maintenance, cluster upgrades, and autoscaler scale-down events can evict pods involuntarily. A `PodDisruptionBudget` (PDB) tells Kubernetes the minimum number (or percentage) of pods that must remain available during voluntary disruptions:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-app
```

For high-availability workloads, prefer `minAvailable` over `maxUnavailable` to express an absolute floor. For a 4-replica deployment, `minAvailable: 2` means at least half your capacity is always serving traffic, even during aggressive node maintenance windows.

---

### 5. Putting It All Together with a CI/CD Pipeline

Here's how to integrate this into a GitOps-style deployment using a simple shell script that you can plug into any CI system (GitHub Actions, GitLab CI, Jenkins, etc.):

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_NAME="my-app"
NAMESPACE="production"
NEW_IMAGE="registry.example.com/my-app:${IMAGE_TAG}"
DEPLOY_TIMEOUT="300s"

echo "==> Updating image to ${NEW_IMAGE}"
kubectl set image deployment/"${APP_NAME}" \
  "${APP_NAME}=${NEW_IMAGE}" \
  --namespace="${NAMESPACE}" \
  --record

echo "==> Waiting for rollout to complete..."
kubectl rollout status deployment/"${APP_NAME}" \
  --namespace="${NAMESPACE}" \
  --timeout="${DEPLOY_TIMEOUT}"

echo "==> Verifying pod health..."
READY_PODS=$(kubectl get deployment "${APP_NAME}" \
  --namespace="${NAMESPACE}" \
  -o jsonpath='{.status.readyReplicas}')

DESIRED_PODS=$(kubectl get deployment "${APP_NAME}" \
  --namespace="${NAMESPACE}" \
  -o jsonpath='{.spec.replicas}')

if [[ "${READY_PODS}" -ne "${DESIRED_PODS}" ]]; then
  echo "ERROR: Only ${READY_PODS}/${DESIRED_PODS} pods are ready. Rolling back."
  kubectl rollout undo deployment/"${APP_NAME}" --namespace="${NAMESPACE}"
  exit 1
fi
