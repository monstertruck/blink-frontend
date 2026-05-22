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

There is no API/data layer, state management, styling system, or test runner yet — those choices are open.
