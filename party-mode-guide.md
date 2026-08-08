# Party Mode — Usage Guide

**Stop making critical product decisions with a single perspective.**

---

## What Is Party Mode?

Party Mode is an AI skill that simulates a **real expert roundtable** around your product decisions. Not a pros/cons list. Not a "here are 5 options" answer. A room of 17 product and engineering experts who argue, challenge your assumptions, cite real data, and push toward a decision you can defend.

**The value:** Before you commit months of engineering time or make an irreversible strategic bet, you get the benefit of a multi-disciplinary team debate — in minutes, not weeks of scheduling.

**Who it's for:** Product managers, founders, tech leads, and anyone making decisions where being wrong is expensive.

---

## Why Single-Perspective Decisions Fail

Every product team has been burned by a decision that looked right from one angle:

- **Tech selection**: Chose the "hot" framework, discovered maintenance costs 6 months later
- **Business model**: Optimized for growth, ignored unit economics until the burn rate crisis
- **Architecture**: Built for today's scale, hit a wall at 10x growth with no clean migration path
- **Feature design**: Shipped what stakeholders asked for, not what users actually needed
- **Pricing**: Set based on competitor comparison, not on real willingness-to-pay data

Party Mode exists because these failures aren't caused by lack of intelligence — they're caused by **lack of perspective diversity**. One mind, no matter how smart, has blind spots. A room of experts with different incentives and expertise catches them before they become expensive.

---

## The 17 Expert Roles

Each role has distinct expertise, thinking patterns, and communication style. They're not generic "optimist/pessimist" — they're specific professional lenses.

### Engineering & Architecture

| Role | Expertise | Typical Question |
|------|-----------|------------------|
| 🔒 **Vex** | Security Engineer | "What if every input is malicious?" |
| 😤 **Grumbal** | The Adversary | "What breaks at 3am on a Saturday?" |
| 🌶️ **Boundary** | Edge-Case Hunter | "What happens with 10M concurrent requests?" |
| 🎯 **Yui** | The Craftsman | "Will the next team understand this in 2 years?" |
| 🏗️ **Forge** | Engineering Delivery Lead | "Is this choice reversible? What's the migration cost?" |

### Product & Commercialization

| Role | Expertise | Typical Question |
|------|-----------|------------------|
| 📋 **Alex** | Product Expert | "What problem does this solve? What happens if we don't build it?" |
| 🧑‍💼 **Ren** | Customer Voice | "Have you watched a real user try to do this?" |
| 💰 **Cai** | Monetization Strategist | "Show me the unit economics. Where's the money?" |
| 🔬 **Tao** | Validation Engineer | "What's the riskiest assumption? Can we test it in 2 days?" |
| 🪞 **Mirror** | UX Expert | "Where does the user hesitate? Where's the dead end?" |

### Strategy & Decision-Making

| Role | Expertise | Typical Question |
|------|-----------|------------------|
| 🏰 **Wei** | Moat Architect | "If your only advantage is being first, you don't have a moat" |
| 🔭 **Noa** | The Visionary | "What does winning look like in 5 years?" |
| 🃏 **Wildcard** | Option Generator | "What if we approached this completely differently?" |
| 📏 **Level** | Evidence Checker | "What's the data? What's missing? What would change the answer?" |
| 🪵 **Splinter** | Consensus Challenger | "Why do we all agree? What are we missing?" |
| 🛑 **Killjoy** | Loop Stopper | "Which unresolved question actually matters?" |
| 🚢 **Dana** | The Pragmatist | "Does this matter to users? Ship the 80%, archive the rest" |

---

## Core Scenarios & Examples

### Scenario 1: New Product Design (0→1 Validation)

**The situation:** You're considering building a new product. You have a hypothesis about the market, but you need to stress-test it before committing resources.

**What you'd say:**
```
/party-mode — We're thinking about building an AI-powered habit tracking app.
Target market: professionals 25-40 who want to build better routines.
Hypothesis: People will pay $8/month for AI-personalized habit coaching.
Competition: Streaks, Habitica, Fabulous. We think AI personalization is the differentiator.
Budget: $200K for MVP, 4-person team, 6-month runway.
```

**What happens in the room:**

The skill auto-selects the most relevant experts. You'll hear:

