---
titulo: "Kubernetes GitOps Platform"
descripcion: "Reference GitOps architecture on a KinD cluster with ArgoCD as the sole delivery mechanism. Kubernetes manifests are the single source of truth — auto-sync, prune and selfHeal enforce Git as the authoritative state."
fecha: 2026-05-01
categoria: "Kubernetes & GitOps"
madurez: "Reference"
stack: ["Kubernetes 1.29", "ArgoCD", "KinD", "Docker", "Kustomize", "GitOps", "YAML"]
cicd: true
github: "https://github.com/Liquenson/k8s-devops-platform"
featured: false
iconPath: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
draft: false
metricas:
  - { label: "KinD Nodes", value: "3" }
  - { label: "Control plane", value: "1 + 2 workers" }
  - { label: "Port mapping", value: "80/443 Ingress-ready" }
  - { label: "Delivery", value: "ArgoCD GitOps" }
highlights:
  - "3-node KinD cluster: 1 control plane + 2 workers with workload/platform scheduling labels"
  - "Port mapping 80/443 pre-configured: Ingress Controller ready without cluster reconfiguration"
  - "ArgoCD with auto-sync, prune and selfHeal: Git is the enforced source of truth — not a convention"
  - "Kustomize base/overlays pattern for environment-specific configuration without YAML duplication"
  - "No kubectl apply in the production path — all changes flow through ArgoCD sync"
  - "Exponential backoff retry policy: 5 attempts, 5s initial delay, up to 3 minutes maximum"
arquitectura:
  - { nombre: "GitHub Repository", descripcion: "Source of truth: all YAML manifests and Kustomize overlays — any resource not in Git should not be in the cluster" }
  - { nombre: "ArgoCD", descripcion: "GitOps controller that detects changes in Git and reconciles the cluster to the desired state" }
  - { nombre: "KinD Cluster", descripcion: "Kubernetes in Docker: full 3-node cluster for GitOps validation without cloud infrastructure" }
  - { nombre: "Kustomize", descripcion: "Configuration management with base/overlays pattern for dev and prod environment variants" }
  - { nombre: "apps/nginx/", descripcion: "Reference NGINX application with 2 replicas and NodePort service demonstrating the full GitOps delivery flow" }
---

## Platform overview

A reference implementation of GitOps on Kubernetes using ArgoCD. The repository is the single source of truth for cluster state. ArgoCD is the only authorized mechanism for applying changes. Manual `kubectl apply` commands are incompatible with this architecture — any change applied directly is reverted by ArgoCD on the next reconciliation cycle.

The cluster runs on KinD (Kubernetes in Docker): a 3-node topology (1 control plane + 2 workers) that starts in under 2 minutes and requires no cloud spend. The architecture is a validated starting point for teams evaluating GitOps adoption before committing to EKS.

## GitOps enforcement mechanism

ArgoCD is configured with three critical properties:

**`automated`** — sync triggers automatically when changes are pushed to the repository. No manual sync required.

**`prune: true`** — when a manifest is removed from Git, ArgoCD removes the corresponding resource from the cluster. Git defines the complete desired state, not just additions.

**`selfHeal: true`** — when someone modifies the cluster directly with `kubectl edit` or `kubectl patch`, ArgoCD detects the drift and reverts it. This converts GitOps from a team convention into an enforced operational constraint.

The retry policy handles transient sync failures:

```yaml
retry:
  limit: 5
  backoff:
    duration: 5s
    factor: 2
    maxDuration: 3m
```

After 5 failed attempts the application is marked `Degraded`, surfacing the failure for human investigation rather than silently retrying indefinitely.

## Repository structure

```
apps/
├── nginx/              # Reference application: 2-replica Deployment + NodePort Service
└── sample-app/
    ├── base/           # Deployment + Service base configuration
    └── overlays/
        ├── dev/        # 1 replica, minimal resource requests
        └── prod/       # 3 replicas, HPA, resource limits
platform/
├── argocd/             # ArgoCD configuration — managed by ArgoCD itself
├── ingress/            # Ingress controller
├── monitoring/         # Prometheus + Grafana
└── policies/           # Network policies, OPA constraints
```

The Kustomize base/overlays pattern keeps environment differences explicit and minimal. The dev overlay patches only the replica count — it does not duplicate the Service definition or any other unchanged configuration. Changes to the base propagate to both overlays automatically on the next sync.

## Operational constraints

**The only valid kubectl command** in a GitOps workflow is dry-run validation before push:

```bash
# Validate manifest syntax
kubectl apply --dry-run=client -f apps/nginx/

# Validate Kustomize output
kubectl kustomize apps/sample-app/overlays/dev | kubectl apply --dry-run=client -f -
```

**Prune and accidental deletion** — with `prune: true`, moving a manifest to a `_backup/` directory or archiving it elsewhere in the repository triggers deletion of the running resource on the next sync. The correct approach for work-in-progress changes is Git branches, not directory restructuring.

**Polling interval** — ArgoCD's default reconciliation interval is 3 minutes. For immediate sync during active development, use `argocd app sync app-name`. For production environments, GitHub webhooks to ArgoCD eliminate polling and make sync nearly instantaneous.

## Use as a reference

This architecture is validated as a starting point for GitOps adoption. Teams evaluating whether to adopt ArgoCD before committing to an EKS environment can validate the operational model — delivery mechanism, drift detection, self-healing behavior — locally with zero cloud cost.

The cluster topology (public subnets, no NAT, single-node database) would not carry over directly to production. The GitOps operational model does.
