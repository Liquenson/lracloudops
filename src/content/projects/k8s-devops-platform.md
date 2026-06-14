---
titulo: "k8s-devops-platform"
descripcion: "Kubernetes platform with GitOps delivery via ArgoCD. Declarative, automated and versioned deployments using KinD for local development. Helm Charts, Prometheus, Grafana and Alertmanager observability stack."
fecha: 2026-06-13
categoria: "Kubernetes & GitOps"
madurez: "Reference"
featured: false
github: "https://github.com/lra-cloud-ops/k8s-devops-platform"
cicd: false
draft: false

categoria_es: "Kubernetes y GitOps"
madurez_es: "Referencia"
descripcion_es: "Plataforma Kubernetes con entrega GitOps vía ArgoCD. Despliegues declarativos, automatizados y versionados usando KinD para desarrollo local. Helm Charts, Prometheus, Grafana y stack de observabilidad con Alertmanager."
metricas_es:
  - label: "GitOps — auto-sync ArgoCD"
    value: "Modelo de entrega"
  - label: "KinD refleja producción"
    value: "Desarrollo local"
  - label: "Prometheus + Grafana"
    value: "Observabilidad"
  - label: "Declarativo — Helm + ArgoCD"
    value: "Despliegues"
highlights_es:
  - "GitOps con ArgoCD — declarativo, versionado y reconciliado automáticamente"
  - "KinD (Kubernetes en Docker) para desarrollo local que refleja producción"
  - "Helm Charts con valores por entorno — dev, staging, producción"
stack:
  - "Kubernetes"
  - "ArgoCD"
  - "Helm"
  - "KinD"
  - "Prometheus"
  - "Grafana"
  - "Alertmanager"
metricas:
  - label: "Delivery model"
    value: "GitOps — ArgoCD auto-sync"
  - label: "Local dev"
    value: "KinD mirrors production"
  - label: "Observability"
    value: "Prometheus + Grafana"
  - label: "Deployments"
    value: "Declarative — Helm + ArgoCD"
highlights:
  - "GitOps with ArgoCD — declarative, versioned and automatically reconciled"
  - "KinD (Kubernetes in Docker) for local development that mirrors production"
  - "Helm Charts with per-environment values — dev, staging, production"
  - "Full observability — Prometheus metrics, Grafana dashboards, Alertmanager routing"
  - "Zero manual kubectl apply in production — ArgoCD auto-sync + prune + selfHeal"
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
