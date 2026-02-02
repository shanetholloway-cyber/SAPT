import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
  CreditCard, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ListOrdered,
  Repeat,
  X
} from "lucide-react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DashboardPage = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [joiningWaitlist, setJoiningWaitlist] = useState(null);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [recurringSlot, setRecurringSlot] = useState(null);
  const [recurringWeeks, setRecurringWeeks] = useState(4);

  // Fetch slots when date changes
  useEffect(() => {
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const response = await axios.get(`${API}/bookings/slots/${dateStr}`);
        setSlots(response.data);
      } catch (error) {
        console.error("Failed to fetch slots:", error);
        toast.error("Failed to load availability");
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDate]);

  const handleBookSlot = async (timeSlot, isRecurring = false, weeks = 1) => {
    // Check if user has credits
    if (!user.has_unlimited && user.credits <= 0) {
      toast.error("No credits available. Please purchase a session package.");
      navigate("/credits");
      return;
    }

    setBookingSlot(timeSlot);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await axios.post(`${API}/bookings`, {
        date: dateStr,
        time_slot: timeSlot,
        is_recurring: isRecurring,
        recurring_weeks: weeks
      });
      
      if (isRecurring) {
        const data = response.data;
        toast.success(data.message || "Recurring sessions booked!");
        if (data.waitlisted_dates?.length > 0) {
          toast.info(`${data.waitlisted_dates.length} dates added to waitlist`);
        }
      } else {
        toast.success("Session booked successfully!");
      }
      
      // Refresh user credits
      const userResponse = await axios.get(`${API}/auth/me`);
      setUser(userResponse.data);
      
      // Refresh slots
      const slotsResponse = await axios.get(`${API}/bookings/slots/${dateStr}`);
      setSlots(slotsResponse.data);
      
      setShowRecurringDialog(false);
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to book session";
      toast.error(message);
    } finally {
      setBookingSlot(null);
    }
  };

  const handleJoinWaitlist = async (timeSlot) => {
    setJoiningWaitlist(timeSlot);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await axios.post(`${API}/waitlist`, {
        date: dateStr,
        time_slot: timeSlot,
      });
      
      toast.success(response.data.message || "Added to waitlist!");
      
      // Refresh slots
      const slotsResponse = await axios.get(`${API}/bookings/slots/${dateStr}`);
      setSlots(slotsResponse.data);
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to join waitlist";
      toast.error(message);
    } finally {
      setJoiningWaitlist(null);
    }
  };

  const handleLeaveWaitlist = async (timeSlot) => {
    try {
      // Get waitlist entries for the user
      const waitlistResponse = await axios.get(`${API}/waitlist/my`);
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const entry = waitlistResponse.data.find(
        w => w.date === dateStr && w.time_slot === timeSlot
      );
      
      if (entry) {
        await axios.delete(`${API}/waitlist/${entry.waitlist_id}`);
        toast.success("Removed from waitlist");
        
        // Refresh slots
        const slotsResponse = await axios.get(`${API}/bookings/slots/${dateStr}`);
        setSlots(slotsResponse.data);
      }
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to leave waitlist";
      toast.error(message);
    }
  };

  const openRecurringDialog = (timeSlot) => {
    setRecurringSlot(timeSlot);
    setShowRecurringDialog(true);
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await axios.delete(`${API}/bookings/${bookingId}`);
      toast.success("Booking cancelled");
      
      // Refresh user credits
      const userResponse = await axios.get(`${API}/auth/me`);
      setUser(userResponse.data);
      
      // Refresh slots
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const slotsResponse = await axios.get(`${API}/bookings/slots/${dateStr}`);
      setSlots(slotsResponse.data);
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to cancel booking";
      toast.error(message);
    }
  };

  const isPastDate = isBefore(startOfDay(selectedDate), startOfDay(new Date()));

  const renderSlot = (slotKey, slotData) => {
    const isUserBooked = slotData.user_booked;
    const userBooking = slotData.bookings.find(b => b.user_id === user.user_id);
    const isFull = slotData.is_full;
    const availableSpots = slotData.available_spots;
    const waitlistCount = slotData.waitlist_count || 0;
    const userOnWaitlist = slotData.user_on_waitlist;
    const userWaitlistPosition = slotData.user_waitlist_position;

    return (
      <div
        key={slotKey}
        className={`card-base p-6 ${
          isUserBooked
            ? "ring-2 ring-[#F5D5D5] bg-[#FDF2F2]"
            : userOnWaitlist
            ? "ring-2 ring-[#E6C785] bg-[#FFFDF5]"
            : isFull
            ? "bg-[#F5F5F5]"
            : "hover:shadow-lg"
        }`}
        data-testid={`slot-${slotKey}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Playfair Display, serif' }}>
              {slotKey === "morning" ? "Early Morning" : "Mid-Morning"}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-[#737373]">
              <Clock className="w-4 h-4" />
              <span>{slotData.time_display}</span>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isFull 
              ? "bg-[#D97575]/20 text-[#C25050]" 
              : "bg-[#8FB392]/20 text-[#5A8F5E]"
          }`}>
            {isFull ? "Full" : `${availableSpots} spot${availableSpots !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Bookings Display */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-sm text-[#737373]">
            <Users className="w-4 h-4" />
            <span>Participants ({slotData.bookings.length}/3)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {slotData.bookings.map((booking, index) => (
              <div
                key={booking.booking_id}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  booking.user_id === user.user_id
                    ? "bg-[#F5D5D5] text-[#1A1A1A]"
                    : "bg-[#F5F5F5] text-[#737373]"
                }`}
                data-testid={`booking-initials-${index}`}
              >
                {booking.user_initials}
                {booking.user_id === user.user_id && " (You)"}
              </div>
            ))}
            {slotData.bookings.length === 0 && (
              <span className="text-sm text-[#8FB392] flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Available
              </span>
            )}
          </div>
        </div>

        {/* Waitlist Info */}
        {isFull && waitlistCount > 0 && (
          <div className="mb-4 flex items-center gap-2 text-sm text-[#737373]">
            <ListOrdered className="w-4 h-4" />
            <span>{waitlistCount} {waitlistCount === 1 ? 'person' : 'people'} on waitlist</span>
          </div>
        )}

        {/* User on Waitlist Indicator */}
        {userOnWaitlist && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-[#E6C785]/20 rounded-xl">
            <ListOrdered className="w-5 h-5 text-[#B8963A]" />
            <span className="text-sm text-[#B8963A]">
              You're #{userWaitlistPosition} on the waitlist
            </span>
          </div>
        )}

        {/* Action Buttons */}
        {!isPastDate && (
          <div className="mt-4 space-y-2">
            {isUserBooked ? (
              <Button
                onClick={() => handleCancelBooking(userBooking.booking_id)}
                variant="outline"
                className="w-full h-11 rounded-xl border-[#D97575] text-[#D97575] hover:bg-[#D97575]/10"
                data-testid={`cancel-booking-${slotKey}`}
              >
                Cancel My Booking
              </Button>
            ) : userOnWaitlist ? (
              <Button
                onClick={() => handleLeaveWaitlist(slotKey)}
                variant="outline"
                className="w-full h-11 rounded-xl border-[#E6C785] text-[#B8963A] hover:bg-[#E6C785]/10"
                data-testid={`leave-waitlist-${slotKey}`}
              >
                <X className="w-4 h-4 mr-2" />
                Leave Waitlist
              </Button>
            ) : isFull ? (
              <Button
                onClick={() => handleJoinWaitlist(slotKey)}
                disabled={joiningWaitlist === slotKey}
                className="w-full h-11 rounded-xl bg-[#E6C785] hover:bg-[#D4B576] text-[#1A1A1A]"
                data-testid={`join-waitlist-${slotKey}`}
              >
                {joiningWaitlist === slotKey ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ListOrdered className="w-4 h-4 mr-2" />
                    Join Waitlist
                  </>
                )}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleBookSlot(slotKey)}
                  disabled={bookingSlot === slotKey}
                  className="flex-1 btn-primary"
                  data-testid={`book-slot-${slotKey}`}
                >
                  {bookingSlot === slotKey ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Book Session"
                  )}
                </Button>
                <Button
                  onClick={() => openRecurringDialog(slotKey)}
                  variant="outline"
                  className="h-11 px-3 rounded-xl border-[#E5E5E5] hover:bg-[#F5F5F5]"
                  title="Book recurring sessions"
                  data-testid={`recurring-${slotKey}`}
                >
                  <Repeat className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {isPastDate && (
          <div className="mt-4 text-center text-sm text-[#737373]">
            Past date - bookings not available
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Book a Session
          </h1>
          <p className="text-[#737373] mt-2">
            Select a date and time slot to reserve your training session
          </p>
        </div>

        {/* Credits Card */}
        <div className="mb-8 card-base bg-gradient-to-r from-[#FDF2F2] to-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F5D5D5] flex items-center justify-center">
                <CreditCard className="w-7 h-7 text-[#1A1A1A]" />
              </div>
              <div>
                <p className="text-sm text-[#737373]">Your Balance</p>
                <p className="text-2xl font-bold text-[#1A1A1A]" data-testid="credit-balance">
                  {user.has_unlimited ? "Unlimited" : `${user.credits} Credit${user.credits !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            {!user.has_unlimited && user.credits < 2 && (
              <Button
                onClick={() => navigate("/credits")}
                className="btn-secondary flex items-center gap-2"
                data-testid="buy-credits-btn"
              >
                <CreditCard className="w-4 h-4" />
                Buy Credits
              </Button>
            )}
          </div>
          {!user.has_unlimited && user.credits === 0 && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-[#E6C785]/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-[#B8963A]" />
              <span className="text-sm text-[#B8963A]">
                You need credits to book a session. Purchase a package to continue.
              </span>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Calendar Section */}
          <div className="lg:col-span-5">
            <div className="card-base">
              <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                Select Date
              </h2>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                className="rounded-xl border-0"
                data-testid="booking-calendar"
              />
            </div>
          </div>

          {/* Slots Section */}
          <div className="lg:col-span-7">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Playfair Display, serif' }}>
                Available Sessions
              </h2>
              <p className="text-[#737373]">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </p>
            </div>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-12">
                <div className="spinner"></div>
              </div>
            ) : slots ? (
              <div className="grid gap-6">
                {renderSlot("morning", slots.morning)}
                {renderSlot("afternoon", slots.afternoon)}
              </div>
            ) : (
              <div className="text-center py-12 text-[#737373]">
                Failed to load availability
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recurring Booking Dialog */}
      <Dialog open={showRecurringDialog} onOpenChange={setShowRecurringDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              <Repeat className="w-5 h-5" />
              Book Recurring Sessions
            </DialogTitle>
            <DialogDescription>
              Book the same {recurringSlot === "morning" ? "morning (5:30 AM)" : "mid-morning (9:30 AM)"} session 
              every week starting {format(selectedDate, "MMMM d, yyyy")}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              Number of weeks
            </label>
            <div className="flex items-center gap-4">
              {[2, 4, 6, 8].map((weeks) => (
                <button
                  key={weeks}
                  onClick={() => setRecurringWeeks(weeks)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    recurringWeeks === weeks
                      ? "bg-[#F5D5D5] border-[#F5D5D5] text-[#1A1A1A]"
                      : "border-[#E5E5E5] hover:border-[#F5D5D5] text-[#737373]"
                  }`}
                >
                  {weeks} weeks
                </button>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-[#F5F5F5] rounded-lg">
              <p className="text-sm text-[#737373]">
                This will book <strong>{recurringWeeks} sessions</strong> on:
              </p>
              <ul className="mt-2 text-sm text-[#737373] space-y-1">
                {Array.from({ length: Math.min(recurringWeeks, 4) }, (_, i) => {
                  const date = new Date(selectedDate);
                  date.setDate(date.getDate() + (i * 7));
                  return (
                    <li key={i}>{format(date, "EEEE, MMM d")}</li>
                  );
                })}
                {recurringWeeks > 4 && (
                  <li className="text-[#A0A0A0]">...and {recurringWeeks - 4} more</li>
                )}
              </ul>
            </div>
            
            {!user.has_unlimited && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-[#737373]" />
                <span className="text-[#737373]">
                  Credits needed: up to {recurringWeeks} (you have {user.credits})
                </span>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRecurringDialog(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleBookSlot(recurringSlot, true, recurringWeeks)}
              disabled={bookingSlot === recurringSlot}
              className="btn-primary"
            >
              {bookingSlot === recurringSlot ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Repeat className="w-4 h-4 mr-2" />
              )}
              Book {recurringWeeks} Sessions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default DashboardPage;
