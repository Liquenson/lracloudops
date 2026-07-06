// Technical SVG diagrams for the Industries tabs on the homepage (EN + ES).
// Order matches the `tabs` array in src/pages/index.astro and src/pages/es/index.astro:
// 0 AI Agents · 1 AWS Infrastructure · 2 Kubernetes · 3 Security · 4 Natural Language AWS

const svgAiAgents = `
<svg width="580" height="280" viewBox="0 0 580 280" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
  <rect width="580" height="280" fill="#F8F9FA" rx="12"/>

  <rect x="20" y="110" width="80" height="36" rx="6" fill="#E8F0FE" stroke="#1A73E8" stroke-width="1.5"/>
  <text x="60" y="133" font-family="monospace" font-size="11" fill="#1A73E8" text-anchor="middle">Intent</text>

  <line x1="100" y1="128" x2="125" y2="128" stroke="#DADCE0" stroke-width="1.5" marker-end="url(#arrow)"/>

  <rect x="125" y="108" width="90" height="40" rx="6" fill="#FFFFFF" stroke="#DADCE0" stroke-width="1.5"/>
  <text x="170" y="126" font-family="monospace" font-size="9" fill="#5F6368" text-anchor="middle">TaskPlanner</text>
  <text x="170" y="140" font-family="monospace" font-size="9" fill="#1A73E8" text-anchor="middle">DAG Plan</text>

  <line x1="215" y1="128" x2="240" y2="128" stroke="#DADCE0" stroke-width="1.5" marker-end="url(#arrow)"/>

  <rect x="240" y="105" width="100" height="46" rx="6" fill="#FFFFFF" stroke="#1A73E8" stroke-width="1.5"/>
  <text x="290" y="123" font-family="monospace" font-size="9" fill="#5F6368" text-anchor="middle">Governance</text>
  <text x="290" y="136" font-family="monospace" font-size="9" fill="#1A73E8" text-anchor="middle">RBAC · Policy</text>
  <text x="290" y="145" font-family="monospace" font-size="9" fill="#137333" text-anchor="middle">5 levels</text>

  <line x1="340" y1="128" x2="365" y2="128" stroke="#DADCE0" stroke-width="1.5" marker-end="url(#arrow)"/>

  <text x="400" y="45" font-family="monospace" font-size="9" fill="#5F6368" text-anchor="middle">Agents</text>
  ${['Founder', 'Cloud Arch', 'DevOps', 'Security', 'SRE']
    .map(
      (name, i) => `
  <rect x="365" y="${55 + i * 38}" width="80" height="28" rx="5" fill="#FFFFFF" stroke="#DADCE0" stroke-width="1"/>
  <circle cx="378" cy="${69 + i * 38}" r="4" fill="#1A73E8"/>
  <text x="388" y="${73 + i * 38}" font-family="monospace" font-size="9" fill="#202124">${name}</text>
  `
    )
    .join('')}

  <line x1="445" y1="128" x2="470" y2="128" stroke="#DADCE0" stroke-width="1.5" marker-end="url(#arrow)"/>

  <text x="520" y="45" font-family="monospace" font-size="9" fill="#5F6368" text-anchor="middle">Tools</text>
  ${['AWS', 'K8s', 'Terraform', 'Trivy', 'GitHub']
    .map(
      (tool, i) => `
  <rect x="465" y="${55 + i * 38}" width="80" height="28" rx="5" fill="#E8F0FE" stroke="#1A73E8" stroke-width="1"/>
  <text x="505" y="${73 + i * 38}" font-family="monospace" font-size="9" fill="#1A73E8" text-anchor="middle">${tool}</text>
  `
    )
    .join('')}

  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#DADCE0"/>
    </marker>
  </defs>

  <rect x="0" y="255" width="580" height="25" fill="#FFFFFF"/>
  <circle cx="20" cy="267" r="4" fill="#137333"/>
  <text x="30" y="271" font-family="monospace" font-size="9" fill="#137333">8 agents active</text>
  <text x="200" y="271" font-family="monospace" font-size="9" fill="#5F6368">14 integrations</text>
  <text x="350" y="271" font-family="monospace" font-size="9" fill="#5F6368">33 tests passing</text>
  <circle cx="490" cy="267" r="4" fill="#137333"/>
  <text x="500" y="271" font-family="monospace" font-size="9" fill="#137333">operational</text>
</svg>
`

