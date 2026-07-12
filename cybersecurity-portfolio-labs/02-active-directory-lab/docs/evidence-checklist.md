# Evidence Checklist

- Domain topology diagram.
- Successful `dcdiag` summary.
- Sanitised AD Users and Computers view.
- BloodHound graph showing the deliberately created edge.
- Event 4769 sample with sensitive fields redacted.
- Sysmon 10 event showing a synthetic process-access test.
- Timeline correlating authentication and process activity.
- Remediation comparison showing the path before and after control changes.

Never commit BloodHound collection ZIPs, credential hashes, tickets, secrets, or full EVTX exports.
