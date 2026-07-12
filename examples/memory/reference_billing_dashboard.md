---
name: reference_billing_dashboard
description: Stripe billing dashboard — where subscription/payment state is checked
metadata:
  type: reference
---

Subscription and payment state live in the Stripe dashboard (dashboard.stripe.com). Location only —
never store API keys or secrets in a memory; those live in the vault, and a reference points at
them, never contains them.
