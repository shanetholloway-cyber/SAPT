# SAPT Fitness Booking System - PRD

## Original Problem Statement
Build a booking system for personal training and small group fitness. Session times: 5:30am-6:15am and 9:30am-10:15am daily. Users create accounts, search days using calendar, book time slots. Slots show "available" until booked, then show user initials. Max 3 people per slot. Credit packages: 1 session $30, 2 for $40, unlimited $50/week. Payment via cash or bank transfer. Users need fitness profile. Admin dashboard needed.

## User Personas
1. **Fitness Clients** - People looking to book personal training sessions with Stephanie Anderson
2. **Admin (Stephanie)** - Personal trainer who manages bookings, confirms payments, views client profiles

## Core Requirements (Static)
- Two daily session times: 5:30 AM and 9:30 AM
- Maximum 3 participants per session
- Calendar-based booking interface
- Credit system with 3 packages
- User profiles with fitness information
- Admin dashboard for management

## What's Been Implemented (Feb 1, 2026)

### Backend (FastAPI + MongoDB)
- ✅ User authentication (JWT + Google OAuth)
- ✅ User registration and login
- ✅ Profile management (fitness info, health conditions, emergency contact)
- ✅ Credit purchase system (single $30, duo $40, unlimited $50/week)
- ✅ Booking system with slot availability
- ✅ Admin endpoints for managing clients, bookings, and payments
- ✅ Session token management

### Frontend (React + Tailwind)
- ✅ Landing page with Stephanie's photo and SAPT branding
- ✅ Login/Register pages with Google OAuth option
- ✅ Profile completion form
- ✅ Dashboard with calendar and booking interface
- ✅ My Bookings page
- ✅ Buy Credits page with package selection
- ✅ Admin Dashboard with stats, bookings, clients, and payments tabs

### Design
- ✅ Soft pink (#F5D5D5) branding colors
- ✅ Playfair Display headings, Manrope body text
- ✅ Responsive mobile-friendly design
- ✅ Pill-shaped buttons, rounded cards

## Prioritized Backlog

### P0 (Critical - Done)
- [x] Core booking flow
- [x] User authentication
- [x] Credit management
- [x] Admin dashboard

### P1 (Important - Future)
- [ ] Email notifications for booking confirmations
- [ ] Booking reminders
- [ ] Recurring booking support
- [ ] Waitlist for full sessions

### P2 (Nice to Have)
- [ ] Client progress tracking
- [ ] Integration with calendar apps (Google Calendar)
- [ ] Payment integration (Stripe/PayPal)
- [ ] Mobile app

## Next Tasks
1. Add email notifications for bookings
2. Implement booking reminder system
3. Add ability to set recurring bookings
4. Consider adding waitlist feature for popular slots

## Technical Notes
- Visual edits babel plugin disabled due to compatibility issues
- Admin user: admin@sapt.com / admin123
- Session times are hardcoded: 5:30-6:15 AM and 9:30-10:15 AM