- **Cai** (Monetization) challenges the $8/month assumption: "Habit apps have notoriously low willingness-to-pay. The average health app ARPU is $2-4/month. What makes you think 2x that? Show me the validation data."
- **Ren** (Customer Voice) asks: "Have you talked to 20 professionals in your target demo? What specific pain point are they experiencing with existing apps? 'Better routines' is not a pain point — it's a wish."
- **Tao** (Validation) proposes: "Before you build anything, run a 2-week test: offer AI coaching via WhatsApp to 50 users at $8/month. If 5% convert, you have signal. If 0%, you saved $200K."
- **Wei** (Moat) warns: "AI personalization is not a moat. Every habit app will add GPT integration in 6 months. What's your actual defensible position? Is it a proprietary dataset? Network effects? Switching costs?"
- **Splinter** (Consensus Challenger) pushes back on the team's assumptions: "You're all assuming the market is 'professionals 25-40.' But the data shows habit app users skew younger (18-25). Are you solving for the wrong demographic?"

**The outcome:** Not a "here are pros and cons" list. A concrete recommendation: validate the willingness-to-pay first with a cheap experiment, reconsider the target demo, and identify a real moat before writing code.

**Why this matters:** Most product failures happen because teams build something nobody will pay for. Party Mode surfaces these questions *before* you spend 6 months and $200K.

---

### Scenario 2: Key Feature Design

**The situation:** You're designing a critical feature. The requirements seem clear, but you want to catch edge cases, UX issues, and technical risks before development starts.

**What you'd say:**
```
/party-mode — Review this feature design: We're adding real-time collaboration to our document editor.
Users can see each other's cursors, edit simultaneously, and leave inline comments.
Tech stack: React frontend, Node.js backend, currently using WebSockets for notifications.
Scale: ~5K concurrent users at peak, documents up to 500KB.
Timeline: 8 weeks to ship.
```

**What happens in the room:**

- **Forge** (Engineering Delivery) does the math: "8 weeks for real-time collab with a team that hasn't built CRDT or OT before? That's aggressive. The industry benchmark for a team learning conflict resolution algorithms is 12-16 weeks. Are you scoping this correctly?"
- **Boundary** (Edge Cases) stress-tests: "What happens when two users edit the same paragraph simultaneously at 5K concurrent users? WebSocket fan-out at that scale needs Redis pub/sub or you'll hit connection limits. Have you benchmarked your current WebSocket infrastructure?"
- **Mirror** (UX) walks through the user journey: "Real-time cursors are cool, but the real pain point is version confusion — 'whose change was this?' If you don't solve attribution and undo-per-user, the feature creates more problems than it solves."
- **Vex** (Security) finds a gap: "Inline comments can contain XSS payloads. If you're rendering user-generated HTML in the document, you need sanitization. Also, what's the permission model? Can a viewer leave comments? Can an editor delete someone else's comment?"
- **Dana** (Pragmatist) proposes a phased approach: "Ship cursor presence and inline comments in v1 (3 weeks). Full real-time co-editing in v2 (5 weeks). If v1 gets low adoption, you saved 5 weeks."

**The outcome:** A refined feature spec with phased delivery, identified technical risks (WebSocket scaling, conflict resolution), UX gaps (attribution, undo), and security requirements (XSS, permissions).

**Why this matters:** Feature reviews with a single reviewer miss 60% of edge cases. A multi-perspective review catches UX, security, scaling, and delivery risks in one session.

---

### Scenario 3: Technical Architecture Challenges

**The situation:** You're facing a high-stakes architectural decision. The choice is hard to reverse, affects the whole team, and has long-term implications.

**What you'd say:**
```
/party-mode — We need to decide: migrate from monolith to microservices, or stay monolith and optimize?
Current state: Django monolith, 3 years old, 150K lines of code, 12-person engineering team.
Pain points: Deploy takes 45 minutes, teams block each other on the main branch, scaling individual services is impossible.
Scale: 50K DAU, growing 20% month-over-month.
Constraints: Can't pause feature development for more than 2 weeks.
```

**What happens in the room:**

This is a **Tier 3 Deep Dive** discussion (high impact, hard to reverse, multiple stakeholders). The skill:
1. Creates a structured sub-topic board (deployment strategy, data migration, team topology, scaling priorities, risk mitigation)
2. Conducts pre-discussion research (latest benchmarks on monolith-to-microservices migration, case studies of similar-sized companies)
3. Runs 15-25 rounds of structured debate

