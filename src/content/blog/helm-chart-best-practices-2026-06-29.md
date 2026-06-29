---
titulo: "Helm Chart Best Practices"
descripcion: "Helm Chart Best Practices: practical guide for DevOps engineers and platform teams."
fecha: "2026-06-29"
tags: ["Kubernetes","Helm","DevOps"]
draft: false
---

# Helm Chart Best Practices: Building Production-Ready Kubernetes Packages

Managing Kubernetes applications at scale is no trivial task. As your infrastructure grows, so does the complexity of deploying and maintaining dozens — or even hundreds — of services. Helm, the de facto package manager for Kubernetes, solves this problem by allowing teams to define, install, and upgrade applications using reusable, versioned packages called charts. However, simply using Helm does not automatically make your deployments reliable or maintainable. Poor chart design leads to brittle releases, security vulnerabilities, and operational nightmares at 2 AM.

Many teams start with Helm by copying a quick-start template from the internet and never revisiting the fundamentals. The result is often a chart that works in development but falls apart under production conditions — hardcoded values, missing resource limits, absent health checks, and no clear upgrade strategy. These shortcuts accumulate technical debt that becomes increasingly expensive to pay down as the system grows. A poorly designed chart is not just an inconvenience; it is a liability.

This post distills years of hard-won experience running Helm at scale into a set of concrete, actionable best practices. Whether you are authoring a chart from scratch or inheriting one that needs refactoring, these guidelines will help you build charts that are secure, observable, and genuinely production-ready.

---

## 1. Structure Your Chart Consistently

Start with a clean, predictable directory structure. Use `helm create` as your baseline and resist the urge to deviate from conventions without a good reason. A consistent structure makes onboarding new engineers significantly faster.

```bash
helm create my-app
tree my-app/
# my-app/
# ├── Chart.yaml
# ├── values.yaml
# ├── charts/          # subcharts / dependencies
# ├── templates/
# │   ├── deployment.yaml
# │   ├── service.yaml
# │   ├── ingress.yaml
# │   ├── hpa.yaml
# │   ├── serviceaccount.yaml
# │   ├── configmap.yaml
# │   ├── _helpers.tpl  # named templates / partials
# │   └── NOTES.txt
# └── .helmignore
```

Your `Chart.yaml` should always be complete and accurate:

```yaml
apiVersion: v2
name: my-app
description: A production-ready Helm chart for my-app
type: application
version: 1.4.2        # Chart version — bump on every change
appVersion: "2.3.0"   # Upstream application version
maintainers:
  - name: LRA Cloud Ops
    email: cloudops@lra.example.com
keywords:
  - my-app
  - backend
  - api
```

---

## 2. Design `values.yaml` Thoughtfully

Your `values.yaml` is the public API of your chart. Treat it that way. Every value should have a sensible default, and every block should be clearly commented.

```yaml
# values.yaml

## Global image settings
image:
  repository: registry.lra.example.com/my-app
  tag: ""               # Defaults to Chart.appVersion if left empty
  pullPolicy: IfNotPresent

## Replica count — override via HPA for production
replicaCount: 2

## Resource requests and limits are MANDATORY — never leave these empty
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

## Service configuration
service:
  type: ClusterIP
  port: 8080

## Ingress — disabled by default, enabled per environment
ingress:
  enabled: false
  className: nginx
  annotations: {}
  hosts:
    - host: my-app.example.com
      paths:
        - path: /
          pathType: Prefix
  tls: []

## Pod security context — always define this
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 2000

## Liveness and readiness probes
probes:
  liveness:
    httpGet:
      path: /healthz
      port: 8080
    initialDelaySeconds: 15
    periodSeconds: 20
  readiness:
    httpGet:
      path: /ready
      port: 8080
    initialDelaySeconds: 5
    periodSeconds: 10

## Horizontal Pod Autoscaler
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

## Tolerations, affinity, and node selectors
affinity: {}
tolerations: []
nodeSelector: {}
```

---

## 3. Use `_helpers.tpl` to Avoid Repetition

Named templates in `_helpers.tpl` are your best friend. They enforce consistency and eliminate copy-paste errors across your template files.

```yaml
# templates/_helpers.tpl

{{/*
Expand the name of the chart.
*/}}
{{- define "my-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a fully qualified app name.
*/}}
{{- define "my-app.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name (include "my-app.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels applied to every resource.
*/}}
{{- define "my-app.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
app.kubernetes.io/name: {{ include "my-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels — used by Services to match Pods.
*/}}
{{- define "my-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "my-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

Reference these templates consistently across every manifest:

```yaml
# templates/deployment.yaml (excerpt)
metadata:
  name: {{ include "my-app.fullname" . }}
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
spec:
  selector:
    matchLabels:
      {{- include "my-app.selectorLabels" . | nindent 6 }}
```

---

## 4. Validate Inputs with Schema and Guards

Never trust that values will be correct. Use `values.schema.json` to validate inputs before rendering and add template-level guards for critical fields.

```json
// values.schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["image", "resources"],
  "properties": {
    "replicaCount": {
      "type": "integer",
      "minimum": 1
    },
    "image": {
      "type": "object",
      "required": ["repository"],
      "properties": {
        "repository": { "type": "string" },
        "tag":        { "type": "string" },
        "pullPolicy": {
          "type": "string",
          "enum": ["Always", "IfNotPresent", "Never"]
        }
      }
    },
    "resources": {
      "type": "object",
      "required": ["requests", "limits"]
    }
  }
}
```

Add template-level guards for logical validations:

```yaml
# templates/deployment.yaml (top of file)
{{- if and .Values.autoscaling.enabled (eq .Values.replic
