# Deploy FlowFi Backend to Render

This project is configured for Render with a Docker-backed Web Service and a `render.yaml` Blueprint.

## 1. Prepare Neon

Create a Neon PostgreSQL database and copy the connection string.

For local development, put this in `.env`:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
DATABASE_SSL=true
DATABASE_SYNCHRONIZE=false
```

Run the first migration once:

```bash
pnpm migration:run
```

## 2. Verify Locally

```bash
pnpm install
pnpm run build
pnpm test
pnpm start:dev
```

Open Scalar locally:

```text
http://localhost:3000/api/reference
```

## 3. Push To Git

Render Blueprint deploys read `render.yaml` from a GitHub, GitLab, or Bitbucket repository.

Commit and push the repo:

```bash
git add .
git commit -m "Configure Render deployment"
git push origin main
```

## 4. Create Render Blueprint

Open:

```text
https://dashboard.render.com/blueprint/new
```

Then:

1. Connect your Git provider.
2. Pick this repository.
3. Render will detect `render.yaml`.
4. Review the service `flowfi-be`.
5. Fill `DATABASE_URL` with your Neon URL.
6. Apply the Blueprint.

Render generates `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` automatically from `render.yaml`.

## 5. Deploy Behavior

Render will:

1. Build the Docker image from `Dockerfile`.
2. Run `pnpm migration:run:prod` before the service receives traffic.
3. Start the API with `node dist/main.js`.
4. Check health at `/api/v1/health`.

Do not set `DATABASE_SYNCHRONIZE=true` in Render.

## 6. Test Deployed API

After deploy is live, open:

```text
https://your-render-service.onrender.com/api/reference
```

Register and login:

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
```

Copy `accessToken`, click `Authorize` in Scalar, and enter:

```text
Bearer <accessToken>
```

Then test:

```http
GET /api/v1/users/me
POST /api/v1/wallets
POST /api/v1/tags
POST /api/v1/transactions
GET /api/v1/reports/summary
```

## 7. CORS Notes

Scalar is served from the same backend domain, so CORS is not involved when testing at `/api/reference`.

Flutter mobile apps are not browsers, so CORS does not block normal Flutter HTTP requests. CORS mainly matters for browser-based web frontends.

Current backend behavior:

- If `CORS_ORIGINS` is empty, the API allows browser origins.
- If you later deploy a web FE, set:

```env
CORS_ORIGINS=https://your-web-frontend-domain.com
```

For Flutter-only clients, no CORS setting is required.