const svgAwsInfrastructure = `
<svg width="580" height="280" viewBox="0 0 580 280" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
  <rect width="580" height="280" fill="#F8F9FA" rx="12"/>

  <rect x="20" y="30" width="540" height="220" rx="8" fill="none" stroke="#DADCE0" stroke-width="1.5" stroke-dasharray="6,4"/>
  <text x="35" y="48" font-family="monospace" font-size="10" fill="#5F6368">AWS VPC — eu-west-1</text>

  <rect x="30" y="110" width="70" height="36" rx="6" fill="#FFFFFF" stroke="#DADCE0" stroke-width="1.5"/>
  <text x="65" y="133" font-family="monospace" font-size="10" fill="#5F6368" text-anchor="middle">Internet</text>

  <line x1="100" y1="128" x2="130" y2="128" stroke="#DADCE0" stroke-width="1.5" marker-end="url(#arrow2)"/>

  <rect x="130" y="108" width="80" height="40" rx="6" fill="#E8F0FE" stroke="#1A73E8" stroke-width="1.5"/>
  <text x="170" y="126" font-family="monospace" font-size="10" fill="#1A73E8" text-anchor="middle">ALB</text>
  <text x="170" y="140" font-family="monospace" font-size="9" fill="#5F6368" text-anchor="middle">HTTPS</text>

  <line x1="210" y1="128" x2="240" y2="128" stroke="#DADCE0" stroke-width="1.5" marker-end="url(#arrow2)"/>

  <rect x="240" y="90" width="120" height="76" rx="8" fill="#FFFFFF" stroke="#1A73E8" stroke-width="1.5"/>
  <text x="300" y="110" font-family="monospace" font-size="10" fill="#1A73E8" text-anchor="middle">EKS 1.31</text>
  <rect x="255" y="118" width="90" height="20" rx="4" fill="#F8F9FA" stroke="#DADCE0" stroke-width="1"/>
  <text x="300" y="132" font-family="monospace" font-size="9" fill="#5F6368" text-anchor="middle">Flask · Helm</text>
  <rect x="255" y="142" width="90" height="20" rx="4" fill="#F8F9FA" stroke="#DADCE0" stroke-width="1"/>
  <text x="300" y="156" font-family="monospace" font-size="9" fill="#137333" text-anchor="middle">ArgoCD sync</text>

  <line x1="360" y1="128" x2="390" y2="128" stroke="#DADCE0" stroke-width="1.5" marker-end="url(#arrow2)"/>

  <rect x="390" y="108" width="90" height="40" rx="6" fill="#FFFFFF" stroke="#DADCE0" stroke-width="1.5"/>
  <text x="435" y="126" font-family="monospace" font-size="10" fill="#202124" text-anchor="middle">RDS</text>
  <text x="435" y="140" font-family="monospace" font-size="9" fill="#5F6368" text-anchor="middle">PostgreSQL 15</text>

  <rect x="490" y="108" width="60" height="40" rx="6" fill="#E8F0FE" stroke="#1A73E8" stroke-width="1"/>
  <text x="520" y="126" font-family="monospace" font-size="9" fill="#1A73E8" text-anchor="middle">Terraform</text>
  <text x="520" y="140" font-family="monospace" font-size="9" fill="#5F6368" text-anchor="middle">7 modules</text>

  <rect x="140" y="195" width="340" height="40" rx="6" fill="#FFFFFF" stroke="#DADCE0" stroke-width="1"/>
  <text x="200" y="220" font-family="monospace" font-size="9" fill="#5F6368">Multi-AZ: eu-west-1a · eu-west-1b · eu-west-1c</text>

  <defs>
    <marker id="arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#DADCE0"/>
    </marker>
  </defs>

  <rect x="0" y="255" width="580" height="25" fill="#FFFFFF"/>
  <circle cx="20" cy="267" r="4" fill="#137333"/>
  <text x="30" y="271" font-family="monospace" font-size="9" fill="#137333">infrastructure operational</text>
  <text x="220" y="271" font-family="monospace" font-size="9" fill="#5F6368">S3 + DynamoDB state backend</text>
  <text x="440" y="271" font-family="monospace" font-size="9" fill="#5F6368">71 commits</text>
</svg>
`

