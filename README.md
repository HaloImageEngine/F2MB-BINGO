# Bingo-DJGogi-Family

Angular 17 standalone dashboard used to orchestrate menus, marketing, orders, and customer signals for the GetGogi team. The shell ships with a responsive sidebar, insight band, quick actions, and dedicated pages for each workflow.

## Quick start

```bash
npm install
npm start
```

The dev server runs at http://localhost:4200 and reloads on save.

## Available scripts

| Command | Description |
| --- | --- |
| `npm start` | Run the dev server with live reload (includes API proxy for CMS calls). |
| `npm run build` | Produce an optimized production build in `dist/`. |
| `npm run build:prod` | Build production output using the Angular production configuration. |
| `npm run deploy:prepare` | Create deploy-ready package in `deploy/bingo-djgogi-family` from `dist` only. |
| `npm test` | Execute unit tests with Karma. |
| `npm run watch` | Build in watch mode for rapid previews. |

## Deployment checklist

1. Bump release version before building:
   - Update `version` in `src/environments/environment.ts` and `src/environments/environment.prod.ts` (for example, `26.05.31.19.T` and `26.05.31.19.P`).
2. Run production build:
   - `npm run build:prod`
3. Prepare clean deployment folder:
   - `npm run deploy:prepare`
4. Publish only:
   - `deploy/bingo-djgogi-family`

Do not deploy the repository root or non-site folders such as `sqlscript`.

## Feature map

- **Overview** – KPI cards, readiness checks, and kitchen pipeline status.
- **Menu Manager** – Inventory grid, upcoming drops, and bulk utilities.
- **Menu List** – Full browsable list of all menu items.
- **Discount List** – View and edit all discount codes via modal form; calls `Get_All_Discounts` and `CRUD_Discounts` REST endpoints.
- **Marketing** – Campaign pacing plus channel insights.
- **Orders** – Live fulfillment timeline and zone capacity board.
- **Order List** – Filterable orders-by-status grid with master/detail view. Supports full-screen expand mode that collapses the sidebar.
- **Customers** – Segment snapshots and feedback queue.
- **Settings** – Automation rules and access overview.

## Sidebar collapse

A **‹ Hide panel** button at the top of the left navigation collapses the entire sidebar with an animated transition. A **›** reveal tab appears at the left edge to restore it. This works globally across all pages and is independent of the mobile sidebar toggle.

## Architecture notes

- Standalone Angular components with lazy loaded routes keep each page isolated.
- SCSS styling relies on shared design tokens in `src/styles.scss` for consistent theming.
- Navigation, highlight metrics, and action pads are driven by typed data in `app.component.ts` for easy updates.
- Menu data can fall back to the mock set in `environment.useMockMenuApi`; flip it off once the live CMS endpoint is stable.

Feel free to scaffold additional components with `ng generate component path/my-component --standalone --style=scss --skip-tests` to stay consistent with the current setup.


1. Build production
npm run build:prod
Output goes to: dist/bingo-djgogi-family/

2. Prepare deploy package (last step before upload)
npm run deploy:prepare
This copies a clean site-only folder to: deploy/bingo-djgogi-family/

Full sequence
npm run build:prod
npm run deploy:prepare
Then upload everything inside deploy/bingo-djgogi-family/ to production.

There is no npm run deploy — the last command is npm run deploy:prepare.
