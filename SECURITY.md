# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| Current (main) | ✅ |
| Previous branches | ❌ |

## Reporting a vulnerability

Please report security vulnerabilities to:

**Email:** info@lracloudops.com
**Subject:** [SECURITY] Brief description

Do NOT open a public GitHub issue for security vulnerabilities.

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (optional)

### Response timeline

| Stage | Timeline |
|-------|---------|
| Acknowledgement | 48 hours |
| Initial assessment | 5 business days |
| Fix and disclosure | 90 days maximum |

## Security measures

This repository and lracloudops.com implement:

- Continuous security scanning via lra scan (Trivy + Checkov)
- Strict Content Security Policy (CSP)
- HSTS with preload (2 years)
- No secrets in codebase (Cloudflare Worker secrets)
- Stripe PCI DSS Level 1 for payment processing
- All dependencies audited via npm audit

## Responsible disclosure

We follow responsible disclosure principles and will not take legal action
against researchers who report vulnerabilities in good faith.
