# SAPT Fitness Booking System - PRD

## Original Problem Statement
Build a booking system for personal training and small group fitness. Session times: 5:30am-6:15am and 9:30am-10:15am daily. Users create accounts, search days using calendar, book time slots. Slots show "available" until booked, then show user initials. Max 3 people per slot. Credit packages: 1 session $30, 2 for $40, unlimited $50/week. Payment via cash or bank transfer. Users need fitness profile. Admin dashboard needed. Browser push notifications for booking confirmations and reminders. Recurring bookings and waitlist system.

## User Personas
1. **Fitness Clients** - People looking to book personal training sessions with Stephanie Anderson
2. **Admin (Stephanie)** - Personal trainer who manages bookings, confirms payments, views client profiles

## Core Requirements (Static)
- Two daily session times: 5:30 AM and 9:30 AM (configurable by admin)
- Maximum 3 participants per session
- Calendar-based booking interface
- Credit system with 3 packages
- User profiles with fitness information
- Admin dashboard for management
- Push notifications for booking confirmations and reminders
- Recurring booking support
- Waitlist system with auto-promotion

## What's Been Implemented

### Backend (FastAPI + MongoDB)
- ✅ User authentication (JWT + Google OAuth)
- ✅ User registration and login
- ✅ Profile management (fitness info, health conditions, emergency contact)
- ✅ Credit purchase system (single $30, duo $40, unlimited $50/week)
- ✅ Booking system with slot availability
- ✅ Admin endpoints for managing clients, bookings, and payments
- ✅ Session token management
- ✅ **Push Notification System** (Feb 2, 2026)
  - Subscribe/unsubscribe endpoints
  - Test notification endpoint
  - Notification CRUD operations
  - Automatic notification on booking confirmation
- ✅ **Recurring Booking System** (Feb 2, 2026)
  - POST /api/bookings with is_recurring=true and recurring_weeks
  - Creates multiple bookings across weeks
  - Adds to waitlist for full dates
- ✅ **Waitlist System** (Feb 2, 2026)
  - POST /api/waitlist - Join waitlist for full slot
  - GET /api/waitlist/my - User's waitlist entries
  - DELETE /api/waitlist/{id} - Leave waitlist
  - Auto-promotion when cancellation opens a spot
  - "You're In!" push notification on promotion
- ✅ **Reminder Scheduler** (Feb 2, 2026)
  - Background task runs every 15 minutes
  - Sends 24-hour reminders (23-25 hours before)
  - Sends 1-hour reminders (0.5-1.5 hours before)
  - Tracks reminder_24h_sent and reminder_1h_sent flags

### Frontend (React + Tailwind)
- ✅ Landing page with Stephanie's photo and SAPT branding
- ✅ Login/Register pages with Google OAuth option
- ✅ Profile completion form
- ✅ Dashboard with calendar and booking interface
- ✅ My Bookings page
- ✅ Buy Credits page with package selection
- ✅ Admin Dashboard with stats, bookings, clients, and payments tabs
- ✅ **Notification Bell Component** (Feb 2, 2026)
  - NotificationBell in navigation bar
  - Dropdown showing notification list
  - Unread badge counter
  - Enable push notifications banner
- ✅ **Recurring Booking UI** (Feb 2, 2026)
  - Repeat icon next to "Book Session" button
  - Dialog with 2/4/6/8 week selection
  - Preview of dates to be booked
  - Credits needed calculation
- ✅ **Waitlist UI** (Feb 2, 2026)
  - "Join Waitlist" button on full slots
  - Waitlist count display
  - "You are #X on the waitlist" indicator
  - "Leave Waitlist" button
  - "From Waitlist" badge on promoted bookings
  - Waitlist entries section in My Bookings
- ✅ **My Bookings Enhancements** (Feb 2, 2026)
  - "Recurring" badge on recurring bookings
  - "From Waitlist" badge on promoted bookings
  - Waitlist entries with position indicator

### Design
- ✅ Soft pink (#F5D5D5) branding colors
- ✅ Playfair Display headings, Manrope body text
- ✅ Responsive mobile-friendly design
- ✅ Pill-shaped buttons, rounded cards
- ✅ Gold/amber color (#E6C785) for waitlist indicators

## Prioritized Backlog

### P0 (Critical - Done)
- [x] Core booking flow
- [x] User authentication
- [x] Credit management
- [x] Admin dashboard
- [x] Push notification system for booking confirmations
- [x] Push notification reminders (24hr and 1hr)
- [x] Recurring booking support
- [x] Waitlist with auto-promotion and notifications

### P1 (Important - Upcoming)
- [ ] Email notifications (SendGrid integration) - deferred by user
- [ ] SMS notifications (Twilio integration) - deferred by user

### P2 (Nice to Have)
- [ ] Client progress tracking
- [ ] Integration with calendar apps (Google Calendar)
- [ ] Payment integration (Stripe/PayPal)

## Technical Notes
- Visual edits babel plugin disabled due to compatibility issues with complex JSX
- Admin user: admin@sapt.com / admin123
- Session times configurable via admin dashboard
- Push notifications use Web Push API with service worker
- Notifications stored in MongoDB `notifications` collection
- Subscriptions stored in `push_subscriptions` collection
- Waitlist entries stored in `waitlist` collection
- Reminder scheduler runs as background asyncio task every 15 minutes

## Database Collections
- **users** - User accounts and profiles
- **bookings** - Session bookings (includes is_recurring, from_waitlist flags)
- **waitlist** - Waitlist entries with position
- **notifications** - User notifications
- **push_subscriptions** - Browser push subscriptions
- **credit_transactions** - Credit purchase records
- **site_settings** - Admin-configurable site settings
- **user_sessions** - OAuth session tokens

## Files of Reference
- `/app/backend/server.py` - Main backend with all routes
- `/app/frontend/src/pages/DashboardPage.jsx` - Booking UI with waitlist and recurring
- `/app/frontend/src/pages/BookingsPage.jsx` - My Bookings with waitlist display
- `/app/frontend/src/components/NotificationBell.jsx` - Notification UI
- `/app/frontend/src/hooks/usePushNotifications.js` - Push notification hook
- `/app/frontend/public/sw.js` - Service worker
- `/app/frontend/src/components/Layout.jsx` - Navigation with notification bell
