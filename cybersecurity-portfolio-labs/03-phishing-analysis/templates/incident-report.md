# Phishing Incident Report

## 1. Case details

| Field | Value |
|---|---|
| Case ID | |
| Analyst | |
| Date/time opened (UTC) | |
| Date/time closed (UTC) | |
| Reporter | |
| Affected user(s) | |
| Severity | |
| Status | |

## 2. Executive summary

State what was reported, the analyst’s conclusion, whether user interaction occurred, the affected scope, and the most important actions taken. Keep this section understandable to a non-technical reader.

## 3. Initial report

- Subject:
- Displayed sender:
- Envelope sender / Return-Path:
- Reply-To:
- Recipient(s):
- Delivery time:
- User-reported actions:
- Attachment(s):
- URL count:
- Original-message SHA-256:

## 4. Header findings

### Routing

Describe the trusted mail path and source IP. Explain which `Received` hop is trusted and why.

### Authentication

| Control | Result | Alignment | Interpretation |
|---|---|---|---|
| SPF | | | |
| DKIM | | | |
| DMARC | | | |

### Anomalies

Record sender-domain impersonation, Reply-To mismatch, Message-ID mismatch, timestamp issues, or other suspicious features.

## 5. Indicator enrichment

| Type | Defanged indicator | Source | Result | Checked at (UTC) | Confidence |
|---|---|---|---|---|---|
| Domain | | VirusTotal | | | |
| URL | | PhishTank | | | |
| IP | | MXToolbox | | | |
| SHA-256 | | VirusTotal | | | |

## 6. Content and social-engineering analysis

- Impersonated brand or person:
- Claimed urgency or consequence:
- Requested action:
- Credential, payment, attachment, QR, callback, or MFA lure:
- Language or visual inconsistencies:
- Likely objective:

## 7. Scope and impact

- Number of recipients:
- Messages delivered / blocked / quarantined:
- Clicks:
- Credential submissions:
- Attachments opened:
- Suspicious sign-ins:
- Mailbox or MFA changes:
- Endpoint alerts:
- Confirmed impact:

## 8. Assessment

### Observed facts

List only directly supported evidence.

### Analyst assessment

Explain the conclusion, confidence, likely attack objective, and unresolved uncertainty.

### MITRE ATT&CK mapping

| Tactic | Technique | Evidence |
|---|---|---|
| Initial Access | T1566 Phishing | |

## 9. Response actions

| Action | Owner | Status | Time completed |
|---|---|---|---|
| Quarantine or purge messages | | | |
| Block malicious artefacts | | | |
| Reset credentials / revoke sessions | | | |
| Review MFA, OAuth and mailbox rules | | | |
| Isolate or scan endpoint | | | |
| Notify affected users | | | |

## 10. Recommendations

Prioritise durable controls such as mail-authentication enforcement, safe-link and attachment controls, user reporting mechanisms, identity monitoring, conditional access, and detection rules.

## 11. Evidence register

| Evidence ID | Description | Hash / reference | Storage location |
|---|---|---|---|
| E-001 | Original email | | |
| E-002 | Header-analysis screenshot | | |
| E-003 | IOC enrichment export | | |

## 12. Closure

- Containment verified:
- Recovery verified:
- Monitoring period:
- Residual risk:
- Lessons learned:
- Closure approval:
