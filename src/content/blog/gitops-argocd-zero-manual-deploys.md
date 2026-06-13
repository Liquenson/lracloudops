---
titulo: "GitOps with ArgoCD: eliminating manual deployments in production"
descripcion: "How gitops-stack achieves zero manual kubectl apply in production. ArgoCD auto-sync, drift detection, SSM instead of SSH, CloudTrail audit — every decision explained."
fecha: 2026-06-05
tags: ["GitOps", "ArgoCD", "Kubernetes", "AWS", "DevOps"]
draft: false
---

## The problem with manual deployments in production

A manual deployment is any change to production state that does not go through Git. It includes `kubectl apply` run from an engineer's laptop, a configuration change made directly in the AWS console, and an SSH session that edits a file on a server. Each one creates the same problem: the actual state of production diverges from what anyone can reconstruct from the repository.

The gap is invisible until it matters. A deployment fails because a configuration value was changed manually six weeks ago and nobody updated the Terraform variable. An incident investigation stalls because the running configuration cannot be diffed against anything. A new cluster cannot be provisioned because the documentation is out of date with what production actually runs.

The gitops-stack project was built to close this gap. Every change to the EKS cluster goes through Git. Every infrastructure change goes through Terraform. Every server configuration change goes through Ansible. CloudTrail records every AWS API call. SSM replaces SSH. The result is an environment where "what is currently deployed" and "what is in the repository" are always the same answer.

## ArgoCD auto-sync + prune + selfHeal

ArgoCD runs as a controller inside the cluster. It watches a Git repository and continuously reconciles the cluster state against the manifests in that repository. Three configuration options determine how aggressive the reconciliation is.

**`automated`** enables automatic synchronization. Without it, ArgoCD shows diffs between Git and the cluster but requires a human to click Sync or run `argocd app sync`. With it, changes pushed to the watched branch are applied within the polling interval (default 3 minutes) or immediately if webhook notifications are configured.

**`prune: true`** extends reconciliation to deletions. When a manifest is removed from Git, ArgoCD removes the corresponding resource from the cluster. Without prune, the resource stays running indefinitely in an OutOfSync state — it just accumulates. With prune, Git defines the complete desired state of the cluster, including what should not be there.

**`selfHeal: true`** handles the inverse case. When someone applies a change directly to the cluster — with `kubectl edit`, `kubectl patch`, or the Kubernetes dashboard — ArgoCD detects the drift and reverts it on the next reconciliation cycle. selfHeal converts GitOps from a team convention ("we should use Git for everything") into a technical guarantee ("changes outside Git cannot persist").

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

The retry policy handles transient failures. A CRD that is not yet available when its dependent resource is applied will fail the sync. With exponential backoff, ArgoCD retries at 5s, 10s, 20s, 40s, up to 3 minutes — enough time for most dependency ordering issues to resolve. After 5 failures, the application is marked Degraded and requires investigation.

## SSM Session Manager instead of SSH

SSH has two problems in an automated infrastructure. First, it requires key distribution. Keys must be created, stored securely, rotated regularly, and revoked when an engineer leaves. This is operational overhead that scales with team size. Second, SSH access from arbitrary IPs requires open security group rules on port 22. Any host on the internet can attempt authentication.

AWS Systems Manager Session Manager eliminates both problems. Instances register with SSM through the SSM agent and an IAM instance profile. Access is controlled by IAM policies — the same mechanism used for every other AWS API call. There is no port 22 in the security group. There are no keys to manage.

```hcl
# IAM instance profile that enables SSM access
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
```

A session is started with:

```bash
aws ssm start-session --target i-0123456789abcdef0
```

The session is authenticated by the caller's IAM identity. Every session start, command execution, and session termination is recorded in CloudTrail. The audit trail is automatic — no additional configuration required.

## Ansible for node configuration — real idempotency

Ansible manages the configuration of EKS worker nodes beyond what the launch template covers. Package versions, sysctl settings, log rotation configuration, and monitoring agent installation are all handled by Ansible playbooks.

Idempotency is the critical property. An Ansible playbook run against a node that is already correctly configured must produce no changes and no errors. A non-idempotent playbook applied twice leaves the node in an inconsistent state.

Every task in the gitops-stack Ansible playbooks is written to be idempotent:

```yaml
- name: Ensure cloudwatch agent is installed
  ansible.builtin.package:
    name: amazon-cloudwatch-agent
    state: present

- name: Configure cloudwatch agent
  ansible.builtin.copy:
    src: files/cloudwatch-config.json
    dest: /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
    owner: root
    group: root
    mode: '0644'
  notify: Restart cloudwatch agent

- name: Ensure cloudwatch agent is running
  ansible.builtin.service:
    name: amazon-cloudwatch-agent
    state: started
    enabled: true
```

The `package` module checks if the package is already installed before attempting installation. The `copy` module compares checksums before overwriting. The `service` module checks current state before issuing start or restart commands. Running this playbook against a correctly configured node produces `ok=3 changed=0`.

## CloudTrail: auditing every AWS API call

CloudTrail records every API call made to AWS — `CreateBucket`, `DescribeInstances`, `AssumeRole`, every `kubectl` command that translates to an EKS API call. In gitops-stack, CloudTrail is enabled in all regions with a multi-region trail:

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

`is_multi_region_trail = true` ensures that API calls to global services (IAM, STS) and any region are recorded, not just the primary region. `enable_log_file_validation = true` signs each log file so you can verify that logs have not been tampered with.

CloudTrail answers the questions that matter during an incident: what API call was made, by which identity, from which IP, and when. Combined with IAM Access Analyzer, it can identify calls that would have failed under a more restrictive policy before you apply it.

## Complete pipeline: git push → Jenkins CI → ArgoCD → EKS

```
Developer
    ↓ git push to feature branch
GitHub
    ↓ pull request + code review
GitHub (merge to main)
    ↓ webhook trigger
Jenkins CI
    ├── terraform validate
    ├── terraform plan
    ├── pytest / unit tests
    ├── docker build + push to ECR
    └── update image tag in k8s/apps/deployment.yaml
GitHub (commit by Jenkins)
    ↓ ArgoCD detects change (3-minute polling or webhook)
ArgoCD
    ↓ kubectl apply of updated manifests
EKS cluster
```

The Jenkins pipeline is the validation layer. Terraform manifests are validated and planned before any change reaches production. Docker images are built and pushed to ECR with content-addressable tags (commit SHA, not `latest`). The Kubernetes deployment manifest is updated with the new image tag and committed back to Git — ArgoCD then applies the change.

```groovy
// Jenkinsfile excerpt
stage('Update image tag') {
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
                git commit -m 'ci: update image tag to ${imageTag}'
                git push origin main
            """
        }
    }
}
```

No human runs `kubectl apply`. No human pushes directly to production manifests. The pipeline is the only mechanism through which new images reach the cluster.

## Metrics

The gitops-stack project operates with these properties at steady state:

- **Zero manual deployments** — every change to the EKS cluster goes through the pipeline
- **100% IaC** — every AWS resource exists in a Terraform module; none were created manually
- **Zero static credentials** — GitHub Actions uses OIDC; EC2 instances use IAM roles; no access keys in environment variables or secrets files
- **Full audit trail** — every AWS API call in CloudTrail; every cluster change in ArgoCD history; every infrastructure change in Terraform state

## See the full project

The complete project — Terraform modules, Ansible playbooks, Jenkinsfile, and Kubernetes manifests — is at [github.com/lra-cloud-ops/gitops-stack](https://github.com/lra-cloud-ops/gitops-stack).

For the ArgoCD GitOps pattern used in this project, see [GitOps Solutions](/solutions/gitops). For the full case study, see the [gitops-stack project page](/projects/gitops-stack).
