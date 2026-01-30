# Gyana Spardha - Billing Report

---

**Client:** Gyana Spardha  
**Website:** gyanaspardha.com  
**Report Date:** January 2026  
**Currency:** Indian Rupees (INR)  
**Prepared By:** Development Team

---

## Table of Contents

1. [Project Summary](#project-summary)
2. [One-Time Development Costs](#one-time-development-costs)
3. [Recurring Infrastructure Costs](#recurring-infrastructure-costs)
4. [Third-Party Services](#third-party-services)
5. [Maintenance & Support Packages](#maintenance--support-packages)
6. [Optional Add-ons](#optional-add-ons)
7. [Cost Summary](#cost-summary)
8. [Payment Terms](#payment-terms)
9. [Important Notes](#important-notes)

---

## Project Summary

Gyana Spardha is a comprehensive online quiz competition platform designed for school students in Odisha. The platform includes:

- Team-based registration system (2 participants per team)
- Full exam management system with timer and auto-save
- Real-time leaderboard with team score aggregation
- Comprehensive admin panel with analytics
- AI-powered assistant for administrative queries
- Mobile-responsive design for all devices

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase, Netlify

---

## One-Time Development Costs

### Frontend Development

| Item | Description | Hours | Rate/Hour (INR) | Amount (INR) |
|------|-------------|-------|-----------------|--------------|
| Landing Page | Hero section with 7-slide carousel, features, testimonials, FAQ | 16 | 2,000 | 32,000 |
| Registration System | Team registration with 2 participants, validation, duplicate checks | 24 | 2,000 | 48,000 |
| Login & Auth Pages | Email/password login, Aadhar login, forgot password, session management | 12 | 2,000 | 24,000 |
| User Dashboard | Profile display, team info, exam status, navigation | 20 | 2,000 | 40,000 |
| Exam Taking Interface | Timer, auto-save, question navigation, progress tracking, submission | 32 | 2,000 | 64,000 |
| Results Page | Score display, question review, correct/incorrect indicators | 8 | 2,000 | 16,000 |
| Responsive Design | Mobile, tablet, and desktop optimization across all pages | 16 | 2,000 | 32,000 |
| **Frontend Subtotal** | | **128** | | **2,56,000** |

### Admin Panel Development

| Item | Description | Hours | Rate/Hour (INR) | Amount (INR) |
|------|-------------|-------|-----------------|--------------|
| Admin Dashboard | Statistics cards, recent sessions, quick links, refresh functionality | 24 | 2,000 | 48,000 |
| Exam Management | Create, edit, delete, schedule exams, status management, bulk actions | 32 | 2,000 | 64,000 |
| Question Bank | Centralized questions, filters, bulk operations, preview modal | 28 | 2,000 | 56,000 |
| Participant Management | View, filter, search participants, data export | 16 | 2,000 | 32,000 |
| Leaderboard | Real-time updates, team rankings, medal indicators, exam selection | 20 | 2,000 | 40,000 |
| Analytics Dashboard | Charts, trends, performance metrics, participation statistics | 24 | 2,000 | 48,000 |
| Reports (PDF/CSV) | Exam reports, participant reports, export functionality | 16 | 2,000 | 32,000 |
| AI Assistant | Natural language queries, OpenAI integration, conversation history | 20 | 2,000 | 40,000 |
| Exam Scheduling | Calendar view, time slot picker, conflict detection, ICS export | 16 | 2,000 | 32,000 |
| Team Management | Team assignment, participant linking, team scores | 12 | 2,000 | 24,000 |
| **Admin Panel Subtotal** | | **208** | | **4,16,000** |

### Backend Development

| Item | Description | Hours | Rate/Hour (INR) | Amount (INR) |
|------|-------------|-------|-----------------|--------------|
| Database Schema | 8+ tables (teams, participants, exams, questions, attempts, answers, scores) | 16 | 2,000 | 32,000 |
| RLS Policies | Row Level Security for all tables, role-based access control | 12 | 2,000 | 24,000 |
| API Endpoints | 15+ endpoints for auth, admin, email, calendar, analytics | 24 | 2,000 | 48,000 |
| Real-time Features | Live leaderboard updates, Supabase subscriptions | 16 | 2,000 | 32,000 |
| Database Functions | Team score calculation, triggers, auto-updates | 12 | 2,000 | 24,000 |
| **Backend Subtotal** | | **80** | | **1,60,000** |

### Security & Quality Assurance

| Item | Description | Hours | Rate/Hour (INR) | Amount (INR) |
|------|-------------|-------|-----------------|--------------|
| Form Validation | Zod schemas, password strength, duplicate prevention | 12 | 2,000 | 24,000 |
| Security Implementation | Data encryption, session management, CORS configuration | 8 | 2,000 | 16,000 |
| QA & Testing | Manual testing, cross-browser testing, mobile testing | 24 | 1,500 | 36,000 |
| **Security & QA Subtotal** | | **44** | | **76,000** |

### Development Cost Summary

| Category | Hours | Amount (INR) |
|----------|-------|--------------|
| Frontend Development | 128 | 2,56,000 |
| Admin Panel Development | 208 | 4,16,000 |
| Backend Development | 80 | 1,60,000 |
| Security & QA | 44 | 76,000 |
| **TOTAL DEVELOPMENT** | **460** | **9,08,000** |

---

## Recurring Infrastructure Costs

### Monthly Infrastructure

| Service | Provider | Plan | Description | Monthly (INR) | Annual (INR) |
|---------|----------|------|-------------|---------------|--------------|
| Web Hosting | Netlify | Business | Next.js app hosting, serverless functions, analytics | 8,300 | 99,600 |
| Database | Supabase | Pro | PostgreSQL database, 8GB storage, 500MB bandwidth/day | 2,100 | 25,200 |
| Authentication | Supabase | Pro | User authentication, session management (included in Pro) | 0 | 0 |
| File Storage | Supabase | Pro | Profile photos, assets, 100GB storage | 2,100 | 25,200 |
| Domain | Registrar | .com | gyanaspardha.com annual renewal | 125 | 1,500 |
| SSL Certificate | Netlify | Included | HTTPS security (included with hosting) | 0 | 0 |
| **INFRASTRUCTURE TOTAL** | | | | **12,625** | **1,51,500** |

---

## Third-Party Services

### Monthly Service Estimates

| Service | Provider | Purpose | Estimated Usage | Monthly (INR) | Annual (INR) |
|---------|----------|---------|-----------------|---------------|--------------|
| Email Service | Resend | Registration confirmations, verification, notifications | 3,000 emails/month | 1,700 | 20,400 |
| AI API | OpenAI | Admin assistant for natural language queries | 100K tokens/month | 850 | 10,200 |
| Image Assets | Unsplash | Stock images for carousel and marketing | Free tier | 0 | 0 |
| **THIRD-PARTY TOTAL** | | | | **2,550** | **30,600** |

---

## Maintenance & Support Packages

### Available Packages

| Package | Services Included | Response Time | Monthly (INR) | Annual (INR) |
|---------|-------------------|---------------|---------------|--------------|
| **Basic** | Bug fixes, Security patches, Uptime monitoring, Monthly reports | 48 hours | 15,000 | 1,80,000 |
| **Standard** | Basic + Feature updates, Database optimization, Performance tuning, Bi-weekly reports | 24 hours | 25,000 | 3,00,000 |
| **Premium** | Standard + Priority support, 24/7 monitoring, Dedicated account manager, Weekly reports | 4 hours | 40,000 | 4,80,000 |

### Maintenance Services Detail

| Service | Basic | Standard | Premium |
|---------|-------|----------|---------|
| Bug Fixes | Yes | Yes | Yes |
| Security Patches | Yes | Yes | Yes |
| Uptime Monitoring | Yes | Yes | Yes |
| Feature Updates | No | Yes | Yes |
| Database Optimization | No | Yes | Yes |
| Performance Tuning | No | Yes | Yes |
| 24/7 Monitoring | No | No | Yes |
| Priority Support | No | No | Yes |
| Dedicated Account Manager | No | No | Yes |

---

## Optional Add-ons

### One-Time Add-ons

| Add-on | Description | Amount (INR) |
|--------|-------------|--------------|
| Custom Email Setup | @gyanaspardha.com email configuration with professional hosting | 5,000 |
| Google Analytics | Advanced GA4 setup with custom events and conversion tracking | 8,000 |
| SMS Integration | OTP verification system integration (Twilio/MSG91) | 15,000 |
| Multi-language Support | Odia language interface addition | 45,000 |
| Advanced Security Audit | Third-party security assessment and recommendations | 25,000 |
| Load Testing | Performance testing for concurrent exam sessions | 15,000 |

### Recurring Add-ons

| Add-on | Description | Monthly (INR) | Annual (INR) |
|--------|-------------|---------------|--------------|
| Custom Email Hosting | @gyanaspardha.com mailboxes (5 users) | 500 | 6,000 |
| Additional Storage | Per 100GB additional Supabase storage | 2,100 | 25,200 |
| SMS Credits | Per 1,000 SMS (OTP/notifications) | 400 | Based on usage |
| CDN Enhancement | CloudFlare Pro for global performance | 1,700 | 20,400 |
| Backup Service | Daily automated backups with 30-day retention | 2,500 | 30,000 |

### Future Development (On Request)

| Feature | Description | Estimated Cost (INR) |
|---------|-------------|----------------------|
| Mobile App (Android) | Native Android app with exam taking capability | 2,00,000 |
| Mobile App (iOS) | Native iOS app with exam taking capability | 2,50,000 |
| Mobile App (Both) | Cross-platform app (React Native) | 3,50,000 |
| Payment Gateway | Online payment integration for registration fees | 35,000 |
| Advanced Analytics | Custom dashboards with BI tools integration | 75,000 |
| Video Proctoring | Exam monitoring with webcam integration | 1,50,000 |

---

## Cost Summary

### First Year Total Cost

| Category | Amount (INR) |
|----------|--------------|
| One-Time Development | 9,08,000 |
| Annual Infrastructure (Hosting, Database, Domain) | 1,51,500 |
| Annual Third-Party Services (Email, AI API) | 30,600 |
| Annual Maintenance (Standard Package) | 3,00,000 |
| **FIRST YEAR TOTAL** | **13,90,100** |

### Recurring Annual Cost (Year 2 onwards)

| Category | Amount (INR) |
|----------|--------------|
| Annual Infrastructure | 1,51,500 |
| Annual Third-Party Services | 30,600 |
| Annual Maintenance (Standard Package) | 3,00,000 |
| **RECURRING ANNUAL TOTAL** | **4,82,100** |

### Cost Breakdown Chart

```
First Year Breakdown:
├── Development (One-Time)     : ₹9,08,000  (65.3%)
├── Infrastructure (Annual)    : ₹1,51,500  (10.9%)
├── Third-Party Services       : ₹30,600    (2.2%)
└── Maintenance (Annual)       : ₹3,00,000  (21.6%)
                                ─────────────
                         Total : ₹13,90,100

Recurring Annual:
├── Infrastructure             : ₹1,51,500  (31.4%)
├── Third-Party Services       : ₹30,600    (6.3%)
└── Maintenance                : ₹3,00,000  (62.3%)
                                ─────────────
                         Total : ₹4,82,100
```

---

## Payment Terms

### Development Payment Schedule

| Milestone | Percentage | Amount (INR) | Due Date |
|-----------|------------|--------------|----------|
| Project Kickoff | 50% | 4,54,000 | On contract signing |
| Development Milestone (Admin Panel Complete) | 25% | 2,27,000 | Mid-development |
| Final Delivery & Go-Live | 25% | 2,27,000 | On project completion |
| **Total** | **100%** | **9,08,000** | |

### Recurring Services Payment

| Service Type | Billing Cycle | Payment Due |
|--------------|---------------|-------------|
| Infrastructure (Hosting, Database) | Monthly/Annual | 1st of each month / Start of year |
| Third-Party Services | Monthly | As per usage |
| Maintenance & Support | Monthly/Quarterly | 1st of billing period |

### Payment Methods Accepted

- Bank Transfer (NEFT/RTGS/IMPS)
- UPI
- Cheque (for amounts above ₹50,000)

---

## Important Notes

### Pricing Terms

1. **GST:** All prices mentioned are **exclusive of GST (18%)**. GST will be charged additionally on the invoice.

2. **Validity:** This quotation is valid for **30 days** from the report date.

3. **Revisions:** Development costs include **2 rounds of revisions**. Additional revisions will be billed at the standard hourly rate of ₹2,000/hour.

### Variable Costs

4. **Hosting Costs:** May vary based on actual traffic volume. The quoted amounts are for estimated traffic of up to 10,000 monthly active users.

5. **Third-Party APIs:** Email and AI API costs are estimates based on typical usage patterns. Actual costs may vary based on usage.

6. **Storage:** Additional storage beyond the included quota will be charged as per the add-on rates.

### Service Terms

7. **Maintenance Contract:** Minimum 6-month commitment required for maintenance packages.

8. **Support Hours:** Standard support hours are Monday-Saturday, 10 AM - 7 PM IST. Premium package includes 24/7 support.

9. **Custom Development:** Any feature requests not included in the original scope will be quoted separately.

### Technical Requirements

10. **Client Responsibilities:**
    - Provide Supabase project credentials
    - Provide domain access for DNS configuration
    - Provide content (images, text) for marketing pages
    - Timely feedback on deliverables

11. **Intellectual Property:** Source code ownership transfers to client upon full payment.

---

## Contact Information

For queries regarding this billing report, please contact:

**Development Team**  
Email: [Contact Email]  
Phone: [Contact Phone]

---

**Document Version:** 1.0  
**Last Updated:** January 2026

---

*This document is confidential and intended for the client's internal use only.*
