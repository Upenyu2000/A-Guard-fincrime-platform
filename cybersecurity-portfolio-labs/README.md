# Cybersecurity Portfolio Labs

A collection of five defensive-security projects designed to demonstrate practical SOC, detection engineering, incident response, cloud security, Active Directory security, and SOAR automation skills.

> **Authorised-lab use only:** All attack simulation steps are written for isolated virtual machines, synthetic accounts, and resources owned by the learner. Never run them against third-party systems or production environments.

## Projects

| Project | Core stack | Portfolio outcome |
|---|---|---|
| [SIEM Detection Lab](./01-siem-detection-lab/) | Wazuh, Sysmon, Kali Linux | Build a mini SOC, generate authentication telemetry, create a custom rule, and visualise successful versus failed logons. |
| [Active Directory Attack & Defence Lab](./02-active-directory-lab/) | Windows Server, BloodHound, Mimikatz | Deploy a domain, map attack paths, emulate Kerberoasting and pass-the-hash in a sandbox, and hunt the resulting events. |
| [Phishing Analysis](./03-phishing-analysis/) | MXToolbox, VirusTotal, PhishTank | Triage headers and indicators, defang artefacts, assess impact, and produce an incident report. |
| [Cloud Security Monitoring](./04-cloud-security-monitoring/) | Azure, Microsoft Sentinel, Defender for Cloud | Detect an intentionally exposed blob container and automatically restore a secure configuration. |
| [SOC Automation](./05-soc-automation/) | Shuffle SOAR, TheHive, VirusTotal API | Receive an alert, enrich IOCs, score the result, create a case, and notify responders. |

## Suggested evidence for GitHub

For each project, add only sanitised screenshots:

1. Architecture or network diagram.
2. Deployment health screen.
3. Generated test event.
4. Detection alert or enriched incident.
5. Dashboard, timeline, or case ticket.
6. A short lessons-learned note explaining tuning decisions and false-positive handling.

Do not commit passwords, tokens, tenant IDs, real email samples, customer information, hashes from live incidents, or screenshots containing personal data.
