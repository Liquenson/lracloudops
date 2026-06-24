---
titulo: "k8s-on-premise"
descripcion: "Full Kubernetes cluster from zero in ~20 minutes with a single command: vagrant up. kubeadm + Calico CNI + ArgoCD GitOps + NGINX Ingress on bare metal. Idempotent provisioning — destroy and rebuild anytime, no cloud dependency."
fecha: 2026-06-11
categoria: "Kubernetes & GitOps"
madurez: "In Development"
featured: false
github: "https://github.com/lra-cloud-ops/k8s-on-premise"
cicd: false
draft: true

categoria_es: "Kubernetes y GitOps"
madurez_es: "En Desarrollo"
descripcion_es: "Cluster Kubernetes completo desde cero en ~20 minutos con un único comando: vagrant up. kubeadm + CNI Calico + GitOps ArgoCD + Ingress NGINX sobre bare metal. Aprovisionamiento idempotente — destruye y reconstruye cuando quieras, sin dependencia de cloud."
metricas_es:
  - label: "cluster completo desde cero"
    value: "~20 min"
  - label: "comando para cluster operativo"
    value: "1 (vagrant up)"
  - label: "dependencia de cloud"
    value: "0"
  - label: "fases completadas de 18"
    value: "3"
highlights_es:
  - "Cluster Kubernetes completo desde cero en ~20 minutos — un solo comando: vagrant up, cero dependencia de cloud"
  - "Aprovisionamiento idempotente — vagrant destroy && vagrant up siempre produce un cluster limpio"
  - "ArgoCD GitOps — auto-sync + prune + selfHeal habilitados desde la fase 3"

flow_steps:
  - label: "Vagrant"
    sublabel: "VM provisioning"
    icon: "vagrant"
  - label: "kubeadm"
    sublabel: "Cluster init"
    icon: "kubernetes"
  - label: "Calico"
    sublabel: "CNI"
  - label: "ArgoCD"
    sublabel: "GitOps"
    icon: "argo"

stack:
  - "Kubernetes v1.31.14"
  - "ArgoCD"
  - "Helm v3.21.0"
  - "Calico v3.27.0"
  - "NGINX Ingress"
  - "containerd v2.2.1"
  - "Vagrant"
  - "VirtualBox"

metricas:
  - label: "full cluster from scratch"
    value: "~20 min"
  - label: "command to working cluster"
    value: "1 (vagrant up)"
  - label: "cloud dependency"
    value: "0"
  - label: "phases complete of 18"
    value: "3"

highlights:
  - "Full Kubernetes cluster from zero in ~20 minutes — single command: vagrant up, zero cloud dependency"
  - "Idempotent provisioning — vagrant destroy && vagrant up always produces a clean cluster"
  - "ArgoCD GitOps — auto-sync + prune + selfHeal enabled from phase 3"
  - "NGINX Ingress with NodePort — demo app exposed on cluster"
  - "Roadmap covers 18 phases: storage, observability, security, CI/CD"
  - "Built following Red Hat engineering standards — set -euo pipefail throughout"
---

## Overview

`k8s-on-premise` is a production-oriented Kubernetes lab built on bare metal using kubeadm, Vagrant and VirtualBox. The goal is a fully automated, reproducible multi-node cluster that covers the complete DevOps stack across 18 phases — from base provisioning to GitOps delivery, observability, security and CI/CD.

Every phase is documented, version-pinned and interview-ready. The cluster runs on a single host machine with no cloud dependency.

