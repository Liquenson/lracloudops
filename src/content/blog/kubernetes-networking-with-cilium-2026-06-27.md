---
titulo: "Kubernetes Networking with Cilium"
descripcion: "Kubernetes Networking with Cilium: practical guide for DevOps engineers and platform teams."
fecha: "2026-06-27"
tags: ["Kubernetes","Networking","Cloud"]
draft: false
---

# Kubernetes Networking with Cilium: eBPF-Powered Networking for Modern Clusters

## The Problem with Traditional Kubernetes Networking

Kubernetes networking has always been one of the more complex aspects of running production clusters. By default, most CNI (Container Network Interface) plugins rely heavily on `iptables` to manage traffic routing, load balancing, and network policy enforcement. While `iptables` has served the Linux ecosystem well for decades, it was never designed for the scale and dynamism of modern container workloads. As cluster size grows, the `iptables` ruleset expands linearly, and every packet traversal requires a sequential scan through potentially thousands of rules. The performance degradation is real, measurable, and at scale, it becomes a significant operational bottleneck.

Beyond raw performance, traditional CNI plugins offer limited visibility into network traffic. Debugging connectivity issues often means staring at `tcpdump` output or correlating logs across multiple services with no unified picture of what is actually happening at the network layer. Security policies expressed through standard Kubernetes `NetworkPolicy` objects are coarse-grained — they operate at the IP address and port level, which in a dynamic cluster where pod IPs change constantly, leads to fragile and hard-to-maintain security postures.

This is where **Cilium** enters the picture. Cilium is an open-source CNI plugin that leverages **eBPF (extended Berkeley Packet Filter)** — a revolutionary Linux kernel technology that allows you to run sandboxed programs directly in the kernel without modifying kernel source code or loading kernel modules. Instead of maintaining a sprawling `iptables` ruleset, Cilium compiles network policies and routing decisions into efficient eBPF programs that run in the kernel data path. The result is dramatically better performance, richer observability, and identity-aware security policies that go far beyond what standard Kubernetes networking can offer.

---

## Solution: Installing and Configuring Cilium on a Kubernetes Cluster

### Prerequisites

Before installing Cilium, ensure your cluster meets the following requirements:

- Linux kernel **5.4 or later** (5.10+ recommended for full feature support)
- Kubernetes **1.21+**
- No existing CNI plugin installed (or an existing plugin you are prepared to replace)

You can verify your kernel version on any node:

```bash
uname -r
# Expected output: 5.15.0-91-generic (or similar >= 5.4)
```

---

### Step 1: Install the Cilium CLI

The Cilium CLI is your primary tool for installing, managing, and troubleshooting Cilium deployments.

```bash
# Install the Cilium CLI (Linux/macOS)
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
CLI_ARCH=amd64

curl -L --fail --remote-name-all \
  "https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz"

sudo tar xzvfC cilium-linux-${CLI_ARCH}.tar.gz /usr/local/bin
rm cilium-linux-${CLI_ARCH}.tar.gz

# Verify installation
cilium version --client
```

---

### Step 2: Install Cilium into Your Cluster

For a standard installation using Helm, which is the recommended approach for production environments:

```bash
# Add the Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with kube-proxy replacement enabled
helm install cilium cilium/cilium \
  --version 1.15.0 \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=<YOUR_API_SERVER_IP> \
  --set k8sServicePort=6443 \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true
```

The `kubeProxyReplacement=true` flag is critical — it tells Cilium to take over all functions traditionally handled by `kube-proxy`, eliminating it entirely and replacing DNAT-based service routing with efficient eBPF socket-level load balancing.

---

### Step 3: Verify the Installation

```bash
# Check Cilium status across all nodes
cilium status --wait

# Run the built-in connectivity test
cilium connectivity test

# Verify all Cilium pods are running
kubectl get pods -n kube-system -l k8s-app=cilium
```

Expected output from `cilium status`:

```
    /¯¯\
 /¯¯\__/¯¯\    Cilium:             OK
 \__/¯¯\__/    Operator:           OK
 /¯¯\__/¯¯\    Envoy DaemonSet:    OK
 \__/¯¯\__/    Hubble Relay:       OK
    \__/        ClusterMesh:        disabled

Deployment        cilium-operator    Desired: 2, Ready: 2/2, Available: 2/2
DaemonSet         cilium             Desired: 3, Ready: 3/3, Available: 3/3
```

---

### Step 4: Define Identity-Aware Network Policies

One of Cilium's most powerful features is **identity-based network policies** using `CiliumNetworkPolicy` CRDs. Rather than relying on volatile pod IP addresses, Cilium assigns a stable cryptographic identity to each workload based on its Kubernetes labels.

Here is a policy that restricts access to a `payments` service so that only pods with the `frontend` role can reach it on port 8080:

```yaml
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: allow-frontend-to-payments
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: payments
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              - method: "POST"
                path: "/api/v1/charge"
```

Notice that this policy enforces at Layer 7 — Cilium understands HTTP semantics and can restrict traffic down to specific HTTP methods and paths. This is not possible with standard `NetworkPolicy` objects.

---

### Step 5: Observability with Hubble

Hubble is Cilium's built-in observability platform. It provides deep, real-time visibility into network flows without any application instrumentation.

```bash
# Access the Hubble UI via port-forward
kubectl port-forward -n kube-system svc/hubble-ui 12000:80 &

# Or use the Hubble CLI to observe live traffic flows
hubble observe --namespace production --follow

# Filter flows for a specific pod
hubble observe \
  --namespace production \
  --pod payments \
  --verdict DROPPED \
  --follow
```

You can also query flow metrics directly:

```bash
# Show top talkers in the production namespace
hubble observe \
  --namespace production \
  --output json \
  | jq '.flow | {src: .source.labels, dst: .destination.labels, verdict: .verdict}'
```

---

### Step 6: Enable Encryption with WireGuard

Cilium supports **transparent pod-to-pod encryption** using WireGuard, requiring zero application changes:

```bash
# Enable WireGuard encryption via Helm upgrade
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set encryption.enabled=true \
  --set encryption.type=wireguard

# Verify encryption is active
cilium encrypt status
```

```
Encryption:               Wireguard       [NodeEncryption: Disabled, cilium_wg0 (Pubkey: AbC1...xYz=)]
```

All pod-to-pod traffic crossing node boundaries is now encrypted automatically using WireGuard, meeting compliance requirements with minimal operational overhead.

---

### Terraform Integration for Managed Clusters

If you are provisioning clusters on
