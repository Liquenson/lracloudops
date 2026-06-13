---
titulo: "Kubernetes en bare metal con kubeadm: decisiones de arquitectura de k8s-on-premise"
descripcion: "Cómo construimos un cluster Kubernetes de nivel productivo en bare metal usando kubeadm, Vagrant y VirtualBox. Decisiones de arquitectura, networking con Calico, GitOps con ArgoCD — y por qué elegimos bare metal sobre EKS para este proyecto."
fecha: 2026-06-10
tags: ["Kubernetes", "kubeadm", "ArgoCD", "Calico", "GitOps"]
draft: false
---

## Por qué bare metal en lugar de EKS

Todos los proyectos de la cartera lra-cloud-ops que corren en AWS usan EKS. EKS abstrae el control plane, gestiona las actualizaciones e integra directamente con IAM, VPC y el AWS load balancer controller. Para workloads de producción en AWS, EKS es la respuesta correcta.

El proyecto k8s-on-premise existe por una razón diferente: entender qué hace EKS por ti. Cuando el control plane es gestionado, nunca ves etcd, nunca configuras los flags del API server y nunca depuras un plugin CNI desde cero. Esa brecha de conocimiento se convierte en un problema la primera vez que operas un cluster en un entorno donde EKS no está disponible — hardware on-premise, una red air-gapped o un proveedor sin Kubernetes gestionado.

La decisión de usar bare metal con kubeadm fue deliberada. El objetivo no era ejecutar workloads de forma económica. Era construir conocimiento operacional sobre lo que un cluster Kubernetes realmente es.

## Arquitectura del cluster: 1 control plane, 2 workers

El cluster ejecuta tres VMs aprovisionadas con Vagrant y VirtualBox. IPs fijas en una red host-only:

```
192.168.56.10  master   — control plane
192.168.56.11  worker1  — nodo de workload
192.168.56.12  worker2  — nodo de workload
```

Las IPs fijas son importantes. kubeadm genera certificados TLS que incluyen la dirección del API server. Si la IP cambia, los certificados son inválidos y el cluster se rompe. Con DHCP, un reinicio de VM puede producir una IP diferente. Usar una red host-only con asignación estática elimina este modo de fallo completamente.

El Vagrantfile usa un script de aprovisionamiento compartido para configurar los tres nodos de forma idéntica hasta el punto donde divergen — el master ejecuta `kubeadm init`, los workers ejecutan `kubeadm join`.

```ruby
# Fragmento del Vagrantfile
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

Ejecutar `vagrant up` aprovisiona los tres nodos secuencialmente. El script común gestiona la instalación del container runtime (containerd), kubeadm, kubelet y kubectl. El cluster está listo en aproximadamente 20 minutos en un portátil estándar.

## Calico v3.27.0 como CNI — por qué no Flannel ni Cilium

Kubernetes no incluye un plugin CNI. El cluster no puede planificar pods hasta que se instala uno. Tres plugins aparecen con más frecuencia en la documentación: Flannel, Calico y Cilium.

**Flannel** es la opción más simple. Implementa networking overlay VXLAN y no tiene dependencias externas. Para un cluster de aprendizaje, funciona. Para cualquier cosa cercana a producción, no soporta NetworkPolicy. Cualquier pod puede alcanzar cualquier otro pod en cualquier puerto. Esa no es una postura de seguridad aceptable.

**Cilium** es la opción más capaz. Usa eBPF en lugar de iptables, soporta política L7 e integra nativamente con herramientas de service mesh. La sobrecarga operacional es significativamente mayor — eBPF requiere kernel 5.4+, la superficie de configuración es grande y el troubleshooting requiere entender el dataplane eBPF.

**Calico v3.27.0** se sitúa entre ambos. Implementa NetworkPolicy completamente, usa iptables por defecto (sin requisito de versión de kernel) y la configuración es explícita y legible. Para un cluster que necesita aislamiento de red real sin la complejidad de un service mesh completo, Calico es la elección correcta.

La instalación es un único manifiesto:

```bash
# Instalar Calico v3.27.0
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

Después de aplicarlo, los pods de coredns pasan de Pending a Running. El plugin CNI está operativo. Puedes verificar que Calico funciona inspeccionando el DaemonSet `calico-node`:

```bash
kubectl get daemonset calico-node -n kube-system
# NAME          DESIRED   CURRENT   READY   ...
# calico-node   3         3         3       ...
```

Tres de tres nodos significa que el DaemonSet tiene pods en todos los nodos. Los tres listos significa que el CNI es funcional en cada nodo.

## ArgoCD auto-sync + prune + selfHeal desde el día 1

Instalar ArgoCD antes de desplegar cualquier aplicación es una decisión deliberada. La alternativa — desplegar workloads manualmente y luego introducir ArgoCD — crea un problema de reconciliación de estado. ArgoCD necesitaría adoptar recursos que no creó, y cualquier recurso que no esté en el repositorio sería purgado en la primera sincronización.

