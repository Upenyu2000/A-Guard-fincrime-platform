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
npm install
python -m venv .venv
.venv\Scripts\activate
pip install -r services/ai/requirements.txt
npm run dev:api
npm run dev:web
python -m uvicorn services.ai.app.main:app --reload --host 0.0.0.0 --port 8001
```

The web app runs at `http://localhost:3000`, the API at `http://localhost:4000`, and the AI service at `http://localhost:8001`.

## Docker

```bash
docker compose up --build
```

The compose stack includes PostgreSQL, Redis, Kafka, Neo4j, the API, the AI service, and the web app.