Key arguments you'll hear:

- **Forge** (Engineering Delivery): "45-minute deploys with 12 engineers blocking each other — that's costing you roughly 2 engineering-days per week in wait time. But a full microservices migration for a 12-person team is a 6-12 month project. Have you considered the 'modular monolith' path? Clean module boundaries, still one deploy, but you can extract services incrementally."
- **Boundary** (Edge Cases): "At 20% MoM growth, you'll hit 150K DAU in 6 months. The monolith will struggle with that. But microservices at 12-person team means each service gets ~1 engineer. That's not enough for on-call rotation. You'll burn out your team."
- **Wei** (Moat): "Architecture is not your moat. Your moat is your product and user base. Don't over-invest in architecture for its own sake. What's the minimum architectural change that unblocks growth for the next 18 months?"
- **Yui** (Craftsman): "The real issue isn't monolith vs microservices — it's code modularity. If your monolith is a tangled mess, microservices just distribute the mess. Fix the module boundaries first, then decide on deployment topology."
- **Dana** (Pragmatist): "Here's what I'd do: 2-week spike on modularizing the 3 most-deployed services. Measure the impact on deploy time. If it's 50% better, keep going. If not, you know microservices aren't the answer."

**The outcome:** A phased migration plan (modular monolith first, extract services incrementally), concrete metrics to validate each phase, risk mitigation strategies, and a realistic timeline that doesn't require pausing feature development.

**Why this matters:** Architecture decisions are the most expensive mistakes in software. A bad choice locks you in for 2-5 years. Party Mode gives you the benefit of multiple experienced architects debating your specific constraints.

---

### Scenario 4: Product Roadmap & Strategy

**The situation:** You're planning the next 6-12 months of product development. Multiple competing priorities, limited resources, and high uncertainty about which bets will pay off.

**What you'd say:**
```
/party-mode — We need to prioritize our H2 roadmap.
Product: B2B SaaS for project management, 200 paying customers, $80K MRR.
Candidates:
1. Mobile app (top customer request, 30% of users access from phone)
2. AI-powered task prioritization (competitors are adding this)
3. Enterprise SSO & compliance (blocking 3 enterprise deals worth $15K MRR each)
4. API & integrations (Slack, Jira, GitHub — requested by power users)
5. Usage-based pricing (current flat pricing limits upsell potential)
Team: 8 engineers, 2 designers, 1 PM. 6-month window.
```

**What happens in the room:**

- **Cai** (Monetization) does the math first: "Enterprise SSO is blocking $45K in new MRR. That's 56% of current revenue. The ROI is immediate and de-risked. Mobile app is a 'nice to have' — users ask for it but won't pay more for it. AI features are table stakes in 12 months, not a differentiator."
- **Ren** (Customer Voice) pushes back: "30% of users access from mobile — that's not a 'nice to have,' that's a retention risk. If they can't manage tasks on the go, they'll churn to a mobile-first competitor. But is the mobile app the right solution, or is a responsive web app sufficient?"
- **Alex** (Product Expert) frames the priority: "Use the RICE framework. Enterprise SSO: 3 enterprise deals × $15K = $45K impact, 100% confidence, 2-month effort = highest score. Usage-based pricing: potential 30% MRR uplift on existing base, but 6-month effort and high execution risk. Mobile app: high user satisfaction impact, but hard to quantify in revenue."
- **Wei** (Moat) thinks long-term: "API & integrations create switching costs — once your workflow is connected to Slack, Jira, and GitHub, you don't leave. That's a real moat. AI features are not — every PM tool will have AI in 12 months. Invest in the integrations, not the AI hype."
- **Splinter** (Consensus Challenger) questions the framing: "You're treating these as independent choices. But usage-based pricing changes the incentive for everything else — it might make the mobile app a revenue driver, not just a retention play. Have you considered the sequencing effect?"

**The outcome:** A prioritized roadmap with clear reasoning: Enterprise SSO first (immediate revenue), API/integrations second (switching costs), usage-based pricing third (upsell potential), mobile app fourth (retention), AI features last (table stakes, not differentiator). Plus a sequencing strategy that accounts for dependencies.

**Why this matters:** Roadmap prioritization is where most PMs rely on gut feel or loudest-stakeholder-wins. Party Mode forces evidence-based prioritization with multiple professional lenses challenging each assumption.

---

