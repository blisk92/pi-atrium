# Progress

## Status
In Progress

## Tasks
- [x] Round 1: DevOps grill questions drafted
- [x] Round 1: QA grill questions drafted

## Files Changed
- progress.md — updated with round 1 contribution

## Notes

### Team Grill: Attendora — Round 1 (DevOps / The Captain)

Role: The Captain (DevOps). Reviewed the approved PRD (1.1, 112 ACs, MEVN per-node Docker Compose, RSA-2048 ephemeral keys, offline-first local MongoDB cache, configurable external API integration).

**4 questions raised:**

1. **Secrets & key lifecycle** — PRD names 5+ secret classes (server RSA-2048 priv, ephemeral client pub keys, JWT signing, external API bearer tokens, archive encryption keys) but defines no key management plan: no generation location, storage, rotation, escrow, or recovery. Bootstrapping and disaster story are undefined.
2. **Per-node deployment & update** — 100 independent Docker Compose stacks with no inter-node comm. No CI/CD, no image pipeline, no config-push, no update procedure in the PRD. Security patch / schema migration / new attendee type — all undefined rollout.
3. **Backup / DR for offline-first per-node MongoDB** — Node death mid-event = data loss. "No inter-node comms" actively prevents recovery. No backup story in PRD.
4. **Operator-side observability** — AC-61 is UI-only. Across 100 nodes, ops visibility (print failures, sync queue depth, cache staleness, MongoDB capacity, audit log forwarding) is undefined.

These all share a pattern: the PRD defines what runs inside a node, but the operational story across nodes is empty. PRD needs an "operations" section (or ADRs) covering: secrets/keys, deployment/update, DR, observability. These are foundational — design concepts and build waves will bake them in by default if not addressed now.

### Team Grill: Attendora — Round 1 (QA / Marshall)

Role: Marshall (QA). Reviewed the approved PRD (1.1, 112 ACs, MEVN per-node Docker Compose, RSA-2048 ephemeral keys, offline-first local MongoDB cache, configurable external API integration, Zebra ZD421 badge printing, audit + chat via WebSocket).

**4 questions raised:**

1. **Offline sync one-by-one replay safety** (AC-59, AC-60, AC-62, AC-63) — Bulk sync iterates one-by-one per attendee. What's the contract when the worker crashes mid-replay, the network drops between records, or the external API returns 200 with a stale/conflicting state? Need idempotency key, exponential backoff with max attempts, a "claimed but unconfirmed" state in MongoDB, and a deterministic resume that never re-submits an already-synced record. Single most important code path in the system — losing or duplicating a check-in has direct operational and trust consequences.

2. **Type code recompute contract under partial edits** (AC-23, AC-34, AC-36, AC-98) — AC-34 says type code is "computed at print time from current MongoDB values (not pre-stored)" but AC-36 says it "updates automatically when underlying data changes". If a staff edit leaves any of the 4 source fields (tier / lanyard color / LOB / meeting status) temporarily null or stale (e.g., meeting status is fetched async and not yet refreshed), does the type code silently degrade to a partial/abbreviated form, or does the print fail loudly? What's the recompute contract, and how is "stale source data" distinguished from "intentionally absent"?

3. **Mapping engine runtime safety** (AC-82, AC-83, AC-108) — Conditional mapping supports IF/THEN chains, delimiter splits, and regex extraction. AC-83's "Test connection" validates a mapping once, but rules fire per-attendee at scale (1000+ records). What guards exist against regex backtracking / catastrophic backtracking on organizer-supplied patterns, IF/THEN chain non-termination, and per-rule silent failure that produces wrong data instead of an error? Need a regex timeout, chain step limit, and per-batch error budget before the sync aborts and flags the rule for organizer review.

4. **Audit log volume, retention, and queryability** (AC-92 → AC-104) — 13 ACs reference audit logging (scans, prints, edits, overrides, network events, chat messages). With 1000 attendees, multi-day events, and per-message chat logging, projected log volume per node is non-trivial. AC-104 says "accessible for post-event export" — accessible how, in what format, within what time window? Need a retention policy, log rotation strategy, indexed query plan for post-hoc investigation ("show all type-code overrides during hour 14 of day 2"), and a path to ship logs to long-term storage before node decommission. Right now the audit story is "log everything" with no lifecycle — that will fill MongoDB and become a write-throughput bottleneck before the first event ends.

Pattern across the four: PRD describes a system that runs inside a node, but the *failure / recovery / scale* contracts are mostly aspirational. Design phase needs explicit failure-mode specs (sync replay, recompute, mapping safety, log lifecycle) before build waves can write acceptance tests against them.
