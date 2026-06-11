# Ted's Architecture Findings — Attendora Team Grill Round 1

**Grill topic:** Full PRD stress test (scope: everything)
**Raiser:** Ted (architect)
**Round:** 1 of N — questions raised, awaiting user answers

---

## Q1. The "RSA-2048 encrypted communication" model is incomplete

**Question:** RSA-2048 is a public-key algorithm — it cannot encrypt bulk traffic efficiently (~245-byte block cap, CPU-intensive). What is the **actual symmetric cipher** used to encrypt request/response bodies and WebSocket frames, and where does the per-session key live? Is this a hybrid scheme (RSA-wrapped AES session key) or RSA-padding every payload?

**Why this matters:** This is the central security claim of the system (frontend↔backend AND WebSocket). If unspecified, implementations will diverge, padding-oracle attacks become possible, and there's no working threat model. Either spec the hybrid scheme properly or replace with TLS at the reverse proxy.

---

## Q2. Per-node MongoDB with no inter-node comms creates unsynced islands

**Question:** Each kiosk/manned station runs its own MongoDB with no inter-node communication. The **Live Chat (AC-66–77)** and **Walk-In Approval (AC-50–54)** features both require cross-node awareness. How does a walk-in created on Station A reach the organizer on Station B? How do chat messages route across nodes? Are these features scoped to a single station, and if so, is that the intended UX?

**Why this matters:** Either the "no inter-node comms" constraint needs to be relaxed (e.g., add an optional central coordination service for chat/notifications), or several PRD features don't work as written. This is a fundamental architectural choice, not an implementation detail.

---

## Q3. The offline sync engine is critically underspec

**Question:** AC-62 mandates one-at-a-time iteration through pending check-ins ("not a single bulk POST"). At ~100ms/call, 1,000 pending records = 100s minimum, longer under retries. What is the **retry policy** (backoff? max attempts?), **rate-limit handling** (what if the external API throttles mid-sync?), and **conflict resolution workflow** (AC-63 says "latest timestamp wins" — what about simultaneous writes from two offline nodes)?

**Why this matters:** This is the part that runs when things are already going wrong. A 5% partial-failure rate on a 1,000-attendee sync = 50 stuck records with no specified remediation. Needs a real spec, not a hand-wave.

---

## Q4. Where do secrets actually live, and how do they rotate?

**Question:** The PRD references (a) server-side RSA-2048 private keys, (b) bearer tokens for the external registration API (encrypted in MongoDB per AC-81), (c) MongoDB encryption keys for archived events (AC-05), and (d) JWT signing keys. **Where does each live at runtime and at rest? How is key material provisioned per-node? What's the rotation policy? If a kiosk disk is imaged, what's exposed?**

**Why this matters:** A per-node Docker stack implies each node generates or receives its own key material. The PRD never specifies provisioning, rotation, or compromise-recovery. In an offline-first system that may run for days with stale keys, this is a real attack surface.

---

## Likely round-2 follow-ups

After the user answers Q1–Q4, the following second-order questions are likely to surface:
- **Q1 answer** → forces a TLS-vs-hybrid-encryption ADR
- **Q2 answer** → likely re-architects chat and walk-in notification flows
- **Q3 answer** → likely needs a sync state-machine ADR
- **Q4 answer** → likely needs a secrets-management ADR + per-node bootstrap procedure
