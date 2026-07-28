# Threadline — Sprint 1

A deployable React + Netlify foundation for Threadline.

## Included

- Conversion-focused homepage in the existing editorial cream/rose style
- Abstract thread-shaped T logo
- Resume + job description analyzer interface
- Secure OpenAI Job Fit Netlify Function
- Weighted Job Fit report UI
- Stripe Checkout Netlify Function
- Free, $9 report, $49 Pro, $99 Career Story, and $149 Lifetime offers
- Privacy-safe brand copy with no founder identity
- Privacy, terms, success, robots, sitemap, canonical and social metadata
- Responsive mobile design
- Safe demo fallback when OpenAI is not configured

## Deploy to Netlify

1. Upload this project to a new GitHub repository.
2. In Netlify, choose **Add new site → Import an existing project**.
3. Connect the GitHub repository.
4. Netlify should detect:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
5. Add your custom domain: `threadlineresume.com`.

## Environment variables

In **Netlify → Site configuration → Environment variables**, add:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` = `gpt-4.1-mini`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_REPORT`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_CAREER_STORY`
- `STRIPE_PRICE_LIFETIME`
- `URL` = `https://threadlineresume.com`

Do not put secret values in GitHub.

## Stripe setup

Create four one-time Prices in Stripe test mode:

- Complete Job Fit Report — $9
- Pro Job Search, 30-day access — $49
- Career Story — $99
- Lifetime — $149

Copy each `price_...` ID into the matching Netlify variable.

## Test

Use Stripe test card:

`4242 4242 4242 4242`

Use any future expiration date, any CVC, and any ZIP code.

## Current Sprint 1 limitations

- File upload is designed visually but does not yet extract PDF/DOCX text.
- Checkout records payment, but account entitlement/webhook handling comes in Sprint 2.
- Authentication, Supabase storage, saved reports, Career Evidence, and dashboard come in Sprint 2.
- Privacy and Terms are launch drafts and should be reviewed for your exact enabled vendors and policies.
- The AI response is not stored by default.

## Recommended next sprint

1. Supabase email authentication
2. Stripe webhook + purchased entitlement
3. Saved Job Fit reports
4. PDF/DOCX extraction
5. Career Evidence profile
6. Dashboard and application history
