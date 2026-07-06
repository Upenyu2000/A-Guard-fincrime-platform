# Production Readiness

African Guard now exposes the core gates needed for a real deployment:

- `GET /v1/deployment/readiness`: launch checks for API controls, secrets, persistence, AgentOps governance, and observability.
- `GET /v1/metrics`: Prometheus-compatible operational metrics.
- `GET /v1/agentops/control-plane`: autonomy mode, policy thresholds, action queue, telemetry, and emerging patterns.
- `POST /v1/agentops/run-cycle`: executes an agentic defense cycle and queues governed actions.
- `POST /v1/agentops/actions/:id/approve`: approves a queued action and updates rule lifecycle state.

Required production work before live customer traffic:

1. Replace local `x-role` headers with JWT or SSO claims and tenant-scoped authorization.
2. Run Prisma migrations against managed PostgreSQL and persist all events, cases, actions, and audit records.
3. Connect Redis Streams or Kafka consumers for event ingestion and WebSocket fanout.
4. Connect Neo4j for identity graph persistence and graph-risk propagation.
5. Mount `CONSORTIUM_SHARED_SECRET`, JWT keys, database credentials, and provider credentials from a vault.
6. Connect approved OSINT, payment hold/recall, card-network dispute, and sanctions providers.
7. Configure retention, deletion, subject-access, and pseudonymisation controls for GDPR and local privacy regimes.
8. Add load tests for sub-250ms decision latency at target event volume.

Current enterprise expansion includes:

- Secure integration contracts for API keys, OAuth2/Open Banking consent, mTLS, and signed webhooks.
- Adapter registry for Open Banking, Visa, Mastercard, PSPs, processors, internal APIs, and demo providers.
- Developer portal metadata, OpenAPI endpoint, API key fingerprints, webhook event list, and sandbox request example.
- Lawful OSINT workflow with case reference, lawful basis, permission level, audit logging, evidence quality, and privacy safeguards.
- Prisma models and migration for tenants, integrations, API keys, monitored transactions, evidence, and OSINT searches.
