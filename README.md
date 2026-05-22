# Прогрестрейд ЕООД - Recycling Customer Service

Next.js 15 + Supabase application for a Bulgarian scrap metal collection point.

## Setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in values
3. Run SQL migration from `supabase/migrations/001_initial.sql` against your Supabase project
4. `npm run dev`

## Features

- Dashboard with daily/monthly stats and charts
- New transaction workflow with ID card OCR (Claude Vision)
- Customer management
- Nomenclatures (scrap material types)
- PDF generation (ПИС + Декларация + Договор on one A4)
- Reports with CSV export
