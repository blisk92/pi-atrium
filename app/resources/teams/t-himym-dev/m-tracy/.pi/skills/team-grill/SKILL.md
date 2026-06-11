---
name: team-grill
description: Full-team Socratic grill session. The entire team (Ted, Robin, Barney, Marshall, Lily, Captain, Patrice) grills the user through Tracy, the PM. Questions are aggregated and asked one at a time. Consensus is reached between Tracy and Ted, with full-team escalation for tiebreakers. Use when you want to stress-test a plan, design, or decision against every angle of team expertise.
---

# Team Grill

A multi-perspective Socratic grill session where the **whole pi team** chips in to grill you.

The team:

| Role | Name | Domain |
|------|------|--------|
| 🏗️ Architect | **Ted** | System architecture, tradeoffs, tech stack, ADR-worthy decisions |
| 🔧 Backend | **Robin** | API design, data models, service boundaries, error handling, performance |
| 🎨 Frontend | **Barney** | UI components, state management, responsive design, accessibility |
| 🧪 QA | **Marshall** | Test strategy, edge cases, testability, CI test pipeline |
| 👤 UAT | **Lily** | User flows, acceptance criteria, E2E scenarios, usability |
| 🚢 DevOps | **Captain** | Deployment, infrastructure, monitoring, scaling |
| 📝 Docs | **Patrice** | Documentation needs, API docs, changelog, onboarding |

---

## How It Works — Step by Step

### 1. Start

The user sets a topic. Example prompts:

> *"Grill me on my auth system design"*
> *"/skill:team-grill I'm planning a microservices migration"*
> *"Run a team grill on this PRD"*

You acknowledge the topic and initialize the session.

### 2. Initialize the Checkpoint

Create a shared-understanding checkpoint. Store it as a running Markdown document throughout the session. Start with:

```markdown
# Team Grill: <Topic>

## Participants
- ✅ Tracy (PM / coordinator)
- ⏳ Ted (architect)
- ⏳ Robin (backend)
- ⏳ Barney (frontend)
- ⏳ Marshall (QA)
- ⏳ Lily (UAT)
- ⏳ Captain (DevOps)
- ⏳ Patrice (docs)

## Decisions (unanimous ✓)

| # | Decision | Rationale | Raised By | Status |
|---|----------|-----------|-----------|--------|

## Open Questions / Pending Consensus

| # | Question | Raised By | Status |
|---|----------|-----------|--------|

## Risks / Unknowns

## Session Artifacts
```

### 3. Call the Team

Ping every teammate via `intercom` using **`ask`** (blocking, with 10-minute timeout) with the same briefing:

```
To: <teammate>
Message: "Team grill session starting on '<topic>'. 
I need you to review the topic and send me your top 2-4 questions 
from your domain. One question at a time — I'll feed them to the 
user sequentially and loop back for follow-ups. Please reply with 
your questions."

Attachments: [include any relevant context — plan, PRD, code, etc.]
```

Send `ask` to: `Ted`, `Robin`, `Barney`, `Marshall`, `Lily`, `Captain`, `Patrice`

**Important:** Use `ask` (not `send`) so you actually block and wait for real replies from teammates. The `ask` command has a 10-minute timeout.

#### Teammate unavailable

If a teammate's `ask` **times out** (no response within 10 minutes), or if the intercom session name is not found, note them as unavailable and move on. Proceed to collect questions from remaining teammates.

### 4. Aggregate & Prioritize

Once all questions are collected from intercom replies:

1. **Deduplicate** — remove identical or overlapping questions
2. **Categorize** — group by domain (architecture, backend, frontend, QA, UAT, DevOps, docs)
3. **Prioritize** — architecture/design questions first, then implementation details, then testing/docs
4. **Sequence** — make sure dependent questions come after their prerequisites

Present the question plan to the user:

> *"I've gathered X questions from the team across all domains. I'll ask them one at a time. Ready to start?"*

### 5. Grill — One Question at a Time

Ask questions **one per turn**. For each question:

