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

🚧 **In Development:**
- Quiz participation interface
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
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts          # Auth callback handler
│   ├── dashboard/
│   │   └── page.tsx               # User dashboard
│   ├── login/
│   │   └── page.tsx               # Login page
│   ├── register/
│   │   └── page.tsx               # Registration page
│   ├── test-connection/
│   │   └── page.tsx               # Connection test page
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing page
│   └── globals.css                 # Global styles
├── components/
│   └── ui/
│       ├── Button.tsx              # Button component
│       ├── Carousel.tsx            # Image carousel
│       ├── Input.tsx               # Input component
│       └── PasswordStrength.tsx    # Password strength indicator
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser Supabase client
│   │   └── server.ts              # Server Supabase client
│   ├── validations.ts             # Zod schemas
│   └── utils.ts                   # Utility functions
├── docs/
│   ├── PRD.md                     # This document
│   ├── database-schema.sql        # Database schema
│   └── ...                        # Other documentation
├── public/
│   └── images/
│       └── carousel/              # Carousel images
├── middleware.ts                  # Next.js middleware
├── next.config.ts                 # Next.js configuration
├── package.json                   # Dependencies
└── tsconfig.json                  # TypeScript configuration
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

#### 3. `quiz_sessions` (Future Use)

Stores quiz session information for participants.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique session identifier |
| participant_id | UUID | REFERENCES participants(id), ON DELETE CASCADE | Link to participant |
| started_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Session start time |
| completed_at | TIMESTAMP WITH TIME ZONE | NULL | Session completion time |
| score | INTEGER | DEFAULT 0 | Quiz score |
| total_questions | INTEGER | DEFAULT 0 | Total questions in quiz |
| status | VARCHAR(20) | DEFAULT 'in_progress', CHECK | Session status (in_progress, completed, abandoned) |

**Indexes:**
- `idx_quiz_sessions_participant_id` on `participant_id`

**RLS Policies:**
- Users can view their own quiz sessions
- Users can insert their own quiz sessions

---

#### 4. `quiz_answers` (Future Use)

Stores individual quiz answers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique answer identifier |
| session_id | UUID | REFERENCES quiz_sessions(id), ON DELETE CASCADE | Link to quiz session |
| question_id | UUID | NULL | Question identifier |
| answer | TEXT | NULL | Answer text |
| is_correct | BOOLEAN | NULL | Whether answer is correct |
| answered_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Answer timestamp |

**Indexes:**
- `idx_quiz_answers_session_id` on `session_id`

**RLS Policies:**
- Inherited from quiz_sessions policies

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

### API Error Handling

All API calls include:
- **Try-Catch Blocks:** Wrap all async operations
- **Error Messages:** User-friendly error messages
- **Loading States:** Show loading indicators during API calls
- **Retry Logic:** Handle network errors gracefully

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

1. **Run Database Schema:**
   - Go to Supabase SQL Editor
   - Run `docs/database-schema.sql`
   - Verify tables are created

2. **Verify RLS Policies:**
   - Check that all tables have RLS enabled
   - Verify policies are created correctly

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

3. **Test Security:**
   - Verify RLS policies work
   - Test unauthorized access

4. **Monitor:**
   - Check Supabase dashboard for errors
   - Monitor application logs
   - Check user registrations

---

## Future Enhancements

### Phase 2: Quiz Functionality

1. **Quiz Interface:**
   - Question display
   - Answer submission
   - Timer functionality
   - Progress indicator

2. **Question Management:**
   - Question database
   - Question categories
   - Difficulty levels
   - Multiple question types

3. **Scoring System:**
   - Automatic scoring
   - Score calculation
   - Team score aggregation

### Phase 3: Leaderboard

1. **Public Leaderboard:**
   - Team rankings
   - Individual scores
   - School/district filters
   - Real-time updates

2. **Statistics:**
   - Participation statistics
   - Category-wise performance
   - Historical data

### Phase 4: Admin Dashboard

1. **Admin Features:**
   - User management
   - Team management
   - Quiz management
   - Analytics dashboard

2. **Content Management:**
   - Question editor
   - Quiz configuration
   - Event management

### Phase 5: Additional Features

1. **Email Notifications:**
   - Registration confirmation
   - Quiz reminders
   - Results notifications

2. **Phone Verification:**
   - OTP verification
   - SMS integration

3. **School Autocomplete:**
   - School database integration
   - Autocomplete functionality

4. **Multi-language Support:**
   - English interface option
   - Language switcher

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

### Security Metrics

- **Failed Login Attempts:** Number of failed authentication attempts
- **Security Incidents:** Number of security-related issues
- **Data Breaches:** Number of data breach incidents (target: 0)

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

---

**End of Document**

