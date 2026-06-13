---
titulo: "Kubernetes on bare metal with kubeadm: architecture decisions from k8s-on-premise"
descripcion: "How we built a production-grade Kubernetes cluster on bare metal using kubeadm, Vagrant and VirtualBox. Architecture decisions, networking with Calico, GitOps with ArgoCD — and why we chose bare metal over EKS for this project."
fecha: 2026-06-10
tags: ["Kubernetes", "kubeadm", "ArgoCD", "Calico", "GitOps"]
draft: false
---

## Why bare metal instead of EKS

Every Kubernetes project in the lra-cloud-ops portfolio that runs on AWS uses EKS. EKS abstracts the control plane, handles upgrades, and integrates directly with IAM, VPC, and the AWS load balancer controller. For production workloads that live on AWS, EKS is the right answer.

The k8s-on-premise project exists for a different reason: to understand what EKS does for you. When the control plane is managed, you never see etcd, you never configure the API server flags, and you never debug a CNI plugin from scratch. That knowledge gap becomes a problem the first time you operate a cluster in an environment where EKS is not available — on-premise hardware, an air-gapped network, or a provider without a managed Kubernetes offering.

The decision to use bare metal with kubeadm was deliberate. The goal was not to run workloads cheaply. It was to build operational knowledge about what a Kubernetes cluster actually is.

## Cluster architecture: 1 control plane, 2 workers

The cluster runs three VMs provisioned with Vagrant and VirtualBox. Fixed IP addresses on a host-only network:

```
192.168.56.10  master   — control plane
192.168.56.11  worker1  — workload node
192.168.56.12  worker2  — workload node
```

Fixed IPs matter here. kubeadm generates TLS certificates that include the API server address. If the IP changes, the certificates are invalid and the cluster breaks. With DHCP, a VM restart can produce a different IP. Using a host-only network with static allocation removes this failure mode entirely.

The Vagrantfile uses a shared provisioning script to configure all three nodes identically up to the point where they diverge — the master runs `kubeadm init`, the workers run `kubeadm join`.

```ruby
# Vagrantfile excerpt
Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"

  nodes = [
    { name: "master",  ip: "192.168.56.10", memory: 2048, cpus: 2 },
    { name: "worker1", ip: "192.168.56.11", memory: 2048, cpus: 2 },
    { name: "worker2", ip: "192.168.56.12", memory: 2048, cpus: 2 },
  ]

  nodes.each do |node|
    config.vm.define node[:name] do |vm|
      vm.vm.hostname = node[:name]
      vm.vm.network "private_network", ip: node[:ip]
      vm.vm.provider "virtualbox" do |vb|
        vb.memory = node[:memory]
        vb.cpus   = node[:cpus]
      end
      vm.vm.provision "shell", path: "scripts/common.sh"
      if node[:name] == "master"
        vm.vm.provision "shell", path: "scripts/master.sh"
      else
        vm.vm.provision "shell", path: "scripts/worker.sh"
      end
    end
  end
end
```

Running `vagrant up` provisions all three nodes sequentially. The common script handles container runtime (containerd), kubeadm, kubelet, and kubectl installation. The cluster is ready in approximately 20 minutes on a standard laptop.

## Calico v3.27.0 as CNI — why not Flannel or Cilium

Kubernetes does not include a CNI plugin. The cluster cannot schedule pods until a CNI is installed. Three plugins appear most frequently in documentation: Flannel, Calico, and Cilium.

**Flannel** is the simplest option. It implements VXLAN overlay networking and has no external dependencies. For a learning cluster, it works. For anything production-adjacent, it does not support NetworkPolicy. Any pod can reach any other pod on any port. That is not an acceptable security posture.

**Cilium** is the most capable option. It uses eBPF instead of iptables, supports L7 policy, and has native integration with service mesh tools. The operational overhead is significantly higher — eBPF requires kernel 5.4+, the configuration surface is large, and troubleshooting requires understanding the eBPF dataplane.

**Calico v3.27.0** sits between them. It implements NetworkPolicy fully, uses iptables by default (no kernel version requirement), and the configuration is explicit and readable. For a cluster that needs real network isolation without the complexity of a full service mesh, Calico is the right choice.

Installation is a single manifest:

