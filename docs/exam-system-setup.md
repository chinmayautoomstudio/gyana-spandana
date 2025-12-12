# Exam System Setup Guide

## Overview
Complete guide for setting up the exam system in Gyana Spandana.

## Step 1: Database Setup

1. **Run the base schema** (if not already done):
   - Go to Supabase SQL Editor
   - Run `docs/database-schema.sql`

2. **Run the exam schema**:
   - Run `docs/database-exam-schema.sql`
   - This creates all exam-related tables and functions

## Step 2: Set Up Admin User

1. Follow the instructions in `docs/admin-setup.md`
2. Set at least one user as admin

## Step 3: Create Your First Exam

1. Log in as admin
2. Navigate to `/admin/exams`
3. Click "Create New Exam"
4. Fill in exam details:
   - Title
   - Description (optional)
   - Duration in minutes
   - Passing score (optional)
   - Scheduled start/end times (optional)
5. Click "Create Exam"
6. You'll be redirected to add questions

## Step 4: Add Questions

1. On the questions page, click "Add Question"
2. Fill in:
   - Question text
   - Four options (A, B, C, D)
   - Correct answer
   - Points (default: 1)
   - Explanation (optional)
3. Click "Add Question"
4. Repeat for all questions

## Step 5: Schedule Exam

1. Go back to exam details
2. Click "Schedule Exam" (changes status from draft to scheduled)
3. Or click "Activate Exam" to make it immediately available

## Step 6: Participants Take Exam

1. Participants log in
2. Navigate to `/exams` (or click "Available Exams" in dashboard)
3. Click "Start Exam" on an active exam
4. Answer questions and submit

## Step 7: View Leaderboard

1. Admin navigates to `/admin/leaderboard`
2. Select an exam from dropdown
3. View real-time team rankings

## Database Functions

The system includes automatic functions:

- **calculate_team_scores()**: Calculates team scores from individual participant scores
- **update_team_scores_on_submit()**: Trigger that updates team scores when an attempt is submitted
- **update_exam_question_count()**: Automatically updates total_questions count in exams table

## Important Notes

- Participants can only take each exam once
- Exams must be in "scheduled" or "active" status for participants to see them
- Team scores are calculated automatically when both participants submit
- Leaderboard updates in real-time using Supabase subscriptions
- Timer automatically submits exam when time expires

