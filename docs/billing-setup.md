# EnterpriseOS subscriptions — activation checklist

The repository contains the client integration, database migration and Stripe Edge Functions. Live registration and payments remain disabled until the owner connects the external services below. Never put a Stripe secret or Supabase service-role key in GitHub Pages variables or browser code.

## 1. Supabase project

1. Create a Supabase project.
2. In the SQL editor, run `supabase/migrations/202611140001_subscriptions.sql`.
3. Enable Email/Password under Authentication → Providers. Configure the email confirmation policy and SMTP before inviting paying customers.
4. In Authentication → URL Configuration, add:
   - Site URL: `https://jaimefg19034.github.io/EnterpriseOS`
   - Redirect URL: `https://jaimefg19034.github.io/EnterpriseOS/account/`
5. Copy the project URL and the publishable/anon key.

## 2. Stripe products

Create three recurring monthly EUR prices (amounts exclude VAT):
- Essential: 29.00 EUR/month
- Professional: 79.00 EUR/month
- Business: 149.00 EUR/month

Copy each Stripe Price ID. In Stripe Billing → Customer portal, enable cancellation and plan changes and choose the three products as allowed prices.

## 3. Supabase Edge Function secrets

Set these secrets in the Supabase project:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (created in step 4)
- `STRIPE_PRICE_ESSENTIAL`
- `STRIPE_PRICE_PROFESSIONAL`
- `STRIPE_PRICE_BUSINESS`
- `APP_URL=https://jaimefg19034.github.io`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never expose it to the browser)

Deploy:
- `supabase/functions/create-checkout-session`
- `supabase/functions/create-portal-session`
- `supabase/functions/stripe-webhook`

Set `verify_jwt = false` only for the Stripe webhook. The checkout and portal functions must keep JWT verification enabled.

## 4. Stripe webhook

Create a Stripe webhook endpoint pointing to:
`https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`

Subscribe to:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy its signing secret into Supabase as `STRIPE_WEBHOOK_SECRET`. Test a subscription in Stripe test mode before switching to live keys.

## 5. GitHub Pages build variables

In GitHub → Settings → Secrets and variables → Actions → Variables, create:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

These two values are public client configuration; do not store a service-role key here. The Pages workflow injects them at build time. Re-run the Pages deployment after setting them.

## Current product limitation

The existing financial workspaces still keep most model inputs and invoice/forecast records in browser localStorage. Authentication and subscription checks do not turn that local storage into secure, backed-up, company-wide storage. Do not enter confidential financial data until tenant-scoped server persistence, RLS policies for each data table, backups and recovery are implemented and tested. The plan gate is an application access control, not a substitute for server-side authorization of future API/data operations.
