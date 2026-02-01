import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Calendar, 
  Users, 
  CreditCard, 
  CheckCircle, 
  Clock, 
  XCircle,
  Search,
  Eye,
  DollarSign,
  Image,
  Save,
  Loader2
} from "lucide-react";
import { format, parseISO } from "date-fns";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientDialog, setShowClientDialog] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsRes, clientsRes, transactionsRes, settingsRes] = await Promise.all([
          axios.get(`${API}/admin/bookings`),
          axios.get(`${API}/admin/clients`),
          axios.get(`${API}/admin/transactions`),
          axios.get(`${API}/settings`),
        ]);
        setBookings(bookingsRes.data);
        setClients(clientsRes.data);
        setTransactions(transactionsRes.data);
        setSettings(settingsRes.data);
      } catch (error) {
        toast.error("Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleConfirmTransaction = async (transactionId) => {
    try {
      await axios.put(`${API}/admin/transactions/${transactionId}/confirm`);
      toast.success("Transaction confirmed and credits added");
      
      const [transactionsRes, clientsRes] = await Promise.all([
        axios.get(`${API}/admin/transactions`),
        axios.get(`${API}/admin/clients`),
      ]);
      setTransactions(transactionsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error("Failed to confirm transaction");
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await axios.delete(`${API}/admin/bookings/${bookingId}`);
      toast.success("Booking cancelled");
      
      const response = await axios.get(`${API}/admin/bookings`);
      setBookings(response.data);
    } catch (error) {
      toast.error("Failed to cancel booking");
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await axios.put(`${API}/admin/settings`, settings);
      toast.success("Site images updated! Changes will appear on the homepage.");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingTransactions = transactions.filter(t => t.status === "pending");
  const todayBookings = bookings.filter(b => b.date === format(new Date(), "yyyy-MM-dd"));

  const stats = [
    { label: "Total Clients", value: clients.length, icon: Users, color: "bg-[#F5D5D5]" },
    { label: "Today's Sessions", value: todayBookings.length, icon: Calendar, color: "bg-[#8FB392]/20" },
    { label: "Pending Payments", value: pendingTransactions.length, icon: Clock, color: "bg-[#E6C785]/20" },
    { label: "Total Revenue", value: `$${transactions.filter(t => t.status === "confirmed").reduce((sum, t) => sum + t.amount, 0)}`, icon: DollarSign, color: "bg-[#8FA6B3]/20" },
  ];

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Admin Dashboard
          </h1>
          <p className="text-[#737373] mt-2">
            Manage bookings, clients, payments, and site content
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="card-base" data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-[#1A1A1A]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1A1A1A]">{stat.value}</p>
                  <p className="text-sm text-[#737373]">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="bg-[#F5F5F5] p-1 rounded-xl">
            <TabsTrigger value="bookings" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-bookings">
              <Calendar className="w-4 h-4 mr-2" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="clients" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-clients">
              <Users className="w-4 h-4 mr-2" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-payments">
              <CreditCard className="w-4 h-4 mr-2" />
              Payments
              {pendingTransactions.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-[#E6C785] text-white rounded-full">
                  {pendingTransactions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="images" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="tab-images">
              <Image className="w-4 h-4 mr-2" />
              Site Images
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <div className="card-base overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Client</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-[#737373]">
                        No bookings found
                      </td>
                    </tr>
                  ) : (
                    bookings.map((booking) => (
                      <tr key={booking.booking_id} data-testid={`admin-booking-${booking.booking_id}`}>
                        <td className="font-medium">
                          {format(parseISO(booking.date), "MMM d, yyyy")}
                        </td>
                        <td>{booking.time_display}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#F5D5D5] flex items-center justify-center text-sm font-medium">
                              {booking.user_initials}
                            </div>
                            {booking.user_name}
                          </div>
                        </td>
                        <td>
                          <Button
                            onClick={() => handleCancelBooking(booking.booking_id)}
                            variant="ghost"
                            size="sm"
                            className="text-[#D97575] hover:bg-[#D97575]/10"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373]" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 rounded-xl"
                data-testid="client-search-input"
              />
            </div>

            <div className="card-base overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Email</th>
                    <th>Credits</th>
                    <th>Profile</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-[#737373]">
                        No clients found
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client) => (
                      <tr key={client.user_id} data-testid={`admin-client-${client.user_id}`}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#F5D5D5] flex items-center justify-center text-sm font-medium">
                              {client.initials}
                            </div>
                            <span className="font-medium">{client.name}</span>
                          </div>
                        </td>
                        <td className="text-[#737373]">{client.email}</td>
                        <td>
                          <span className={`px-2 py-1 rounded-full text-sm ${
                            client.has_unlimited
                              ? "bg-[#8FB392]/20 text-[#5A8F5E]"
                              : client.credits > 0
                              ? "bg-[#F5D5D5] text-[#1A1A1A]"
                              : "bg-[#D97575]/20 text-[#C25050]"
                          }`}>
                            {client.has_unlimited ? "Unlimited" : `${client.credits} credits`}
                          </span>
                        </td>
                        <td>
                          {client.profile_completed ? (
                            <CheckCircle className="w-5 h-5 text-[#8FB392]" />
                          ) : (
                            <Clock className="w-5 h-5 text-[#E6C785]" />
                          )}
                        </td>
                        <td>
                          <Button
                            onClick={() => {
                              setSelectedClient(client);
                              setShowClientDialog(true);
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-[#737373] hover:text-[#1A1A1A]"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <div className="card-base overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Package</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-[#737373]">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((txn) => (
                      <tr key={txn.transaction_id} data-testid={`admin-transaction-${txn.transaction_id}`}>
                        <td className="font-medium">{txn.user_name}</td>
                        <td className="capitalize">{txn.package_type}</td>
                        <td>${txn.amount}</td>
                        <td className="capitalize">{txn.payment_method}</td>
                        <td>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            txn.status === "confirmed"
                              ? "bg-[#8FB392]/20 text-[#5A8F5E]"
                              : "bg-[#E6C785]/20 text-[#B8963A]"
                          }`}>
                            {txn.status}
                          </span>
                        </td>
                        <td>
                          {txn.status === "pending" && (
                            <Button
                              onClick={() => handleConfirmTransaction(txn.transaction_id)}
                              size="sm"
                              className="bg-[#8FB392] hover:bg-[#7AA37D] text-white"
                              data-testid={`confirm-txn-${txn.transaction_id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Confirm
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Site Images Tab */}
          <TabsContent value="images" className="space-y-6">
            <div className="card-base">
              <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                Site Images
              </h3>
              <p className="text-[#737373] mb-6">
                Update the images displayed on your website. Paste image URLs from any image hosting service.
              </p>

              {settings && (
                <div className="space-y-6">
                  {/* Hero Image */}
                  <div className="grid md:grid-cols-2 gap-6 p-4 bg-[#FAFAFA] rounded-xl">
                    <div>
                      <Label className="text-[#1A1A1A] font-medium mb-2 block">
                        Hero Image (Homepage Main Photo)
                      </Label>
                      <Input
                        value={settings.hero_image || ""}
                        onChange={(e) => updateSetting("hero_image", e.target.value)}
                        placeholder="https://example.com/your-image.jpg"
                        className="h-12 rounded-xl"
                        data-testid="hero-image-input"
                      />
                      <p className="text-sm text-[#737373] mt-2">
                        This appears as the main image on the homepage
                      </p>
                    </div>
                    <div className="flex items-center justify-center bg-white rounded-xl p-4 border border-[#E5E5E5]">
                      {settings.hero_image ? (
                        <img
                          src={settings.hero_image}
                          alt="Hero preview"
                          className="max-h-40 rounded-lg object-cover"
                          onError={(e) => { e.target.src = "https://via.placeholder.com/300x200?text=Invalid+URL"; }}
                        />
                      ) : (
                        <div className="text-[#737373] text-center">
                          <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No image set</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* About Image */}
                  <div className="grid md:grid-cols-2 gap-6 p-4 bg-[#FAFAFA] rounded-xl">
                    <div>
                      <Label className="text-[#1A1A1A] font-medium mb-2 block">
                        About/Profile Image
                      </Label>
                      <Input
                        value={settings.about_image || ""}
                        onChange={(e) => updateSetting("about_image", e.target.value)}
                        placeholder="https://example.com/about-image.jpg"
                        className="h-12 rounded-xl"
                        data-testid="about-image-input"
                      />
                      <p className="text-sm text-[#737373] mt-2">
                        Secondary image for about section or trainer profile
                      </p>
                    </div>
                    <div className="flex items-center justify-center bg-white rounded-xl p-4 border border-[#E5E5E5]">
                      {settings.about_image ? (
                        <img
                          src={settings.about_image}
                          alt="About preview"
                          className="max-h-40 rounded-lg object-cover"
                          onError={(e) => { e.target.src = "https://via.placeholder.com/300x200?text=Invalid+URL"; }}
                        />
                      ) : (
                        <div className="text-[#737373] text-center">
                          <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No image set</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Site Title */}
                  <div className="p-4 bg-[#FAFAFA] rounded-xl">
                    <Label className="text-[#1A1A1A] font-medium mb-2 block">
                      Site Title
                    </Label>
                    <Input
                      value={settings.site_title || ""}
                      onChange={(e) => updateSetting("site_title", e.target.value)}
                      placeholder="Stephanie Anderson Personal Training"
                      className="h-12 rounded-xl"
                      data-testid="site-title-input"
                    />
                  </div>

                  {/* Site Tagline */}
                  <div className="p-4 bg-[#FAFAFA] rounded-xl">
                    <Label className="text-[#1A1A1A] font-medium mb-2 block">
                      Site Tagline
                    </Label>
                    <Input
                      value={settings.site_tagline || ""}
                      onChange={(e) => updateSetting("site_tagline", e.target.value)}
                      placeholder="Personal Training & Small Group Fitness"
                      className="h-12 rounded-xl"
                      data-testid="site-tagline-input"
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="btn-primary"
                      data-testid="save-settings-btn"
                    >
                      {savingSettings ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="card-base bg-[#FDF2F2]">
              <h4 className="font-semibold text-[#1A1A1A] mb-2">Tips for Images</h4>
              <ul className="text-sm text-[#737373] space-y-1">
                <li>• Use high-quality images (at least 800x600 pixels)</li>
                <li>• Square or portrait images work best for the hero section</li>
                <li>• You can upload images to Google Drive, Dropbox, or Imgur and paste the direct link</li>
                <li>• For Google Drive: Right-click → Share → Copy link, then convert to direct link</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        {/* Client Detail Dialog */}
        <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                Client Profile
              </DialogTitle>
            </DialogHeader>
            {selectedClient && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-[#F5F5F5]">
                  <div className="w-16 h-16 rounded-full bg-[#F5D5D5] flex items-center justify-center text-xl font-semibold">
                    {selectedClient.initials}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedClient.name}</h3>
                    <p className="text-[#737373]">{selectedClient.email}</p>
                  </div>
                </div>

                {selectedClient.profile ? (
                  <div className="space-y-3">
                    {selectedClient.profile.phone && (
                      <div>
                        <p className="text-sm text-[#737373]">Phone</p>
                        <p className="font-medium">{selectedClient.profile.phone}</p>
                      </div>
                    )}
                    {selectedClient.profile.age && (
                      <div>
                        <p className="text-sm text-[#737373]">Age</p>
                        <p className="font-medium">{selectedClient.profile.age}</p>
                      </div>
                    )}
                    {selectedClient.profile.fitness_goals && (
                      <div>
                        <p className="text-sm text-[#737373]">Fitness Goals</p>
                        <p className="font-medium">{selectedClient.profile.fitness_goals}</p>
                      </div>
                    )}
                    {selectedClient.profile.health_conditions && (
                      <div>
                        <p className="text-sm text-[#737373]">Health Conditions</p>
                        <p className="font-medium text-[#D97575]">{selectedClient.profile.health_conditions}</p>
                      </div>
                    )}
                    {selectedClient.profile.previous_injuries && (
                      <div>
                        <p className="text-sm text-[#737373]">Previous Injuries</p>
                        <p className="font-medium text-[#E6C785]">{selectedClient.profile.previous_injuries}</p>
                      </div>
                    )}
                    {selectedClient.profile.emergency_contact_name && (
                      <div>
                        <p className="text-sm text-[#737373]">Emergency Contact</p>
                        <p className="font-medium">
                          {selectedClient.profile.emergency_contact_name}
                          {selectedClient.profile.emergency_contact_phone && ` - ${selectedClient.profile.emergency_contact_phone}`}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[#737373] text-center py-4">
                    Profile not completed yet
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
