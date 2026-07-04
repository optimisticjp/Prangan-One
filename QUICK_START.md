# Quick start

## Run it

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). That's it, no environment variables, no database, no signup. In local dev, demo shortcuts are on automatically (`import.meta.env.DEV`).

## Try it in a few minutes

1. You'll land on the public homepage at `/`, in Gujarati by default (English is the toggle). For the actual demo, go to `/demo` directly. Pick **"હું રહેવાસી છું"** (I'm a resident), choose any flat, tap શરૂ કરો.
2. Look at the home screen, then tap **બિલ** to see a bill and try recording a payment.
3. Go back (રોલ બદલો in the profile tab), then visit `/demo` again and this time pick **"હું કમિટી મેમ્બર છું"** (committee member).
4. In the admin sidebar, try **બિલિંગ અને બાકી**: generate this month's bills, or check the dues list.
5. Try **ફરિયાદ** (complaints): open one, advance its status, watch the timeline grow.
6. Try **સેટિંગ્સ**: turn a module off, save, and watch it disappear from the sidebar.
7. Log out and go back to `/demo`, try **Prangan One ઓનર કન્સોલ**. Tap **+ નવી સોસાયટી** to walk through the real 5-step onboarding wizard, pick a different color theme, and land straight in that new society's own (empty) admin panel.

The real `/login` screen never shows these shortcuts, regardless of demo mode, that separation is deliberate. `/demo` itself only exists when `VITE_DEMO_MODE` is on (the default in local dev).

## Reset the demo data

Committee panel → સેટિંગ્સ → **ડેમો ડેટા રીસેટ**. This wipes everything back to the original sample data. Useful after you've been clicking around and want a clean slate for a demo.

## Where things live

- `src/pages/resident/`: the resident-facing screens
- `src/pages/admin/`: the committee panel
- `src/pages/accountant/`: the accountant panel
- `src/pages/owner/`: owner console (`Layout.tsx`, `Dashboard.tsx`, `Societies.tsx`), onboarding wizard (`Onboarding.tsx`), society edit (`SocietyDetail.tsx`), platform billing, leads, activity log
- `src/pages/public/`: the bilingual marketing site (home, features, pricing, FAQ, contact)
- `src/lib/store.tsx`: all the data logic, one file, one hook (`useData()`), now multi-tenant
- `src/lib/theme/`: the per-society color theme presets and how they get applied
- `sample-data/*.json`: the demo data, editable directly if you want different names/numbers

## If something looks broken

Run `npm run build`. It runs the TypeScript checker before bundling, so it'll catch most issues with a clear file/line number. If the dev server won't start, delete `node_modules` and `package-lock.json` and run `npm install` again.

Full details: see `README.md`. For the plan to connect a real backend: see `CLAUDE_CODE_NEXT_STEPS.md`.
