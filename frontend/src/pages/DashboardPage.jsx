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

  const handleBookSlot = async (timeSlot) => {
    // Check if user has credits
    if (!user.has_unlimited && user.credits <= 0) {
      toast.error("No credits available. Please purchase a session package.");
      navigate("/credits");
      return;
    }

    setBookingSlot(timeSlot);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      await axios.post(`${API}/bookings`, {
        date: dateStr,
        time_slot: timeSlot,
      });
      
      toast.success("Session booked successfully!");
      
      // Refresh user credits
      const userResponse = await axios.get(`${API}/auth/me`);
      setUser(userResponse.data);
      
      // Refresh slots
      const slotsResponse = await axios.get(`${API}/bookings/slots/${dateStr}`);
      setSlots(slotsResponse.data);
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to book session";
      toast.error(message);
    } finally {
      setBookingSlot(null);
    }
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

    return (
      <div
        key={slotKey}
        className={`card-base p-6 ${
          isUserBooked
            ? "ring-2 ring-[#F5D5D5] bg-[#FDF2F2]"
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

        {/* Action Button */}
        {!isPastDate && (
          <div className="mt-4">
            {isUserBooked ? (
              <Button
                onClick={() => handleCancelBooking(userBooking.booking_id)}
                variant="outline"
                className="w-full h-11 rounded-xl border-[#D97575] text-[#D97575] hover:bg-[#D97575]/10"
                data-testid={`cancel-booking-${slotKey}`}
              >
                Cancel My Booking
              </Button>
            ) : isFull ? (
              <Button
                disabled
                className="w-full h-11 rounded-xl bg-[#E5E5E5] text-[#737373] cursor-not-allowed"
              >
                Session Full
              </Button>
            ) : (
              <Button
                onClick={() => handleBookSlot(slotKey)}
                disabled={bookingSlot === slotKey}
                className="w-full btn-primary"
                data-testid={`book-slot-${slotKey}`}
              >
                {bookingSlot === slotKey ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Book This Session"
                )}
              </Button>
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
    </Layout>
  );
};

export default DashboardPage;
