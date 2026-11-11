# Sire Crawler

Technical SEO site audits with user accounts, Pro subscriptions (Stripe), a client dashboard, a quote / contact funnel and an admin portal.

- **Free:** site audits up to 100 pages, 58 checks, health score, exports, saved audit history
- **Pro (Stripe subscription):** audits up to 1,000 pages, fast crawl mode and the Pro data tools
- **Admin portal:** users, subscriptions, payments, revenue and quote requests

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4 and MongoDB.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string (e.g. a free MongoDB Atlas cluster) |
| `MONGODB_DB` | No | Database name, default `sire_crawler` |
| `AUTH_SECRET` | Yes in production | Signs session cookies. `openssl rand -base64 48` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Yes | The first admin account. It is created on the first sign-in at `/admin/login` |
| `APP_URL` | Recommended | Public site URL, used for Stripe return links |
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key |
| `STRIPE_PRICE_ID` | For payments | The recurring price of the Pro plan |
| `STRIPE_WEBHOOK_SECRET` | For payments | Webhook signing secret |

Without the Stripe variables the site still works; the upgrade button is replaced by a "contact us" message.

### Stripe

1. In Stripe, create a product **Pro** with a recurring price and copy its price ID into `STRIPE_PRICE_ID`.
2. Enable the **Customer portal** (Settings → Billing → Customer portal) so users can update cards and cancel.
3. Add a webhook endpoint `https://YOUR-DOMAIN/api/stripe/webhook` with these events:
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
4. Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook` and use the printed `whsec_…` secret.

## Routes

| Route | Who | What |
| --- | --- | --- |
| `/` | Everyone | Landing page and free site audit |
| `/contact` | Everyone | Quote / contact form |
| `/login`, `/signup` | Visitors | Accounts |
| `/dashboard` | Users | Overview, saved audits, plan |
| `/dashboard/audit` | Users | Run an audit (plan limits apply) |
| `/dashboard/tools` | Users | Pro data tools |
| `/dashboard/services` | Users | Request a quote, track requests |
| `/dashboard/billing` | Users | Upgrade, manage subscription, invoices |
| `/dashboard/settings` | Users | Profile and password |
| `/admin/login` | Admins | Admin sign in |
| `/admin` | Admins | Users, revenue, MRR, signups, latest leads |
| `/admin/users` | Admins | Search users, suspend / reactivate |
| `/admin/subscriptions` | Admins | Subscribers, amounts, last and next payment, total paid, payments |
| `/admin/quotes` | Admins | Quote requests, status pipeline, internal notes |

## Security notes

- Passwords are hashed with bcrypt; sessions are signed JWTs in an HttpOnly, SameSite=Lax cookie.
- Changing a password or suspending a user signs that user out everywhere.
- Login, signup and quote forms are rate limited (per server instance) and use a honeypot field.
- Plan limits are enforced in the crawl API, not only in the UI.
- The crawler blocks private and internal network addresses (SSRF protection).

## Deploying

Any Node.js host works (Vercel, Railway, a VPS). Set the environment variables, point the Stripe webhook at the deployed URL, then sign in at `/admin/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` to create the admin account. The crawl API runs up to 300 seconds (`maxDuration`).
