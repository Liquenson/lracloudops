---
titulo: "Networking en Kubernetes con Cilium"
descripcion: "Networking en Kubernetes con Cilium: guía práctica para ingenieros DevOps y equipos de plataforma."
fecha: "2026-06-27"
tags: ["Kubernetes","Networking","Cloud"]
draft: false
---

# Networking en Kubernetes con Cilium: CNI de Alto Rendimiento basado en eBPF

## Problema y Contexto

La gestión de redes en Kubernetes ha sido históricamente uno de los aspectos más complejos de operar clústeres en producción. El modelo de red plano de Kubernetes —donde cada Pod recibe su propia dirección IP y puede comunicarse con cualquier otro Pod sin NAT— requiere un plugin CNI (Container Network Interface) que implemente esta especificación de manera eficiente, segura y escalable. Durante años, soluciones como Flannel, Calico o Weave Net han dominado este espacio, pero cada una arrastra limitaciones en términos de rendimiento, observabilidad o granularidad en las políticas de seguridad.

El problema se agudiza cuando los clústeres crecen a cientos o miles de nodos: las tablas de iptables se convierten en un cuello de botella crítico. Cada nueva regla de `NetworkPolicy` o cada nuevo servicio añade entradas a iptables, cuya naturaleza lineal y secuencial degrada el rendimiento de forma notable. En entornos con miles de servicios, la latencia introducida por iptables puede ser medible y perjudicial para aplicaciones sensibles al tiempo de respuesta.

**Cilium** resuelve este problema de raíz. Desarrollado por Isovalent y actualmente bajo el paraguas de la CNCF como proyecto graduado, Cilium utiliza **eBPF (extended Berkeley Packet Filter)** para implementar toda la lógica de red directamente en el kernel de Linux, sin pasar por el espacio de usuario ni por iptables. Esto permite un plano de datos ultraeficiente, una observabilidad nativa sin agentes adicionales y políticas de seguridad que operan hasta la capa 7 del modelo OSI, siendo conscientes de protocolos como HTTP, gRPC o Kafka.

---

## Enfoque de Solución

### 1. Instalación de Cilium con Helm

El método recomendado para instalar Cilium en producción es mediante Helm. Primero, asegúrate de que tu clúster esté disponible sin un CNI previo activo (o reemplaza el existente siguiendo la guía de migración).

```bash
# Añadir el repositorio de Cilium
helm repo add cilium https://helm.cilium.io/
helm repo update

# Instalar Cilium con kube-proxy replacement activado
helm install cilium cilium/cilium \
  --version 1.15.4 \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=<API_SERVER_IP> \
  --set k8sServicePort=6443 \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set ipam.mode=kubernetes \
  --set bpf.masquerade=true
```

```bash
# Verificar el estado de los nodos con cilium CLI
cilium status --wait

# Ejecutar test de conectividad integrado
cilium connectivity test
```

La opción `kubeProxyReplacement=true` es clave: le indica a Cilium que asuma **completamente** las funciones de kube-proxy usando eBPF, eliminando iptables del camino de datos de Kubernetes. El resultado es una reducción significativa de latencia y un comportamiento más predecible bajo carga.

---

### 2. NetworkPolicy L3/L4 con CiliumNetworkPolicy

Cilium es 100% compatible con las `NetworkPolicy` estándar de Kubernetes, pero además expone su propio CRD `CiliumNetworkPolicy` para capacidades avanzadas.

**Política estándar de Kubernetes (L3/L4):**

```yaml
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
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
```

**Política L7 nativa de Cilium (filtrado HTTP):**

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-gateway-l7-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: backend
      tier: api
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
                path: "/api/v1/products.*"
              - method: "POST"
                path: "/api/v1/orders"
                headers:
                  - "X-Auth-Token: .*"
```

Esta política permite únicamente peticiones `GET` a rutas de productos y `POST` a órdenes con el header de autenticación presente, bloqueando cualquier otro verbo HTTP o ruta. Esto es imposible de conseguir con iptables o con CNIs que no operen en capa 7.

---

### 3. Observabilidad con Hubble

Hubble es el componente de observabilidad de Cilium, integrado de forma nativa y sin overhead adicional significativo.

```bash
# Instalar la CLI de Hubble
export HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/master/stable.txt)
curl -L --fail --remote-name-all \
  "https://github.com/cilium/hubble/releases/download/${HUBBLE_VERSION}/hubble-linux-amd64.tar.gz"
tar xzvf hubble-linux-amd64.tar.gz
sudo mv hubble /usr/local/bin/

# Port-forward al relay de Hubble
cilium hubble port-forward &

# Observar flujos de red en tiempo real
hubble observe \
  --namespace production \
  --pod backend \
  --type drop \
  --follow

# Ver flujos con contexto de política
hubble observe \
  --namespace production \
  --verdict DROPPED \
  --output json | jq '.flow | {src: .source.pod_name, dst: .destination.pod_name, reason: .drop_reason_desc}'
```

```bash
# Generar un mapa de dependencias de servicios
hubble observe \
  --namespace production \
  --output json \
  | jq -r '[.flow.source.pod_name, .flow.destination.pod_name] | @csv' \
  | sort | uniq -c | sort -rn | head -20
```

---

### 4. BGP y LoadBalancer sin nube pública

Cilium incluye soporte nativo para BGP mediante `CiliumBGPPeeringPolicy`, permitiendo anunciar IPs de servicios directamente a routers físicos en entornos on-premise o bare-metal, sin necesidad de MetalLB.

```yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumBGPPeeringPolicy
metadata:
  name: bgp-peering-datacenter
spec:
  nodeSelector:
    matchLabels:
      kubernetes.io/os: linux
  virtualRouters:
    - localASN: 65001
      exportPodCIDR: true
      neighbors:
        - peerAddress: "192.168.100.1/32"
          peerASN: 65000
          gracefulRestart:
            enabled: true
            restartTimeSeconds: 120
      serviceSelector:
        matchExpressions:
          - key: expose-via-bgp
            operator: In
            values:
