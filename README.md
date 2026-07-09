# A-Guard

A-Guard is a financial crime defence platform built to help financial institutions detect, investigate, and prevent fraud, money laundering, and related financial risks.

The platform combines real-time transaction monitoring, behavioural analytics, identity graph intelligence, automated risk scoring, and collaborative investigation workflows. It provides investigators with live alerts, case management, payment tracking, AML screening, explainable risk insights, and Financial Crime Copilot capabilities.

A-Guard delivers a unified operational view that strengthens fraud prevention, regulatory compliance, investigative efficiency, and institutional collaboration.

## Core Capabilities

- Real-time fraud and transaction monitoring
- Automated and explainable risk scoring
- Behavioural and anomaly analysis
- AML, sanctions, PEP, and adverse-media screening
- Identity graph and relationship intelligence
- Payment route and beneficiary-risk analysis
- Investigation case management and evidence tracking
- Suspicious Activity Report preparation
- Live WebSocket alerts and operational updates
- Analyst feedback and continuous model improvement

## Platform Architecture

A-Guard is structured as a production-oriented monorepo:

- `apps/web` — Next.js operating console built with TypeScript, Tailwind CSS, Framer Motion, Zustand, and React Query.
- `services/api` — NestJS API and WebSocket gateway providing fraud scoring, payment tracking, case management, intelligence sharing, graph-risk analysis, RBAC, rate limiting, and audit controls.
- `services/ai` — Internal A-Guard Risk Analysis Service supporting hybrid scoring, explainability, investigation summaries, SAR preparation, drift monitoring, and analyst feedback.
- `infra/k8s` — Kubernetes deployment manifests for containerised environments.
- `docs` — Architecture, security, and implementation documentation.

## How It Works

1. Transaction, login, device, account, and beneficiary events enter the NestJS API.
2. The fraud engine evaluates deterministic rules, behavioural profiles, anomaly signals, graph relationships, AML indicators, and consortium intelligence.
3. High-risk events generate live alerts and may automatically create investigation cases.
4. Investigators review the shared operating picture across fraud, AML, payments, identity networks, cases, and Financial Crime Copilot workspaces.
5. Analyst decisions and investigation outcomes are captured to support model monitoring and continuous improvement.

## Local Development

### Install dependencies

```bash
npm ci

python -m venv .venv
.venv\Scripts\activate
pip install -r services/ai/requirements.txt
