---
titulo: "CI/CD Pipeline Architecture with GitHub Actions and AWS ECS"
descripcion: "How to design a production CI/CD pipeline with OIDC authentication, parallel quality gates, automated rollback and zero long-lived AWS credentials. Architecture decisions and operational tradeoffs."
fecha: 2026-04-28
tags: ["CI/CD", "GitHub Actions", "AWS", "Docker", "DevOps"]
draft: false
---

## Problem

Manual deployments fail in predictable ways. The steps drift between environments. A flag missed in a Friday deployment becomes a production incident on Monday. Security scans that require a separate manual step get skipped under deadline pressure. Rollback procedures that were never rehearsed fail when an incident actually requires them.

The problem is not that teams want to cut corners — it is that manual deployment creates the conditions under which corners get cut systematically.

## Context

GitHub Actions eliminates the infrastructure cost of running CI/CD. There is no server to provision, patch or maintain. The pipeline runs where the code already lives. This removes the operational overhead that causes teams to defer pipeline work.

The design decisions that make a pipeline production-grade are not about which tool to use. They are about what gates exist, what conditions trigger them, and what happens when a gate fails.

## Architecture

A production pipeline has four properties:

**1. Fail fast, fail hard** — quality gates run before build steps. If tests fail, the Docker image is never built. If the image build fails, no deployment is attempted. Each stage is a hard gate, not a warning.

**2. No static credentials** — GitHub Actions authenticates to AWS via OIDC federation. The pipeline assumes an IAM role directly. No `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` exists in repository secrets. Credentials are tokens valid for the duration of the pipeline run — nothing to rotate, nothing to leak.

**3. Deploy only from main** — pull requests run build and test jobs. Deployment executes only on merge to the production branch. This separates validation from deployment and ensures that only reviewed, merged code reaches the environment.

**4. Verification after deployment** — post-deployment health checks confirm the service is responding before the pipeline reports success. A deployment that passes CI but leaves the service unhealthy is a failed deployment.

## Implementation

### OIDC authentication setup

Three steps in AWS: create an OIDC identity provider pointing to `token.actions.githubusercontent.com`, create an IAM role that trusts that provider, and scope the trust policy to the specific repository and branch that can assume the role.

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
    aws-region: eu-west-1
```

The trust policy condition prevents other repositories — including forks — from assuming the role:

```json
{
  "Condition": {
    "StringLike": {
      "token.actions.githubusercontent.com:sub":
        "repo:org/repo:ref:refs/heads/main"
    }
  }
}
```

### Pipeline structure

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements.txt
      - run: pytest --cov=app tests/ --cov-report=xml --cov-fail-under=80

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Scan dependencies
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          severity: HIGH,CRITICAL
          exit-code: 1

  build:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: eu-west-1
      - name: Build and push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REPO
          docker build -t $ECR_REPO:${{ github.sha }} .
          docker push $ECR_REPO:${{ github.sha }}

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster production \
            --service api \
            --force-new-deployment
      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster production \
            --services api
```

### Image tagging

Images are tagged with the Git commit SHA — never with `latest`. This makes every deployment traceable to an exact commit, and makes rollback a matter of redeploying a previous SHA rather than reconstructing what the previous state was.

### Quality gate configuration

Coverage enforcement at 80% minimum runs before the build job. If coverage drops below threshold, the pipeline stops. The Docker image is not built and the ECR registry stays clean.

```yaml
- run: pytest --cov=app tests/ --cov-fail-under=80
```

SonarCloud integration adds static analysis and security hotspot detection as a separate parallel job, so it does not block the test run but does block the build:

```yaml
  sonar:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: SonarSource/sonarcloud-github-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

## Operational Considerations

**Deployment verification** — `aws ecs wait services-stable` blocks the pipeline until ECS confirms all tasks in the new deployment are healthy. If tasks fail their health checks, the wait command times out and the pipeline fails. ECS rolls back to the previous task definition automatically.

**Concurrency control** — two simultaneous deployments to the same environment create race conditions. GitHub Actions concurrency groups prevent this:

```yaml
concurrency:
  group: deploy-production
  cancel-in-progress: false
```

`cancel-in-progress: false` is intentional — a deployment in progress should complete, not be cancelled mid-flight.

**Secret scanning** — Gitleaks or GitHub's built-in secret scanning catches credentials accidentally committed to source control before they reach the registry. This runs as a pre-build gate, not a post-incident remediation step.

**IAM role permissions** — the deploy role should have minimum viable permissions. ECR push, ECS service update, ECS task execution. No `AdministratorAccess`, no `PowerUserAccess`. Use CloudTrail to observe exactly what actions the pipeline executes, then write the policy to match.

## Outcome

A pipeline built on these principles produces the same result on every run: identical build steps, identical quality gates, identical deployment procedure. The team stops accumulating deployment-related incidents caused by procedural variance. Security scanning runs on every merge without requiring a separate scheduled process. Rollback is a pipeline re-run, not an emergency runbook.

The infrastructure cost is zero beyond the GitHub Actions minutes consumed.