1. Announce who raised it: *"From Ted (Architecture): ..."*
2. Provide **2-4 answer alternatives** (like grill-me's Tab autocomplete)
3. Mark your recommended answer
4. Wait for the user's response

Example:

> **From Barney (Frontend):** How should we handle loading states in the data table — skeleton loaders, spinners, or optimistic rendering?
>
> *Tab alternatives:*
> - **Skeleton loaders** (recommended) — matches our design system, good for known layout
> - Spinners — simpler but worse perceived performance
> - Optimistic rendering — best UX but needs careful error handling

### 6. Iterate

After each answer:

1. **Update the checkpoint** with the decision
2. **Broadcast the answer** to the team via intercom:
   > *"Update: User answered Q1 from Barney: chosen skeleton loaders. Any follow-up questions from your domain based on this answer?"*
3. Collect any follow-up questions
4. Insert them into the queue
5. Ask the next question

This is the **iteration loop** — one answer unlocks new questions from other domains. Keep looping until no teammate has further questions.

### 7. Consensus Phase

When all questions are exhausted (no more follow-ups from any teammate):

**Tracy + Ted deliberate** for unanimous consensus:

1. Review the full checkpoint together
2. Discuss any remaining ambiguity, tradeoffs, or risks
3. **For each decision**, confirm: is Tracy and Ted in unanimous agreement?
4. If **unanimous on all decisions** → mark as ✅ and proceed to output

#### Deadlock Resolution

If Tracy and Ted **cannot reach unanimous consensus** on a decision:

1. Escalate to the **full team** — ping everyone:
   > *"Deadlock on [decision]. Ted says [X], Tracy says [Y]. Team vote needed. What's your take?"*
2. Collect votes
3. Discuss until **unanimous** — iterate, refine, compromise
4. Document the resolution path in the checkpoint:
   > *"Consensus reached after 2 rounds of team debate. Original positions: Ted argued for X due to Y. Tracy argued for A due to B. After team input from Robin (data shows Z) and Marshall (testing concerns), the group converged on C."*

### 8. Documentation Phase

Once unanimous consensus is reached on all decisions:

**Checkpoint is finalized** — produce the session artifacts:

1. **Decision Log** — full table of all decisions, rationale, who raised them
2. **ADRs** (sparingly) — only when ALL of:
   - Hard to reverse
   - Surprising without context
   - Result of a real tradeoff with genuine alternatives
3. **Summary Artifact** — choose output format(s):

| Format | When |
|--------|------|
| PRD updates | Product-level decisions |
| ADR doc(s) | Architecture decisions |
| GitHub issues | Actionable tasks |
| Design doc | Full design capture |
| README update | Decisions affecting users |
| Test plan / QA checklist | Testing decisions |
| Implementation plan | Engineering roadmap |
| Research brief | Open unknowns to investigate |
| Changelog / release notes | Release-impacting decisions |

Ask the user which output(s) they want. Produce them one at a time.

---

## Skill Flow Diagram

```
User sets topic
      │
      ▼
Tracy initializes checkpoint
      │
      ▼
Tracy pings team via intercom (10m timeout)
      │
      ├── Online → collects questions
      └── Offline → note as unavailable, move to next teammate
      │
      ▼
Tracy aggregates, deduplicates, prioritizes
      │
      ▼
┌─────────────────────────────────────┐
│  GRILL LOOP (one question at a time) │
│                                     │
│  Ask question → User answers        │
│       │                             │
│       ▼                             │
│  Update checkpoint                  │
│       │                             │
│       ▼                             │
│  Broadcast answer to team           │
│       │                             │
│       ▼                             │
│  Collect follow-ups → new queue     │
│       │                             │
│       ▼                             │
│  Any questions left? ──yes──┐       │
│       │                     │       │
│       no                    │       │
└───────┬─────────────────────┘       │
        │                             │
        ▼                             │
┌──────────────────┐                  │
│  CONSENSUS PHASE │                  │
│                  │                  │
│  Tracy + Ted     │                  │
│  deliberate      │                  │
│       │          │                  │
│       ▼          │                  │
│  Unanimous? ──no──→ Full team vote  │
│       │          │       │          │
│       yes        │       ▼          │
│       │          │  Unanimous? ──no─┘
│       ▼          │       │          │
│  Finalize        │       yes        │
│  checkpoint      │                  │
└──────────────────┘                  │
        │                             │
        ▼                             │
Select output(s) → Produce artifacts
        │
        ▼
Session complete ✅
```

---

## Consensus Rules Summary

| Situation | Who decides | Threshold |
|-----------|-------------|-----------|
| Standard deliberation | Tracy + Ted | Unanimous |
| Tracy + Ted deadlock | Full team vote | Unanimous (iterate until reached) |

---

## Documentation Rules

### Live Checkpoint
- Update after **every** user answer
- Track: decisions, open questions, risks, team perspectives
- Always show the latest checkpoint when asked

### Decision Log
- Captures: decision, rationale, raiser, consensus path
- Includes dissenting views and how they were resolved

### ADR Rule
Only create an ADR when **all three** are true:
1. **Hard to reverse** — changing your mind later costs meaningful effort
2. **Surprising without context** — a future reader will wonder "why?"
3. **Real tradeoff** — genuine alternatives with pros/cons

If any is missing, skip the ADR and just log the decision.

---

## User Commands During a Session

The user can interject at any time:

| Command | Effect |
|---------|--------|
| `status` | Show current checkpoint |
| `skip` | Skip current question, move to next |
| `branch <question>` | Explore a tangent question before continuing |
| `pause` | Pause the session (save checkpoint, dismiss team) |
| `resume` | Resume a paused session |
| `stop` | End the session, keep checkpoint as-is |

---

## Session Persistence

Save the checkpoint as a Markdown note in Obsidian at the end of each session for later reference.

Path: `Projects/Team Grills/<topic-slug>.md`

Include:
- Date, participants, topic
- Full decision log
- Artifacts produced
- Follow-up items
