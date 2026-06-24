---
titulo: "k8s-devops-platform"
descripcion: "Zero manual kubectl applies in production. ArgoCD delivers every deployment declaratively from Git — drifts auto-corrected without human intervention. KinD mirrors production exactly so 'works locally, fails in prod' failures are eliminated. Prometheus + Grafana observability from day one."
fecha: 2026-06-13
categoria: "Kubernetes & GitOps"
madurez: "Reference"
featured: false
github: "https://github.com/lra-cloud-ops/k8s-devops-platform"
cicd: false
draft: false

categoria_es: "Kubernetes y GitOps"
madurez_es: "Referencia"
descripcion_es: "Cero kubectl apply manuales en producción. ArgoCD entrega cada despliegue declarativamente desde Git — los drifts se corrigen automáticamente. KinD refleja producción exactamente: los fallos 'funciona en local pero no en prod' son eliminados. Observabilidad Prometheus + Grafana desde el día uno."
metricas_es:
  - label: "kubectl apply manuales en producción"
    value: "0"
  - label: "despliegues reconciliados por GitOps"
    value: "100%"
  - label: "paridad entorno local/producción (KinD)"
    value: "Exacta"
  - label: "detección y corrección de drift"
    value: "Auto-heal"
highlights_es:
  - "Cero kubectl apply manuales en producción — ArgoCD auto-sync + prune + selfHeal en cada cambio"
  - "KinD refleja producción exactamente — elimina los fallos de paridad local/producción"
  - "GitOps con ArgoCD — declarativo, versionado y reconciliado automáticamente"

flow_steps:
  - label: "KinD"
    sublabel: "Local K8s"
    icon: "kubernetes"
  - label: "Helm"
    sublabel: "Packaging"
    icon: "helm"
  - label: "ArgoCD"
    sublabel: "GitOps"
    icon: "argo"
  - label: "Prometheus"
    sublabel: "Observability"
    icon: "prometheus"

stack:
  - "Kubernetes"
  - "ArgoCD"
  - "Helm"
  - "KinD"
  - "Prometheus"
  - "Grafana"
  - "Alertmanager"
metricas:
  - label: "manual kubectl applies in production"
    value: "0"
  - label: "GitOps-reconciled deployments"
    value: "100%"
  - label: "local/production environment parity (KinD)"
    value: "Exact"
  - label: "drift detection & correction"
    value: "Auto-heal"
highlights:
  - "Zero manual kubectl applies in production — ArgoCD auto-sync + prune + selfHeal on every change"
  - "KinD mirrors production exactly — eliminates 'works locally but fails in prod' failures"
  - "GitOps with ArgoCD — declarative, versioned and automatically reconciled"
  - "Helm Charts with per-environment values — dev, staging, production"
  - "Full observability — Prometheus metrics, Grafana dashboards, Alertmanager routing"
---

## Overview

`k8s-devops-platform` is a Kubernetes reference platform built around GitOps delivery with ArgoCD. Every deployment is declarative, versioned and automatically reconciled — no manual kubectl commands in production.

KinD (Kubernetes in Docker) provides a local development environment that mirrors production exactly. Helm Charts with per-environment values files handle application configuration. Prometheus, Grafana and Alertmanager provide full observability from day one.

**Organization:** [LRA Cloud Operations](https://lracloudops.com)
**Repository:** [github.com/lra-cloud-ops/k8s-devops-platform](https://github.com/lra-cloud-ops/k8s-devops-platform)

---

## Architecture

```
Git Repository (source of truth)
         │
         ▼
      ArgoCD
  (GitOps controller)
         │
         ├── auto-sync
         ├── prune
         └── selfHeal
         │
         ▼
  Kubernetes Cluster
         │
         ├── KinD (local dev)
         └── Production cluster
              │
              ├── Applications (Helm Charts)
              ├── Prometheus (metrics)
              ├── Grafana (dashboards)
              └── Alertmanager (routing)
```

### GitOps delivery flow

Any commit to the Git repository triggers ArgoCD auto-sync. The controller reconciles the desired state from Git against the live cluster state — drifts are detected and corrected automatically without human intervention.

### Local development with KinD

KinD (Kubernetes in Docker) runs inside a single Docker container and mirrors the production cluster topology. Developers iterate locally using the same Helm Charts and ArgoCD configuration that runs in production.

---

## Getting Started

```bash
git clone https://github.com/lra-cloud-ops/k8s-devops-platform.git
cd k8s-devops-platform
```

**Local cluster with KinD:**

```bash
kind create cluster --config kind-config.yaml
kubectl apply -f argocd/install.yaml
```

**Deploy applications via ArgoCD:**

```bash
kubectl apply -f apps/
# ArgoCD takes over — auto-sync handles the rest
```

**Verify observability stack:**

```bash
kubectl get pods -n monitoring
kubectl port-forward svc/grafana 3000:3000 -n monitoring
```

---

## Key Engineering Decisions

**Why ArgoCD over manual kubectl:** ArgoCD uses Git as the single source of truth. Any drift between the cluster state and the Git repository is detected and reconciled automatically. No engineer can accidentally apply a change that isn't tracked in Git.

**Why KinD for local development:** KinD runs Kubernetes inside Docker containers. The local environment uses the same Helm Charts and ArgoCD configuration as production — no "works on my machine" surprises.

**Why Helm + per-environment values:** A single Helm Chart with separate values files for dev, staging and production. Promotes consistency across environments while allowing environment-specific configuration.

**Why full observability from day one:** Prometheus, Grafana and Alertmanager are deployed as part of the initial platform — not added later. SLIs and alerting thresholds are defined before the first workload reaches the cluster.

---

## Key Learnings

**What worked:** Using KinD made the local/production parity near-perfect — the same ArgoCD ApplicationSet syncing to a KinD cluster locally is structurally identical to the production EKS setup. This eliminated entire categories of "works locally but not in prod" failures.

**What we learned:** HPA requires metrics-server to be installed before the first workload, not after. Deferring it creates a gap where scaling behavior is undefined — add it to the cluster bootstrap, not the application deployment.

**What we'd improve:** Deploying the kube-prometheus-stack via ArgoCD Application from day one rather than as a manual Helm release would make the observability layer itself subject to GitOps reconciliation and drift detection.