**Organization:** [LRA Cloud Operations](https://lracloudops.com)
**Repository:** [github.com/lra-cloud-ops/k8s-on-premise](https://github.com/lra-cloud-ops/k8s-on-premise)

---

## Architecture

```
Host: Windows 11 Pro · Intel i7-13620H · 32GB RAM

┌─────────────────────────────────────────────────────────┐
│                      VirtualBox                         │
│                                                         │
│  ┌──────────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │   master-node    │  │worker-node-1│  │worker-node-2│ │
│  │ 192.168.56.10    │  │192.168.56.11│  │192.168.56.12│ │
│  │ 6GB RAM · 4 CPU  │  │6GB · 4 CPU  │  │6GB · 4 CPU│  │
│  │  Control Plane   │  │   Worker    │  │  Worker   │  │
│  └──────────────────┘  └─────────────┘  └───────────┘  │
│                                                         │
│  CNI: Calico v3.27.0    Runtime: containerd v2.2.1      │
│  Kubernetes: v1.31.14   OS: Ubuntu 22.04 LTS            │
└─────────────────────────────────────────────────────────┘
```

### Traffic flow

```
Browser (host)
      │
      ▼
192.168.56.11:30080 (NodePort)
      │
      ▼
NGINX Ingress Controller
      │
      ├──► nginx-lracloudops.local → nginx-lracloudops (2-3 replicas)
      └──► argocd.local:30443      → ArgoCD UI
```

---

## Prerequisites

| Tool       | Version | Purpose         |
|------------|---------|-----------------|
| VirtualBox | 7.x     | Hypervisor      |
| Vagrant    | 2.x     | VM provisioning |
| Git        | any     | Source control  |

**Minimum host resources:** 20GB RAM · 12 CPU cores · 150GB disk

---

## Getting Started

```bash
git clone https://github.com/lra-cloud-ops/k8s-on-premise.git
cd k8s-on-premise
vagrant up
```

Provisioning runs automatically in ~20 minutes:

1. `common.sh` — installs containerd, kubeadm, kubelet, kubectl on all nodes
2. `master.sh` — initializes Control Plane, deploys Calico CNI
3. `worker.sh` — resets prior state, joins workers to the cluster

**Post-install:**

```bash
vagrant ssh master
bash /vagrant/scripts/post-install.sh
```

Installs Helm, Metrics Server and local-path StorageClass.

**Verify:**

```bash
kubectl get nodes -o wide
kubectl top nodes
kubectl get pods -n argocd
kubectl get pods -n ingress-nginx
```

---

## Repository Structure

```
k8s-on-premise/
├── Vagrantfile                  # Infrastructure as Code — 3 VMs
├── README.md
├── .gitignore
├── apps/
│   └── nginx-lracloudops/       # GitOps demo app managed by ArgoCD
│       └── deployment.yaml      # Deployment + Service + Ingress
└── scripts/
    ├── common.sh                # Base setup — all nodes
    ├── master.sh                # Control Plane initialization
    ├── worker.sh                # Worker join (idempotent)
    ├── post-install.sh          # Helm + Metrics Server + StorageClass
    └── helm-metrics.sh          # Phase 1 reference script
```

---

## Roadmap

| Phase | Component                               | Status      |
|-------|-----------------------------------------|-------------|
| Base  | Vagrant · containerd · kubeadm · Calico | ✅ Complete  |
| 1     | Helm v3.21.0 · Metrics Server v0.8.0    | ✅ Complete  |
| 2     | local-path-provisioner (StorageClass)   | ✅ Complete  |
| 3     | NGINX Ingress Controller                | ✅ Complete  |
| 4     | cert-manager                            | ⬜ Planned   |
| 5     | PostgreSQL (StatefulSet)                | ⬜ Planned   |
| 6     | Prometheus                              | ⬜ Planned   |
| 7     | Grafana                                 | ⬜ Planned   |
| 8     | ArgoCD (GitOps)                         | ⬜ Planned   |
| 9     | Horizontal Pod Autoscaler               | ⬜ Planned   |
| 10    | Network Policies                        | ⬜ Planned   |
| 11    | RBAC                                    | ⬜ Planned   |
| 12    | Secrets Management (Vault/Sealed)       | ⬜ Planned   |
| 13    | Jenkins CI                              | ⬜ Planned   |
| 14    | SonarQube                               | ⬜ Planned   |
| 15    | Jaeger (Distributed Tracing)            | ⬜ Planned   |
| 16    | EFK Stack (Logging)                     | ⬜ Planned   |
| 17    | Multi-environment (staging/production)  | ⬜ Planned   |
| 18    | Full GitOps pipeline end-to-end         | ⬜ Planned   |

---

## Key Engineering Decisions

**Why bare metal instead of cloud:** The goal is reproducibility without cloud dependency. Any engineer can run `vagrant up` and have an identical cluster in 20 minutes — no AWS account, no cost, no drift between environments.

**Why idempotent scripts:** `worker.sh` resets prior state before joining. This means the cluster can be destroyed and rebuilt from scratch without manual cleanup. `vagrant destroy && vagrant up` always produces a clean state.

**Why ArgoCD from phase 3:** GitOps delivery is not an afterthought. The demo app is managed by ArgoCD from the beginning — any commit to the repo triggers an automatic sync to the cluster. This mirrors production GitOps workflows.

**Why Red Hat engineering standards:** Every script uses `set -euo pipefail`, centralized variables, numbered step logging and semantic commits. The cluster is built to be audited, not just run.

---

## Key Learnings

**What worked:** The idempotent provisioning model (`vagrant destroy && vagrant up` → clean cluster every time) turned out to be the most valuable design decision — it made the 18-phase roadmap iterative rather than fragile. Destroying and rebuilding to test a new phase takes 20 minutes, not a day.

**What we learned:** Bare metal requires more upfront networking decisions than managed Kubernetes — the Calico CNI choice and the pod CIDR range need to be decided before `kubeadm init`, not after. Getting this wrong requires a full cluster rebuild.

**What we'd improve:** Earlier Prometheus/Grafana integration (Phase 6) would have surfaced resource constraints on the VirtualBox VMs sooner — RAM allocation per node was tuned by trial and error rather than metric-driven decisions.
