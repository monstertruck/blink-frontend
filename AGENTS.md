# Frontend

- The purpose of this app is for users to submit and review links (URLs + titles) and decide which ones to keep and how to categorize them.
- I have a lot of links that I would like to save for later, and I want to categorize them. I also want to bring back a bunch and decide to read them or archive them (or delete them entirely). I also want to deduplicate these links (the backend should be checking for this).
- There is a link-service-backend that runs the backend. You should have been given access to this repository so you can understand how the backend works.
- There is a primary user of the app (me), so you can ask me how what features I would like in the app.

# UX

- I would like the UX to be pleasant.
- I would like to see links presented with Titles (when available from the backend). When those are not available, show the URL.
- I would like to be able to cut and paste hyperlinks.


<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Blink frontend

The Bookmark-LINK frontend. Scaffolded with `create-next-app` using the App Router, TypeScript, no Tailwind, no ESLint, no `src/` directory.

## Commands

- `npm run dev` — start the dev server on http://localhost:3000
- `npm run build` — production build
- `npm run start` — run the production build
- No test or lint scripts are configured yet; add them when needed.

## Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript** (strict mode).
- Import alias `@/*` resolves to the repo root (see `tsconfig.json`).
- Node.js was installed via Homebrew (`brew install node`); no version manager and no `.nvmrc`.

## Layout

- `app/` — App Router root. `layout.tsx` is the root layout, `page.tsx` is `/`, `globals.css` is the global stylesheet, `page.module.css` is a CSS module scoped to the home page.
- `public/` — static assets served at the site root.
- `next.config.ts`, `tsconfig.json` — configuration. `next-env.d.ts` is generated and gitignored.

## API client

- Typed client for the `link-service-backend` API lives in `lib/api/` (`types.ts` for schemas, `client.ts` for fetch wrappers).
- Base URL: `process.env.NEXT_PUBLIC_API_BASE_URL`, defaults to `http://localhost:8000`. The `NEXT_PUBLIC_` prefix is required so the value is inlined into client bundles.
- Errors throw `ApiError` (status + body). `createLink` is the exception: a 409 ("already saved") resolves with `{ link, alreadyExisted: true }` instead of throwing, matching the backend's convention of returning the existing record on conflict. `createCategory` does **not** apply that same convention — its 409 throws like any other error.
- `category` on links is a plain `string` (not an enum). The backend has a `categories` table that's user-extensible via `POST /categories`; seed values come from the legacy `LinkCategory` enum on the backend. Use `updateLink(id, { category, status })` to recategorize; the older `setLinkStatus(id, status)` still works for status-only updates.

## Pages

Three routes, with a sticky top nav defined in `app/layout.tsx` (`app/_components/nav.tsx`):

- **`/`** (`app/page.tsx`) — "Read links". Server Component. Fetches up to 500 links + categories in parallel, then hands them to `LinksBrowser` (client) which owns search + filter + paging state. Default shows the most recent 10 (sorted by `id desc` since the backend has no `ORDER BY`); a "Show 10 more" control extends it.
- **`/add`** (`app/add/page.tsx`) — "Add link". Renders `BulkSubmit`, which is a textarea-driven, paste-aware bulk submitter (see below).
- **`/categories`** (`app/categories/page.tsx`) — "Categories". Lists every category with its link count, plus the `AddCategory` form.

Both `/` and `/categories` export `dynamic = "force-dynamic"` so they don't prerender stale data at build time.

### Client components

- `app/_components/bulk-submit.tsx` — textarea for one URL per line. On paste, if the clipboard has `text/html` with `<a href>` tags, extracts every href and appends one-per-line (a single-link paste from a browser also goes through this path). Submits sequentially with per-line status icons (pending → saving → saved / already-saved / error) plus a final totals line. Slow because each `POST /links` calls Claude on the backend.
- `app/_components/add-category.tsx` — compact form to create a new category via `POST /categories`.
- `app/_components/category-select.tsx` — pill-styled `<select>` per link. Calls `updateLink(id, { category })` and tracks a `pending` value so the displayed option doesn't snap back to the old one while the request is in flight.
- `app/_components/nav.tsx` — sticky tabbed nav. Uses `usePathname` to highlight the active tab.

Every mutation calls `router.refresh()` on success — the Server Component re-fetches and re-renders. No client-side cache.

Backend gaps to keep in mind:
- No `ORDER BY` on `GET /links`, so `/` reverses by `id` to show newest first.
- No `DELETE /categories/{name}` or rename; the Categories page can list and create only.

No state management, styling system, or test runner is set up yet — those choices are open.
