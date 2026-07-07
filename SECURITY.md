# Security Policy

African Guard is under active production hardening. Do not process live financial, identity, investigation, or customer data until the production-readiness checklist has passed.

## Private reporting

Report security concerns privately to the repository owner through an approved organisational security channel. Do not place exploit details, credentials, personal data, or production configuration in public issues.

A useful report includes the affected component, version, reproduction steps, impact, and a suggested remediation where known.

## Release blockers

A release must be blocked when authentication can be bypassed, tenant isolation fails, secrets are exposed, signed webhooks are not verified, WebSockets are not tenant-isolated, model artifacts are unverified, or critical security findings remain open.

## Secrets

Never commit access tokens, API keys, bank credentials, certificates, signing secrets, encryption keys, database passwords, or production environment files. Production secrets must be supplied through an approved managed secret system and rotated.
