# GYANA SPARDHA - Odisha Quiz Competition Website

A beautiful, modern quiz competition website for Odisha's culture, traditions, history, and geography. Built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## Features

- 🎯 **Team Registration**: Register teams with 2 participants
- 🔐 **Secure Authentication**: Individual login with email/Aadhar support
- 📝 **Form Validation**: Real-time validation with clear error messages
- 🎨 **Beautiful UI**: Modern, responsive design with Odia cultural elements
- 🔒 **Security**: Supabase authentication with Row Level Security (RLS)
- 📱 **Responsive**: Mobile-friendly design

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication)
- **Form Handling**: React Hook Form + Zod validation
- **UI Components**: Custom components with Tailwind

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### Installation

1. Clone the repository or navigate to the project directory:
   ```bash
   cd gyana-spandana
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. Set up the database:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the SQL script from `docs/database-schema.sql` to create all necessary tables

5. Configure Supabase Authentication:
   - In Supabase Dashboard, go to Authentication > Settings
   - Enable Email authentication
   - Configure email templates (verification, password reset)
   - Set up redirect URLs:
     - `http://localhost:3000/auth/callback` (for development)
     - `https://yourdomain.com/auth/callback` (for production)

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
gyana-spandana/
├── app/
│   ├── auth/
│   │   └── callback/          # Supabase auth callback
│   ├── dashboard/             # User dashboard (protected)
│   ├── login/                 # Login page
│   ├── register/              # Team registration page
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Landing page
│   └── globals.css            # Global styles
├── components/
│   └── ui/                    # Reusable UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       └── PasswordStrength.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser Supabase client
│   │   └── server.ts          # Server Supabase client
│   ├── validations.ts         # Zod schemas
│   └── utils.ts               # Utility functions
├── docs/
│   └── database-schema.sql    # Database schema
├── middleware.ts              # Next.js middleware for auth
└── .env.local.example         # Environment variables template
```

## Key Features Implementation

### Registration Page (`/register`)
- Team registration form with 2 participants
- Real-time form validation
- Password strength indicator
- Email and Aadhar uniqueness checks
- Success confirmation with email verification reminder

### Login Page (`/login`)
- Email or Aadhar number login
- Forgot password functionality
- Remember me option
- Redirect to dashboard after successful login

### Dashboard (`/dashboard`)
- Protected route (requires authentication)
- Displays user and team information
- Placeholder for quiz functionality

## Database Schema

The application uses the following main tables:

- **teams**: Stores team information
- **participants**: Stores participant details (linked to teams)
- **quiz_sessions**: For future quiz functionality
- **quiz_answers**: For future quiz answers storage

See `docs/database-schema.sql` for the complete schema with RLS policies.

## Validation Rules

### Participant Information
- **Name**: 2-100 characters
- **Email**: Valid email format, unique
- **Phone**: 10-digit Indian mobile number (starts with 6-9)
- **School Name**: 2-200 characters
- **Aadhar**: Exactly 12 digits, unique
- **Password**: Minimum 8 characters, must contain uppercase, lowercase, and a number

### Team Registration
- Team name must be unique
- Both participants must have different emails, phones, and Aadhar numbers
- Consent checkbox required

## Security Features

- Password hashing handled by Supabase Auth
- Row Level Security (RLS) policies on all tables
- Secure authentication with JWT tokens
- Protected routes via middleware
- Input validation and sanitization

## Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

## Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy to Vercel, Netlify, or your preferred hosting platform

3. Update environment variables in your hosting platform

4. Update Supabase redirect URLs to include your production domain

## Future Enhancements

- Quiz participation interface
- Real-time leaderboard
- Admin dashboard
- Email notifications
- Phone OTP verification
- School name autocomplete

## License

This project is private and proprietary.

## Support

For issues or questions, please contact the development team.
