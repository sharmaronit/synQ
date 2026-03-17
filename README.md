# synQ

synQ is a conversational analytics app built with Next.js that turns uploaded tabular data into dashboards, charts, KPI cards, and narrative insights. Users can upload CSV or Excel files, ask questions in natural language, apply filters, save dashboards, and export results.

## What It Does

- Upload CSV or Excel data and infer the schema automatically.
- Ask questions in plain English to generate analytics plans.
- Run AI-powered query planning with GitHub Models or Google Gemini.
- Fall back to mock mode when no AI key is configured.
- Render dashboards with KPIs, charts, tables, summaries, and insight cards.
- Generate executive-style data stories from the current analysis.
- Save dashboards to a Supabase-backed account and resume them later.
- Export dashboards to PDF and charts/data to SVG, PNG, and Excel.

## Key Features

- Conversational analytics flow with follow-up query support.
- Client-side execution using AlaSQL and Web Workers for responsive analysis.
- Built-in demo datasets for quick evaluation.
- Correlation heatmap, descriptive statistics, and anomaly-oriented insights.
- Protected dashboard routes with Supabase authentication.
- Row-level security for per-user dashboard storage.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Recharts
- Supabase Auth + Postgres
- Google Gemini API
- GitHub Models via Azure Inference
- AlaSQL
- PapaParse
- XLSX
- html2canvas + jsPDF

## Project Structure

```text
src/
  app/                 Next.js routes, pages, and API handlers
  components/          Dashboard, chat, chart, and UI components
  hooks/               Query submission and analytics hooks
  lib/                 Parsing, execution, prompts, exports, auth helpers
  types/               Shared TypeScript types
supabase/
  schema.sql           Dashboard storage schema and RLS policies
```

## Prerequisites

- Node.js 20+
- npm
- A Supabase project

## Environment Variables

Create a `.env.local` file in the project root.

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: use either one for AI query/story generation
GITHUB_TOKEN=your_github_models_token
GEMINI_API_KEY=your_gemini_api_key
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required.
- `GITHUB_TOKEN` enables GitHub Models with `gpt-4o-mini`.
- `GEMINI_API_KEY` enables Gemini `gemini-2.0-flash`.
- If neither AI key is present, synQ still runs in mock mode.

## Supabase Setup

Run the SQL in `supabase/schema.sql` in your Supabase SQL editor. This creates the `dashboards` table, indexes, trigger, and row-level security policies needed for saved dashboards.

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## How It Works

1. Upload a dataset or load one of the built-in demo datasets.
2. synQ infers column types and computes summary statistics.
3. A natural language query is sent to GitHub Models, Gemini, or the mock planner.
4. The returned plan is executed against the dataset client-side.
5. The app renders charts, KPIs, tables, summaries, and insights.
6. Users can filter results, export outputs, or save the dashboard to their account.

## Available Scripts

- `npm run dev` - Start the development server.
- `npm run build` - Build the production app.
- `npm run start` - Start the production server.
- `npm run lint` - Run ESLint.

## Demo Datasets

The app ships with built-in demo datasets for:

- E-Commerce Sales
- Employee HR Data
- Student Scores

These are useful for testing the app without uploading your own files.

## Authentication and Access Control

- Unauthenticated users are redirected away from protected dashboard routes.
- Authenticated users are redirected away from login/signup pages.
- Saved dashboards are stored per user with Supabase row-level security.

## Export Options

- Dashboard to PDF
- Chart to SVG or PNG
- Table data to Excel
- Data story to text file

## Notes

- Dashboard snapshots are also stored locally in the browser.
- Heavy analytics work is offloaded to Web Workers when possible.
- Query execution time is surfaced in the UI.

## Future Improvements

- Add automated tests for query planning and execution.
- Add file size and row-count guidance for very large datasets.
- Add deployment-specific environment setup notes.
