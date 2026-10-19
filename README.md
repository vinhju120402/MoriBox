# MoriBox

MoriBox is a Vietnamese Gunpla (Gundam model kit) e-commerce demo built with Next.js. It is fully client-side — no backend or database — and uses a light-only "premium product showcase" UI.

## Features

- **Catalog** — browse across six grades (PG, MG, RG, HG, EG, SD), each with its own category page (`/danh-muc/[grade]`) with sorting (featured, price, difficulty).
- **Home sections** — curated "Mô hình mới về" (new arrivals) and "Mô hình bán chạy" (best sellers), plus a "Hàng mới về" filtered view.
- **Product detail pages** (`/san-pham/[id]`) — full spec sheet, quantity stepper, related-by-series and similar-by-grade product rails.
- **Promo carousel** — auto-rotating campaign banner on the homepage, pauses on hover and under `prefers-reduced-motion`.
- **Cart & checkout** — a 3-step cart drawer (cart → shipping info → confirmation), persisted to `localStorage` so it survives page reloads.
- **Wishlist** — like/unlike products, persisted to `localStorage`.
- **Accounts** — mock login/register (`/dang-nhap`, `/dang-ky`) backed by `localStorage`; adding to cart or buying requires being logged in.
- **Stock awareness** — out-of-stock products are clearly marked and their purchase actions are disabled.
- **Installable app (PWA)** — has a web app manifest and app icons, so it can be installed via "Add to Home Screen" (mobile) or the browser's install prompt (desktop). No service worker/offline caching (a caching service worker caused stale-JS hydration bugs in dev — see `components/sw-register.tsx`).

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Other scripts:

```bash
npm run build      # production build
npm run start      # run the production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```
