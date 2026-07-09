# African Guard

African Guard is a FinCrime and fraud defense SaaS platform built as a working monorepo:

- `apps/web`: Next.js, TypeScript, Tailwind CSS, Framer Motion, Zustand, and React Query operating console.
- `services/api`: NestJS API and WebSocket gateway with fraud scoring, payment tracking, cases, intelligence sharing, graph risk, learning feedback, RBAC, rate limiting, and audit primitives.
- `services/ai`: internal African Guard Risk Analysis Service used only through the secure API orchestration layer.
- `infra/k8s`: Kubernetes-ready deployment manifests.

## Runtime Surfaces

The platform simulates the production flow:

1. Events enter the NestJS API as transactions, logins, device updates, account updates, or beneficiary changes.
2. The fraud engine combines deterministic rules, anomaly scoring, behavioral profiling, graph risk propagation, and consortium intelligence.
3. Critical events publish live alerts over WebSockets and can auto-create investigation cases.
4. The identity graph, payment route, collaboration network, AML convergence, and Financial Crime Copilot views update from the same operating picture.

## Local Development

```bash
npm ci
python -m venv .venv
.venv\Scripts\activate
pip install -r services/ai/requirements.txt
npm run dev:api
npm run dev:web
python -m uvicorn services.ai.app.main:app --reload --host 0.0.0.0 --port 8001
```

The web app runs at `http://localhost:3000` and calls the same-origin `/api/gateway/*` and `/socket.io/*` paths. The API runs at `http://localhost:4000`. The internal risk service is for local development only and should not be exposed in staging or production.

## Docker

Start the full stack:

```bash
docker compose up --build
```

The compose stack includes PostgreSQL, Redis, Kafka, Neo4j, the API, the internal risk service, and the web app. Backing services are placed on the backend network and are not published as public application endpoints.

After changing Dockerfiles, dependencies, or the Next.js build, use a clean rebuild so the browser receives the matching JavaScript and CSS assets:

```bash
docker compose down --remove-orphans
docker compose build --no-cache web api ai
docker compose up
```

Verify the services:

- Web console: `http://localhost:3000`
- API health: `http://localhost:4000/v1/health`
- Internal risk health: available only on the private Docker network.
- Database, cache, broker, graph, and risk-service ports are not public application surfaces.

Host ports can be changed without editing `docker-compose.yml`. For example, in PowerShell:

```powershell
$env:WEB_PORT = "3001"
$env:API_PORT = "4001"
$env:PUBLIC_API_GATEWAY_URL = "http://api:4000"
$env:PUBLIC_WS_GATEWAY_URL = "http://api:4000"
docker compose up --build
```

When the web image is rebuilt, perform a hard browser refresh (`Ctrl+Shift+R`) to clear references to older Next.js chunks.

Use untracked local environment files for server-only values. Do not commit real connection strings, tokens, private keys, model identifiers, provider credentials, or production hostnames.
