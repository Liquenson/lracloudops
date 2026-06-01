---
titulo: "GitOps on Kubernetes: Git as the Authoritative Source for Cluster State"
descripcion: "How ArgoCD enforces GitOps: auto-sync, prune and selfHeal behavior, why kubectl apply is incompatible with GitOps, and the operational constraints this architecture imposes on teams."
fecha: 2026-05-01
tags: ["Kubernetes", "GitOps", "ArgoCD", "KinD", "Kustomize", "DevOps", "CI/CD"]
draft: false
---

## Problem

The standard Kubernetes workflow — modify a manifest, run `kubectl apply -f deployment.yaml` — fails silently in team environments. It fails not because the command is wrong, but because it has no memory.

An engineer modifies a configuration directly on the cluster during a 2am incident. That change is not in Git. The next person to run `kubectl apply` from the repository overwrites it without knowing. The cluster ends up in a state nobody fully knows and nobody can reproduce. Audit logs show what was applied but not what the cluster actually contains right now, or how it diverged.

GitOps inverts this model. Instead of humans pushing changes to the cluster, a controller continuously verifies that the cluster matches the repository and corrects any difference automatically. The repository is not documentation of what should be deployed — it is the authoritative definition of what is deployed.

## Context

The `k8s-devops-platform` project is a reference implementation of GitOps using ArgoCD on a KinD cluster. ArgoCD is the only authorized mechanism for applying changes to the cluster. Every resource in the cluster corresponds to a manifest in Git. Every change to a manifest produces a traceable commit.

## Architecture

```
Developer
    ↓ git push
GitHub (source of truth)
    ↓ ArgoCD detects change (polling or webhook)
ArgoCD Controller
    ↓ kubectl apply of desired state
KinD Cluster (actual state)
```

Consequences of this architecture:

- Every cluster change has a commit, an author and a timestamp
- The cluster is reproducible: creating a new cluster and installing ArgoCD restores full application state from Git
- Manual changes cannot persist: ArgoCD reverts them on the next reconciliation cycle

## Implementation

### Cluster provisioning with KinD

KinD (Kubernetes in Docker) creates a production-topology Kubernetes cluster inside Docker containers. A 3-node cluster — 1 control plane + 2 workers — starts in under 2 minutes with no cloud spend:

```bash
kind create cluster --config clusters/local/kind-config.yaml
```

The `kind-config.yaml` configures port mapping for the Ingress controller (80/443 → host ports) and node labels for workload/platform scheduling separation. Without explicit port mapping, NodePort services are unreachable from the host.

### ArgoCD Application manifest

Applications are defined as Kubernetes resources of type `Application`. This is the full configuration for the reference NGINX application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/Liquenson/k8s-devops-platform
    targetRevision: HEAD
    path: apps/nginx
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### The three critical sync parameters

**`automated`** — enables automatic synchronization. Without this, ArgoCD detects differences between Git and the cluster but does not apply them. The team must trigger sync manually. With `automated`, ArgoCD applies detected changes without human intervention.

**`prune: true`** — when a resource is removed from the Git repository, ArgoCD removes it from the cluster. Without prune, removing a manifest from Git puts the resource in "OutOfSync" state but leaves it running. With prune, Git defines the complete desired state — not just additions.

This behavior requires operational discipline: moving a YAML file to a different directory or archiving it in a `_backup/` folder triggers deletion of the running resource. The correct pattern for in-progress work is Git branches, not directory restructuring.

**`selfHeal: true`** — when someone modifies the cluster directly with `kubectl edit` or `kubectl patch`, ArgoCD detects the drift and reverts it on the next reconciliation. This converts GitOps from a convention ("we should use Git for everything") into a guarantee ("changes outside Git are physically impossible to maintain").

### Retry policy

```yaml
retry:
  limit: 5
  backoff:
    duration: 5s
    factor: 2
    maxDuration: 3m
```

If a sync fails — because a CRD is not yet available, or there is a race condition during namespace creation — ArgoCD retries with exponential backoff: 5s, 10s, 20s, 40s, up to 3 minutes maximum. After 5 failed attempts, the application is marked `Degraded` and requires human intervention. This prevents false alerts from transient sync failures while still surfacing persistent problems.

### Kustomize overlays

The repository demonstrates the base/overlays pattern for environment-specific configuration:

```
apps/sample-app/
├── base/
│   ├── deployment.yaml    # 2 replicas, base resource requests
│   └── service.yaml
└── overlays/
    ├── dev/
    │   └── kustomization.yaml   # 1 replica, minimal resources
    └── prod/
        └── kustomization.yaml   # 3 replicas, HPA, resource limits
```

Overlays define only what differs from the base. The dev overlay does not duplicate the Service definition — it patches only the replica count. A change to the base Service propagates automatically to both overlays on the next sync.

### Validation before push

The only kubectl command that belongs in a GitOps workflow is dry-run validation:

```bash
# Validate manifest syntax before commit
kubectl apply --dry-run=client -f apps/nginx/

# Validate Kustomize output
kubectl kustomize apps/sample-app/overlays/dev | kubectl apply --dry-run=client -f -
```

Dry-run detects YAML syntax errors and references to nonexistent resources before they reach the cluster. It does not interact with the cluster — it only validates that the manifests would be accepted.

## Operational Considerations

**The polling interval** — ArgoCD's default reconciliation interval is 3 minutes. In active development this feels slow. Two options: force immediate sync with `argocd app sync app-name`, or configure GitHub webhooks to notify ArgoCD of push events. Webhooks eliminate polling entirely and make sync nearly instantaneous. In production, webhooks are the correct configuration. Polling is the fallback when webhook configuration is not possible.

**kubectl apply is incompatible with managed applications** — any change applied directly with `kubectl apply` or `kubectl edit` to a resource managed by ArgoCD will be reverted on the next reconciliation cycle. This is by design. Teams new to GitOps discover this quickly: a change applied manually during an incident reverts itself within minutes. The correct incident response is to make the change in Git, push, and use `argocd app sync` to apply immediately.

**Platform vs application separation** — the repository separates application workloads (`apps/`) from platform infrastructure (`platform/`). ArgoCD can manage both:

```
platform/
├── argocd/       # ArgoCD configuration itself
├── ingress/      # Ingress controller
├── monitoring/   # Prometheus + Grafana
└── policies/     # Network policies, OPA constraints
```

This App of Apps pattern means the entire cluster — both platform components and application workloads — is reconciled from Git. A new cluster installs ArgoCD, points it at the repository root, and self-assembles.

**Prune and accidental deletions** — the most common operational error with prune enabled is accidentally removing a YAML file from a path that ArgoCD monitors. The resource disappears from the cluster on the next sync. Recovery is a git revert and a sync. The time window is the polling interval — usually under 3 minutes if caught quickly, potentially longer if not noticed.

## Outcome

GitOps with ArgoCD produces these properties at steady state:

**Auditability** — every cluster change has a Git commit with author, timestamp and diff. Git is the audit log for cluster state.

**Disaster recovery** — if the cluster is lost, create a new KinD cluster, install ArgoCD, and register the Application manifests pointing at the repository. The cluster reconstructs itself from Git without manual intervention.

**Change review** — infrastructure changes go through pull requests with code review, exactly like application code. No production change without approval.

**Drift prevention** — the cluster always reflects the repository. There is no "emergency configuration" or "temporary fix" that never gets documented.

The operational constraint this imposes is real: teams must change how they respond to incidents. The instinct to reach for `kubectl edit` must be replaced with the habit of editing Git. This is a workflow change that takes time to internalize and is worth the investment.
