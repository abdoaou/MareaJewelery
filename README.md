# Marea Jewelry

```
Marea Jewlery/
├── api/          # Express API (empty scaffold — build your routes here)
├── website/      # Customer storefront (React + 3D hero)
├── admin/        # Admin dashboard (empty scaffold — build your UI here)
└── README.md
```

## Run

```bash
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| Website | http://localhost:5173 |
| API | http://localhost:3000 |
| Admin | http://localhost:5175 |

## API scaffold

- `api/server.js` — Express entry point
- `api/routes/` — add route files
- `api/controllers/` — add controllers
- `api/middleware/` — add middleware

Health check: `GET http://localhost:3000/api/health`

## Admin scaffold

- `admin/src/App.tsx` — placeholder page
- Ready for your new admin dashboard build

## Environment

- Root `.env` or `api/.env` — API config (database, JWT, etc.)
- `website/.env` — `VITE_API_KEY`, `VITE_WEBSITE_ID`
