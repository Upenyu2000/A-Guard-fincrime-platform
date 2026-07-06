# Compliance Controls

African Guard is designed for regulated fraud, AML, and investigation workflows. The local build includes controls and documentation surfaces; production deployments must bind them to the organisation's policies, regulators, and approved providers.

## GDPR and Data Protection

- Tenant isolation keys separate organisation data.
- OSINT searches require case ID, lawful basis, purpose, investigator ID, permission level, timestamp, and queried sources.
- Uncertain matches are labelled `needs_verification` and require human review before action.
- Data minimisation rules prohibit raw API key storage and encourage hashed identifiers in consortium payloads.
- Retention periods are modelled per data class and tenant.

## Open Banking

- Open Banking connectors support OAuth2, consent IDs, mTLS certificate fingerprints, and signed webhooks.
- Account and transaction access should only be enabled where legally available and with valid consent or lawful authority.
- Consent revocation is represented as a webhook event.

## PCI DSS Scope Considerations

- Card integrations are modelled around token references, authorization metadata, and dispute evidence.
- PAN and CVV storage are intentionally excluded from the domain model.
- Network adapters should be deployed in segmented environments with provider-approved controls.

## AML and Fraud Controls

- Real-time scoring supports pre-authorization decisions where rails allow it.
- Post-transaction monitoring supports case creation, recall workflows, evidence timelines, SAR/STR drafts, and escalation.
- Human-in-the-loop approvals govern high-risk agent actions and rule changes.

## User Access Governance

- Roles include Admin, Investigator, Analyst, Reviewer, Auditor, Developer, Compliance Officer, and Institution Partner.
- MFA status, scopes, permissions, and audit events are represented in the platform data model.
- Audit export includes a hash for chain-of-custody verification.

## OSINT and Public Web Restrictions

- The platform must use only approved, lawful, permissioned, public, licensed, or internally authorised data sources.
- It must not bypass privacy settings, private accounts, passwords, paywalls, platform restrictions, or security controls.
- Evidence capture stores timestamp, URL where available, hash, quality, and chain-of-custody metadata.
