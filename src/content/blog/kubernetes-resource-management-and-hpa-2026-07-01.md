---
titulo: "Kubernetes Resource Management and HPA"
descripcion: "Kubernetes Resource Management and HPA: practical guide for DevOps engineers and platform teams."
fecha: "2026-07-01"
tags: ["Kubernetes","DevOps","Cloud"]
draft: false
---

# Kubernetes Resource Management and HPA: Stop Guessing, Start Scaling

## The Problem with "Set It and Forget It" Workloads

One of the most common mistakes teams make when migrating to Kubernetes is treating it like a traditional VM environment — provisioning fixed resource allocations and calling it a day. Without proper resource requests and limits, your cluster becomes a noisy-neighbour nightmare. Pods compete for CPU and memory without any guardrails, critical workloads get throttled or OOM-killed, and your infrastructure bill quietly balloons while half your nodes sit at 10% utilisation.

The root cause is usually a misunderstanding of two fundamental Kubernetes concepts: **resource requests** (what the scheduler uses to place your pod) and **resource limits** (the hard ceiling the container runtime enforces). Getting these wrong doesn't just hurt performance — it actively undermines the scheduler's ability to make good placement decisions, leading to hot spots, cascading failures, and unpredictable latency spikes during traffic surges.

The second layer of the problem is static scaling. Even if you've perfectly tuned your resource requests, a deployment with a fixed replica count cannot respond to real-world demand. Traffic patterns are inherently variable — a flash sale, a viral post, or a scheduled batch job can spike load by 10x in seconds. This is exactly where the **Horizontal Pod Autoscaler (HPA)** comes in, and when combined with well-defined resource configuration, it becomes a genuinely powerful tool for cost-efficient, resilient operations.

---

## Solution: Resource Configuration + HPA Done Right

### Step 1: Define Meaningful Resource Requests and Limits

Always set both `requests` and `limits` on every container. Use your observability stack (Prometheus, Datadog, etc.) to baseline actual consumption before setting values. A good starting point looks like this:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
        - name: api-server
          image: lra-cloud/api-server:1.4.2
          resources:
            requests:
              cpu: "250m"       # 0.25 cores — what the scheduler reserves
              memory: "256Mi"   # guaranteed memory floor
            limits:
              cpu: "1000m"      # 1 core — hard cap, prevents CPU hogging
              memory: "512Mi"   # hard cap — exceed this and the pod is OOM-killed
          ports:
            - containerPort: 8080
```

> **Pro tip:** For CPU, a modest gap between requests and limits is fine — CPU throttling is recoverable. For memory, keep the gap tighter. Memory pressure leads to OOM kills, which are far more disruptive than CPU throttling.

---

### Step 2: Deploy the Metrics Server

HPA relies on the **Metrics Server** to query live CPU and memory usage from kubelets. If it isn't already running in your cluster, deploy it:

```bash
# Install via official manifest
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify it's healthy
kubectl get deployment metrics-server -n kube-system

# Confirm metrics are flowing
kubectl top nodes
kubectl top pods -n production
```

If you're running in a private cluster or using self-signed TLS, you may need to add `--kubelet-insecure-tls` to the metrics-server args — but only in non-production environments.

---

### Step 3: Configure HPA for CPU-Based Autoscaling

Once the Metrics Server is running and your deployment has resource requests defined, you can attach an HPA. Here's a production-grade configuration using the `autoscaling/v2` API:

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 2        # Never scale below this — maintains HA
  maxReplicas: 20       # Hard ceiling to prevent runaway scaling costs
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60   # Scale when average CPU hits 60% of request
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 75   # Scale on memory pressure too
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60    # Wait 60s before scaling up again
      policies:
        - type: Pods
          value: 4
          periodSeconds: 60             # Add at most 4 pods per minute
    scaleDown:
      stabilizationWindowSeconds: 300   # Wait 5 min before scaling down
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60             # Remove at most 25% of pods per minute
```

The `behavior` block is critical and often overlooked. Without it, HPA uses default stabilization windows that can cause **thrashing** — rapid scale up/down cycles that destabilize your application. The conservative scale-down policy above protects against premature pod termination during traffic lulls.

---

### Step 4: Validate and Monitor

```bash
# Check HPA status
kubectl get hpa api-server-hpa -n production

# Watch it in real time during a load test
kubectl get hpa api-server-hpa -n production -w

# Describe for full event history
kubectl describe hpa api-server-hpa -n production
```

A healthy HPA output looks like this:

```
NAME             REFERENCE              TARGETS          MINPODS   MAXPODS   REPLICAS
api-server-hpa   Deployment/api-server  42%/60%, 55%/75%    2        20        4
```

If you see `<unknown>` in the TARGETS column, your Metrics Server isn't reachable or your pods are missing resource requests — the two most common HPA failure modes.

---

### Step 5 (Bonus): Pair HPA with Cluster Autoscaler

HPA scales pods; it cannot conjure new nodes. When your node pool is full and HPA tries to schedule more pods, they'll sit `Pending`. Pair HPA with **Cluster Autoscaler** (or Karpenter on AWS) to handle node-level scaling:

```bash
# Example: Enable Cluster Autoscaler on GKE
gcloud container clusters update my-cluster \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=10 \
  --region=europe-west1
```

The combination of HPA + Cluster Autoscaler creates a two-tier autoscaling system: HPA responds to load within seconds by adding pods, while Cluster Autoscaler provisions new nodes within minutes when pod pressure demands it.

---

## Key Takeaways

- **Always set resource requests** on every container — HPA cannot function without them, and the scheduler cannot make intelligent placement decisions without accurate resource data.
- **Use the `autoscaling/v2` API** and define explicit `behavior` blocks to prevent HPA thrashing. Conservative scale-down windows (≥5 minutes) are almost always the right default for stateless services.
- **Don't conflate CPU requests with limits** — keep CPU limits at 3–4x requests for burst tolerance, but keep memory limits tight (1.5–2x) to avoid node-level memory pressure.
- **Metrics Server is a prerequisite**, not an optional add-on. Monitor it like any other critical system component and set up alerting if it goes unhealthy.
- **HPA alone isn't enough** at scale — combine it with Cluster Autoscaler or Karpenter to ensure node capacity keeps pace with pod scaling decisions, preventing `Pending` pod backlogs during traffic spikes.
