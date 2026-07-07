# African Guard

African Guard is a multi-tenant financial crime operations platform.

## Applications

- `apps/web`: Next.js operating console.
- `services/api`: NestJS API and realtime services.
- `services/ai`: FastAPI risk-scoring and investigation service.
- `infra/k8s`: Kubernetes deployment manifests.

## Local development

```bash
npm ci
npm run prisma:generate
npm run dev:api
npm run dev:web
python -m uvicorn services.ai.app.main:app --reload --host 0.0.0.0 --port 8001
```

The web app runs on port 3000, the API on port 4000, and the AI service on port 8001.

## Durable API

Production-oriented services are exposed below `/v1/live`. The original seeded operating console remains restricted to non-production development and training.

## Database

```bash
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:deploy
```

Run the dedicated migration job before deploying a new API version.

## Deployment status

The repository includes a hardened technical baseline. Live deployments still require organisation-specific infrastructure, provider onboarding, legal approval, security testing, operational ownership, and verified production configuration.
