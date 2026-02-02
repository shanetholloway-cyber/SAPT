import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  XCircle, 
  CheckCircle,
  AlertCircle,
  ListOrdered,
  Repeat
} from "lucide-react";
import { format, isBefore, startOfDay, parseISO } from "date-fns";

const BookingsPage = () => {
  const { user, setUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      const [bookingsRes, waitlistRes] = await Promise.all([
        axios.get(`${API}/bookings/my`),
        axios.get(`${API}/waitlist/my`)
      ]);
      setBookings(bookingsRes.data);
      setWaitlistEntries(waitlistRes.data);
    } catch (error) {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async (bookingId) => {
    try {
      await axios.delete(`${API}/bookings/${bookingId}`);
      toast.success("Booking cancelled and credit refunded");
      
      // Refresh bookings
      fetchBookings();
      
      // Refresh user credits
      const userResponse = await axios.get(`${API}/auth/me`);
      setUser(userResponse.data);
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to cancel booking";
      toast.error(message);
    }
  };

  const handleLeaveWaitlist = async (waitlistId) => {
    try {
      await axios.delete(`${API}/waitlist/${waitlistId}`);
      toast.success("Removed from waitlist");
      fetchBookings();
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to leave waitlist";
      toast.error(message);
    }
  };

  const isPastBooking = (dateStr) => {
    const bookingDate = parseISO(dateStr);
    return isBefore(startOfDay(bookingDate), startOfDay(new Date()));
  };

  const upcomingBookings = bookings.filter(b => !isPastBooking(b.date));
  const pastBookings = bookings.filter(b => isPastBooking(b.date));
  const activeWaitlist = waitlistEntries.filter(w => !isPastBooking(w.date));

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'Playfair Display, serif' }}>
            My Bookings
          </h1>
          <p className="text-[#737373] mt-2">
            View and manage your training sessions
          </p>
        </div>

        {bookings.length === 0 && waitlistEntries.length === 0 ? (
          <div className="card-base text-center py-16">
            <div className="w-16 h-16 rounded-full bg-[#F5D5D5]/50 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-[#737373]" />
            </div>
            <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              No Bookings Yet
            </h3>
            <p className="text-[#737373] mb-6">
              You have not booked any sessions yet. Head to the dashboard to book your first session!
            </p>
            <Button
              onClick={() => window.location.href = '/dashboard'}
              className="btn-primary"
              data-testid="book-first-session-btn"
            >
              Book a Session
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Waitlist Entries */}
            {activeWaitlist.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-[#B8963A] mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <ListOrdered className="w-5 h-5" />
                  On Waitlist ({activeWaitlist.length})
                </h2>
                <div className="space-y-4">
                  {activeWaitlist.map((entry) => (
                    <div
                      key={entry.waitlist_id}
                      className="card-base border-2 border-[#E6C785] bg-[#FFFDF5] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      data-testid={`waitlist-entry-${entry.waitlist_id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-[#E6C785]/30 flex items-center justify-center">
                          <ListOrdered className="w-7 h-7 text-[#B8963A]" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#1A1A1A]">
                            {format(parseISO(entry.date), "EEEE, MMMM d")}
                          </p>
                          <div className="flex items-center gap-3 text-[#737373]">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {entry.time_slot === "morning" ? "5:30 AM - 6:15 AM" : "9:30 AM - 10:15 AM"}
                            </span>
                            <span className="px-2 py-0.5 bg-[#E6C785]/30 rounded-full text-xs font-medium text-[#B8963A]">
                              #{entry.position} in line
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleLeaveWaitlist(entry.waitlist_id)}
                        variant="outline"
                        className="h-10 rounded-xl border-[#E6C785] text-[#B8963A] hover:bg-[#E6C785]/10"
                        data-testid={`leave-waitlist-${entry.waitlist_id}`}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Leave Waitlist
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Bookings */}
            {upcomingBookings.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <CheckCircle className="w-5 h-5 text-[#8FB392]" />
                  Upcoming Sessions ({upcomingBookings.length})
                </h2>
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.booking_id}
                      className="card-base flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      data-testid={`upcoming-booking-${booking.booking_id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-[#8FB392]/20 flex items-center justify-center">
                          {booking.is_recurring ? (
                            <Repeat className="w-7 h-7 text-[#5A8F5E]" />
                          ) : (
                            <Calendar className="w-7 h-7 text-[#5A8F5E]" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-[#1A1A1A]">
                            {format(parseISO(booking.date), "EEEE, MMMM d")}
                          </p>
                          <div className="flex items-center gap-3 text-[#737373]">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {booking.time_display}
                            </span>
                            {booking.is_recurring && (
                              <span className="px-2 py-0.5 bg-[#8FB392]/20 rounded-full text-xs font-medium text-[#5A8F5E]">
                                Recurring
                              </span>
                            )}
                            {booking.from_waitlist && (
                              <span className="px-2 py-0.5 bg-[#E6C785]/30 rounded-full text-xs font-medium text-[#B8963A]">
                                From Waitlist
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleCancelBooking(booking.booking_id)}
                        variant="outline"
                        className="h-10 rounded-xl border-[#D97575] text-[#D97575] hover:bg-[#D97575]/10"
                        data-testid={`cancel-booking-${booking.booking_id}`}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Bookings */}
            {pastBookings.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-[#737373] mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <AlertCircle className="w-5 h-5" />
                  Past Sessions ({pastBookings.length})
                </h2>
                <div className="space-y-4">
                  {pastBookings.slice(0, 10).map((booking) => (
                    <div
                      key={booking.booking_id}
                      className="card-base opacity-60 flex items-center gap-4"
                      data-testid={`past-booking-${booking.booking_id}`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-[#737373]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#737373]">
                          {format(parseISO(booking.date), "EEEE, MMMM d, yyyy")}
                        </p>
                        <div className="flex items-center gap-2 text-[#A0A0A0] text-sm">
                          <Clock className="w-3 h-3" />
                          <span>{booking.time_display}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BookingsPage;