Empezar con ArgoCD significa que el cluster nunca tiene una configuración que no esté en Git.

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

El recurso Application que usa ArgoCD para gestionar el cluster define tres opciones de sincronización críticas:

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

`automated` significa que los cambios en Git se aplican sin intervención humana. `prune: true` significa que eliminar un manifiesto de Git elimina el recurso correspondiente del cluster. `selfHeal: true` significa que cualquier cambio manual al cluster se revierte en el siguiente ciclo de reconciliación — típicamente en 3 minutos.

Estas tres opciones juntas convierten GitOps en una garantía técnica en lugar de una convención de equipo.

## NGINX Ingress con NodePort

EKS integra con el AWS load balancer controller para aprovisionar un NLB o ALB automáticamente cuando se crea un Service de tipo LoadBalancer. El bare metal no tiene equivalente. No hay API cloud que llamar. El cluster debe exponer servicios a través de un mecanismo que funcione sin infraestructura externa.

NodePort es ese mecanismo. El controlador NGINX Ingress se instala y configura para escuchar en NodePort 30080 (HTTP) y 30443 (HTTPS):

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/baremetal/deploy.yaml
```

El manifiesto de despliegue para bare metal usa un Service de tipo NodePort en lugar de LoadBalancer. Las peticiones a la IP de cualquier nodo en el puerto 30080 se reenvían al controlador Ingress, que las enruta al Service de backend apropiado según las reglas del Ingress.

Para desarrollo local con Vagrant, acceder a un workload significa hacer una petición a `http://192.168.56.10:30080` con el header Host apropiado. No tan limpio como un nombre DNS respaldado por un load balancer, pero completamente funcional.

## Scripts idempotentes con set -euo pipefail

Todos los scripts de aprovisionamiento siguen el mismo patrón usado en el proyecto linux-fleet-manager: `set -euo pipefail` al inicio, operaciones idempotentes a lo largo de todo el script.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Deshabilitar swap — requerido por kubelet
if swapon --show | grep -q .; then
  swapoff -a
  sed -i '/swap/d' /etc/fstab
  echo "Swap deshabilitado"
else
  echo "Swap ya deshabilitado — omitiendo"
fi
```

La comprobación de swap ilustra el patrón: verificar el estado actual, aplicar el cambio solo si es necesario, registrar lo que ocurrió. Ejecutar el script dos veces en el mismo nodo produce el mismo resultado. Esto es el estándar Red Hat para scripts de aprovisionamiento y es importante cuando `vagrant provision` se ejecuta después de un fallo a mitad de la configuración.

## Lecciones de las primeras tres fases

**Fase 1 — Aprovisionamiento del cluster:** El fallo más común es el desfase de reloj entre nodos. kubeadm requiere que los relojes estén dentro de una ventana estrecha. Los scripts de aprovisionamiento deben incluir configuración NTP antes de ejecutar kubeadm init. Un cluster aprovisionado sin NTP parecerá funcionar y luego fallará de formas impredecibles cuando los certificados expiren prematuramente.

**Fase 2 — Instalación del CNI:** Los pods de Calico en CrashLoopBackOff después de la instalación generalmente significa que el pod CIDR en el manifiesto de Calico no coincide con el `--pod-network-cidr` pasado a kubeadm init. El valor por defecto de kubeadm es `10.244.0.0/16`. El de Calico es `192.168.0.0/16`. Elige uno y configura ambos para que coincidan.

**Fase 3 — Bootstrap de ArgoCD:** El problema del huevo y la gallina de ArgoCD gestionando su propia configuración es real. La instalación inicial debe aplicarse manualmente. Después, el patrón App of Apps en `platform/argocd/` toma el control y gestiona todas las actualizaciones posteriores a través de Git.

El roadmap de 18 fases para este proyecto va más lejos: multi-tenancy, OPA Gatekeeper para aplicación de políticas, observabilidad con Prometheus + Grafana y, eventualmente, backup productivo de etcd. La base construida en las fases 1–3 convierte cada fase posterior en un commit de Git.

## Ver el proyecto completo

El proyecto completo — Vagrantfile, scripts de aprovisionamiento, manifiestos de Kubernetes y definiciones de Application de ArgoCD — está en [github.com/lra-cloud-ops/k8s-on-premise](https://github.com/lra-cloud-ops/k8s-on-premise).

Para una ruta estructurada de bare metal a Kubernetes productivo, consulta [Adopción de Kubernetes](/solutions/kubernetes-adoption). Para el caso de uso completo incluyendo el roadmap de 18 fases, consulta la [página del proyecto k8s-on-premise](/projects/k8s-on-premise).
