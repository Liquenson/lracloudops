---
titulo: "Kubernetes Networking with Cilium"
descripcion: "Kubernetes Networking with Cilium: practical guide for DevOps engineers and platform teams."
fecha: "2026-06-27"
tags: ["Kubernetes","Networking","Cloud"]
draft: false
---

# Kubernetes Networking with Cilium: eBPF-Powered Networking for Modern Clusters

## The Problem with Traditional Kubernetes Networking

Kubernetes networking has always been one of the more complex aspects of running production clusters. The default networking model relies heavily on `iptables` — a Linux kernel facility that was never designed to handle the dynamic, high-throughput workloads that modern microservices architectures demand. As your cluster grows, so does the iptables ruleset. A cluster with hundreds of services and thousands of pods can accumulate tens of thousands of iptables rules, each requiring sequential evaluation. This creates a performance bottleneck that gets worse over time and becomes nearly impossible to debug when things go wrong.

Beyond raw performance, traditional CNI plugins offer limited visibility into network traffic. When a pod is misbehaving or a microservice is experiencing latency spikes, your troubleshooting toolkit is often limited to tcpdump, netstat, and a lot of guesswork. You can see that packets are being dropped, but understanding *why* — and which specific workload is responsible — requires correlating data from multiple sources, often with no clear path forward.

Security is another pain point. Traditional Kubernetes NetworkPolicy operates at Layer 3 and Layer 4 — IP addresses and ports. In a dynamic cluster environment where pod IPs change constantly, writing meaningful security policies based on IP addresses is an exercise in frustration. What you really want is identity-aware networking: policies that follow your workloads regardless of where they are scheduled.

---

## Enter Cilium: eBPF-Powered Networking

[Cilium](https://cilium.io/) is an open-source CNI plugin that leverages **eBPF** (extended Berkeley Packet Filter) to push networking, security, and observability logic directly into the Linux kernel — without kernel module modifications. eBPF programs run in a sandboxed environment inside the kernel, enabling packet processing at wire speed with dramatically fewer CPU cycles than iptables.

### Installing Cilium on a Kubernetes Cluster

The recommended way to install Cilium is via the Cilium CLI or Helm. Here we'll use Helm for production-grade deployments:

```bash
# Add the Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with kube-proxy replacement enabled
helm install cilium cilium/cilium \
  --version 1.15.3 \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=<YOUR_API_SERVER_IP> \
  --set k8sServicePort=6443 \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true
```

> **Note:** Setting `kubeProxyReplacement=true` tells Cilium to completely replace `kube-proxy`, handling all service load balancing through eBPF maps instead of iptables.

Verify the installation:

```bash
# Install the Cilium CLI
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --fail --remote-name-all \
  https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz

tar xzvf cilium-linux-amd64.tar.gz
sudo mv cilium /usr/local/bin

# Check cluster status
cilium status --wait
```

---

## Defining Identity-Aware Network Policies

One of Cilium's most powerful features is **CiliumNetworkPolicy**, an extension of the standard Kubernetes NetworkPolicy that supports Layer 7 filtering. Instead of relying on IP addresses, Cilium assigns a cryptographic identity to each workload based on its Kubernetes labels.

Here's an example policy that restricts a backend API to only accept traffic from a frontend service, and further restricts HTTP methods at Layer 7:

```yaml
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: backend-api-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: backend-api
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
              - method: "GET"
                path: "/api/v1/.*"
              - method: "POST"
                path: "/api/v1/data"
  egress:
    - toEndpoints:
        - matchLabels:
            app: postgres
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
```

This policy ensures that:
- Only pods labeled `app: frontend` can reach the backend API
- Only specific HTTP methods and paths are permitted (not just raw TCP)
- The backend can only make outbound connections to PostgreSQL

---

## Observability with Hubble

Cilium ships with **Hubble**, a built-in network observability platform that provides real-time visibility into all network flows across your cluster. Hubble taps into the same eBPF data path as Cilium, giving you zero-overhead observability.

```bash
# Enable the Hubble CLI
export HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/master/stable.txt)
curl -L --fail --remote-name-all \
  https://github.com/cilium/hubble/releases/download/$HUBBLE_VERSION/hubble-linux-amd64.tar.gz

tar xzvf hubble-linux-amd64.tar.gz
sudo mv hubble /usr/local/bin

# Port-forward the Hubble relay
cilium hubble port-forward &

# Observe live network flows
hubble observe --namespace production --follow

# Filter for dropped packets only
hubble observe \
  --namespace production \
  --verdict DROPPED \
  --follow

# Observe flows to/from a specific pod
hubble observe \
  --pod production/backend-api-6d8f9b7c4-xk2pq \
  --follow
```

You can also access the Hubble UI, a rich visual interface for exploring service maps and flow logs:

```bash
# Open the Hubble UI in your browser
cilium hubble ui
```

---

## Enabling Mutual TLS with Cilium

For zero-trust environments, Cilium supports **transparent mutual TLS (mTLS)** between workloads without requiring any application changes. This is configured through `CiliumNetworkPolicy` combined with a service mesh mode:

```yaml
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: mtls-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: backend-api
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      authentication:
        mode: "required"
```

With this policy applied, Cilium will enforce mutual authentication between the `frontend` and `backend-api` workloads using SPIFFE/SPIRE identities, transparently negotiating TLS at the kernel level.

---

## Performance Tuning: BandwidthManager and Big TCP

Cilium exposes several eBPF-powered performance features through Helm values. For high-throughput workloads, consider enabling the BandwidthManager and Big TCP support:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set bandwidthManager.enabled=true \
  --set bandwidthManager.bbr=true \
  --set enableIPv6BigTCP=true \
  --set enableIPv4BigTCP=true
```

You can also annotate individual pods to apply egress bandwidth limits using standard Kubernetes annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: bandwidth-limited-app
  namespace: production
  annotations:
    kubernetes.io/egress-bandwidth: "100M"
    kubernetes.io/ingress-bandwidth: "200M"
spec:
