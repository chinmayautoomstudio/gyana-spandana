# Product Requirements Document (PRD)
## Gyana Spandana - Odisha Quiz Competition Website

**Version:** 1.0  
**Date:** 2024  
**Status:** Current Implementation  
**Document Owner:** Development Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview & Objectives](#project-overview--objectives)
3. [Target Users](#target-users)
4. [Current Features](#current-features)
5. [Technical Architecture](#technical-architecture)
6. [Database Schema](#database-schema)
7. [UI/UX Specifications](#uiux-specifications)
8. [Security Requirements](#security-requirements)
9. [Validation Rules](#validation-rules)
10. [API Specifications](#api-specifications)
11. [Testing Requirements](#testing-requirements)
12. [Deployment Guide](#deployment-guide)
13. [Future Enhancements](#future-enhancements)
14. [Success Metrics](#success-metrics)

---

## Executive Summary

**Gyana Spandana** is a modern, web-based quiz competition platform designed to celebrate and test knowledge about Odisha's rich culture, traditions, history, and geography. The platform enables school students to form teams of two participants and compete in Odia-language quizzes.

### Key Highlights

- **Purpose:** Online quiz competition platform for Odisha's cultural knowledge
- **Language:** Primary interface and quizzes in Odia language
- **Team Structure:** Two participants per team
- **Current Phase:** Registration, Authentication, and Dashboard (Phase 1)
- **Technology:** Next.js 14, TypeScript, Tailwind CSS, Supabase

### Current Implementation Status

✅ **Completed Features:**
- Team registration system (2 participants per team)
- Individual user authentication (email/password)
- User dashboard with team information
- Landing page with competition information
- Form validation and error handling
- Password management (reset/forgot password)
- Responsive design for mobile and desktop
- **Exam system (fully implemented):**
  - Admin exam creation and management
  - Question management (MCQ format)
  - Exam taking interface with timer
  - Auto-save functionality
  - Score calculation and results
  - Team score aggregation
  - Real-time leaderboard
  - Admin dashboard

---

## Project Overview & Objectives

### Project Vision

To create an engaging, secure, and user-friendly platform that promotes knowledge of Odisha's culture, traditions, history, and geography among school students through competitive quizzes.

### Primary Objectives

1. **Enable Team Registration:** Allow teams of two participants to register with complete information
2. **Secure Authentication:** Provide individual login for each participant with secure password management
3. **User Dashboard:** Display team information and quiz status to authenticated users
4. **Cultural Promotion:** Celebrate Odia language and Odisha's heritage through quiz content
5. **Fair Competition:** Ensure secure, fair, and transparent competition process

### Success Criteria

- Successful team registration with data validation
- Secure user authentication and session management
- Responsive design across all devices
- Data privacy and security compliance
- User-friendly interface with clear navigation

---

## Target Users

### Primary Users

1. **School Students (Participants)**
   - Age: Typically 13-18 years
   - Location: Primarily Odisha, India
   - Technical Skill: Basic internet and form-filling skills
   - Language: Odia and/or English
   - Device: Mobile phones, tablets, or computers

2. **Teachers/Coordinators**
   - May assist students with registration
   - Monitor team registrations
   - Access to competition information

### User Personas

**Persona 1: Student Participant (Primary)**
- Wants to participate in quiz competition
- Needs simple registration process
- Requires clear instructions
- Expects mobile-friendly interface

**Persona 2: Team Coordinator**
- Helps multiple students register
- Needs to verify team information
- Requires access to registration status

---

## Current Features

### 1. Landing Page (`/`)

**Purpose:** Introduce the competition and provide navigation to registration/login

**Features:**
- Hero section with competition name and tagline
- Feature highlights (Team Competition, Odia Language Focus, Security)
- Call-to-action buttons (Register Team, Login)
- Responsive design with gradient backgrounds
- Modern UI with Tailwind CSS styling

**User Flow:**
1. User lands on homepage
2. Views competition information
3. Clicks "Register Your Team" or "Login"
4. Redirected to appropriate page

**Technical Implementation:**
- Static page with Next.js App Router
- Client-side navigation with Next.js Link
- Responsive grid layout
- Gradient backgrounds and card-based design

---

### 2. Team Registration (`/register`)

**Purpose:** Allow teams of two participants to register for the competition

#### 2.1 Registration Form Structure

**Split-Screen Layout:**
- **Left Side (60%):** Image carousel with marketing content
- **Right Side (40%):** Registration form (scrollable)

**Form Sections:**

1. **Team Information**
   - Team Name (required, unique, 2-100 characters)

2. **Participant 1 Details**
   - Full Name (required, 2-100 characters)
   - Email Address (required, valid format, unique)
   - Phone Number (required, 10-digit Indian format, starts with 6-9, unique)
   - School Name (required, 2-200 characters)
   - Aadhar Number (required, exactly 12 digits, unique)
   - Password (required, min 8 chars, uppercase, lowercase, number)

3. **Participant 2 Details**
   - Same fields as Participant 1
   - Must have different email, phone, and Aadhar from Participant 1

4. **Consent Checkbox**
   - Required agreement to Terms and Conditions
   - Required agreement to Privacy Policy

#### 2.2 Registration Process Flow

1. User fills out team registration form
2. Real-time validation on each field
3. Password strength indicator for both participants
4. Form submission validation
5. Server-side checks:
   - Team name uniqueness
   - Email/Aadhar/Phone uniqueness
   - Duplicate participant check
6. Create Supabase Auth users for both participants
7. Create team record in database
8. Create participant records linked to team and auth users
9. Success message with email verification reminder
10. Redirect to login page after 3 seconds

#### 2.3 Validation Features

- **Real-time Validation:** Using React Hook Form with Zod schema
- **Password Strength Indicator:** Visual feedback on password requirements
- **Inline Error Messages:** Clear, specific error messages for each field
- **Duplicate Prevention:** Server-side checks for unique constraints
- **Form State Management:** Loading states, error states, success states

#### 2.4 UI Components

- **Carousel:** Auto-sliding image carousel (7 slides) with navigation dots
- **Input Components:** Reusable Input component with label, error display
- **Button Components:** Primary, secondary, outline variants with loading states
- **Password Strength:** Visual indicator showing password requirements
- **Scrollable Form:** Form content scrolls independently from fixed header/footer

#### 2.5 Error Handling

- **Client-side Errors:** Displayed inline with form fields
- **Server-side Errors:** Displayed in error banner at top of form
- **Network Errors:** Graceful error messages with retry suggestions
- **Validation Errors:** Specific messages for each validation rule

---

### 3. User Login (`/login`)

**Purpose:** Authenticate individual participants to access their dashboard

#### 3.1 Login Form Structure

**Split-Screen Layout:**
- **Left Side (60%):** Image carousel with marketing content
- **Right Side (40%):** Login form (centered)

**Form Fields:**
- Email Address (required, valid email format)
- Password (required)
- Remember Me checkbox (optional)
- Forgot Password link

#### 3.2 Login Process Flow

1. User enters email and password
2. Form validation (client-side)
3. Submit to Supabase Auth
4. Handle authentication response:
   - Success: Redirect to dashboard
   - Invalid credentials: Display error message
   - Email not verified: Prompt for verification
   - Other errors: Display specific error message
5. Session management via Supabase

#### 3.3 Forgot Password Flow

1. User clicks "Forgot password?"
2. Form switches to password reset mode
3. User enters email address
4. System sends password reset email via Supabase
5. Success message with instructions
6. User can return to login form

#### 3.4 Features

- **Email/Password Authentication:** Supabase Auth integration
- **Session Management:** Automatic session refresh via middleware
- **Redirect Handling:** Redirects authenticated users away from login
- **Registration Success Message:** Shows success message if redirected from registration
- **Error Messages:** Clear, user-friendly error messages

#### 3.5 UI Components

- **Carousel:** Same carousel component as registration (7 slides)
- **Input Components:** Email and password inputs with validation
- **Button Components:** Primary login button with loading state
- **Link Components:** Forgot password and registration links

---

### 4. User Dashboard (`/dashboard`)

**Purpose:** Display user information, team details, and quiz status

#### 4.1 Dashboard Structure

**Protected Route:** Requires authentication (redirects to login if not authenticated)

**Sections:**

1. **Header Section**
   - Welcome message with user name
   - Logout button

2. **Team Information Card**
   - Team Name
   - User's Role (Participant 1 or Participant 2)
   - School Name

3. **Quiz Status Card**
   - Placeholder for future quiz functionality
   - Message indicating quiz will be available soon

#### 4.2 Dashboard Process Flow

1. User accesses `/dashboard`
2. Middleware checks authentication
3. If not authenticated: Redirect to login
4. If authenticated: Fetch user data from Supabase Auth
5. Fetch participant data from database using `user_id`
6. Fetch team information via participant relationship
7. Display user and team information
8. Show loading state during data fetch

#### 4.3 Features

- **Authentication Protection:** Middleware-based route protection
- **Data Fetching:** Server-side data fetching with error handling
- **Loading States:** Spinner during data load
- **Logout Functionality:** Secure logout with session cleanup
- **Responsive Design:** Mobile-friendly layout

#### 4.4 Error Handling

- **Unauthenticated Access:** Automatic redirect to login
- **Data Fetch Errors:** Graceful error handling
- **Missing Data:** Conditional rendering based on data availability

---

### 5. Authentication Callback (`/auth/callback`)

**Purpose:** Handle Supabase authentication callbacks (email verification, password reset)

**Process:**
1. Receives authentication code from Supabase
2. Exchanges code for session
3. Redirects to dashboard or specified route

---

## Exam System

### Overview

The exam system allows administrators to create and manage exams with multiple-choice questions, enables participants to take timed exams individually, and automatically calculates team scores by aggregating individual participant scores. The system includes comprehensive admin features for exam management, real-time leaderboards, and detailed results viewing.

### Key Features

- **Admin Exam Management:** Create, edit, schedule, and activate exams
- **Question Management:** Add, edit, and delete multiple-choice questions with 4 options
- **Exam Taking Interface:** User-friendly interface with timer, auto-save, and question navigation
- **Automatic Scoring:** Instant score calculation upon submission
- **Team Score Aggregation:** Automatic calculation of team scores from individual participant scores
- **Real-time Leaderboard:** Live updates of team rankings
- **Results Review:** Detailed question-by-question results with correct/incorrect indicators

---

### 6. Admin Exam Management

#### 6.1 Exam Creation (`/admin/exams/new`)

**Purpose:** Allow administrators to create new exams

**Access:** Admin users only (verified via `user_profiles.role = 'admin'`)

**Form Fields:**
- **Exam Title** (required, min 3 characters)
- **Description** (optional, text area)
- **Duration (minutes)** (required, minimum 1 minute)
- **Passing Score** (optional, integer)
- **Scheduled Start** (optional, datetime-local)
- **Scheduled End** (optional, datetime-local)

**Process Flow:**
1. Admin navigates to `/admin/exams/new`
2. System verifies admin role
3. Admin fills exam details
4. Form validation (client-side with Zod)
5. Exam created with status 'draft'
6. Redirect to question management page

**Exam Statuses:**
- `draft` - Exam created but not ready
- `scheduled` - Exam scheduled for specific date/time
- `active` - Exam currently available for participants
- `completed` - Exam period has ended
- `cancelled` - Exam cancelled by admin

#### 6.2 Exam List (`/admin/exams`)

**Purpose:** View and manage all exams

**Features:**
- List all exams with status indicators
- Color-coded status badges
- Quick access to exam details and question management
- Create new exam button
- Filter by status (future enhancement)

**Display Information:**
- Exam title and description
- Duration and total questions count
- Scheduled start/end times
- Current status
- Creation date

#### 6.3 Exam Details (`/admin/exams/[id]`)

**Purpose:** View exam details and manage exam status

**Features:**
- View complete exam information
- Change exam status (draft → scheduled → active → completed)
- Access question management
- View statistics (future enhancement)

---

### 7. Question Management

#### 7.1 Question List (`/admin/exams/[id]/questions`)

**Purpose:** Manage questions for a specific exam

**Access:** Admin users only

**Features:**
- List all questions with order
- Visual indicators for correct answers
- Add new question button
- Edit question button
- Delete question button
- Question count displayed
- Automatic question count update

#### 7.2 Question Form

**Question Fields:**
- **Question Text** (required, textarea)
- **Option A** (required)
- **Option B** (required)
- **Option C** (required)
- **Option D** (required)
- **Correct Answer** (required, dropdown: A/B/C/D)
- **Points** (required, default: 1, minimum: 1)
- **Explanation** (optional, textarea)

**Validation:**
- All options must be unique (future enhancement)
- Question text cannot be empty
- Points must be positive integer

**Question Display:**
- Questions shown in creation order
- Correct answer highlighted with green background
- Points displayed for each question
- Explanation shown if provided

---

### 8. Participant Exam Interface

#### 8.1 Available Exams (`/exams`)

**Purpose:** Display exams available for participants to take

**Access:** Authenticated participants

**Features:**
- List only scheduled or active exams
- Show exam details: title, description, duration, question count
- Display scheduled start/end times
- Status indicators (available/not available yet)
- "Start Exam" button for available exams
- "View Results" button for completed exams
- Completion status for each exam

**Process Flow:**
1. Participant logs in
2. Navigates to `/exams` (or clicks "Available Exams" in dashboard)
3. Views list of available exams
4. Clicks "Start Exam" on desired exam
5. Redirected to exam taking interface

**Exam Availability Rules:**
- Exam status must be 'scheduled' or 'active'
- If scheduled: Current time must be between scheduled_start and scheduled_end
- If active: Available immediately
- Participant can only attempt each exam once

#### 8.2 Exam Taking Interface (`/exams/[id]/take`)

**Purpose:** Provide interface for participants to take exams

**Access:** Authenticated participants, exam must be available

**Key Features:**

**Header Section:**
- Exam title
- Current question number (e.g., "Question 5 of 50")
- Timer countdown (MM:SS format)
- Red warning when less than 5 minutes remaining
- Submit Exam button

**Progress Indicator:**
- Visual progress bar
- Answered questions count
- Percentage completed
- Color-coded progress

**Question Navigation Sidebar:**
- Grid/list of all questions
- Current question highlighted
- Answered questions marked with green
- Unanswered questions in gray
- Click to jump to any question
- Scrollable for large question sets

**Question Display:**
- Large, readable question text
- Four option buttons (A, B, C, D)
- Selected option highlighted
- Previous/Next navigation buttons
- Disabled Previous on first question
- Disabled Next on last question

**Auto-Save Functionality:**
- Answers automatically saved every 2 seconds
- Debounced to prevent excessive database writes
- Transparent to user (no save indicator needed)
- Answers persist across page refreshes

**Timer Functionality:**
- Countdown timer from exam duration
- Automatically calculated from attempt start time
- Auto-submit when timer reaches zero
- Warning visual when less than 5 minutes remain
- Timer persists across page refreshes

**Attempt Management:**
- Exam attempt created when exam is started
- Resume capability if attempt is in progress
- Prevents multiple attempts (unique constraint on exam_id + participant_id)
- Time remaining calculated from original start time

**Process Flow:**
1. Participant clicks "Start Exam"
2. System checks for existing in-progress attempt
3. If exists: Resume with remaining time
4. If not: Create new attempt, record start time
5. Load questions for exam
6. Load any previously saved answers
7. Display exam interface
8. Timer starts countdown
9. Participant answers questions (auto-saved)
10. Participant can navigate between questions
11. Submit exam manually or wait for auto-submit
12. Calculate scores automatically
13. Redirect to results page

**Submission Process:**
1. User clicks "Submit Exam" (or auto-submit on timeout)
2. Confirmation dialog (for manual submit)
3. Fetch all questions with correct answers
4. Compare user answers with correct answers
5. Calculate total score and correct answers count
6. Save all answers with is_correct flag and points_earned
7. Update attempt: status = 'submitted', score, correct_answers, submitted_at
8. Trigger team score calculation (database trigger)
9. Redirect to results page

---

### 9. Exam Results

#### 9.1 Results Page (`/exams/[id]/results`)

**Purpose:** Display detailed exam results to participants

**Access:** Authenticated participants, only for their own submitted exams

**Features:**

**Summary Section:**
- Exam title
- Total score (out of maximum possible)
- Correct answers count (e.g., "45 / 50")
- Percentage score
- Pass/Fail indicator (if passing score set)
- Submitted timestamp

**Question Review:**
- All questions displayed with answers
- Correct answers highlighted in green
- Incorrect answers highlighted in red
- User's selected answer shown
- Points earned for each question
- Option to review all questions with explanations

**Display Format:**
- Questions listed sequentially
- Each question shows:
  - Question text
  - All four options (A, B, C, D)
  - User's selected answer marked
  - Correct answer highlighted
  - Points earned/available

---

### 10. Team Score Aggregation

#### 10.1 Team Score Calculation

**Purpose:** Automatically calculate team scores from individual participant scores

**Implementation:**
- Database trigger automatically calculates team scores when exam attempt is submitted
- Function: `calculate_team_scores(exam_uuid)`
- Trigger: `trigger_update_team_scores` fires on exam_attempts status change

**Calculation Logic:**
1. When participant submits exam:
   - Individual score saved to `exam_attempts.score`
   - Trigger fires if status changes to 'submitted'
2. Team score calculation:
   - Find participant1's score for the exam
   - Find participant2's score for the exam
   - Calculate total_team_score = participant1_score + participant2_score
   - Update or insert into `team_scores` table
   - Calculate rank based on total_team_score (descending)
   - Update rank for all teams

**Team Scores Table:**
- `exam_id` - Reference to exam
- `team_id` - Reference to team
- `participant1_score` - Score of participant 1
- `participant2_score` - Score of participant 2
- `total_team_score` - Sum of both scores
- `rank` - Team rank for the exam
- `last_updated` - Timestamp of last update

**Ranking Rules:**
- Teams ranked by total_team_score (descending)
- Ties broken by last_updated (earlier submission ranks higher)
- Ranks recalculated whenever any team member submits

---

### 11. Leaderboard

#### 11.1 Admin Leaderboard (`/admin/leaderboard`)

**Purpose:** Display team rankings for exams

**Access:** Admin users only

**Features:**
- Dropdown to select exam
- Real-time updates via Supabase subscriptions
- Team rankings table
- Medal indicators for top 3 teams (🥇 🥈 🥉)
- Individual participant scores displayed
- Total team score highlighted

**Display Columns:**
- Rank (with medals for top 3)
- Team Name
- Participant 1 Score
- Participant 2 Score
- Total Team Score

**Real-time Updates:**
- Uses Supabase real-time subscriptions
- Automatically updates when team_scores table changes
- No page refresh required

**Available Exams:**
- Only shows exams with status 'active' or 'completed'
- Sorted by creation date (newest first)

---

### 12. Database Schema - Exam System

#### 12.1 Exams Table

Stores exam information and configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique exam identifier |
| title | VARCHAR(255) | NOT NULL | Exam title |
| description | TEXT | NULL | Exam description |
| duration_minutes | INTEGER | NOT NULL | Exam duration in minutes |
| total_questions | INTEGER | DEFAULT 0 | Total number of questions (auto-updated) |
| passing_score | INTEGER | NULL | Minimum score to pass (optional) |
| scheduled_start | TIMESTAMP WITH TIME ZONE | NULL | Exam start time |
| scheduled_end | TIMESTAMP WITH TIME ZONE | NULL | Exam end time |
| status | VARCHAR(20) | DEFAULT 'draft', CHECK | Exam status: draft, scheduled, active, completed, cancelled |
| created_by | UUID | REFERENCES auth.users(id) | Admin user who created the exam |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- `idx_exams_status` on `status`
- `idx_exams_created_by` on `created_by`
- `idx_exams_scheduled_start` on `scheduled_start`

**RLS Policies:**
- Admins can manage all exams (INSERT, UPDATE, DELETE, SELECT)
- Participants can view scheduled/active exams (SELECT only)

#### 12.2 Questions Table

Stores questions for exams.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique question identifier |
| exam_id | UUID | REFERENCES exams(id), ON DELETE CASCADE | Parent exam |
| question_text | TEXT | NOT NULL | Question text |
| option_a | TEXT | NOT NULL | Option A |
| option_b | TEXT | NOT NULL | Option B |
| option_c | TEXT | NOT NULL | Option C |
| option_d | TEXT | NOT NULL | Option D |
| correct_answer | VARCHAR(1) | CHECK (IN 'A','B','C','D') | Correct answer option |
| points | INTEGER | DEFAULT 1 | Points awarded for correct answer |
| explanation | TEXT | NULL | Explanation for correct answer |
| order_index | INTEGER | NULL | Question order (optional) |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- Primary key on `id`
- `idx_questions_exam_id` on `exam_id`
- `idx_questions_order_index` on `(exam_id, order_index)`

**RLS Policies:**
- Admins can manage all questions
- Participants can view questions for scheduled/active exams

**Auto-update Trigger:**
- When questions added/deleted, `total_questions` in exams table automatically updated

#### 12.3 Exam Attempts Table

Stores individual participant exam attempts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique attempt identifier |
| exam_id | UUID | REFERENCES exams(id), ON DELETE CASCADE | Exam being attempted |
| participant_id | UUID | REFERENCES participants(id), ON DELETE CASCADE | Participant taking exam |
| started_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Attempt start time |
| submitted_at | TIMESTAMP WITH TIME ZONE | NULL | Submission time |
| score | INTEGER | DEFAULT 0 | Total score achieved |
| total_questions | INTEGER | NULL | Total questions in exam |
| correct_answers | INTEGER | DEFAULT 0 | Number of correct answers |
| status | VARCHAR(20) | DEFAULT 'in_progress', CHECK | Status: in_progress, submitted, timeout |
| time_taken_minutes | INTEGER | NULL | Time taken to complete (minutes) |
| UNIQUE(exam_id, participant_id) | | | Prevents multiple attempts per participant per exam |

**Indexes:**
- Primary key on `id`
- `idx_exam_attempts_exam_id` on `exam_id`
- `idx_exam_attempts_participant_id` on `participant_id`
- `idx_exam_attempts_status` on `status`
- Unique index on `(exam_id, participant_id)`

**RLS Policies:**
- Participants can create their own exam attempts
- Participants can view their own attempts
- Participants can update their own in-progress attempts
- Admins can view all attempts

**Team Score Trigger:**
- When attempt status changes to 'submitted', automatically triggers team score calculation

#### 12.4 Exam Answers Table

Stores individual answers for each question in an attempt.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique answer identifier |
| attempt_id | UUID | REFERENCES exam_attempts(id), ON DELETE CASCADE | Parent attempt |
| question_id | UUID | REFERENCES questions(id), ON DELETE CASCADE | Question answered |
| selected_answer | VARCHAR(1) | CHECK (IN 'A','B','C','D'), NULL | Answer selected by participant |
| is_correct | BOOLEAN | NULL | Whether answer is correct |
| points_earned | INTEGER | DEFAULT 0 | Points earned for this answer |
| answered_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Answer timestamp |
| UNIQUE(attempt_id, question_id) | | | One answer per question per attempt |

**Indexes:**
- Primary key on `id`
- `idx_exam_answers_attempt_id` on `attempt_id`
- `idx_exam_answers_question_id` on `question_id`
- Unique index on `(attempt_id, question_id)`

**RLS Policies:**
- Participants can create/update answers for their own in-progress attempts
- Participants can view answers for their own attempts
- Admins can view all answers

#### 12.5 Team Scores Table

Stores aggregated team scores for leaderboards.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique score identifier |
| exam_id | UUID | REFERENCES exams(id), ON DELETE CASCADE | Exam reference |
| team_id | UUID | REFERENCES teams(id), ON DELETE CASCADE | Team reference |
| participant1_score | INTEGER | DEFAULT 0 | Score of participant 1 |
| participant2_score | INTEGER | DEFAULT 0 | Score of participant 2 |
| total_team_score | INTEGER | DEFAULT 0 | Sum of both scores |
| rank | INTEGER | NULL | Team rank for this exam |
| last_updated | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |
| UNIQUE(exam_id, team_id) | | | One score record per team per exam |

**Indexes:**
- Primary key on `id`
- `idx_team_scores_exam_id` on `exam_id`
- `idx_team_scores_team_id` on `team_id`
- `idx_team_scores_total_score` on `(exam_id, total_team_score DESC)` - For leaderboard queries

**RLS Policies:**
- Only admins can view team scores (for leaderboard)

**Auto-calculation:**
- Scores automatically calculated by database function when exam attempts are submitted
- Ranks automatically calculated and updated

#### 12.6 Database Functions

**calculate_team_scores(exam_uuid UUID)**
- Calculates team scores for all teams that have submitted attempts
- Deletes existing scores for the exam
- Inserts new calculated scores
- Updates ranks for all teams
- Called automatically by trigger when attempt is submitted

**update_exam_question_count()**
- Automatically updates `total_questions` in exams table
- Triggered when questions are added or deleted

**update_team_scores_on_submit()**
- Trigger function that calls `calculate_team_scores()` when attempt is submitted
- Ensures team scores are always up-to-date

---

### 13. Security & Access Control

#### 13.1 Role-Based Access

**Admin Users:**
- Full access to exam management
- Can create, edit, delete exams
- Can manage questions
- Can view all attempts and results
- Can view leaderboard
- Verified via `user_profiles.role = 'admin'`

**Participants:**
- Can view available exams
- Can take exams (one attempt per exam)
- Can view their own results
- Cannot view other participants' results
- Cannot view team scores (leaderboard admin-only)

#### 13.2 Exam Access Rules

1. **Exam Visibility:**
   - Participants can only see exams with status 'scheduled' or 'active'
   - Draft and completed exams hidden from participants
   - Scheduled exams visible only within scheduled time window

2. **Exam Attempt Rules:**
   - One attempt per participant per exam (enforced by unique constraint)
   - Cannot start new attempt if one already exists
   - Can resume in-progress attempts
   - Cannot modify submitted attempts

3. **Time Restrictions:**
   - Timer enforces exam duration
   - Auto-submit when time expires
   - Cannot submit after scheduled_end time (future enhancement)

#### 13.3 Data Protection

- Row Level Security (RLS) enabled on all exam tables
- Participants can only access their own attempts and answers
- Question text hidden until exam attempt starts
- Correct answers hidden until exam is submitted
- Team scores only visible to admins

---

### 14. User Flows - Exam System

#### 14.1 Admin: Create and Activate Exam

1. Admin logs in and navigates to `/admin/exams`
2. Clicks "Create New Exam"
3. Fills exam details (title, description, duration, schedule)
4. Clicks "Create Exam"
5. Redirected to question management page
6. Adds questions one by one
7. Reviews questions list
8. Returns to exam list
9. Clicks exam to view details
10. Changes status from 'draft' to 'scheduled' or 'active'
11. Exam now visible to participants

#### 14.2 Participant: Take Exam

1. Participant logs in
2. Navigates to dashboard or `/exams`
3. Views available exams list
4. Clicks "Start Exam" on desired exam
5. Exam interface loads with timer
6. Answers questions (auto-saved every 2 seconds)
7. Navigates between questions using sidebar
8. Reviews all answers before submitting
9. Clicks "Submit Exam"
10. Confirms submission
11. Redirected to results page
12. Reviews detailed results
13. Can view results anytime from `/exams/[id]/results`

#### 14.3 Admin: View Leaderboard

1. Admin logs in and navigates to `/admin/leaderboard`
2. Selects exam from dropdown
3. Views team rankings table
4. Leaderboard updates in real-time as participants submit
5. Can switch between different exams

---

## Technical Architecture

### Technology Stack

#### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Custom components built with Tailwind
- **Form Management:** React Hook Form
- **Validation:** Zod schema validation
- **State Management:** React Hooks (useState, useEffect)

#### Backend
- **BaaS:** Supabase
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth
- **API:** Supabase REST API
- **Session Management:** Supabase SSR with Next.js middleware

#### Development Tools
- **Package Manager:** npm
- **Linting:** ESLint
- **Type Checking:** TypeScript
- **Version Control:** Git

### Project Structure

```
gyana-spandana/
├── app/
│   ├── admin/
│   │   ├── exams/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx       # Exam details
│   │   │   │   └── questions/
│   │   │   │       └── page.tsx    # Question management
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # Create new exam
│   │   │   └── page.tsx            # Exam list
│   │   ├── leaderboard/
│   │   │   └── page.tsx            # Leaderboard
│   │   ├── participants/
│   │   │   └── page.tsx            # Participant management
│   │   └── page.tsx                # Admin dashboard
│   ├── exams/
│   │   ├── [id]/
│   │   │   ├── take/
│   │   │   │   └── page.tsx        # Exam taking interface
│   │   │   └── results/
│   │   │       └── page.tsx        # Exam results
│   │   └── page.tsx                # Available exams list
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts            # Auth callback handler
│   ├── dashboard/
│   │   └── page.tsx                # User dashboard
│   ├── login/
│   │   └── page.tsx                # Login page
│   ├── register/
│   │   └── page.tsx                # Registration page
│   ├── profile/
│   │   └── edit/
│   │       └── page.tsx            # Profile editing
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Landing page
│   └── globals.css                 # Global styles
├── components/
│   ├── ui/
│   │   ├── Button.tsx              # Button component
│   │   ├── Carousel.tsx            # Image carousel
│   │   ├── Input.tsx               # Input component
│   │   ├── PasswordStrength.tsx    # Password strength indicator
│   │   ├── ProfileCompletionModal.tsx  # Profile completion modal
│   │   └── EmailVerification.tsx   # Email verification component
│   └── layout/
│       ├── Navbar.tsx               # Navigation bar
│       └── Footer.tsx               # Footer
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   ├── server.ts               # Server Supabase client
│   │   └── admin.ts                # Admin Supabase client
│   ├── utils/
│   │   ├── scoring.ts              # Score calculation utilities
│   │   └── roles.ts                # Role management utilities
│   ├── validations.ts              # Zod schemas
│   └── utils.ts                    # Utility functions
├── docs/
│   ├── PRD.md                      # This document
│   ├── database-schema.sql         # Base database schema
│   ├── database-exam-schema.sql    # Exam system schema
│   ├── exam-system-setup.md        # Exam system setup guide
│   └── ...                         # Other documentation
├── public/
│   └── images/
│       └── carousel/                # Carousel images
├── middleware.ts                   # Next.js middleware
├── next.config.ts                  # Next.js configuration
├── package.json                    # Dependencies
└── tsconfig.json                   # TypeScript configuration
```

### Authentication Flow

1. **Registration:**
   - User fills registration form
   - Create Supabase Auth user for each participant
   - Store `user_id` in participants table
   - Link participants to team

2. **Login:**
   - User enters email/password
   - Supabase Auth validates credentials
   - Session created and stored in cookies
   - Middleware refreshes session on each request

3. **Session Management:**
   - Middleware checks authentication on protected routes
   - Automatic session refresh
   - Secure cookie handling

4. **Logout:**
   - Supabase Auth sign out
   - Clear session cookies
   - Redirect to login

### Data Flow

1. **Registration:**
   ```
   Form → Validation → Supabase Auth (create users) → Database (create team & participants)
   ```

2. **Login:**
   ```
   Form → Supabase Auth (authenticate) → Session → Dashboard (fetch data)
   ```

3. **Dashboard:**
   ```
   Request → Middleware (check auth) → Fetch user → Fetch participant → Fetch team → Display
   ```

4. **Exam Taking:**
   ```
   Start Exam → Create Attempt → Load Questions → Auto-save Answers → Submit → Calculate Scores → Update Team Scores → Display Results
   ```

5. **Team Score Calculation:**
   ```
   Participant Submits → Trigger Fires → Calculate Team Scores → Update Ranks → Leaderboard Updates (Real-time)
   ```

---

## Database Schema

### Overview

The database uses PostgreSQL via Supabase with Row Level Security (RLS) policies for data protection.

### Tables

#### 1. `teams`

Stores team information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique team identifier |
| team_name | VARCHAR(100) | NOT NULL, UNIQUE | Team name |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`

**RLS Policies:**
- Public can view teams (for leaderboard)

**Triggers:**
- Auto-update `updated_at` on row update

---

#### 2. `participants`

Stores participant information linked to teams and auth users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique participant identifier |
| user_id | UUID | REFERENCES auth.users(id), ON DELETE CASCADE | Link to Supabase Auth user |
| team_id | UUID | REFERENCES teams(id), ON DELETE CASCADE | Link to team |
| name | VARCHAR(100) | NOT NULL | Participant full name |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Email address |
| phone | VARCHAR(10) | NOT NULL, UNIQUE, CHECK format | Phone number (10 digits, starts with 6-9) |
| school_name | VARCHAR(200) | NOT NULL | School name |
| aadhar | VARCHAR(12) | NOT NULL, UNIQUE, CHECK format | Aadhar number (12 digits) |
| email_verified | BOOLEAN | DEFAULT FALSE | Email verification status |
| phone_verified | BOOLEAN | DEFAULT FALSE | Phone verification status |
| is_participant1 | BOOLEAN | NOT NULL | True for participant 1, false for participant 2 |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Constraints:**
- `check_phone_format`: Phone must match `^[6-9]\d{9}$`
- `check_aadhar_format`: Aadhar must match `^\d{12}$`

**Indexes:**
- `idx_participants_user_id` on `user_id`
- `idx_participants_team_id` on `team_id`
- `idx_participants_email` on `email`
- `idx_participants_aadhar` on `aadhar`
- `idx_participants_phone` on `phone`

**RLS Policies:**
- Users can view their own participant data (`auth.uid() = user_id`)
- Users can update their own participant data (`auth.uid() = user_id`)
- Users can insert their own participant data (`auth.uid() = user_id`)
- Public can view participant public data (for leaderboard, excludes sensitive fields)

**Triggers:**
- Auto-update `updated_at` on row update

---

#### 3. `exams` (Exam System)

Stores exam information and configuration. See [Exam System Database Schema](#12-database-schema---exam-system) for complete details.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique exam identifier |
| title | VARCHAR(255) | NOT NULL | Exam title |
| description | TEXT | NULL | Exam description |
| duration_minutes | INTEGER | NOT NULL | Exam duration in minutes |
| total_questions | INTEGER | DEFAULT 0 | Total number of questions (auto-updated) |
| passing_score | INTEGER | NULL | Minimum score to pass (optional) |
| scheduled_start | TIMESTAMP WITH TIME ZONE | NULL | Exam start time |
| scheduled_end | TIMESTAMP WITH TIME ZONE | NULL | Exam end time |
| status | VARCHAR(20) | DEFAULT 'draft', CHECK | Exam status: draft, scheduled, active, completed, cancelled |
| created_by | UUID | REFERENCES auth.users(id) | Admin user who created the exam |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- `idx_exams_status` on `status`
- `idx_exams_created_by` on `created_by`
- `idx_exams_scheduled_start` on `scheduled_start`

**RLS Policies:**
- Admins can manage all exams
- Participants can view scheduled/active exams

---

#### 4. `questions` (Exam System)

Stores questions for exams. See [Exam System Database Schema](#12-database-schema---exam-system) for complete details.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique question identifier |
| exam_id | UUID | REFERENCES exams(id), ON DELETE CASCADE | Parent exam |
| question_text | TEXT | NOT NULL | Question text |
| option_a | TEXT | NOT NULL | Option A |
| option_b | TEXT | NOT NULL | Option B |
| option_c | TEXT | NOT NULL | Option C |
| option_d | TEXT | NOT NULL | Option D |
| correct_answer | VARCHAR(1) | CHECK (IN 'A','B','C','D') | Correct answer option |
| points | INTEGER | DEFAULT 1 | Points awarded for correct answer |
| explanation | TEXT | NULL | Explanation for correct answer |
| order_index | INTEGER | NULL | Question order (optional) |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- Primary key on `id`
- `idx_questions_exam_id` on `exam_id`
- `idx_questions_order_index` on `(exam_id, order_index)`

**RLS Policies:**
- Admins can manage all questions
- Participants can view questions for scheduled/active exams

---

#### 5. `exam_attempts` (Exam System)

Stores individual participant exam attempts. See [Exam System Database Schema](#12-database-schema---exam-system) for complete details.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique attempt identifier |
| exam_id | UUID | REFERENCES exams(id), ON DELETE CASCADE | Exam being attempted |
| participant_id | UUID | REFERENCES participants(id), ON DELETE CASCADE | Participant taking exam |
| started_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Attempt start time |
| submitted_at | TIMESTAMP WITH TIME ZONE | NULL | Submission time |
| score | INTEGER | DEFAULT 0 | Total score achieved |
| total_questions | INTEGER | NULL | Total questions in exam |
| correct_answers | INTEGER | DEFAULT 0 | Number of correct answers |
| status | VARCHAR(20) | DEFAULT 'in_progress', CHECK | Status: in_progress, submitted, timeout |
| time_taken_minutes | INTEGER | NULL | Time taken to complete (minutes) |
| UNIQUE(exam_id, participant_id) | | | Prevents multiple attempts per participant per exam |

**Indexes:**
- Primary key on `id`
- `idx_exam_attempts_exam_id` on `exam_id`
- `idx_exam_attempts_participant_id` on `participant_id`
- `idx_exam_attempts_status` on `status`
- Unique index on `(exam_id, participant_id)`

**RLS Policies:**
- Participants can create/view/update their own attempts
- Admins can view all attempts

---

#### 6. `exam_answers` (Exam System)

Stores individual answers for each question in an attempt. See [Exam System Database Schema](#12-database-schema---exam-system) for complete details.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique answer identifier |
| attempt_id | UUID | REFERENCES exam_attempts(id), ON DELETE CASCADE | Parent attempt |
| question_id | UUID | REFERENCES questions(id), ON DELETE CASCADE | Question answered |
| selected_answer | VARCHAR(1) | CHECK (IN 'A','B','C','D'), NULL | Answer selected by participant |
| is_correct | BOOLEAN | NULL | Whether answer is correct |
| points_earned | INTEGER | DEFAULT 0 | Points earned for this answer |
| answered_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Answer timestamp |
| UNIQUE(attempt_id, question_id) | | | One answer per question per attempt |

**Indexes:**
- Primary key on `id`
- `idx_exam_answers_attempt_id` on `attempt_id`
- `idx_exam_answers_question_id` on `question_id`
- Unique index on `(attempt_id, question_id)`

**RLS Policies:**
- Participants can create/update/view answers for their own attempts
- Admins can view all answers

---

#### 7. `team_scores` (Exam System)

Stores aggregated team scores for leaderboards. See [Exam System Database Schema](#12-database-schema---exam-system) for complete details.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique score identifier |
| exam_id | UUID | REFERENCES exams(id), ON DELETE CASCADE | Exam reference |
| team_id | UUID | REFERENCES teams(id), ON DELETE CASCADE | Team reference |
| participant1_score | INTEGER | DEFAULT 0 | Score of participant 1 |
| participant2_score | INTEGER | DEFAULT 0 | Score of participant 2 |
| total_team_score | INTEGER | DEFAULT 0 | Sum of both scores |
| rank | INTEGER | NULL | Team rank for this exam |
| last_updated | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |
| UNIQUE(exam_id, team_id) | | | One score record per team per exam |

**Indexes:**
- Primary key on `id`
- `idx_team_scores_exam_id` on `exam_id`
- `idx_team_scores_team_id` on `team_id`
- `idx_team_scores_total_score` on `(exam_id, total_team_score DESC)`

**RLS Policies:**
- Only admins can view team scores (for leaderboard)

**Auto-calculation:**
- Scores automatically calculated by database function when exam attempts are submitted

---

### Database Functions

#### `update_updated_at_column()`

Automatically updates the `updated_at` timestamp when a row is updated.

**Usage:**
- Triggered on `teams` table updates
- Triggered on `participants` table updates

---

### Relationships

```
auth.users (Supabase Auth)
    ↓ (1:1)
participants
    ↓ (many:1)
teams
    ↓ (1:many)
quiz_sessions
    ↓ (1:many)
quiz_answers
```

---

## UI/UX Specifications

### Design System

#### Color Palette

- **Primary:** Blue (#2563EB) to Indigo (#4F46E5) gradient
- **Secondary:** White, Gray scale (50-900)
- **Success:** Green (#10B981)
- **Error:** Red (#EF4444)
- **Warning:** Yellow (#F59E0B)
- **Background:** Gradient from Blue-50 via Indigo-50 to Purple-50

#### Typography

- **Font Family:** System fonts (sans-serif)
- **Headings:** Bold, gradient text for main headings
- **Body:** Regular weight, gray-600 to gray-900
- **Sizes:** Responsive (text-sm to text-6xl)

#### Spacing

- **Container:** max-w-7xl for main content
- **Padding:** p-4 to p-12 (responsive)
- **Gaps:** gap-2 to gap-8
- **Margins:** mb-2 to mb-20

#### Components

**Buttons:**
- Primary: Blue gradient background, white text
- Secondary: White background, colored text
- Outline: Border, transparent background
- Sizes: sm, md, lg
- States: Default, hover, active, loading, disabled

**Inputs:**
- Border: gray-300
- Focus: blue-500 ring
- Error: red border and text
- Label: Above input, gray-700
- Helper text: Below input, gray-500

**Cards:**
- Background: White
- Border radius: rounded-2xl
- Shadow: shadow-xl
- Padding: p-8

**Carousel:**
- Full height on desktop
- Auto-slide: 5 seconds
- Navigation: Dots at bottom
- Overlay: Dark overlay (40% opacity) for text readability

---

### Responsive Design

#### Breakpoints

- **Mobile:** < 640px (sm)
- **Tablet:** 640px - 1024px (md, lg)
- **Desktop:** > 1024px (xl, 2xl)

#### Layout Adaptations

**Registration/Login Pages:**
- **Desktop:** Split-screen (60/40)
- **Mobile:** Stacked layout (carousel hidden, full-width form)

**Dashboard:**
- **Desktop:** Multi-column grid
- **Mobile:** Single column stack

**Landing Page:**
- **Desktop:** 3-column feature grid
- **Mobile:** Single column stack

---

### User Experience Flows

#### Registration Flow

1. User lands on landing page
2. Clicks "Register Your Team"
3. Views registration form with carousel
4. Fills team information
5. Fills Participant 1 details (with real-time validation)
6. Fills Participant 2 details (with real-time validation)
7. Checks consent checkbox
8. Submits form
9. Sees loading state
10. Sees success message
11. Redirected to login page

#### Login Flow

1. User lands on login page
2. Views login form with carousel
3. Enters email and password
4. Clicks "Log In"
5. Sees loading state
6. On success: Redirected to dashboard
7. On error: Sees error message

#### Dashboard Flow

1. User accesses dashboard (or redirected after login)
2. Sees loading spinner
3. Dashboard loads with user information
4. Views team information
5. Views quiz status (placeholder)
6. Can logout

---

### Accessibility

- **Keyboard Navigation:** All interactive elements keyboard accessible
- **Focus States:** Visible focus indicators
- **ARIA Labels:** Proper labels for screen readers
- **Color Contrast:** WCAG AA compliant
- **Form Labels:** All inputs have associated labels
- **Error Messages:** Clear, descriptive error messages

---

## Security Requirements

### Authentication Security

1. **Password Requirements:**
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - Stored securely via Supabase Auth (hashed)

2. **Session Management:**
   - JWT tokens via Supabase
   - Secure HTTP-only cookies
   - Automatic session refresh
   - Session expiration handling

3. **Email Verification:**
   - Email verification required (configurable)
   - Verification links sent via Supabase
   - Secure token-based verification

### Data Security

1. **Row Level Security (RLS):**
   - All tables have RLS enabled
   - Users can only access their own data
   - Public data (leaderboard) has restricted access

2. **Input Validation:**
   - Client-side validation (Zod schemas)
   - Server-side validation (database constraints)
   - SQL injection prevention (parameterized queries)
   - XSS prevention (React's built-in escaping)

3. **Data Privacy:**
   - Sensitive data (email, Aadhar) not exposed in public views
   - Password never stored in plain text
   - Secure data transmission (HTTPS)

### API Security

1. **Supabase API:**
   - Anon key for public operations
   - Service role key for admin operations (server-side only)
   - Rate limiting via Supabase

2. **CORS:**
   - Configured via Supabase dashboard
   - Restricted to allowed origins

### Compliance

1. **Data Protection:**
   - GDPR considerations for data handling
   - Indian data protection compliance
   - Secure storage of personal information

2. **User Consent:**
   - Terms and Conditions acceptance required
   - Privacy Policy acceptance required
   - Explicit consent checkbox

---

## Validation Rules

### Team Registration

#### Team Name
- **Required:** Yes
- **Min Length:** 2 characters
- **Max Length:** 100 characters
- **Uniqueness:** Must be unique across all teams
- **Validation:** Server-side check before creation

#### Participant Information

**Name:**
- **Required:** Yes
- **Min Length:** 2 characters
- **Max Length:** 100 characters
- **Pattern:** Any characters (letters, spaces, special characters allowed)

**Email:**
- **Required:** Yes
- **Format:** Valid email format (RFC 5322)
- **Uniqueness:** Must be unique across all participants
- **Validation:** Client-side (Zod) and server-side (database constraint)

**Phone Number:**
- **Required:** Yes
- **Format:** Exactly 10 digits
- **Pattern:** Must start with 6, 7, 8, or 9 (Indian mobile format)
- **Regex:** `^[6-9]\d{9}$`
- **Uniqueness:** Must be unique across all participants
- **Validation:** Client-side (Zod) and server-side (database constraint)

**School Name:**
- **Required:** Yes
- **Min Length:** 2 characters
- **Max Length:** 200 characters
- **Pattern:** Any characters

**Aadhar Number:**
- **Required:** Yes
- **Format:** Exactly 12 digits
- **Pattern:** `^\d{12}$`
- **Uniqueness:** Must be unique across all participants
- **Validation:** Client-side (Zod) and server-side (database constraint)

**Password:**
- **Required:** Yes
- **Min Length:** 8 characters
- **Pattern:** Must contain:
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one number (0-9)
- **Regex:** `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$`
- **Storage:** Hashed via Supabase Auth (never stored in plain text)

#### Cross-Participant Validation

- **Email:** Participant 1 and Participant 2 must have different email addresses
- **Phone:** Participant 1 and Participant 2 must have different phone numbers
- **Aadhar:** Participant 1 and Participant 2 must have different Aadhar numbers

#### Consent
- **Required:** Yes
- **Type:** Boolean checkbox
- **Value:** Must be `true` to submit
- **Message:** "You must agree to the terms and conditions"

### Login Validation

**Email:**
- **Required:** Yes
- **Format:** Valid email format

**Password:**
- **Required:** Yes
- **Min Length:** 1 character (actual validation done by Supabase Auth)

### Error Messages

All validation errors display:
- **Location:** Inline below the field (for form fields)
- **Style:** Red text, clear message
- **Content:** Specific error message explaining the issue
- **Persistence:** Clear when field is corrected

---

## API Specifications

### Supabase Integration

The application uses Supabase's REST API and JavaScript client library.

#### Authentication API

**Sign Up:**
```typescript
supabase.auth.signUp({
  email: string,
  password: string,
  options: {
    emailRedirectTo: string
  }
})
```

**Sign In:**
```typescript
supabase.auth.signInWithPassword({
  email: string,
  password: string
})
```

**Sign Out:**
```typescript
supabase.auth.signOut()
```

**Get User:**
```typescript
supabase.auth.getUser()
```

**Reset Password:**
```typescript
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: string
})
```

#### Database API

**Create Team:**
```typescript
supabase
  .from('teams')
  .insert({ team_name: string })
  .select()
  .single()
```

**Create Participant:**
```typescript
supabase
  .from('participants')
  .insert({
    user_id: UUID,
    team_id: UUID,
    name: string,
    email: string,
    phone: string,
    school_name: string,
    aadhar: string,
    is_participant1: boolean
  })
```

**Check Existing Data:**
```typescript
// Check team name
supabase
  .from('teams')
  .select('id')
  .eq('team_name', string)
  .single()

// Check participants
supabase
  .from('participants')
  .select('email, aadhar')
  .in('email', string[])
  .or('aadhar.in.(...)')
```

**Fetch Participant Data:**
```typescript
supabase
  .from('participants')
  .select('*, teams(*)')
  .eq('user_id', UUID)
  .single()
```

#### Exam System API

**Create Exam (Admin):**
```typescript
supabase
  .from('exams')
  .insert({
    title: string,
    description: string | null,
    duration_minutes: number,
    passing_score: number | null,
    scheduled_start: string | null,
    scheduled_end: string | null,
    status: 'draft',
    created_by: UUID
  })
  .select()
  .single()
```

**Fetch Available Exams:**
```typescript
supabase
  .from('exams')
  .select('*')
  .in('status', ['scheduled', 'active'])
  .order('scheduled_start', { ascending: true })
```

**Create Exam Attempt:**
```typescript
supabase
  .from('exam_attempts')
  .insert({
    exam_id: UUID,
    participant_id: UUID,
    total_questions: number,
    status: 'in_progress'
  })
  .select()
  .single()
```

**Fetch Questions for Exam:**
```typescript
supabase
  .from('questions')
  .select('*')
  .eq('exam_id', UUID)
  .order('order_index', { ascending: true, nullsFirst: false })
  .order('created_at', { ascending: true })
```

**Save Exam Answer (Auto-save):**
```typescript
supabase
  .from('exam_answers')
  .upsert({
    attempt_id: UUID,
    question_id: UUID,
    selected_answer: 'A' | 'B' | 'C' | 'D'
  }, {
    onConflict: 'attempt_id,question_id'
  })
```

**Submit Exam:**
```typescript
// 1. Calculate scores
const { data: questions } = await supabase
  .from('questions')
  .select('id, correct_answer, points')
  .eq('exam_id', UUID)

// 2. Update all answers with scoring
for (const question of questions) {
  await supabase
    .from('exam_answers')
    .upsert({
      attempt_id: UUID,
      question_id: question.id,
      selected_answer: answer,
      is_correct: answer === question.correct_answer,
      points_earned: answer === question.correct_answer ? question.points : 0
    }, {
      onConflict: 'attempt_id,question_id'
    })
}

// 3. Update attempt status
await supabase
  .from('exam_attempts')
  .update({
    status: 'submitted',
    score: totalScore,
    correct_answers: correctCount,
    submitted_at: new Date().toISOString(),
    time_taken_minutes: timeTaken
  })
  .eq('id', attemptId)
```

**Fetch Exam Results:**
```typescript
// Fetch attempt
const { data: attempt } = await supabase
  .from('exam_attempts')
  .select('*')
  .eq('exam_id', UUID)
  .eq('participant_id', UUID)
  .eq('status', 'submitted')
  .single()

// Fetch answers with question details
const { data: answers } = await supabase
  .from('exam_answers')
  .select(`
    *,
    questions (
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer
    )
  `)
  .eq('attempt_id', attempt.id)
```

**Fetch Leaderboard (Admin):**
```typescript
supabase
  .from('team_scores')
  .select('*, teams(team_name), exams(title)')
  .eq('exam_id', UUID)
  .order('total_team_score', { ascending: false })
  .order('rank', { ascending: true })
```

**Real-time Leaderboard Subscription:**
```typescript
const channel = supabase
  .channel('leaderboard-updates')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'team_scores',
      filter: `exam_id=eq.${examId}`
    },
    () => {
      // Refresh leaderboard data
    }
  )
  .subscribe()
```

**Add Question (Admin):**
```typescript
supabase
  .from('questions')
  .insert({
    exam_id: UUID,
    question_text: string,
    option_a: string,
    option_b: string,
    option_c: string,
    option_d: string,
    correct_answer: 'A' | 'B' | 'C' | 'D',
    points: number,
    explanation: string | null
  })
```

**Update Exam Status (Admin):**
```typescript
supabase
  .from('exams')
  .update({ status: 'scheduled' | 'active' | 'completed' })
  .eq('id', UUID)
```

### API Error Handling

All API calls include:
- **Try-Catch Blocks:** Wrap all async operations
- **Error Messages:** User-friendly error messages
- **Loading States:** Show loading indicators during API calls
- **Retry Logic:** Handle network errors gracefully
- **Role Verification:** Admin operations verify user role before execution
- **RLS Enforcement:** Database-level security via Row Level Security policies

---

## Testing Requirements

### Unit Testing

**Components:**
- Input component validation
- Button component states
- Password strength indicator logic

**Utilities:**
- Validation schemas (Zod)
- Utility functions

### Integration Testing

**Registration Flow:**
- Form submission
- API integration
- Error handling
- Success flow

**Login Flow:**
- Authentication
- Session management
- Error handling

**Dashboard Flow:**
- Data fetching
- Authentication check
- Error handling

### End-to-End Testing

**User Journeys:**
1. Complete registration flow
2. Login and access dashboard
3. Logout and re-login
4. Password reset flow

### Manual Testing Checklist

**Registration:**
- [ ] All fields validate correctly
- [ ] Password strength indicator works
- [ ] Duplicate prevention works
- [ ] Success message displays
- [ ] Redirect to login works

**Login:**
- [ ] Valid credentials work
- [ ] Invalid credentials show error
- [ ] Forgot password flow works
- [ ] Remember me checkbox works
- [ ] Redirect to dashboard works

**Dashboard:**
- [ ] Unauthenticated access redirects
- [ ] User data displays correctly
- [ ] Team data displays correctly
- [ ] Logout works

**Responsive Design:**
- [ ] Mobile layout works
- [ ] Tablet layout works
- [ ] Desktop layout works

---

## Deployment Guide

### Prerequisites

1. **Node.js:** Version 18 or higher
2. **Supabase Account:** Active Supabase project
3. **Hosting Platform:** Vercel, Netlify, or similar

### Environment Setup

1. **Create `.env.local` file:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Get Supabase Credentials:**
   - Go to Supabase Dashboard
   - Settings → API
   - Copy Project URL and anon public key

### Database Setup

1. **Run Base Database Schema:**
   - Go to Supabase SQL Editor
   - Run `docs/database-schema.sql`
   - Verify base tables are created (teams, participants)

2. **Run Exam System Schema:**
   - Run `docs/database-exam-schema.sql`
   - This creates exam-related tables (exams, questions, exam_attempts, exam_answers, team_scores)
   - Creates database functions and triggers for team score calculation

3. **Verify RLS Policies:**
   - Check that all tables have RLS enabled
   - Verify policies are created correctly
   - Test admin and participant access restrictions

4. **Set Up Admin User:**
   - Follow instructions in `docs/admin-setup.md`
   - Create at least one admin user for exam management

### Supabase Configuration

1. **Authentication Settings:**
   - Enable Email authentication
   - Configure email templates
   - Set redirect URLs:
     - Development: `http://localhost:3000/auth/callback`
     - Production: `https://yourdomain.com/auth/callback`

2. **CORS Settings:**
   - Add your domain to allowed origins
   - Configure CORS policies

### Build and Deploy

1. **Build Project:**
   ```bash
   npm run build
   ```

2. **Deploy to Hosting:**
   - **Vercel:** Connect GitHub repo, add environment variables
   - **Netlify:** Connect GitHub repo, add environment variables
   - **Other:** Follow platform-specific instructions

3. **Set Environment Variables:**
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Update Supabase Redirect URLs:**
   - Add production domain to allowed redirect URLs

### Post-Deployment

1. **Test Registration:**
   - Create a test team
   - Verify email verification works

2. **Test Login:**
   - Login with test account
   - Verify dashboard loads

3. **Test Exam System:**
   - Create a test exam as admin
   - Add test questions
   - Activate exam
   - Take exam as participant
   - Verify scoring and results
   - Check leaderboard updates

4. **Test Security:**
   - Verify RLS policies work
   - Test unauthorized access (participant trying to create exam)
   - Verify admin-only features are protected
   - Test participant data isolation

5. **Monitor:**
   - Check Supabase dashboard for errors
   - Monitor application logs
   - Check user registrations
   - Monitor exam attempts and submissions

---

## Future Enhancements

### Phase 2: Exam System Enhancements

#### 2.1 Question Management Enhancements

1. **Question Types:**
   - True/False questions
   - Fill-in-the-blank questions
   - Multiple correct answers (select all that apply)
   - Short answer questions
   - Image-based questions

2. **Question Organization:**
   - Question categories/tags (e.g., History, Geography, Culture)
   - Difficulty levels (Easy, Medium, Hard)
   - Question banks and templates
   - Bulk question import (CSV/Excel)
   - Question search and filtering

3. **Question Quality:**
   - Question validation (ensure all options are unique)
   - Question difficulty analysis
   - Question usage statistics
   - Question review workflow

#### 2.2 Exam Configuration Enhancements

1. **Advanced Scheduling:**
   - Recurring exams
   - Time zone support
   - Exam windows (multiple time slots)
   - Late submission penalties

2. **Exam Security:**
   - Proctoring features (screen monitoring)
   - IP address restrictions
   - Browser lockdown mode
   - Question shuffling per attempt
   - Option shuffling per question
   - Random question selection from question bank

3. **Exam Attempts:**
   - Configurable attempt limits (currently: 1 attempt)
   - Practice mode (unlimited attempts, no scoring)
   - Review mode (see answers before submitting)
   - Pause/resume functionality (with time limits)

#### 2.3 Scoring Enhancements

1. **Advanced Scoring:**
   - Partial credit for multiple-step questions
   - Negative marking for incorrect answers
   - Time-based bonus points
   - Category-wise scoring breakdown
   - Weighted questions (different point values)

2. **Analytics:**
   - Question-level analytics (difficulty, discrimination)
   - Participant performance analytics
   - Team performance trends
   - Comparative analysis

#### 2.4 User Experience Enhancements

1. **Exam Interface:**
   - Keyboard shortcuts (arrow keys for navigation)
   - Mark for review functionality
   - Question filtering (answered/unanswered/review)
   - Full-screen exam mode
   - Offline capability with sync

2. **Results Enhancement:**
   - Detailed performance analytics
   - Category-wise performance breakdown
   - Comparison with average scores
   - Downloadable results (PDF)
   - Share results functionality

### Phase 3: Leaderboard Enhancements

1. **Public Leaderboard:**
   - Public-facing leaderboard (participant view)
   - School/district filters
   - Historical leaderboards (past exams)
   - Team comparison view
   - Individual participant rankings

2. **Statistics Dashboard:**
   - Participation statistics
   - Category-wise performance
   - Historical data and trends
   - Performance distribution charts
   - Top performers showcase

### Phase 4: Admin Dashboard Enhancements

1. **Enhanced Admin Features:**
   - User management interface (promote/demote users)
   - Team management (view/edit teams)
   - Bulk operations (bulk question import, bulk exam creation)
   - Advanced analytics dashboard
   - Export capabilities (CSV, PDF, Excel)

2. **Content Management:**
   - Rich text editor for questions (with formatting)
   - Image/media support in questions
   - Exam templates and cloning
   - Question versioning
   - Content approval workflow

3. **Monitoring & Reporting:**
   - Real-time exam monitoring
   - Suspicious activity detection
   - Detailed audit logs
   - Performance reports
   - Custom report generation

### Phase 5: Communication & Notifications

1. **Email Notifications:**
   - Registration confirmation emails
   - Exam reminder emails (before scheduled start)
   - Results notification emails
   - Exam completion confirmations
   - Team score updates

2. **SMS Notifications:**
   - Exam reminders via SMS
   - Results notifications
   - Important announcements

3. **In-App Notifications:**
   - Notification center
   - Real-time alerts
   - Exam announcements

### Phase 6: Additional Features

1. **Phone Verification:**
   - OTP verification during registration
   - SMS integration for verification
   - Phone number verification status

2. **School Management:**
   - School database integration
   - School name autocomplete
   - School-based leaderboards
   - School admin roles

3. **Multi-language Support:**
   - Odia language interface (primary)
   - English interface option
   - Language switcher
   - Bilingual question support

4. **Accessibility:**
   - Screen reader optimization
   - High contrast mode
   - Font size adjustment
   - Keyboard-only navigation

5. **Mobile App:**
   - Native mobile applications (iOS/Android)
   - Offline exam taking capability
   - Push notifications
   - Mobile-optimized interface

---

## Success Metrics

### Registration Metrics

- **Registration Success Rate:** Percentage of successful registrations
- **Form Abandonment Rate:** Percentage of users who start but don't complete registration
- **Average Registration Time:** Time taken to complete registration
- **Error Rate:** Percentage of registration attempts with errors

### Authentication Metrics

- **Login Success Rate:** Percentage of successful logins
- **Password Reset Usage:** Number of password reset requests
- **Session Duration:** Average session length
- **Logout Rate:** Percentage of users who logout vs. session timeout

### User Engagement Metrics

- **Dashboard Access Rate:** Percentage of users who access dashboard after login
- **Return User Rate:** Percentage of users who login multiple times
- **User Retention:** Percentage of users who return after initial registration

### Technical Metrics

- **Page Load Time:** Average page load time
- **API Response Time:** Average API response time
- **Error Rate:** Percentage of requests resulting in errors
- **Uptime:** Application availability percentage

### Exam System Metrics

- **Exam Completion Rate:** Percentage of started exams that are completed
- **Average Exam Duration:** Average time taken to complete exams
- **Question Answer Rate:** Percentage of questions answered per exam
- **Auto-submit Rate:** Percentage of exams auto-submitted due to timeout
- **Average Score:** Mean score across all exam attempts
- **Team Participation Rate:** Percentage of teams with both participants completing exams
- **Leaderboard Update Frequency:** Real-time update performance

### Security Metrics

- **Failed Login Attempts:** Number of failed authentication attempts
- **Security Incidents:** Number of security-related issues
- **Data Breaches:** Number of data breach incidents (target: 0)
- **Unauthorized Access Attempts:** Attempts to access admin features or other users' data

---

## Appendix

### Glossary

- **BaaS:** Backend as a Service
- **RLS:** Row Level Security
- **JWT:** JSON Web Token
- **SSR:** Server-Side Rendering
- **BFF:** Backend for Frontend

### References

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | Development Team | Initial PRD for current implementation |
| 2.0 | 2024 | Development Team | Added comprehensive Exam System documentation including admin features, participant interface, database schema, API specifications, and future enhancements |

---

**End of Document**

