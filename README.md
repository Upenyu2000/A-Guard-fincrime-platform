# African Guard

African Guard is a FinCrime and fraud defense SaaS platform built as a working monorepo:

- `apps/web`: Next.js, TypeScript, Tailwind CSS, Framer Motion, Zustand, and React Query operating console.
- `services/api`: NestJS API and WebSocket gateway with fraud scoring, payment tracking, cases, intelligence sharing, graph risk, learning feedback, RBAC, rate limiting, and audit primitives.
- `services/ai`: FastAPI AI service with hybrid scoring features, explainability payloads, copilot summaries, SAR drafts, drift checks, and feedback ingestion.
- `infra/k8s`: Kubernetes-ready deployment manifests.

## Runtime Surfaces

The platform simulates the production flow:

1. Events enter the NestJS API as transactions, logins, device updates, account updates, or beneficiary changes.
2. The fraud engine combines deterministic rules, anomaly scoring, behavioral profiling, graph risk propagation, and consortium intelligence.
3. Critical events publish live alerts over WebSockets and can auto-create investigation cases.
4. The identity graph, payment route, collaboration network, AML convergence, and AI copilot views update from the same operating picture.

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

The web app runs at `http://localhost:3000`, the API at `http://localhost:4000`, and the AI service at `http://localhost:8001`.

## Docker

Start the full stack:

```bash
docker compose up --build
```

The compose stack includes PostgreSQL, Redis, Kafka, Neo4j, the API, the AI service, and the web app.

After changing Dockerfiles, dependencies, or the Next.js build, use a clean rebuild so the browser receives the matching JavaScript and CSS assets:

```bash
docker compose down --remove-orphans
docker compose build --no-cache web api ai
docker compose up
```

Verify the services:

- Web console: `http://localhost:3000`
- API health: `http://localhost:4000/v1/health`
- AI health: `http://localhost:8001/health`
- Neo4j browser: `http://localhost:7474`

Host ports can be changed without editing `docker-compose.yml`. For example, in PowerShell:

```powershell
$env:WEB_PORT = "3001"
$env:API_PORT = "4001"
$env:NEXT_PUBLIC_API_URL = "http://localhost:4001"
$env:NEXT_PUBLIC_WS_URL = "http://localhost:4001"
docker compose up --build
```

When the web image is rebuilt, perform a hard browser refresh (`Ctrl+Shift+R`) to clear references to older Next.js chunks.