### Scenario 5: Commercialization & Business Model

**The situation:** You need to make a fundamental business model decision. The choice affects pricing, go-to-market, growth strategy, and long-term defensibility.

**What you'd say:**
```
/party-mode — We're debating our go-to-market strategy for an AI writing tool.
Product: AI-powered long-form content generation (blog posts, reports, whitepapers).
Current model: Freemium, 50K free users, 1K paid at $20/month, $20K MRR.
Problem: Free-to-paid conversion is 2%, growth is slowing, CAC is $150.
Options we're considering:
A) Stay freemium, improve conversion with better onboarding
B) Switch to free trial (14-day), cut free tier
C) Move upmarket: enterprise plans at $200/month, sell to marketing teams
D) Open-source the core, sell hosted version (like GitLab model)
```

**What happens in the room:**

This is a **Tier 3 Deep Dive** — high impact, hard to reverse, affects the entire business. The room conducts thorough research and debate:

- **Cai** (Monetization) starts with unit economics: "Your current LTV is $20 × 12 months × 50% retention = $120. Your CAC is $150. You're losing $30 per customer. The freemium model is subsidizing growth you can't afford. Option B (free trial) would cut your user base by 80% but your CAC drops to ~$50 because you're not supporting 50K free users. The math works."
- **Ren** (Customer Voice) challenges: "Before you kill the free tier, understand why 50K people signed up. What job-to-beat brought them here? If you remove the free tier, you lose the learning loop — you won't know what features matter. The free tier is your product research engine, not just a cost center."
- **Wei** (Moat) evaluates each option: "Option A (improve conversion) has a ceiling — 2% to 4% is a band-aid. Option B (free trial) is a one-way door — you can't go back once you cut free users. Option C (enterprise) requires a completely different sales motion and product. Option D (open-source) is the most defensible long-term but takes 18-24 months to see revenue."
- **Tao** (Validation) proposes experiments: "Before committing to any option, run 3 tests: (1) Offer annual plans at $15/month to free users — measure uptake. (2) Create a fake 'enterprise' landing page — measure inbound. (3) Open-source a minimal version on GitHub — measure stars and community response. 2 weeks, $5K, and you'll have real data."
- **Noa** (Visionary) thinks about the 5-year outcome: "The AI writing tool market will be commoditized in 3 years. Every LLM provider will offer content generation. Your only defensible position is a proprietary dataset or workflow lock-in. Option D (open-source) builds community and dataset. Option C (enterprise) builds workflow lock-in. Options A and B are just pricing tweaks — they don't build a moat."

**The outcome:** A data-driven GTM recommendation with validation experiments before committing, a clear-eyed assessment of each option's long-term defensibility, and a phased approach (test enterprise demand while improving free-to-paid conversion, keep open-source as a 12-month strategic option).

**Why this matters:** Business model decisions are the highest-leverage choices a company makes. Getting it wrong means years of slow death. Party Mode gives you a multi-disciplinary team to stress-test every assumption before you commit.

---

## How It Works

### Dynamic Role Selection

You don't pick the experts. After you describe your topic, the skill automatically selects the 4-6 most relevant people based on each role's expertise domain. When the topic changes, the lineup changes too.

You can also use **preset rooms**:
- `code-review-crew` — Vex, Grumbal, Boundary, Yui, Dana (for code reviews)
- `anti-consensus-club` — Wildcard, Level, Killjoy, Splinter (for challenging assumptions)

```
/party-mode code-review-crew — review this code: [paste code]
/party-mode anti-consensus-club — We want to kill the free tier
```

### Three Tiers of Discussion Depth

| Tier | Rounds | When to Use | Example Topics |
|------|--------|-------------|----------------|
| **Tier 1** | 3-5 | Simple decisions, clear best practices | Button color, variable naming |
| **Tier 2** | 8-12 | Medium complexity, trade-offs involved | React vs Vue, pricing strategy |
| **Tier 3** | 15-25 | High impact, hard to reverse, multiple stakeholders | Architecture migration, business model change |

The skill assesses complexity across 5 dimensions (impact scope, reversibility, uncertainty, stakeholders, technical depth) and auto-assigns the tier.

### Evidence-Driven Discussion

Role statements cite specific data sources — industry reports, benchmarks, case studies, documentation. Not "I think" or "in my experience." When current data is needed, the skill triggers web research automatically.

