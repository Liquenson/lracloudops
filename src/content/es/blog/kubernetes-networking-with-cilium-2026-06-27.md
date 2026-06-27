---
titulo: "Networking en Kubernetes con Cilium"
descripcion: "Networking en Kubernetes con Cilium: guía práctica para ingenieros DevOps y equipos de plataforma."
fecha: "2026-06-27"
tags: ["Kubernetes","Networking","Cloud"]
draft: false
---

# Networking en Kubernetes con Cilium: Una Guía Práctica

## Problema y Contexto

El networking en Kubernetes es uno de los aspectos más complejos y críticos de cualquier plataforma de contenedores en producción. Por defecto, Kubernetes no implementa una solución de red por sí mismo; delega esa responsabilidad a plugins CNI (Container Network Interface). Durante años, soluciones como Flannel o Calico dominaron el mercado, pero presentaban limitaciones importantes cuando los clústeres comenzaban a escalar a cientos de nodos y miles de pods. Las reglas de `iptables`, que son la base de muchas de estas soluciones, se convierten en un cuello de botella severo en entornos de alta demanda.

Cilium emerge como una solución moderna que resuelve estos problemas utilizando **eBPF (extended Berkeley Packet Filter)**, una tecnología del kernel de Linux que permite ejecutar programas sandboxed directamente en el espacio del kernel sin necesidad de modificarlo. Esto significa que Cilium puede interceptar y manipular paquetes de red a una velocidad significativamente mayor que las alternativas basadas en iptables, al mismo tiempo que proporciona observabilidad profunda del tráfico sin apenas overhead de rendimiento.

Además de sus capacidades de red de alto rendimiento, Cilium introduce el concepto de **Network Policies** basadas en identidades de servicio en lugar de solo en IPs, lo que lo hace nativo para entornos dinámicos donde las IPs cambian constantemente. También incluye Hubble, una plataforma de observabilidad de red que permite visualizar flujos de tráfico en tiempo real, detectar anomalías y depurar problemas de conectividad de manera intuitiva. En este artículo exploraremos cómo desplegar y configurar Cilium en un clúster de Kubernetes, aplicar políticas de red avanzadas y aprovechar Hubble para observabilidad.

---

## Instalación de Cilium con Helm

La forma más recomendada de instalar Cilium en producción es mediante Helm. Primero, asegúrate de tener un clúster de Kubernetes sin un CNI previo instalado, o con el CNI anterior completamente eliminado.

```bash
# Agregar el repositorio oficial de Cilium
helm repo add cilium https://helm.cilium.io/
helm repo update

# Instalar Cilium con configuración básica de producción
helm install cilium cilium/cilium \
  --version 1.15.4 \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=<API_SERVER_IP> \
  --set k8sServicePort=6443 \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set prometheus.enabled=true \
  --set operator.prometheus.enabled=true
```

> **Nota:** El parámetro `kubeProxyReplacement=true` indica a Cilium que reemplace completamente a `kube-proxy`, eliminando la dependencia de iptables para el manejo de servicios.

Verifica que la instalación fue exitosa:

```bash
# Instalar la CLI de Cilium
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --fail --remote-name-all \
  "https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz"
tar xzvf cilium-linux-amd64.tar.gz
sudo mv cilium /usr/local/bin

# Verificar el estado del clúster
cilium status --wait
cilium connectivity test
```

---

## Configuración Avanzada con Helm Values

Para entornos de producción es recomendable gestionar la configuración a través de un archivo `values.yaml` versionado en tu repositorio de infraestructura.

```yaml
# cilium-values.yaml
kubeProxyReplacement: true
k8sServiceHost: "10.0.0.10"
k8sServicePort: 6443

# Configuración de IPAM
ipam:
  mode: "kubernetes"

# Habilitar eBPF Host Routing para máximo rendimiento
routingMode: native
autoDirectNodeRoutes: true
ipv4NativeRoutingCIDR: "10.244.0.0/16"

# Habilitar Hubble para observabilidad
hubble:
  enabled: true
  metrics:
    enabled:
      - dns:query;ignoreAAAA
      - drop
      - tcp
      - flow
      - icmp
      - http
  relay:
    enabled: true
    replicas: 2
  ui:
    enabled: true
    replicas: 1

# Configuración de Prometheus
prometheus:
  enabled: true
  port: 9962

operator:
  prometheus:
    enabled: true

# Seguridad y cifrado WireGuard
encryption:
  enabled: true
  type: wireguard

# Configuración de recursos para nodos grandes
resources:
  requests:
    cpu: "100m"
    memory: "512Mi"
  limits:
    cpu: "2000m"
    memory: "2Gi"
```

```bash
# Aplicar la configuración actualizada
helm upgrade --install cilium cilium/cilium \
  --version 1.15.4 \
  --namespace kube-system \
  --values cilium-values.yaml
```

---

## Network Policies con Cilium

Una de las mayores ventajas de Cilium es su soporte extendido de políticas de red. Cilium es totalmente compatible con las `NetworkPolicy` estándar de Kubernetes, pero también introduce `CiliumNetworkPolicy`, que ofrece capacidades adicionales como filtrado por DNS, HTTP paths, métodos HTTP, y más.

### Política Estándar de Kubernetes

```yaml
# kubernetes-netpol.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
      tier: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: database
      ports:
        - protocol: TCP
          port: 5432
```

### Política Avanzada con CiliumNetworkPolicy

```yaml
# cilium-netpol-l7.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-gateway-l7-policy
  namespace: production
spec:
  description: "Política L7 para el API Gateway con filtrado HTTP"
  endpointSelector:
    matchLabels:
      app: api-gateway
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
          rules:
            http:
              - method: "GET"
                path: "/api/v1/.*"
              - method: "POST"
                path: "/api/v1/orders"
                headers:
                  - "Content-Type: application/json"
  egress:
    - toFQDNs:
        - matchName: "payments.external-provider.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: production
            app
