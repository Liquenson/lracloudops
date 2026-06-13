---
titulo: "GitOps con ArgoCD: eliminar los despliegues manuales en producción"
descripcion: "Cómo gitops-stack logra cero kubectl apply manuales en producción. ArgoCD auto-sync, detección de drift, SSM en lugar de SSH, auditoría CloudTrail — cada decisión explicada."
fecha: 2026-06-05
tags: ["GitOps", "ArgoCD", "Kubernetes", "AWS", "DevOps"]
draft: false
---

## El problema con los despliegues manuales en producción

Un despliegue manual es cualquier cambio al estado de producción que no pasa por Git. Incluye `kubectl apply` ejecutado desde el portátil de un ingeniero, un cambio de configuración hecho directamente en la consola de AWS y una sesión SSH que edita un archivo en un servidor. Cada uno crea el mismo problema: el estado real de producción diverge de lo que cualquiera puede reconstruir desde el repositorio.

La brecha es invisible hasta que importa. Un despliegue falla porque un valor de configuración fue cambiado manualmente hace seis semanas y nadie actualizó la variable de Terraform. Una investigación de incidente se paraliza porque la configuración en ejecución no puede compararse con nada. Un nuevo cluster no puede aprovisionarse porque la documentación no está sincronizada con lo que producción realmente ejecuta.

El proyecto gitops-stack fue construido para cerrar esta brecha. Cada cambio al cluster EKS pasa por Git. Cada cambio de infraestructura pasa por Terraform. Cada cambio de configuración de servidor pasa por Ansible. CloudTrail registra cada llamada a la API de AWS. SSM reemplaza SSH. El resultado es un entorno donde "qué está desplegado actualmente" y "qué está en el repositorio" siempre tienen la misma respuesta.

## ArgoCD auto-sync + prune + selfHeal

ArgoCD se ejecuta como un controlador dentro del cluster. Observa un repositorio Git y reconcilia continuamente el estado del cluster contra los manifiestos de ese repositorio. Tres opciones de configuración determinan la agresividad de la reconciliación.

**`automated`** habilita la sincronización automática. Sin él, ArgoCD muestra diferencias entre Git y el cluster pero requiere que un humano haga clic en Sync o ejecute `argocd app sync`. Con él, los cambios enviados a la rama observada se aplican dentro del intervalo de polling (por defecto 3 minutos) o inmediatamente si se configuran notificaciones webhook.

**`prune: true`** extiende la reconciliación a las eliminaciones. Cuando un manifiesto se elimina de Git, ArgoCD elimina el recurso correspondiente del cluster. Sin prune, el recurso sigue ejecutándose indefinidamente en estado OutOfSync — simplemente se acumula. Con prune, Git define el estado deseado completo del cluster, incluyendo lo que no debería estar allí.

**`selfHeal: true`** maneja el caso inverso. Cuando alguien aplica un cambio directamente al cluster — con `kubectl edit`, `kubectl patch` o el dashboard de Kubernetes — ArgoCD detecta el drift y lo revierte en el siguiente ciclo de reconciliación. selfHeal convierte GitOps de una convención de equipo ("deberíamos usar Git para todo") en una garantía técnica ("los cambios fuera de Git no pueden persistir").

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: platform-apps
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/lra-cloud-ops/gitops-stack
    targetRevision: main
    path: k8s/apps
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

La política de reintentos maneja fallos transitorios. Un CRD que aún no está disponible cuando se aplica su recurso dependiente fallará la sincronización. Con backoff exponencial, ArgoCD reintenta a los 5s, 10s, 20s, 40s, hasta 3 minutos — tiempo suficiente para que la mayoría de problemas de ordenación de dependencias se resuelvan. Después de 5 fallos, la aplicación se marca como Degraded y requiere investigación.

## SSM Session Manager en lugar de SSH

SSH tiene dos problemas en infraestructura automatizada. Primero, requiere distribución de claves. Las claves deben crearse, almacenarse de forma segura, rotarse regularmente y revocarse cuando un ingeniero se va. Esta es sobrecarga operacional que escala con el tamaño del equipo. Segundo, el acceso SSH desde IPs arbitrarias requiere reglas de security group abiertas en el puerto 22. Cualquier host en internet puede intentar autenticarse.

AWS Systems Manager Session Manager elimina ambos problemas. Las instancias se registran con SSM a través del agente SSM y un IAM instance profile. El acceso está controlado por políticas IAM — el mismo mecanismo usado para cualquier otra llamada a la API de AWS. No hay puerto 22 en el security group. No hay claves que gestionar.

```hcl
# IAM instance profile que habilita el acceso SSM
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
```

Una sesión se inicia con:

```bash
aws ssm start-session --target i-0123456789abcdef0
```

La sesión se autentica por la identidad IAM del solicitante. Cada inicio de sesión, ejecución de comando y cierre de sesión se registra en CloudTrail. El rastro de auditoría es automático — sin configuración adicional requerida.

## Ansible para configuración de nodos — idempotencia real

Ansible gestiona la configuración de los nodos worker de EKS más allá de lo que cubre el launch template. Las versiones de paquetes, configuración de sysctl, rotación de logs e instalación del agente de monitorización se gestionan con playbooks de Ansible.