### Critical Decision Points

When discussion reaches a fork in the road, the room pauses and presents you with options via an interactive prompt. Each option includes pros, cons, and best-fit scenario. The room's recommendation goes first. You make the call, the discussion continues from there.

### Session Memory

The skill remembers previous discussions. When you start a new session on a related topic, it recalls prior decisions, open questions, and unresolved tensions — so you don't rehash the same debates.

### Four Operating Modes

| Mode | Description | Best For |
|------|-------------|----------|
| `subagent` | Each role is an independent sub-agent, truly independent thinking | Complex decisions (default) |
| `session` | One model plays all roles, fast and lightweight | Quick brainstorming |
| `auto` | Normal conversation, spawns independent agents at critical moments | Balanced speed/depth |
| `agent-team` | Persistent team, roles directly address each other | Ongoing projects |

### Intelligent Model Allocation

In `subagent` and `agent-team` modes, the skill automatically detects available models and allocates the most appropriate one based on role complexity:

| Tier | Roles | Model Level |
|------|-------|-------------|
| **Strong** | Vex, Cai, Wei, Noa, Forge, Alex | Most capable (deep reasoning) |
| **Balanced** | Boundary, Yui, Level, Splinter, Ren, Tao | Mid-tier (precision needed) |
| **Fast** | Grumbal, Dana, Wildcard, Killjoy, Mirror | Fastest (quick reactions) |

Override in conversation: `All roles use claude-3-opus`

---

## Getting Started

### Installation

```bash
npx skills add sacrtap/Opc_Kit --skill party-mode
```

### Basic Usage

Just describe your topic in natural language:

```
/party-mode — [Your topic and context]
```

The skill handles the rest: assesses complexity, selects experts, starts the discussion.

### Examples to Try

**Quick decision:**
```
/party-mode — Should we use PostgreSQL or MongoDB? Team of 8, 100K DAU expected.
```

**Feature review:**
```
/party-mode — Review this requirement: batch CSV export for B2B SaaS.
Enterprise customers need it for finance reporting. Current state: one-at-a-time only.
Expected impact: 30% reduction in support tickets. Dev time: 2 weeks.
```

**Strategic decision:**
```
/party-mode — We want to kill the free tier. 100K free users, 1K paid, $50K MRR.
```

**Architecture:**
```
/party-mode — Microservices or monolith? 5-person team, MVP stage.
```

**Crisis:**
```
/party-mode — Data breach: 5000 users' emails and password hashes leaked.
PR says transparent, legal says quiet, engineering says fix first. What do we do?
```

### Listing Available Rooms

```
What preset rooms are available?
```

### Switching Modes

```
Use session mode for a quick discussion on [topic]
```

---

## Output & Artifacts

After each discussion, the skill generates:

1. **Discussion Memory** (`docs/party-mode-memories/`) — Persistent record of decisions, open questions, and tensions. Feeds into future sessions.
2. **Meeting Report** (`docs/party-mode-report/`) — Structured minutes with executive summary, key decisions, risk register, and action items.
3. **Visual Review** (optional HTML) — A polished, self-contained HTML page with participant cards, decision timeline, highlights, and risk overview.

These artifacts are yours to keep, share with stakeholders, or use as input for your PRD (pair with the `create-prd` skill for a complete workflow from debate to documentation).

---

## Advanced: Creating Custom Parties

You can create custom persona groups tailored to your domain. For example, a "growth-team" room with roles focused on acquisition, activation, retention, referral, and revenue.

```
Create a new party called "growth-team" focused on growth metrics and experimentation
```

The skill guides you through defining personas, their expertise, and communication styles. Custom parties are saved to `user/party.user.toml` and persist across sessions.

See the [create-party reference](.agents/skills/party-mode/references/create-party.md) for details.

---

## The Complete Workflow

Party Mode is most powerful when paired with the `create-prd` skill:

1. **Debate** → Use party-mode to stress-test your idea from multiple perspectives
2. **Document** → Use create-prd to turn the decision into a structured, production-ready PRD
3. **Build** → Hand the PRD to your engineering team with confidence

```
/party-mode — Should we build a real-time collaboration feature? [context...]
[Discussion happens, decision is reached]
/create-prd Based on the party-mode discussion, write a PRD for real-time collaboration
```

Two skills, one seamless workflow: from multi-perspective debate to actionable documentation.
