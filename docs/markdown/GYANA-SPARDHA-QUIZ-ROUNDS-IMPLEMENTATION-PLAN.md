# Gyana Spardha — Quiz Rounds Implementation Plan

**Document type:** Full implementation specification  
**Stack:** Next.js 16.1, React 19, TypeScript, Supabase (PostgreSQL + Realtime), Tailwind CSS v4  
**Scope:** All 5 live quiz round types + host control system + live leaderboard  
**Date:** April 2026

---

## Table of Contents

1. [Round Types Overview](#1-round-types-overview)
2. [Core Architecture](#2-core-architecture)
3. [Database Schema](#3-database-schema)
4. [Phase 1 — Database Migrations](#4-phase-1--database-migrations)
5. [Phase 2 — Shared Infrastructure](#5-phase-2--shared-infrastructure)
6. [Phase 3 — Host Control Panel](#6-phase-3--host-control-panel)
7. [Phase 4 — Round Implementations](#7-phase-4--round-implementations)
8. [Phase 5 — Participant Screens](#8-phase-5--participant-screens)
9. [Phase 6 — Live Leaderboard](#9-phase-6--live-leaderboard)
10. [Complete File Checklist](#10-complete-file-checklist)
11. [Build Order](#11-build-order)
12. [Reused vs New Code](#12-reused-vs-new-code)

---

## 1. Round Types Overview

Each round type has distinct rules for question delivery, team targeting, scoring, and timing. All five run inside a single **Quiz Session** managed by a host.

### 1.1 Direct Question Round

**Format:** Host reads a question. One team is targeted first.

| Attempt | Conditions | Points |
|---|---|---|
| 1st attempt | No options shown — verbal answer | Full marks (e.g. 10 pts) |
| 2nd attempt | Options revealed after wrong/no answer | Half marks (e.g. 5 pts) |

- If the targeted team answers correctly on the 1st attempt → full points, next question
- If the targeted team answers incorrectly or passes → options are revealed, same team or host can pass to the next team in sequence for half marks
- If all teams fail on the 2nd-attempt stage → no points, next question
- No negative marking

**Key UI requirement:** The host controls a two-stage reveal — question text first, options only on demand.

---

### 1.2 Rapid Fire Round

**Format:** A single team answers as many questions as possible within a time window.

- Duration: 30–60 seconds per team (admin configures per session)
- Questions are shown one after another, rapid succession
- The team answers verbally; the host marks each correct/incorrect
- No negative marking — wrong answers just move to the next question
- All 4 teams each get one Rapid Fire turn (host picks the order)
- The round ends either when time runs out or the question bank is exhausted

**Key UI requirement:** A prominent countdown timer on both the host panel and the participant/display screens. Auto-advance questions when the host marks an answer.

---

### 1.3 True or False Round

**Format:** Host reads a statement. Teams answer True or False.

- Can be directed (one team targeted, same pass rules as Direct Question Round) OR open buzzer (first to buzz answers)
- The admin configures which variant to use when setting up the session
- Statements are entered in the question bank with `question_type = 'true_false'`, `correct_answer` is either `'TRUE'` or `'FALSE'`
- Points and half-marks rules identical to Direct Question Round when directed; Buzzer Round rules when open

**Key UI requirement:** Participant screens show only two large buttons — TRUE and FALSE — instead of four MCQ options.

---

### 1.4 Buzzer Round

**Format:** Open competition. All four teams can buzz in simultaneously.

- Host reveals question (options visible)
- Buzzer opens for all teams
- First team to buzz in gets the right to answer
- Correct → full points
- Incorrect → question passes to the team that buzzed second, then third, then fourth
- If all teams fail → no points, next question
- Race condition handled server-side: first DB insert by timestamp wins

**Key UI requirement:** A large, high-contrast BUZZ IN button on participant screens activated by `touchstart` for minimum latency. Immediate visual feedback on tap. Buzz order list visible to host.

---

### 1.5 Visual Round

**Format:** Questions are delivered via images or videos displayed on the main screen.

- The host uploads or pre-links media (image URL or YouTube/video embed URL) to each question
- The media is displayed full-screen on the display board during the question
- The question text is shown below or beside the media
- Round type is otherwise identical to Direct Question Round in terms of scoring and pass rules
- Image questions: stored as `question_type = 'visual_image'`, `media_url` field
- Video questions: stored as `question_type = 'visual_video'`, `media_url` field (YouTube embed supported)

**Key UI requirement:** The display board enters a full-screen media mode for this round. The host panel shows a thumbnail of the media.

---

### 1.6 Scoring Summary

| Round | Full marks | Half marks | Negative |
|---|---|---|---|
| Direct Question | 1st attempt (no options) | 2nd attempt (with options) | None |
| Rapid Fire | Per correct answer | N/A | None |
| True or False | Correct answer | N/A (no half-marks) | None |
| Buzzer | First correct answer | N/A | None |
| Visual | Same as Direct Question | Same as Direct Question | None |

Points per question are configured by the admin when creating the session (e.g. 10 pts full, 5 pts half).

---

## 2. Core Architecture

### 2.1 Session Model

A **Quiz Session** (`quiz_live_sessions`) is the container for an entire on-stage event. It holds:
- The 4 competing teams (Team A, B, C, D — assigned labels for the session, not permanent)
- A sequence of rounds (ordered list of round configurations)
- The current state (which round, which question, which team is active)
- The assigned host
- Links to question banks per round

Multiple sessions can exist (one per heat, one for the final). Sessions are independent.

### 2.2 Realtime Channel

One Supabase Realtime channel per session: **`quiz:session:{sessionId}`**

The host broadcasts events; all other screens subscribe:

| Event | Broadcaster | Subscribers |
|---|---|---|
| `round_started` | Host | Participants, Display |
| `question_revealed` | Host | Participants, Display |
| `options_revealed` | Host | Participants, Display |
| `media_revealed` | Host | Display (Visual Round) |
| `timer_started` | Host | Participants, Display |
| `timer_update` | Server (via API) | All |
| `buzzer_open` | Host | Participants, Display |
| `buzz_received` | Server | Host, Display |
| `answer_result` | Server | All |
| `scores_updated` | Server | All |
| `question_skipped` | Host | All |
| `round_ended` | Host | All |
| `session_ended` | Host | All |

### 2.3 Four-Team Identity System

Teams are assigned a **session label** (A, B, C, D) when the session is created. This label is displayed on all screens with a colour coding:

| Label | Colour (Tailwind) | Usage |
|---|---|---|
| A | `blue-600` | All A-team indicators |
| B | `green-600` | All B-team indicators |
| C | `amber-600` | All C-team indicators |
| D | `purple-600` | All D-team indicators |

The `quiz_live_sessions.team_slots` JSONB column stores: `{ "A": "team_uuid", "B": "team_uuid", "C": "team_uuid", "D": "team_uuid" }`.

### 2.4 Screen Types

| Screen | URL | Auth | Purpose |
|---|---|---|---|
| Host control panel | `/host/session/[id]` | `role = host or admin` | Full control of session |
| Participant screen | `/quiz/[id]/play` | Authenticated participant | View questions, buzz in, see score |
| Display board | `/quiz/[id]/display` | Public (no login) | Projected on main screen |
| Public leaderboard | `/leaderboard/[sessionId]` | Public (no login) | Displayed on dedicated page |
| Admin session setup | `/admin/quiz/new` | `role = admin` | Create and configure sessions |
| Admin session list | `/admin/quiz` | `role = admin` | Manage all sessions |

### 2.5 Reused Components and Utilities

The following existing code is reused without modification:

- `components/exam/ExamTimer.tsx` — already handles countdown, warnings, time-up callback. Reused directly in Rapid Fire Round.
- `components/exam/MCQQuestion.tsx` — reused for rendering options in Direct/Buzzer/Visual rounds on participant screens.
- `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts` — all Supabase clients reused as-is.
- `lib/email/sendgrid.ts` — reused for any notification emails.
- `lib/utils/roles.ts` — reused with `HOST` role addition from previous plan.
- `proxy.ts` — reused with host route additions from previous plan.
- `components/ui/Button.tsx`, `components/ui/Input.tsx` — all UI primitives reused.
- `components/admin/DataTable.tsx`, `ExportButton.tsx`, `StatsCard.tsx` — reused in admin session views.
- `app/admin/leaderboard/page.tsx` — extended to include live session leaderboards.

---

## 3. Database Schema

### 3.1 New Tables

#### `quiz_live_sessions`

The master session record.

```sql
CREATE TABLE quiz_live_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               VARCHAR(255) NOT NULL,
  status              VARCHAR(20) DEFAULT 'setup'
                        CHECK (status IN ('setup','lobby','active','paused','completed')),
  team_slots          JSONB NOT NULL DEFAULT '{}',
  -- e.g. {"A":"uuid","B":"uuid","C":"uuid","D":"uuid"}
  current_round_id    UUID,
  assigned_host_id    UUID REFERENCES auth.users(id),
  points_full         INTEGER DEFAULT 10,
  points_half         INTEGER DEFAULT 5,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `quiz_rounds`

Each session has an ordered list of rounds. One row per round.

```sql
CREATE TABLE quiz_rounds (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID REFERENCES quiz_live_sessions(id) ON DELETE CASCADE,
  round_order         INTEGER NOT NULL,
  round_type          VARCHAR(30) NOT NULL
                        CHECK (round_type IN (
                          'direct_question',
                          'rapid_fire',
                          'true_or_false',
                          'buzzer',
                          'visual'
                        )),
  title               VARCHAR(255),
  question_set_id     UUID REFERENCES question_sets(id),
  -- Rapid Fire specific
  rapid_fire_duration_seconds INTEGER DEFAULT 45,
  -- True/False specific
  true_false_mode     VARCHAR(20) DEFAULT 'directed'
                        CHECK (true_false_mode IN ('directed','buzzer')),
  status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending','active','completed')),
  current_question_index INTEGER DEFAULT 0,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `quiz_questions`

Questions linked to a round for a session. Pre-loaded from question sets.

```sql
CREATE TABLE quiz_questions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id            UUID REFERENCES quiz_rounds(id) ON DELETE CASCADE,
  source_question_id  UUID REFERENCES questions(id),
  -- Copied fields at session-creation time (snapshot, not live link)
  question_text       TEXT NOT NULL,
  question_type       VARCHAR(30) DEFAULT 'mcq'
                        CHECK (question_type IN ('mcq','true_false','visual_image','visual_video')),
  option_a            TEXT,
  option_b            TEXT,
  option_c            TEXT,
  option_d            TEXT,
  correct_answer      VARCHAR(10) NOT NULL,
  -- For True/False: correct_answer is 'TRUE' or 'FALSE'
  -- For MCQ/Visual: correct_answer is 'A','B','C','D'
  media_url           TEXT,
  -- For visual questions: image URL or YouTube embed URL
  question_order      INTEGER NOT NULL,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `quiz_question_events`

One row per question as it is played live. Tracks state and outcome.

```sql
CREATE TABLE quiz_question_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id              UUID REFERENCES quiz_rounds(id) ON DELETE CASCADE,
  question_id           UUID REFERENCES quiz_questions(id),
  status                VARCHAR(20) DEFAULT 'pending'
                          CHECK (status IN (
                            'pending',
                            'revealed',         -- question text shown, no options
                            'options_revealed',  -- options now visible
                            'buzzer_open',       -- buzzer active (Buzzer Round)
                            'answered',
                            'dropped'            -- all teams failed
                          )),
  -- For Direct/True-False/Visual directed rounds
  directed_team         VARCHAR(1) CHECK (directed_team IN ('A','B','C','D')),
  attempt_number        INTEGER DEFAULT 1,
  -- 1 = no options shown (full marks possible)
  -- 2 = options shown (half marks possible)
  -- For Rapid Fire
  rapid_fire_team       VARCHAR(1) CHECK (rapid_fire_team IN ('A','B','C','D')),
  -- Outcome
  answered_by_team      VARCHAR(1) CHECK (answered_by_team IN ('A','B','C','D')),
  points_awarded        INTEGER DEFAULT 0,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `quiz_pass_log`

Tracks the pass sequence for a question event (who tried, in what order).

```sql
CREATE TABLE quiz_pass_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_event_id   UUID REFERENCES quiz_question_events(id) ON DELETE CASCADE,
  team_label          VARCHAR(1) NOT NULL CHECK (team_label IN ('A','B','C','D')),
  attempt_number      INTEGER NOT NULL,
  -- 1 = first try (full/no options), 2 = second try (with options)
  passed_or_wrong     BOOLEAN NOT NULL,
  -- TRUE = team got it wrong or passed, FALSE = team answered correctly
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `quiz_buzz_events`

Buzz-in records for Buzzer Round (and True/False buzzer mode).

```sql
CREATE TABLE quiz_buzz_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_event_id     UUID REFERENCES quiz_question_events(id) ON DELETE CASCADE,
  team_label            VARCHAR(1) NOT NULL CHECK (team_label IN ('A','B','C','D')),
  buzzed_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  buzz_order            INTEGER,
  selected_answer       VARCHAR(10),
  is_correct            BOOLEAN,
  UNIQUE(question_event_id, team_label)
);
```

#### `quiz_session_scores`

Running cumulative score per team per session. One row per team per session.

```sql
CREATE TABLE quiz_session_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID REFERENCES quiz_live_sessions(id) ON DELETE CASCADE,
  team_label          VARCHAR(1) NOT NULL CHECK (team_label IN ('A','B','C','D')),
  team_id             UUID REFERENCES teams(id),
  total_score         INTEGER DEFAULT 0,
  questions_answered  INTEGER DEFAULT 0,
  questions_correct   INTEGER DEFAULT 0,
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, team_label)
);
```

#### `quiz_rapid_fire_sessions`

Tracks the active Rapid Fire team and timer state.

```sql
CREATE TABLE quiz_rapid_fire_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_event_id   UUID REFERENCES quiz_question_events(id),
  team_label          VARCHAR(1) NOT NULL,
  started_at          TIMESTAMP WITH TIME ZONE,
  duration_seconds    INTEGER NOT NULL,
  ended_at            TIMESTAMP WITH TIME ZONE,
  questions_attempted INTEGER DEFAULT 0,
  questions_correct   INTEGER DEFAULT 0,
  score_earned        INTEGER DEFAULT 0
);
```

### 3.2 Existing Tables Extended

#### `questions` table — add `question_type` and `media_url`

```sql
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_type VARCHAR(30) DEFAULT 'mcq'
    CHECK (question_type IN ('mcq','true_false','visual_image','visual_video')),
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS correct_answer_text TEXT;
  -- correct_answer_text: for T/F stores 'TRUE'/'FALSE'
  -- correct_answer (existing VARCHAR(1)) keeps A/B/C/D for MCQ
```

### 3.3 RLS Policies

All new tables get RLS enabled. Policy summary:

- **Admin:** Full access to all tables
- **Host:** Read/write to sessions they are assigned to, and all child records of those sessions
- **Authenticated (participant):** Read-only on `quiz_questions`, `quiz_question_events`, `quiz_session_scores`, `quiz_rounds` for active sessions; write to `quiz_buzz_events` only
- **Public (unauthenticated):** Read-only on `quiz_session_scores` and `quiz_question_events` for active sessions (needed for display board and public leaderboard)

---

## 4. Phase 1 — Database Migrations

### 4.1 `docs/sql/migrate-quiz-live-sessions.sql`

Creates all new tables listed in Section 3.1. Run in Supabase SQL editor. Full SQL:

```sql
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- quiz_live_sessions
CREATE TABLE IF NOT EXISTS quiz_live_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               VARCHAR(255) NOT NULL,
  status              VARCHAR(20) DEFAULT 'setup'
                        CHECK (status IN ('setup','lobby','active','paused','completed')),
  team_slots          JSONB NOT NULL DEFAULT '{}',
  current_round_id    UUID,
  assigned_host_id    UUID REFERENCES auth.users(id),
  points_full         INTEGER DEFAULT 10,
  points_half         INTEGER DEFAULT 5,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- quiz_rounds
CREATE TABLE IF NOT EXISTS quiz_rounds (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                 UUID REFERENCES quiz_live_sessions(id) ON DELETE CASCADE,
  round_order                INTEGER NOT NULL,
  round_type                 VARCHAR(30) NOT NULL
                               CHECK (round_type IN (
                                 'direct_question','rapid_fire',
                                 'true_or_false','buzzer','visual'
                               )),
  title                      VARCHAR(255),
  question_set_id            UUID,
  rapid_fire_duration_seconds INTEGER DEFAULT 45,
  true_false_mode            VARCHAR(20) DEFAULT 'directed'
                               CHECK (true_false_mode IN ('directed','buzzer')),
  status                     VARCHAR(20) DEFAULT 'pending'
                               CHECK (status IN ('pending','active','completed')),
  current_question_index     INTEGER DEFAULT 0,
  created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- quiz_questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id            UUID REFERENCES quiz_rounds(id) ON DELETE CASCADE,
  source_question_id  UUID REFERENCES questions(id),
  question_text       TEXT NOT NULL,
  question_type       VARCHAR(30) DEFAULT 'mcq'
                        CHECK (question_type IN ('mcq','true_false','visual_image','visual_video')),
  option_a            TEXT,
  option_b            TEXT,
  option_c            TEXT,
  option_d            TEXT,
  correct_answer      VARCHAR(10) NOT NULL,
  media_url           TEXT,
  question_order      INTEGER NOT NULL,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- quiz_question_events
CREATE TABLE IF NOT EXISTS quiz_question_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id              UUID REFERENCES quiz_rounds(id) ON DELETE CASCADE,
  question_id           UUID REFERENCES quiz_questions(id),
  status                VARCHAR(20) DEFAULT 'pending'
                          CHECK (status IN (
                            'pending','revealed','options_revealed',
                            'buzzer_open','answered','dropped'
                          )),
  directed_team         VARCHAR(1) CHECK (directed_team IN ('A','B','C','D')),
  attempt_number        INTEGER DEFAULT 1,
  rapid_fire_team       VARCHAR(1) CHECK (rapid_fire_team IN ('A','B','C','D')),
  answered_by_team      VARCHAR(1) CHECK (answered_by_team IN ('A','B','C','D')),
  points_awarded        INTEGER DEFAULT 0,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- quiz_pass_log
CREATE TABLE IF NOT EXISTS quiz_pass_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_event_id     UUID REFERENCES quiz_question_events(id) ON DELETE CASCADE,
  team_label            VARCHAR(1) NOT NULL CHECK (team_label IN ('A','B','C','D')),
  attempt_number        INTEGER NOT NULL,
  passed_or_wrong       BOOLEAN NOT NULL,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- quiz_buzz_events
CREATE TABLE IF NOT EXISTS quiz_buzz_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_event_id     UUID REFERENCES quiz_question_events(id) ON DELETE CASCADE,
  team_label            VARCHAR(1) NOT NULL CHECK (team_label IN ('A','B','C','D')),
  buzzed_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  buzz_order            INTEGER,
  selected_answer       VARCHAR(10),
  is_correct            BOOLEAN,
  UNIQUE(question_event_id, team_label)
);

-- quiz_session_scores
CREATE TABLE IF NOT EXISTS quiz_session_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID REFERENCES quiz_live_sessions(id) ON DELETE CASCADE,
  team_label          VARCHAR(1) NOT NULL CHECK (team_label IN ('A','B','C','D')),
  team_id             UUID REFERENCES teams(id),
  total_score         INTEGER DEFAULT 0,
  questions_answered  INTEGER DEFAULT 0,
  questions_correct   INTEGER DEFAULT 0,
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, team_label)
);

-- quiz_rapid_fire_sessions
CREATE TABLE IF NOT EXISTS quiz_rapid_fire_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_event_id     UUID REFERENCES quiz_question_events(id),
  team_label            VARCHAR(1) NOT NULL,
  started_at            TIMESTAMP WITH TIME ZONE,
  duration_seconds      INTEGER NOT NULL,
  ended_at              TIMESTAMP WITH TIME ZONE,
  questions_attempted   INTEGER DEFAULT 0,
  questions_correct     INTEGER DEFAULT 0,
  score_earned          INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_rounds_session         ON quiz_rounds(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_round        ON quiz_questions(round_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_events_round  ON quiz_question_events(round_id);
CREATE INDEX IF NOT EXISTS idx_quiz_buzz_events_question   ON quiz_buzz_events(question_event_id, buzzed_at);
CREATE INDEX IF NOT EXISTS idx_quiz_session_scores_session ON quiz_session_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_live_sessions_host     ON quiz_live_sessions(assigned_host_id);
CREATE INDEX IF NOT EXISTS idx_quiz_live_sessions_status   ON quiz_live_sessions(status);

-- Enable RLS
ALTER TABLE quiz_live_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_rounds             ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_question_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_pass_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_buzz_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_session_scores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_rapid_fire_sessions ENABLE ROW LEVEL SECURITY;

-- RLS: Admin full access
CREATE POLICY "Admin full access quiz_live_sessions"
  ON quiz_live_sessions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- RLS: Host access to their assigned sessions
CREATE POLICY "Host access quiz_live_sessions"
  ON quiz_live_sessions FOR ALL
  USING (
    assigned_host_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS: Public read on scores (display board, public leaderboard)
CREATE POLICY "Public read quiz_session_scores"
  ON quiz_session_scores FOR SELECT USING (true);

-- RLS: Public read on question events (display board knows current state)
CREATE POLICY "Public read quiz_question_events"
  ON quiz_question_events FOR SELECT USING (true);

-- RLS: Public read on rounds and questions
CREATE POLICY "Public read quiz_rounds"
  ON quiz_rounds FOR SELECT USING (true);

CREATE POLICY "Public read quiz_questions"
  ON quiz_questions FOR SELECT USING (true);

-- RLS: Host and admin write quiz data
CREATE POLICY "Host admin write quiz_rounds"
  ON quiz_rounds FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','host')
  ));

CREATE POLICY "Host admin write quiz_question_events"
  ON quiz_question_events FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','host')
  ));

CREATE POLICY "Host admin write quiz_session_scores"
  ON quiz_session_scores FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','host')
  ));

-- RLS: Authenticated users can insert buzz events
CREATE POLICY "Authenticated insert quiz_buzz_events"
  ON quiz_buzz_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Public read quiz_buzz_events"
  ON quiz_buzz_events FOR SELECT USING (true);
```

### 4.2 `docs/sql/migrate-questions-media.sql`

Extends the existing `questions` table for new question types.

```sql
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_type VARCHAR(30) DEFAULT 'mcq'
    CHECK (question_type IN ('mcq','true_false','visual_image','visual_video')),
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS correct_answer_tf VARCHAR(10)
    CHECK (correct_answer_tf IN ('TRUE','FALSE'));

-- Index for filtering by type in admin question bank
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);
```

---

## 5. Phase 2 — Shared Infrastructure

Build these before any UI. All later phases depend on them.

### 5.1 `lib/services/quizSessionService.ts`

Central Realtime service. All screens import from here.

```typescript
import { createClient } from '@/lib/supabase/client'

const CHANNEL_PREFIX = 'quiz:session:'

export type QuizEventType =
  | 'round_started'
  | 'question_revealed'
  | 'options_revealed'
  | 'media_revealed'
  | 'timer_started'
  | 'timer_update'
  | 'buzzer_open'
  | 'buzz_received'
  | 'answer_result'
  | 'scores_updated'
  | 'question_skipped'
  | 'round_ended'
  | 'session_ended'
  | 'rapid_fire_team_change'

export interface QuizEvent {
  type: QuizEventType
  payload: Record<string, unknown>
  timestamp: string
}

export interface QuizEventHandlers {
  onRoundStarted?: (payload: RoundStartedPayload) => void
  onQuestionRevealed?: (payload: QuestionRevealedPayload) => void
  onOptionsRevealed?: (payload: OptionsRevealedPayload) => void
  onMediaRevealed?: (payload: MediaRevealedPayload) => void
  onTimerStarted?: (payload: TimerStartedPayload) => void
  onBuzzerOpen?: (payload: BuzzerOpenPayload) => void
  onBuzzReceived?: (payload: BuzzReceivedPayload) => void
  onAnswerResult?: (payload: AnswerResultPayload) => void
  onScoresUpdated?: (payload: ScoresUpdatedPayload) => void
  onRoundEnded?: (payload: RoundEndedPayload) => void
  onSessionEnded?: () => void
  onRapidFireTeamChange?: (payload: RapidFireTeamChangePayload) => void
}

// Payload type definitions
export interface RoundStartedPayload {
  roundId: string
  roundType: string
  roundTitle: string
  roundOrder: number
}

export interface QuestionRevealedPayload {
  questionEventId: string
  questionText: string
  questionType: string
  directedTeam?: string    // A/B/C/D for directed rounds
  attemptNumber: number    // 1 = no options, 2 = with options
  questionNumber: number
  totalQuestions: number
}

export interface OptionsRevealedPayload {
  questionEventId: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
}

export interface MediaRevealedPayload {
  questionEventId: string
  mediaUrl: string
  mediaType: 'image' | 'video'
  questionText: string
}

export interface TimerStartedPayload {
  questionEventId: string
  durationSeconds: number
  team?: string   // Rapid Fire: which team's turn
}

export interface BuzzerOpenPayload {
  questionEventId: string
}

export interface BuzzReceivedPayload {
  questionEventId: string
  teamLabel: string
  buzzOrder: number
}

export interface AnswerResultPayload {
  questionEventId: string
  correct: boolean
  teamLabel: string
  pointsAwarded: number
  correctAnswer: string
  updatedScores: ScoreMap
}

export interface ScoresUpdatedPayload {
  scores: ScoreMap
}

export interface RoundEndedPayload {
  roundId: string
  roundType: string
  finalScores: ScoreMap
}

export interface RapidFireTeamChangePayload {
  team: string
  durationSeconds: number
}

export type ScoreMap = {
  A: number; B: number; C: number; D: number
}

// Active channel cache
const channels: Map<string, ReturnType<ReturnType<typeof createClient>['channel']>> = new Map()

export function subscribeToSession(
  sessionId: string,
  handlers: QuizEventHandlers
): () => void {
  const supabase = createClient()
  const channelName = `${CHANNEL_PREFIX}${sessionId}`

  const channel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'quiz_event' }, ({ payload }: { payload: QuizEvent }) => {
      switch (payload.type) {
        case 'round_started':
          handlers.onRoundStarted?.(payload.payload as RoundStartedPayload)
          break
        case 'question_revealed':
          handlers.onQuestionRevealed?.(payload.payload as QuestionRevealedPayload)
          break
        case 'options_revealed':
          handlers.onOptionsRevealed?.(payload.payload as OptionsRevealedPayload)
          break
        case 'media_revealed':
          handlers.onMediaRevealed?.(payload.payload as MediaRevealedPayload)
          break
        case 'timer_started':
          handlers.onTimerStarted?.(payload.payload as TimerStartedPayload)
          break
        case 'buzzer_open':
          handlers.onBuzzerOpen?.(payload.payload as BuzzerOpenPayload)
          break
        case 'buzz_received':
          handlers.onBuzzReceived?.(payload.payload as BuzzReceivedPayload)
          break
        case 'answer_result':
          handlers.onAnswerResult?.(payload.payload as AnswerResultPayload)
          break
        case 'scores_updated':
          handlers.onScoresUpdated?.(payload.payload as ScoresUpdatedPayload)
          break
        case 'round_ended':
          handlers.onRoundEnded?.(payload.payload as RoundEndedPayload)
          break
        case 'session_ended':
          handlers.onSessionEnded?.()
          break
        case 'rapid_fire_team_change':
          handlers.onRapidFireTeamChange?.(payload.payload as RapidFireTeamChangePayload)
          break
      }
    })
    .subscribe()

  channels.set(sessionId, channel)

  // Return cleanup function
  return () => {
    supabase.removeChannel(channel)
    channels.delete(sessionId)
  }
}

export async function broadcastEvent(
  sessionId: string,
  type: QuizEventType,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = createClient()
  const channelName = `${CHANNEL_PREFIX}${sessionId}`

  const channel = channels.get(sessionId) ||
    supabase.channel(channelName)

  await channel.send({
    type: 'broadcast',
    event: 'quiz_event',
    payload: {
      type,
      payload,
      timestamp: new Date().toISOString(),
    } as QuizEvent,
  })
}
```

### 5.2 `lib/services/scoringService.ts`

All scoring logic in one place. No scoring logic in UI components.

```typescript
export interface ScoreUpdate {
  sessionId: string
  teamLabel: 'A' | 'B' | 'C' | 'D'
  pointsDelta: number
  questionEventId: string
}

// Determine points for a correct answer
export function resolvePoints(
  attemptNumber: number,       // 1 = first attempt (no options), 2 = with options
  pointsFull: number,          // from session config
  pointsHalf: number,          // from session config
  roundType: string
): number {
  if (roundType === 'rapid_fire') return pointsFull  // no half marks
  if (roundType === 'true_or_false') return pointsFull  // no half marks
  if (roundType === 'buzzer') return pointsFull  // no half marks
  // direct_question and visual use attempt-based scoring
  return attemptNumber === 1 ? pointsFull : pointsHalf
}

// Apply score update to quiz_session_scores via API call
export async function applyScoreUpdate(update: ScoreUpdate): Promise<void> {
  await fetch('/api/quiz/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  })
}
```

### 5.3 `lib/utils/teamColors.ts`

Team colour utility used by every screen.

```typescript
export type TeamLabel = 'A' | 'B' | 'C' | 'D'

export const TEAM_COLORS: Record<TeamLabel, {
  bg: string
  text: string
  border: string
  badge: string
  light: string
}> = {
  A: {
    bg: 'bg-blue-600',
    text: 'text-blue-600',
    border: 'border-blue-600',
    badge: 'bg-blue-100 text-blue-800',
    light: 'bg-blue-50',
  },
  B: {
    bg: 'bg-green-600',
    text: 'text-green-600',
    border: 'border-green-600',
    badge: 'bg-green-100 text-green-800',
    light: 'bg-green-50',
  },
  C: {
    bg: 'bg-amber-600',
    text: 'text-amber-600',
    border: 'border-amber-600',
    badge: 'bg-amber-100 text-amber-800',
    light: 'bg-amber-50',
  },
  D: {
    bg: 'bg-purple-600',
    text: 'text-purple-600',
    border: 'border-purple-600',
    badge: 'bg-purple-100 text-purple-800',
    light: 'bg-purple-50',
  },
}

export function getTeamColor(label: TeamLabel) {
  return TEAM_COLORS[label]
}
```

### 5.4 API Routes — Core Session Actions

#### `app/api/quiz/session/[id]/route.ts`

**GET** — returns full session state: current round, current question event, all scores, team slot mapping.

**PATCH** — host actions. Body: `{ action: string, ...params }`. Actions:

| Action | Description |
|---|---|
| `start_round` | Moves a round from `pending` → `active`, broadcasts `round_started` |
| `reveal_question` | Creates `quiz_question_events` row, sets status `revealed`, broadcasts `question_revealed` |
| `reveal_options` | Updates event status to `options_revealed`, broadcasts `options_revealed` |
| `reveal_media` | Broadcasts `media_revealed` with `media_url` |
| `direct_to_team` | Sets `directed_team` on current event |
| `mark_correct` | Records correct answer, updates score, broadcasts `answer_result` |
| `mark_wrong_pass` | Inserts `quiz_pass_log` row, rotates to next team or drops |
| `skip_question` | Sets event to `dropped`, broadcasts `question_skipped` |
| `end_round` | Sets round to `completed`, broadcasts `round_ended` |
| `end_session` | Sets session to `completed`, broadcasts `session_ended` |
| `start_rapid_fire` | Creates `quiz_rapid_fire_sessions` row, broadcasts `timer_started` |
| `end_rapid_fire` | Ends timer, tallies Rapid Fire score, broadcasts `answer_result` |
| `open_buzzer` | Sets event status to `buzzer_open`, broadcasts `buzzer_open` |

#### `app/api/quiz/buzz/route.ts`

**POST** — records a buzz-in from a participant team. Body: `{ sessionId, questionEventId, teamLabel }`.

1. Verify `quiz_question_events.status = 'buzzer_open'`
2. Insert into `quiz_buzz_events` with `buzzed_at = NOW()`
3. `UNIQUE(question_event_id, team_label)` prevents double-buzz from same team
4. Query all buzz events for this question ordered by `buzzed_at` → assign `buzz_order`
5. Broadcast `buzz_received` with `{ teamLabel, buzzOrder }`
6. Return `{ buzzOrder, accepted: true }`

#### `app/api/quiz/score/route.ts`

**POST** — atomically increments team score. Body: `{ sessionId, teamLabel, pointsDelta, questionEventId }`.

1. `UPDATE quiz_session_scores SET total_score = total_score + pointsDelta WHERE session_id = ? AND team_label = ?`
2. Broadcast `scores_updated` with all 4 teams' new scores
3. Return updated scores

---

## 6. Phase 3 — Host Control Panel

**File:** `app/host/session/[id]/page.tsx`

This is the most complex new page. The host has full control of the session flow. All other screens react to what the host does.

### 6.1 Layout

Three-column layout:

```
┌──────────────────────────────────────────────────────────────┐
│  Left sidebar (200px) │  Main workspace (flex-1)  │  Right   │
│  Team scores + labels │  Round-specific controls  │  sidebar │
│  Always visible       │  Changes per round type   │  (160px) │
│                       │                           │  Round   │
│                       │                           │  list +  │
│                       │                           │  nav     │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Left Sidebar — Team Scores

Always-visible score panel. Four team cards stacked vertically.

Each card shows:
- Team label (A/B/C/D) with colour coding from `teamColors.ts`
- Team name (from `quiz_live_sessions.team_slots`)
- Current score (large, bold)
- Mini badge showing +points when score increments (fades after 2s)

Updates in real-time via `onScoresUpdated` handler.

### 6.3 Right Sidebar — Round Navigator

List of all rounds in session order. Each round shown as a pill: round type icon + title + status badge (pending / active / done). Clicking a round scrolls the main workspace to that round's section. Active round is highlighted.

### 6.4 Main Workspace — Per-Round Controls

#### Direct Question Round controls

State machine driven by a `questionState` enum: `idle → revealed → options_revealed → resolved → idle`.

**idle state:**
- "Next Question" button
- Question counter: "Question 3 of 8"
- Directed team selector: four team buttons (A / B / C / D) — host picks which team gets first attempt
- On click "Next Question" → calls PATCH `reveal_question` with `directed_team`

**revealed state** (question text shown, no options):
- Large question text (read from DB)
- Directed team badge with colour (e.g. "Team B — 1st attempt — Full marks")
- Three action buttons:
  - `✓ Correct (Full marks)` → calls `mark_correct` with `attemptNumber = 1`
  - `✗ Wrong / Pass` → calls `mark_wrong_pass` → moves to `options_revealed` state with next team
  - `Skip` → calls `skip_question`

**options_revealed state** (question text + options shown):
- Question text + all 4 options visible (correct answer highlighted for host only)
- Directed team badge updated: "Team C — 2nd attempt — Half marks"
- Same three action buttons but `✓ Correct` awards half marks
- If all teams exhausted → show "All teams failed — skip" button

#### Rapid Fire Round controls

**Team selector:** Four team buttons. Host picks which team goes first (then proceeds round-robin through A/B/C/D or in any custom order).

**Active Rapid Fire state:**
- Large team badge (colour-coded) — "Team A is answering"
- `ExamTimer` component (reused) configured with Rapid Fire duration (e.g. 45 seconds)
- `isActive` prop driven by `timerRunning` state
- Question displayed: one question at a time from the question bank
- Two buttons: `✓ Correct` and `✗ Wrong` — both advance to the next question instantly
- Score counter: "3 correct so far"
- When timer hits 0: `onTimeUp` fires, triggers `end_rapid_fire` API call
- After current team's turn: "Next Team" button appears, host selects next team

#### True or False Round controls

If `true_false_mode = 'directed'`:
- Identical to Direct Question Round controls but with only two answer buttons: `TRUE` and `FALSE` (no A/B/C/D options shown)
- Correct answer is stored as `correct_answer_tf` field

If `true_false_mode = 'buzzer'`:
- Identical to Buzzer Round controls (see below) but participant screens show TRUE/FALSE instead of A/B/C/D

#### Buzzer Round controls

**idle state:**
- "Next Question" button
- Question counter

**revealed state:**
- Question text displayed
- "Open Buzzer" button (large, prominent)
- Buzz queue panel: "Waiting for buzzes..." (empty)

**buzzer_open state:**
- "Open Buzzer" button changes to "Buzzer Open" (disabled, green indicator)
- Buzz queue fills in real-time as teams buzz: ordered list with team label, timestamp, buzz order number
- First team in queue gets an "Answering..." badge
- Host sees correct answer highlighted
- Buttons: `✓ Correct` and `✗ Wrong / Pass to next`

**pass state:** If wrong, buzz queue shows next team highlighted with "Now answering..." — host confirms correct/wrong for each team in order.

#### Visual Round controls

Identical to Direct Question Round controls, plus:

**Media preview panel** in main workspace above the question:
- Image: `<img>` tag with the question's `media_url`
- Video: YouTube embed `<iframe>` or `<video>` tag
- "Display media on screen" toggle — when ON, broadcasts `media_revealed` event to display board
- Hosts can choose to show media first, then reveal question text — two separate broadcast actions

### 6.5 Host Panel Connection

On mount, the host panel:
1. Fetches full session state from `GET /api/quiz/session/[id]`
2. Calls `subscribeToSession(sessionId, handlers)` to listen for any updates from the API
3. All PATCH actions are fire-and-confirm: call API, wait for `200`, then update local state

---

## 7. Phase 4 — Round Implementations

### 7.1 Direct Question Round — detailed flow

```
Host clicks "Next Question"
  → PATCH action: reveal_question { directed_team: 'B', attemptNumber: 1 }
  → Server creates quiz_question_events row (status: revealed)
  → Server broadcasts question_revealed { questionText, directedTeam: 'B', attemptNumber: 1 }
  → All screens update

Host clicks "✓ Correct (Full marks)"
  → PATCH action: mark_correct { questionEventId, teamLabel: 'B', attemptNumber: 1 }
  → Server: resolvePoints(1, 10, 5, 'direct_question') = 10
  → Server: POST /api/quiz/score { sessionId, teamLabel: 'B', pointsDelta: 10 }
  → Server: updates quiz_question_events { answered_by_team: 'B', points_awarded: 10, status: 'answered' }
  → Server broadcasts answer_result { correct: true, teamLabel: 'B', pointsAwarded: 10, updatedScores }
  → Host panel shows "+10 Team B" flash, scores update

Host clicks "✗ Wrong / Pass"
  → PATCH action: mark_wrong_pass { questionEventId, teamLabel: 'B', attemptNumber: 1 }
  → Server: inserts quiz_pass_log { team_label: 'B', attempt_number: 1, passed_or_wrong: true }
  → Server: determines next team in sequence (B → C)
  → If still attemptNumber 1 and this was the directed team:
      → update event: attempt_number = 2 (options now revealed), directed_team = 'C'
      → broadcasts options_revealed + new directed team
  → If all teams tried on attempt 2:
      → update event: status = 'dropped'
      → broadcasts question_skipped
```

### 7.2 Rapid Fire Round — detailed flow

```
Host selects Team A, clicks "Start Rapid Fire"
  → PATCH action: start_rapid_fire { team_label: 'A', duration_seconds: 45 }
  → Server: creates quiz_rapid_fire_sessions row { team_label: 'A', started_at: NOW() }
  → Server: reveals first question → broadcasts question_revealed + timer_started { duration: 45 }
  → Host panel: ExamTimer starts, first question shown

Host clicks "✓ Correct"
  → PATCH action: mark_correct { questionEventId, teamLabel: 'A', rapidFire: true }
  → Server: score update, reveal next question immediately
  → broadcasts answer_result + question_revealed (next question)
  → Timer continues running (not reset between questions)

Timer reaches 0 (ExamTimer.onTimeUp fires)
  → PATCH action: end_rapid_fire { team_label: 'A' }
  → Server: updates quiz_rapid_fire_sessions { ended_at: NOW() }
  → Server: tallies total score, broadcasts answer_result with final rapid fire score
  → Host panel: shows "Team A scored 30 pts in Rapid Fire"
  → "Next Team" button appears
```

### 7.3 Buzzer Round — race condition handling

The buzz race condition is the most critical technical piece.

Multiple teams can tap their buzz button within milliseconds. The guarantee:

1. Each team's `touchstart` immediately disables their buzz button with visual feedback
2. POST request fires to `/api/quiz/buzz`
3. Server inserts into `quiz_buzz_events` with `buzzed_at = NOW()` (server timestamp, not client)
4. `UNIQUE(question_event_id, team_label)` means each team can only buzz once
5. Server queries all buzz events for this question ordered by `buzzed_at ASC`
6. Assigns `buzz_order = 1, 2, 3, 4` based on server timestamp order
7. Broadcasts `buzz_received { teamLabel, buzzOrder }` after each insert
8. Only `buzz_order = 1` team gets highlighted as "now answering" on host panel

Client-side latency note: a team with higher network latency may buzz first physically but arrive at the server later. This is acknowledged as acceptable — server timestamp is the definitive tie-breaker, consistent with physical buzzer systems.

### 7.4 Visual Round — media handling

Questions of type `visual_image` or `visual_video` store their media in `media_url`.

**Supported media sources:**
- Direct image URLs (any HTTPS image link)
- Supabase Storage URLs (uploaded via the question bank interface)
- YouTube embed URLs (format: `https://www.youtube.com/embed/VIDEO_ID`)

**Host panel:** Shows a thumbnail/preview of the media above the question text. Two buttons: "Show media on display" (broadcasts `media_revealed`) and "Show question" (broadcasts `question_revealed`). The host can show media first, then the question, or both simultaneously.

**Display board:** On `media_revealed`, the center area switches to full-screen media mode:
- Images: `<img>` stretched to fill available space, `object-fit: contain`
- Videos: `<iframe>` with autoplay (YouTube embed parameter `?autoplay=1`) or `<video>` with autoplay

**Question bank addition:** The existing `QuestionFormModal` component needs a new field: "Media URL" (text input), shown only when question type is `visual_image` or `visual_video`. The question type dropdown in the form gets two new options: "Visual — Image" and "Visual — Video".

---

## 8. Phase 5 — Participant Screens

### 8.1 `app/quiz/[id]/play/page.tsx`

The participant-facing screen. Subscribes to the session Realtime channel on mount. Renders reactively.

**Authentication:** Requires login. On mount, fetches the participant's team and maps it to a session team label (A/B/C/D) by looking up `quiz_live_sessions.team_slots`.

**States by event:**

| Received event | Participant sees |
|---|---|
| `round_started` | Round title card with round type icon, "Get ready!" |
| `question_revealed` (directed, not their team) | Question text read-only, "Team X is answering first" |
| `question_revealed` (directed, their team) | Question text, "Your team answers first!", no options yet |
| `options_revealed` (their team's turn) | Question + 4 MCQ options (selectable) or TRUE/FALSE buttons |
| `options_revealed` (another team's turn) | Question + 4 options read-only, "Team X is answering" |
| `buzzer_open` | Large animated "BUZZ IN!" button activates |
| `buzz_received` (their team, buzz_order=1) | "You buzzed first! Select your answer" + options appear |
| `buzz_received` (their team, buzz_order>1) | "Team X buzzed first. You're #N in queue" |
| `buzz_received` (another team) | "Team X buzzed first" |
| `answer_result` (correct, their team) | Green "+10 pts" flash, updated score |
| `answer_result` (wrong, their team) | Red "Incorrect" flash |
| `answer_result` (any) | Score board updates for all teams |
| `timer_started` | Countdown timer displayed (Rapid Fire) |
| `round_ended` | "Round complete" card with round summary |
| `session_ended` | Final scoreboard with winner announcement |

**Score display:** All 4 team scores always visible at the top of the screen, updating on every `scores_updated` event.

**Buzz button implementation:**

```typescript
const BuzzButton = ({ onBuzz, disabled }: { onBuzz: () => void; disabled: boolean }) => {
  const [pressed, setPressed] = useState(false)

  const handleTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault()  // prevent double-fire from click
    if (disabled || pressed) return
    setPressed(true)
    onBuzz()
  }, [disabled, pressed, onBuzz])

  return (
    <button
      onTouchStart={handleTouch}
      onClick={() => { if (!pressed) { setPressed(true); onBuzz() } }}
      disabled={disabled || pressed}
      className={`
        w-full py-10 text-3xl font-bold rounded-2xl transition-all
        ${pressed
          ? 'bg-gray-400 text-white cursor-not-allowed'
          : 'bg-[#C0392B] text-white active:scale-95 hover:bg-[#A93226]'
        }
      `}
    >
      {pressed ? 'Buzzed!' : 'BUZZ IN!'}
    </button>
  )
}
```

### 8.2 `proxy.ts` additions for participant quiz route

```typescript
// Protect /quiz routes — require authentication
if (request.nextUrl.pathname.startsWith('/quiz') &&
    !request.nextUrl.pathname.endsWith('/display') && !user) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('redirectedFrom', request.nextUrl.pathname)
  return NextResponse.redirect(url)
}

// Allow public display board
if (request.nextUrl.pathname.endsWith('/display')) {
  return supabaseResponse
}
```

---

## 9. Phase 6 — Live Leaderboard

### 9.1 Public Leaderboard Page

**File:** `app/leaderboard/[sessionId]/page.tsx`

No authentication required. Accessible at a shareable URL during and after the session.

**Live data:** Subscribes to `quiz_session_scores` via Supabase Realtime postgres_changes (same pattern as `app/admin/leaderboard/page.tsx`). Updates without page refresh.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  GYANA SPARDHA — LIVE LEADERBOARD                   │
│  Heat 3 | Round 2 — Buzzer Round                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🥇  TEAM A   ████████████████████████  85 pts     │
│  🥈  TEAM B   ████████████████████     70 pts     │
│  🥉  TEAM C   ██████████████           55 pts     │
│       TEAM D   ██████████               40 pts     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Questions answered: 12 | Current round: Buzzer     │
└─────────────────────────────────────────────────────┘
```

Features:
- Animated score bars (CSS transitions on width change)
- Score changes highlighted with a brief flash
- Trophy icons for top 3
- Session title and current round shown in header
- Auto-refreshes when `quiz_session_scores` changes
- Mobile responsive — readable on phones held by audience members

### 9.2 Display Board

**File:** `app/quiz/[id]/display/page.tsx`

Projected on the main screen/Smart TV. No login required.

**Layout:** Full-screen, dark background (`bg-gray-900`), high-contrast text.

```
┌──────────────────────────────────────────────────────────────┐
│  GYANA SPARDHA 2026     Heat 3 · Round 2 · Buzzer Round     │
├─────────────────────┬────────────────────────────────────────┤
│                     │                                        │
│   LIVE SCORES       │   QUESTION                            │
│                     │                                        │
│ A  [Team Name]  85  │   Which river is the longest in       │
│ B  [Team Name]  70  │   Odisha?                             │
│ C  [Team Name]  55  │                                        │
│ D  [Team Name]  40  │   A. Mahanadi                         │
│                     │   B. Brahmani                         │
│                     │   C. Rushikulya                       │
│                     │   D. Indravati                        │
│                     │                                        │
│                     │         [ BUZZER OPEN ]               │
├─────────────────────┴────────────────────────────────────────┤
│  Current: Question 4 / 8                                     │
└──────────────────────────────────────────────────────────────┘
```

**Event-driven states:**

- `question_revealed`: question text fades in centre; options hidden
- `options_revealed`: options fade in below question
- `media_revealed`: full-screen media replaces question area (image fills, video embeds)
- `buzzer_open`: large animated "BUZZER OPEN" banner pulses
- `buzz_received`: team name flashes in a large overlay (2 seconds)
- `answer_result` correct: green overlay with "+N pts", score bar animates
- `answer_result` wrong: brief red flash
- `timer_started`: countdown timer appears prominently (Rapid Fire)
- `round_ended`: round summary card

**Visual Round media display:**

```typescript
// In display board
{mediaPayload?.mediaType === 'image' && (
  <img
    src={mediaPayload.mediaUrl}
    alt="Visual question"
    className="w-full h-full object-contain max-h-[60vh]"
  />
)}
{mediaPayload?.mediaType === 'video' && (
  <iframe
    src={`${mediaPayload.mediaUrl}?autoplay=1&mute=0`}
    className="w-full aspect-video max-h-[60vh]"
    allow="autoplay"
  />
)}
```

### 9.3 Admin Leaderboard Extension

**File to modify:** `app/admin/leaderboard/page.tsx`

The existing admin leaderboard reads from `team_scores` (the screening exam leaderboard). Extend it with a second tab: **"Live Sessions"**.

The Live Sessions tab:
- Dropdown of all `quiz_live_sessions` (active and completed)
- Shows `quiz_session_scores` for the selected session
- Columns: Team label, Team name, Total score, Questions correct
- Same `ExportButton` (CSV + PDF) already on the page
- Real-time updates via postgres_changes on `quiz_session_scores`

### 9.4 `app/admin/quiz/page.tsx` — Admin quiz session list

Lists all quiz sessions. Each row shows: title, status badge, assigned host, team slots filled (4/4), rounds count, created date, actions (setup bracket, go to session, view leaderboard, delete).

"Create new session" button → `/admin/quiz/new`.

### 9.5 `app/admin/quiz/new/page.tsx` — Session creation

Form fields:

| Field | Type | Description |
|---|---|---|
| Session title | Text | e.g. "Heat 3 — Semi-final" |
| Assign host | Dropdown | Users with `role = 'host'` |
| Team A | Dropdown | All teams (filtered from qualified) |
| Team B | Dropdown | Remaining teams |
| Team C | Dropdown | Remaining teams |
| Team D | Dropdown | Remaining teams |
| Points (full mark) | Number | Default 10 |
| Points (half mark) | Number | Default 5 |
| Rounds | Dynamic list | Add round → pick type → pick question set → configure |

**Round builder:** A drag-sortable list. Each round item has:
- Round type selector (5 options)
- Round title (text)
- Question set selector (existing `QuestionSetSelector` component, reused)
- Type-specific config:
  - Rapid Fire: duration slider (30–60 seconds)
  - True or False: mode toggle (Directed / Buzzer)

On submit → creates `quiz_live_sessions`, all `quiz_rounds`, and snapshots all questions from selected sets into `quiz_questions` (a copy, not a live link — ensures questions can't change mid-session).

Add to `app/admin/layout.tsx` nav:
```typescript
{ href: '/admin/quiz', label: 'Quiz Sessions', icon: '...' }
```

---

## 10. Complete File Checklist

### SQL Migrations (run first)

```
docs/sql/migrate-quiz-live-sessions.sql         NEW
docs/sql/migrate-questions-media.sql            NEW
```

### Phase 2 — Shared infrastructure

```
lib/services/quizSessionService.ts              NEW
lib/services/scoringService.ts                  NEW
lib/utils/teamColors.ts                         NEW
app/api/quiz/session/[id]/route.ts              NEW
app/api/quiz/buzz/route.ts                      NEW
app/api/quiz/score/route.ts                     NEW
```

### Phase 3 — Host control panel

```
app/host/session/[id]/page.tsx                  NEW  (replaces/extends previous plan)
```

### Phase 4 — Round-specific components

```
components/quiz/DirectQuestionControls.tsx      NEW
components/quiz/RapidFireControls.tsx           NEW
components/quiz/TrueOrFalseControls.tsx         NEW
components/quiz/BuzzerControls.tsx              NEW
components/quiz/VisualControls.tsx              NEW
components/quiz/BuzzQueue.tsx                   NEW
components/quiz/ScoreSidebar.tsx                NEW
components/quiz/RoundNavigator.tsx              NEW
components/quiz/TeamBadge.tsx                   NEW
components/quiz/QuestionDisplay.tsx             NEW  (wraps MCQQuestion + T/F variant)
components/quiz/MediaDisplay.tsx                NEW  (image + video renderer)
```

### Phase 5 — Participant and display screens

```
app/quiz/[id]/play/page.tsx                     NEW
app/quiz/[id]/display/page.tsx                  NEW
```

### Phase 6 — Leaderboard

```
app/leaderboard/[sessionId]/page.tsx            NEW
app/admin/quiz/page.tsx                         NEW
app/admin/quiz/new/page.tsx                     NEW
```

### Modified files

```
proxy.ts                                        MODIFY  (/quiz auth + display board public)
app/admin/layout.tsx                            MODIFY  (add Quiz Sessions nav item)
app/admin/leaderboard/page.tsx                  MODIFY  (add Live Sessions tab)
components/admin/QuestionFormModal.tsx          MODIFY  (add question_type + media_url fields)
lib/utils/roles.ts                              MODIFY  (add HOST constant if not done)
```

**Total: 26 new files, 5 modified files**

---

## 11. Build Order

```
Phase 1: SQL migrations
    │
    ▼
Phase 2: Shared infrastructure
  (quizSessionService, scoringService, teamColors, API routes)
    │
    ▼
Phase 3: Host control panel
  (Build all 5 round control components first, then assemble into host page)
    │
    ├──────────────────────────────────────────────┐
    ▼                                              ▼
Phase 4: Participant screen               Phase 5: Display board
  (depends on Realtime events defined       (depends on same events,
   in Phase 2; test against host panel)      simpler — read-only)
    │                                              │
    └──────────────────┬────────────────────────────┘
                       ▼
Phase 6: Admin session management + Public leaderboard
  (admin/quiz/new, admin/quiz/page, leaderboard page)
```

**Phase 3 internal build order (host panel components):**

1. `TeamBadge.tsx` — smallest, no dependencies
2. `ScoreSidebar.tsx` — uses TeamBadge, no API calls
3. `RoundNavigator.tsx` — uses round data, no API calls
4. `QuestionDisplay.tsx` — wraps existing `MCQQuestion`, adds T/F variant
5. `MediaDisplay.tsx` — image and video renderer
6. `BuzzQueue.tsx` — list of buzz events
7. `DirectQuestionControls.tsx` — uses QuestionDisplay + TeamBadge
8. `RapidFireControls.tsx` — uses `ExamTimer` (existing) + QuestionDisplay
9. `TrueOrFalseControls.tsx` — variant of DirectQuestion with T/F buttons
10. `BuzzerControls.tsx` — uses BuzzQueue + QuestionDisplay
11. `VisualControls.tsx` — uses MediaDisplay + DirectQuestion pattern
12. `app/host/session/[id]/page.tsx` — assembles all components

---

## 12. Reused vs New Code

### Reused without modification

| Component/Util | Reused in |
|---|---|
| `components/exam/ExamTimer.tsx` | Rapid Fire Round timer |
| `components/exam/MCQQuestion.tsx` | QuestionDisplay component |
| `components/exam/FormattedQuestionText.tsx` | QuestionDisplay component |
| `components/admin/DataTable.tsx` | Admin session list |
| `components/admin/ExportButton.tsx` | Admin session list + leaderboard |
| `components/admin/StatsCard.tsx` | Admin session detail |
| `components/admin/QuestionSetSelector.tsx` | Session creation form |
| `components/ui/Button.tsx` | All new pages |
| `components/ui/Input.tsx` | Session creation form |
| `lib/supabase/client.ts` | All client components |
| `lib/supabase/server.ts` | All API routes |
| `lib/supabase/admin.ts` | Admin API routes |
| `lib/email/sendgrid.ts` | Any notification emails |
| `app/admin/layout.tsx` | Admin pages (extended only) |
| `app/host/layout.tsx` | Host pages (from previous plan) |

### Modified (minimal changes)

| File | Change |
|---|---|
| `proxy.ts` | Add `/quiz/*` auth + display board public route |
| `app/admin/layout.tsx` | Add "Quiz Sessions" nav item |
| `app/admin/leaderboard/page.tsx` | Add "Live Sessions" tab |
| `components/admin/QuestionFormModal.tsx` | Add question_type dropdown + media_url field |
| `lib/utils/roles.ts` | Add HOST constant (if not done in previous plan) |

### New (from scratch)

All files in the checklist above marked `NEW`. No existing file is deleted or replaced.

---

*This document covers all five round types for the Gyana Spardha live quiz system. Implement phases in order. Begin with the two SQL migrations.*
