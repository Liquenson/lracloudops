# Stripe Payment Links — Setup Guide

## Step 1 — Create Stripe account
1. Go to https://stripe.com
2. Sign up with info@lracloudops.com
3. Complete business verification (solo practitioner)
4. Add bank account for payouts

## Step 2 — Create Payment Links

### Infrastructure Security Audit — €199
1. Stripe Dashboard → Payment Links → Create
2. Product: "Infrastructure Security Audit"
3. Price: €199 (one-time)
4. Description: "Trivy + Checkov analysis of your GitHub repository. AI-generated remediation report delivered within 24 hours."
5. After payment redirect: https://lracloudops.com/payment-success
6. Copy link URL

### Platform Retainer — €499/month
1. Stripe Dashboard → Payment Links → Create
2. Product: "Platform Retainer"
3. Price: €499 (recurring monthly)
4. Description: "Monthly security scans, infrastructure reviews, CI/CD audits and direct engineering access."
5. After payment redirect: https://lracloudops.com/payment-success
6. Copy link URL

## Step 3 — Replace placeholders in the code

Replace these strings in `src/pages/pricing.astro`, `src/pages/es/precios.astro`, `src/pages/services.astro` and `src/pages/es/servicios.astro`:

| Placeholder | Replace with |
|------------|-------------|
| `https://buy.stripe.com/AUDIT_LINK` | Your audit payment link |
| `https://buy.stripe.com/RETAINER_LINK` | Your retainer payment link |
| `https://buy.stripe.com/CICD_LINK` | Your CI/CD payment link (optional — not wired into any page yet) |

## Step 4 — Configure Stripe webhook (optional, for automation)
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: https://lracloudops-webhook.liquenson-cloud.workers.dev/stripe
3. Events: checkout.session.completed
4. This triggers automatic Smart Scan after payment

Note: this `/stripe` route does not exist yet in `workers/webhook/index.ts` — it only
handles the contact-form POST today. Treat this step as a future enhancement, not
something already wired up.

## Payment methods enabled by default
- Visa/Mastercard (EU & international)
- SEPA Direct Debit (recommended for retainers)
- Apple Pay / Google Pay
- PayPal (enable in Stripe settings)

## Pricing in other currencies
Stripe auto-converts. Set EUR as primary currency.
UK clients pay in GBP equivalent.
US clients pay in USD equivalent.