const svgKubernetes = `
<svg width="580" height="280" viewBox="0 0 580 280" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
  <rect width="580" height="280" fill="#F8F9FA" rx="12"/>

  <rect x="20" y="30" width="540" height="200" rx="8" fill="none" stroke="#DADCE0" stroke-width="1.5" stroke-dasharray="6,4"/>
  <text x="35" y="48" font-family="monospace" font-size="10" fill="#5F6368">k8s-on-premise · kubeadm v1.31 · Vagrant/VirtualBox</text>

  <rect x="40" y="65" width="140" height="100" rx="8" fill="#FFFFFF" stroke="#1A73E8" stroke-width="1.5"/>
  <text x="110" y="85" font-family="monospace" font-size="10" fill="#1A73E8" text-anchor="middle">control-plane</text>
  <rect x="55" y="92" width="110" height="20" rx="4" fill="#F8F9FA" stroke="#DADCE0" stroke-width="1"/>
  <text x="110" y="106" font-family="monospace" font-size="9" fill="#5F6368" text-anchor="middle">kube-apiserver</text>
  <rect x="55" y="116" width="110" height="20" rx="4" fill="#F8F9FA" stroke="#DADCE0" stroke-width="1"/>
  <text x="110" y="130" font-family="monospace" font-size="9" fill="#5F6368" text-anchor="middle">etcd · scheduler</text>
  <rect x="55" y="140" width="110" height="18" rx="4" fill="#E8F0FE" stroke="#1A73E8" stroke-width="1"/>
  <text x="110" y="153" font-family="monospace" font-size="9" fill="#1A73E8" text-anchor="middle">192.168.56.10</text>

  <rect x="220" y="55" width="130" height="110" rx="8" fill="#FFFFFF" stroke="#DADCE0" stroke-width="1.5"/>
  <text x="285" y="75" font-family="monospace" font-size="10" fill="#202124" text-anchor="middle">worker-1</text>
  <rect x="235" y="82" width="100" height="18" rx="4" fill="#F8F9FA" stroke="#DADCE0" stroke-width="1"/>
  <text x="285" y="95" font-family="monospace" font-size="9" fill="#5F6368" text-anchor="middle">kubelet · containerd</text>
  <rect x="235" y="104" width="100" height="18" rx="4" fill="#E8F0FE" stroke="#1A73E8" stroke-width="1"/>
  <text x="285" y="117" font-family="monospace" font-size="9" fill="#1A73E8" text-anchor="middle">Calico CNI</text>
  <rect x="235" y="126" width="100" height="18" rx="4" fill="#F8F9FA" stroke="#137333" stroke-width="1"/>
  <text x="285" y="139" font-family="monospace" font-size="9" fill="#137333" text-anchor="middle">ArgoCD pod</text>
  <text x="285" y="158" font-family="monospace" font-size="9" fill="#5F6368" text-anchor="middle">192.168.56.11</text>

  <rect x="390" y="55" width="130" height="110" rx="8" fill="#FFFFFF" stroke="#DADCE0" stroke-width="1.5"/>
  <text x="455" y="75" font-family="monospace" font-size="10" fill="#202124" text-anchor="middle">worker-2</text>
  <rect x="405" y="82" width="100" height="18" rx="4" fill="#F8F9FA" stroke="#DADCE0" stroke-width="1"/>
  <text x="455" y="95" font-family="monospace" font-size="9" fill="#5F6368" text-anchor="middle">kubelet · containerd</text>
  <rect x="405" y="104" width="100" height="18" rx="4" fill="#E8F0FE" stroke="#1A73E8" stroke-width="1"/>
  <text x="455" y="117" font-family="monospace" font-size="9" fill="#1A73E8" text-anchor="middle">Calico CNI</text>
  <rect x="405" y="126" width="100" height="18" rx="4" fill="#F8F9FA" stroke="#DADCE0" stroke-width="1"/>
  <text x="455" y="139" font-family="monospace" font-size="9" fill="#5F6368" text-anchor="middle">NGINX Ingress</text>
  <text x="455" y="158" font-family="monospace" font-size="9" fill="#5F6368" text-anchor="middle">192.168.56.12</text>

  <line x1="180" y1="115" x2="220" y2="110" stroke="#DADCE0" stroke-width="1.5"/>
  <line x1="180" y1="115" x2="390" y2="110" stroke="#DADCE0" stroke-width="1.5"/>

  <rect x="40" y="200" width="500" height="24" rx="6" fill="#FFFFFF" stroke="#DADCE0" stroke-width="1"/>
  <circle cx="58" cy="212" r="4" fill="#137333"/>
  <text x="70" y="216" font-family="monospace" font-size="9" fill="#137333">ArgoCD GitOps sync enabled · self-heal: true · prune: true</text>

  <rect x="0" y="255" width="580" height="25" fill="#FFFFFF"/>
  <circle cx="20" cy="267" r="4" fill="#137333"/>
  <text x="30" y="271" font-family="monospace" font-size="9" fill="#137333">3 nodes ready</text>
  <text x="160" y="271" font-family="monospace" font-size="9" fill="#5F6368">Helm · Metrics Server · local-path-provisioner</text>
  <text x="470" y="271" font-family="monospace" font-size="9" fill="#5F6368">25 commits</text>
</svg>
`