La idempotencia es la propiedad crítica. Un playbook de Ansible ejecutado contra un nodo que ya está correctamente configurado debe producir cero cambios y cero errores. Un playbook no idempotente aplicado dos veces deja el nodo en un estado inconsistente.

Cada tarea en los playbooks de Ansible del gitops-stack está escrita para ser idempotente:

```yaml
- name: Asegurar que cloudwatch agent está instalado
  ansible.builtin.package:
    name: amazon-cloudwatch-agent
    state: present

- name: Configurar cloudwatch agent
  ansible.builtin.copy:
    src: files/cloudwatch-config.json
    dest: /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
    owner: root
    group: root
    mode: '0644'
  notify: Reiniciar cloudwatch agent

- name: Asegurar que cloudwatch agent está en ejecución
  ansible.builtin.service:
    name: amazon-cloudwatch-agent
    state: started
    enabled: true
```

El módulo `package` comprueba si el paquete ya está instalado antes de intentar la instalación. El módulo `copy` compara checksums antes de sobreescribir. El módulo `service` comprueba el estado actual antes de emitir comandos de inicio o reinicio. Ejecutar este playbook contra un nodo correctamente configurado produce `ok=3 changed=0`.

## CloudTrail: auditar cada llamada a la API de AWS

CloudTrail registra cada llamada a la API de AWS — `CreateBucket`, `DescribeInstances`, `AssumeRole`, cada comando `kubectl` que se traduce en una llamada a la API de EKS. En gitops-stack, CloudTrail está habilitado en todas las regiones con un trail multi-región:

```hcl
resource "aws_cloudtrail" "main" {
  name                          = "${var.project}-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }
}
```

`is_multi_region_trail = true` asegura que las llamadas a API de servicios globales (IAM, STS) y cualquier región se registren, no solo la región primaria. `enable_log_file_validation = true` firma cada archivo de log para que puedas verificar que los logs no han sido manipulados.

CloudTrail responde las preguntas que importan durante un incidente: qué llamada a la API se realizó, por qué identidad, desde qué IP y cuándo. Combinado con IAM Access Analyzer, puede identificar llamadas que habrían fallado bajo una política más restrictiva antes de aplicarla.

## Pipeline completo: git push → Jenkins CI → ArgoCD → EKS

```
Desarrollador
    ↓ git push a rama feature
GitHub
    ↓ pull request + revisión de código
GitHub (merge a main)
    ↓ trigger de webhook
Jenkins CI
    ├── terraform validate
    ├── terraform plan
    ├── pytest / tests unitarios
    ├── docker build + push a ECR
    └── actualizar image tag en k8s/apps/deployment.yaml
GitHub (commit de Jenkins)
    ↓ ArgoCD detecta cambio (polling de 3 min o webhook)
ArgoCD
    ↓ kubectl apply de manifiestos actualizados
Cluster EKS
```

El pipeline de Jenkins es la capa de validación. Los manifiestos de Terraform se validan y planifican antes de que cualquier cambio llegue a producción. Las imágenes Docker se construyen y envían a ECR con tags content-addressable (SHA del commit, no `latest`). El manifiesto de deployment de Kubernetes se actualiza con el nuevo image tag y se hace commit de vuelta a Git — ArgoCD aplica entonces el cambio.

```groovy
// Fragmento del Jenkinsfile
stage('Actualizar image tag') {
    steps {
        script {
            def imageTag = sh(
                script: 'git rev-parse --short HEAD',
                returnStdout: true
            ).trim()
            sh """
                sed -i 's|image: .*|image: ${ECR_REGISTRY}/${IMAGE_NAME}:${imageTag}|' \
                    k8s/apps/deployment.yaml
                git config user.email 'ci@lracloudops.com'
                git config user.name  'Jenkins CI'
                git add k8s/apps/deployment.yaml
                git commit -m 'ci: actualizar image tag a ${imageTag}'
                git push origin main
            """
        }
    }
}
```

Ningún humano ejecuta `kubectl apply`. Ningún humano hace push directamente a manifiestos de producción. El pipeline es el único mecanismo a través del cual las nuevas imágenes llegan al cluster.

## Métricas

El proyecto gitops-stack opera con estas propiedades en estado estable:

- **Cero despliegues manuales** — cada cambio al cluster EKS pasa por el pipeline
- **100% IaC** — cada recurso AWS existe en un módulo Terraform; ninguno fue creado manualmente
- **Zero static credentials** — GitHub Actions usa OIDC; las instancias EC2 usan roles IAM; sin access keys en variables de entorno o archivos de secretos
- **Rastro de auditoría completo** — cada llamada a la API de AWS en CloudTrail; cada cambio de cluster en el historial de ArgoCD; cada cambio de infraestructura en el estado de Terraform

## Ver el proyecto completo

El proyecto completo — módulos Terraform, playbooks Ansible, Jenkinsfile y manifiestos de Kubernetes — está en [github.com/lra-cloud-ops/gitops-stack](https://github.com/lra-cloud-ops/gitops-stack).

Para el patrón GitOps de ArgoCD usado en este proyecto, consulta [Soluciones GitOps](/solutions/gitops). Para el caso de uso completo, consulta la [página del proyecto gitops-stack](/projects/gitops-stack).
