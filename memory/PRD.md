# SAPT Fitness Booking System - PRD

## Original Problem Statement
Build a booking system for personal training and small group fitness. Session times: 5:30am-6:15am and 9:30am-10:15am daily. Users create accounts, search days using calendar, book time slots. Slots show "available" until booked, then show user initials. Max 3 people per slot. Credit packages: 1 session $30, 2 for $40, unlimited $50/week. Payment via cash or bank transfer. Users need fitness profile. Admin dashboard needed. Browser push notifications for booking confirmations and reminders.

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
- Push notifications for booking confirmations

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
  - `/api/notifications/subscribe` - Store push subscriptions
  - `/api/notifications/unsubscribe` - Remove subscriptions
  - `/api/notifications/test` - Send test notifications
  - `/api/notifications` - Get user notifications
  - `/api/notifications/unread` - Get unread notifications
  - `/api/notifications/{id}/read` - Mark as read
  - `/api/notifications/read-all` - Mark all as read
  - Automatic notification on booking confirmation

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
  - Mark as read functionality
  - Enable push notifications banner
  - Service worker for push handling

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
- [x] Push notification system for booking confirmations

### P1 (Important - Upcoming)
- [ ] Push notification reminders (24hr and 1hr before session)
- [ ] Email notifications (SendGrid integration) - deferred by user
- [ ] SMS notifications (Twilio integration) - deferred by user

### P2 (Nice to Have)
- [ ] Recurring booking support
- [ ] Waitlist for full sessions
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

## Files of Reference
- `/app/backend/server.py` - Main backend with all routes
- `/app/frontend/src/components/NotificationBell.jsx` - Notification UI
- `/app/frontend/src/hooks/usePushNotifications.js` - Push notification hook
- `/app/frontend/public/sw.js` - Service worker
- `/app/frontend/src/components/Layout.jsx` - Navigation with notification bell