const svgSecurity = `
<svg width="580" height="280" viewBox="0 0 580 280" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
  <rect width="580" height="280" fill="#0D1117" rx="12"/>

  <rect x="0" y="0" width="580" height="32" rx="12" fill="#161B22"/>
  <rect x="0" y="20" width="580" height="12" fill="#161B22"/>
  <circle cx="20" cy="16" r="5" fill="#5F6368"/>
  <circle cx="38" cy="16" r="5" fill="#5F6368"/>
  <circle cx="56" cy="16" r="5" fill="#5F6368"/>
  <text x="290" y="21" font-family="monospace" font-size="10" fill="#5F6368" text-anchor="middle">lra-ai-platform — security scan</text>

  <text x="20" y="55" font-family="monospace" font-size="10" fill="#4ADE80">$</text>
  <text x="35" y="55" font-family="monospace" font-size="10" fill="#FFFFFF">lra scan --github lra-cloud-ops/aws-terraform-devops</text>

  <text x="20" y="75" font-family="monospace" font-size="10" fill="#5F6368">→ Cloning repository...</text>
  <text x="20" y="91" font-family="monospace" font-size="10" fill="#5F6368">→ Detecting stack: terraform, docker, kubernetes</text>

  <text x="20" y="111" font-family="monospace" font-size="10" fill="#FFFFFF">TRIVY — Container &amp; IaC vulnerabilities</text>
  <text x="20" y="127" font-family="monospace" font-size="10" fill="#4ADE80">  ✓ Critical:  0</text>
  <text x="20" y="143" font-family="monospace" font-size="10" fill="#4ADE80">  ✓ High:      0</text>
  <text x="20" y="159" font-family="monospace" font-size="10" fill="#F29900">  ⚠ Medium:    2  →  auto-documented</text>

  <text x="20" y="179" font-family="monospace" font-size="10" fill="#FFFFFF">CHECKOV — IaC misconfigurations</text>
  <text x="20" y="195" font-family="monospace" font-size="10" fill="#4ADE80">  ✓ Terraform:   47/50 passed</text>
  <text x="20" y="211" font-family="monospace" font-size="10" fill="#4ADE80">  ✓ Dockerfile:   8/8  passed</text>
  <text x="20" y="227" font-family="monospace" font-size="10" fill="#F29900">  ⚠ K8s manifests: 3 warnings</text>

  <rect x="20" y="242" width="540" height="26" rx="6" fill="#137333" opacity="0.2"/>
  <rect x="20" y="242" width="540" height="26" rx="6" fill="none" stroke="#137333" stroke-width="1"/>
  <text x="290" y="260" font-family="monospace" font-size="11" fill="#4ADE80" text-anchor="middle" font-weight="bold">✓ SCAN COMPLETE — PASS · 4.2s</text>
</svg>
`

