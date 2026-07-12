# Active Directory Event-Hunting Matrix

| Technique | Primary telemetry | Pivot fields | Detection idea |
|---|---|---|---|
| Kerberoasting | Security 4769 | TargetUserName, ServiceName, IpAddress, TicketEncryptionType | High count of service tickets, many SPNs per requester, RC4 use, unusual source. |
| Credential dumping | Sysmon 10, Security 4688 | SourceImage, TargetImage, GrantedAccess, CommandLine | Non-standard process accesses `lsass.exe`; suspicious process tree. |
| Pass-the-hash | 4624, 4648, 4672, 4776 | LogonId, AuthenticationPackageName, WorkstationName, IpAddress | NTLM network logon from an unusual source followed by privileged activity. |
| Remote share access | 5140, 5145 | SubjectLogonId, ShareName, RelativeTargetName | Administrative share access after suspicious NTLM logon. |
| Group modification | 4728, 4732, 4756 | MemberName, TargetUserName, SubjectUserName | Unexpected privileged-group membership change. |
| Account creation | 4720 | TargetUserName, SubjectUserName | New account created outside change window or by unusual operator. |

## Correlation keys

Use `Logon ID` / `SubjectLogonId`, source address, account name, hostname, and a narrow time window to join events. Avoid treating a single NTLM or 4769 event as malicious without context.
