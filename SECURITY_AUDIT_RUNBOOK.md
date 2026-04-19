# Security Audit Trail Runbook

Date: 2026-04-19
Scope: Server-side audit trail events for admin and release/reporting actions

## What This Covers

This runbook covers:
1. Audit sink file rotation behavior
2. Disk growth expectations and controls
3. Incident retrieval workflow for investigations

## Audit Sink Behavior

The server writes audit events to two sinks:
1. In-memory rolling list for API access through the admin endpoint
2. Persistent JSONL files for durable local retention

Persistent files are written by date using this naming pattern:
- audit-YYYY-MM-DD.jsonl

Default retention behavior:
- Keep the newest 14 daily files
- Delete older files automatically after each write when max file count is exceeded

Primary configuration variables:
- AUDIT_SINK_ENABLED
- AUDIT_SINK_DIR
- AUDIT_SINK_MAX_FILES
- AUDIT_TRAIL_MAX_ENTRIES

## Rotation and Retention Operations

Daily rotation:
1. Rotation is date-based and automatic.
2. A new daily file is created when the date changes.
3. Old files are pruned automatically based on AUDIT_SINK_MAX_FILES.

Operational checks:
1. Confirm sink is enabled in server/.env.
2. Confirm sink directory exists and is writable by the service user.
3. Confirm daily file appears after an auditable action is performed.

Manual retention tuning:
1. Increase AUDIT_SINK_MAX_FILES for longer retention.
2. Decrease AUDIT_SINK_MAX_FILES to reduce disk consumption.
3. Restart server after changing environment values.

## Disk Growth Guidance

Capacity estimate formula:
Estimated Disk Usage = Average Events Per Day x Average Event Size x Retained Days

Quick sizing baseline:
1. Typical sanitized JSONL event: about 0.5 KB to 2 KB
2. 10,000 events/day for 14 days at 1 KB average: about 140 MB

Monitoring steps:
1. Track file count and total size in audit sink directory daily.
2. Alert when directory exceeds local threshold (example: 500 MB).
3. Adjust retention or archive older files externally if needed.

Risk controls:
1. Keep sensitive values redacted in details payloads.
2. Limit retained days to operational and compliance requirements.
3. Restrict file system permissions on audit sink directory.

## Incident Retrieval Workflow

When investigating suspicious admin/release actions:

1. Capture incident window
- Determine start and end time in UTC.
- Identify relevant actor role, endpoint, or request ID if known.

2. Pull recent API-level audit view
- Query admin audit endpoint first for quick triage.
- Focus on action, actorRole, statusCode, outcome, requestId, timestamp.

3. Pull durable JSONL evidence
- Read daily audit files from AUDIT_SINK_DIR for the incident dates.
- Filter by timestamp, requestId, actorRole, action, and statusCode.

4. Correlate with application logs
- Match requestId between audit records and server logs.
- Confirm outcome and error conditions.

5. Create investigation package
- Include filtered audit JSONL lines.
- Include correlated server log excerpts.
- Include timeline and conclusion summary.

6. Post-incident follow-up
- Add new detection rules if needed.
- Tune abuse limits or role protections if abuse pattern is confirmed.
- Record remediation actions and approval evidence.

## Quick Triage Queries

Examples below assume shell access in project root and audit files in server/audit.

Find all failed admin actions in a day:
- grep '"action":"admin\.' server/audit/audit-YYYY-MM-DD.jsonl | grep '"outcome":"failure"'

Find events for a specific request ID:
- grep 'REQUEST_ID_VALUE' server/audit/audit-YYYY-MM-DD.jsonl

Count events by action:
- awk -F'"action":"' '{print $2}' server/audit/audit-YYYY-MM-DD.jsonl | awk -F'"' 'NF>1 {print $1}' | sort | uniq -c | sort -nr

## Validation Checklist

1. AUDIT_SINK_ENABLED is true in active environment.
2. AUDIT_SINK_DIR has expected daily files.
3. File count does not exceed AUDIT_SINK_MAX_FILES.
4. Admin endpoint returns recent entries.
5. At least one requestId can be correlated between audit entries and server logs.

## Ownership

Recommended owner: Backend or Platform engineer responsible for operational security and release governance.