const svgNaturalLanguageAws = `
<svg width="580" height="280" viewBox="0 0 580 280" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
  <rect width="580" height="280" fill="#0D1117" rx="12"/>

  <rect x="0" y="0" width="580" height="32" rx="12" fill="#161B22"/>
  <rect x="0" y="20" width="580" height="12" fill="#161B22"/>
  <circle cx="20" cy="16" r="5" fill="#5F6368"/>
  <circle cx="38" cy="16" r="5" fill="#5F6368"/>
  <circle cx="56" cy="16" r="5" fill="#5F6368"/>
  <text x="290" y="21" font-family="monospace" font-size="10" fill="#5F6368" text-anchor="middle">aws-devops-agent · Claude Sonnet 4.6</text>

  <text x="20" y="55" font-family="monospace" font-size="10" fill="#5F6368">Tu:</text>
  <text x="50" y="55" font-family="monospace" font-size="10" fill="#FFFFFF">¿Qué instancias EC2 están corriendo?</text>

  <text x="20" y="78" font-family="monospace" font-size="10" fill="#1A73E8">Claude →</text>
  <text x="85" y="78" font-family="monospace" font-size="10" fill="#5F6368">calling list_ec2_instances(region=eu-west-1)</text>

  <rect x="20" y="88" width="540" height="50" rx="6" fill="#161B22"/>
  <text x="35" y="106" font-family="monospace" font-size="10" fill="#4ADE80">i-0a1b2c3d  t3.medium   running   prod-api-server</text>
  <text x="35" y="122" font-family="monospace" font-size="10" fill="#4ADE80">i-0e4f5a6b  t3.small    running   staging-worker</text>

  <text x="20" y="160" font-family="monospace" font-size="10" fill="#5F6368">Tu:</text>
  <text x="50" y="160" font-family="monospace" font-size="10" fill="#FFFFFF">¿Hay security groups peligrosos?</text>

  <text x="20" y="180" font-family="monospace" font-size="10" fill="#1A73E8">Claude →</text>
  <text x="85" y="180" font-family="monospace" font-size="10" fill="#5F6368">calling check_security_groups()</text>

  <rect x="20" y="190" width="540" height="36" rx="6" fill="#161B22"/>
  <text x="35" y="208" font-family="monospace" font-size="10" fill="#4ADE80">✓ No open 0.0.0.0/0 rules on critical ports</text>
  <text x="35" y="222" font-family="monospace" font-size="10" fill="#F29900">⚠ sg-0a1b: port 22 open to 0.0.0.0/0 — review recommended</text>

  <rect x="20" y="245" width="540" height="22" rx="6" fill="#161B22"/>
  <text x="35" y="261" font-family="monospace" font-size="10" fill="#5F6368">31 tools · 24 AWS services · Claude Sonnet 4.6 tool-use loop</text>
</svg>
`

// Index matches tabs[] order: 0 AI Agents, 1 AWS Infrastructure, 2 Kubernetes, 3 Security, 4 Natural Language AWS
export const industrySvgs: string[] = [
  svgAiAgents,
  svgAwsInfrastructure,
  svgKubernetes,
  svgSecurity,
  svgNaturalLanguageAws,
]