```bash
# Install Calico v3.27.0
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

After applying, the coredns pods transition from Pending to Running. The CNI plugin is operational. You can verify Calico is working by inspecting the `calico-node` DaemonSet:

```bash
kubectl get daemonset calico-node -n kube-system
# NAME          DESIRED   CURRENT   READY   ...
# calico-node   3         3         3       ...
```

All three nodes means the DaemonSet has pods on all nodes. All three ready means the CNI is functional on every node.

## ArgoCD auto-sync + prune + selfHeal from day one

Installing ArgoCD before deploying any application is a deliberate choice. The alternative — deploying workloads manually, then introducing ArgoCD later — creates a state reconciliation problem. ArgoCD would need to adopt resources it did not create, and any resource not in the repository would be pruned on the first sync.

Starting with ArgoCD means the cluster never has a configuration that is not in Git.

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

The Application resource that ArgoCD uses to manage itself and the cluster applications defines three critical sync options:

```yaml
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

`automated` means changes in Git are applied without human intervention. `prune: true` means removing a manifest from Git removes the corresponding resource from the cluster. `selfHeal: true` means any manual change to the cluster is reverted on the next reconciliation cycle — typically within 3 minutes.

These three options together make GitOps a guarantee rather than a convention.

## NGINX Ingress with NodePort

EKS integrates with the AWS load balancer controller to provision an NLB or ALB automatically when you create a Service of type LoadBalancer. Bare metal has no equivalent. There is no cloud API to call. The cluster must expose services through a mechanism that works without external infrastructure.

NodePort is that mechanism. The NGINX Ingress controller is installed and configured to listen on NodePort 30080 (HTTP) and 30443 (HTTPS):

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/baremetal/deploy.yaml
```

The baremetal deployment manifest uses a NodePort Service instead of LoadBalancer. Requests to any node's IP on port 30080 are forwarded to the Ingress controller, which routes them to the appropriate backend Service based on the Ingress rules.

For local development with Vagrant, accessing a workload means hitting `http://192.168.56.10:30080` with the appropriate Host header. Not as clean as a DNS name backed by a load balancer, but fully functional.

## Idempotent scripts with set -euo pipefail

All provisioning scripts follow the same pattern used in the linux-fleet-manager project: `set -euo pipefail` at the top, idempotent operations throughout.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Disable swap — required by kubelet
if swapon --show | grep -q .; then
  swapoff -a
  sed -i '/swap/d' /etc/fstab
  echo "Swap disabled"
else
  echo "Swap already disabled — skipping"
fi
```

The swap check illustrates the pattern: check the current state, apply the change only if needed, log what happened. Running the script twice on the same node produces the same result. This is the Red Hat standard for provisioning scripts and it matters when `vagrant provision` runs after a failure partway through setup.

## Lessons from the first three phases

**Phase 1 — Cluster provisioning:** The most common failure is clock skew between nodes. kubeadm requires clocks to be within a narrow window. Provisioning scripts must include NTP configuration before running kubeadm init. A cluster provisioned without NTP will appear to work and then fail in unpredictable ways as certificates expire prematurely.

**Phase 2 — CNI installation:** Calico pods in CrashLoopBackOff after installation usually means the pod CIDR in the Calico manifest does not match the `--pod-network-cidr` passed to kubeadm init. The kubeadm default is `10.244.0.0/16`. Calico's default is `192.168.0.0/16`. Pick one and configure both to match.

**Phase 3 — ArgoCD bootstrap:** The chicken-and-egg problem of ArgoCD managing its own configuration is real. The initial installation must be applied manually. After that, the App of Apps pattern in `platform/argocd/` takes over and manages all subsequent updates through Git.

The 18-phase roadmap for this project goes further: multi-tenancy, OPA Gatekeeper for policy enforcement, Prometheus + Grafana observability, and eventually production-grade etcd backup. The foundation built in phases 1–3 makes each subsequent phase a Git commit.

## See the full project

The complete project — Vagrantfile, provisioning scripts, Kubernetes manifests, and ArgoCD Application definitions — is at [github.com/lra-cloud-ops/k8s-on-premise](https://github.com/lra-cloud-ops/k8s-on-premise).

For a structured path from bare-metal to production Kubernetes, see [Kubernetes Adoption](/solutions/kubernetes-adoption). For the full case study including the 18-phase roadmap, see the [k8s-on-premise project page](/projects/k8s-on-premise).
