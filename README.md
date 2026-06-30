# Todero Web

Standalone Next.js web/admin app split from the original TODEROSAPP monorepo.

## Run locally

```powershell
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

Use this folder as the Vercel project root:

```text
C:\My_Web_Sites\TODEROSAPP-web
```

Build command:

```text
npm run build
```

The `packages/` folder is included because the web app imports shared Todero types, validation, and database helpers.
