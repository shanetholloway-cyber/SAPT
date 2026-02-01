import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
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
  Loader2,
  Plus,
  Trash2,
  Palette,
  Settings
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
  const [newGalleryImage, setNewGalleryImage] = useState("");

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
      toast.success("Settings saved! Refresh the page to see changes.");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateSessionTime = (slot, field, value) => {
    setSettings(prev => ({
      ...prev,
      session_times: {
        ...prev.session_times,
        [slot]: {
          ...prev.session_times[slot],
          [field]: value
        }
      }
    }));
  };

  const updateThemeColor = (key, value) => {
    setSettings(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        [key]: value
      }
    }));
  };

  const addGalleryImage = () => {
    if (!newGalleryImage.trim()) return;
    const currentImages = settings.gallery_images || [];
    updateSetting("gallery_images", [...currentImages, newGalleryImage.trim()]);
    setNewGalleryImage("");
    toast.success("Image added to gallery");
  };

  const removeGalleryImage = (index) => {
    const currentImages = settings.gallery_images || [];
    updateSetting("gallery_images", currentImages.filter((_, i) => i !== index));
    toast.success("Image removed from gallery");
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
            Manage bookings, clients, payments, and customize your site
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="card-base">
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
          <TabsList className="bg-[#F5F5F5] p-1 rounded-xl flex-wrap">
            <TabsTrigger value="bookings" className="rounded-lg data-[state=active]:bg-white">
              <Calendar className="w-4 h-4 mr-2" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="clients" className="rounded-lg data-[state=active]:bg-white">
              <Users className="w-4 h-4 mr-2" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg data-[state=active]:bg-white">
              <CreditCard className="w-4 h-4 mr-2" />
              Payments
              {pendingTransactions.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-[#E6C785] text-white rounded-full">
                  {pendingTransactions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="images" className="rounded-lg data-[state=active]:bg-white" data-testid="tab-images">
              <Image className="w-4 h-4 mr-2" />
              Images
            </TabsTrigger>
            <TabsTrigger value="sessions" className="rounded-lg data-[state=active]:bg-white" data-testid="tab-sessions">
              <Clock className="w-4 h-4 mr-2" />
              Session Times
            </TabsTrigger>
            <TabsTrigger value="theme" className="rounded-lg data-[state=active]:bg-white" data-testid="tab-theme">
              <Palette className="w-4 h-4 mr-2" />
              Theme
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <div className="card-base overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr><th>Date</th><th>Time</th><th>Client</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-[#737373]">No bookings found</td></tr>
                  ) : (
                    bookings.map((booking) => (
                      <tr key={booking.booking_id}>
                        <td className="font-medium">{format(parseISO(booking.date), "MMM d, yyyy")}</td>
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
                          <Button onClick={() => handleCancelBooking(booking.booking_id)} variant="ghost" size="sm" className="text-[#D97575] hover:bg-[#D97575]/10">
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
              <Input placeholder="Search clients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 h-12 rounded-xl" />
            </div>
            <div className="card-base overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr><th>Client</th><th>Email</th><th>Credits</th><th>Profile</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredClients.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-[#737373]">No clients found</td></tr>
                  ) : (
                    filteredClients.map((client) => (
                      <tr key={client.user_id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#F5D5D5] flex items-center justify-center text-sm font-medium">{client.initials}</div>
                            <span className="font-medium">{client.name}</span>
                          </div>
                        </td>
                        <td className="text-[#737373]">{client.email}</td>
                        <td>
                          <span className={`px-2 py-1 rounded-full text-sm ${client.has_unlimited ? "bg-[#8FB392]/20 text-[#5A8F5E]" : client.credits > 0 ? "bg-[#F5D5D5] text-[#1A1A1A]" : "bg-[#D97575]/20 text-[#C25050]"}`}>
                            {client.has_unlimited ? "Unlimited" : `${client.credits} credits`}
                          </span>
                        </td>
                        <td>{client.profile_completed ? <CheckCircle className="w-5 h-5 text-[#8FB392]" /> : <Clock className="w-5 h-5 text-[#E6C785]" />}</td>
                        <td>
                          <Button onClick={() => { setSelectedClient(client); setShowClientDialog(true); }} variant="ghost" size="sm" className="text-[#737373] hover:text-[#1A1A1A]">
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
                  <tr><th>Client</th><th>Package</th><th>Amount</th><th>Method</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-[#737373]">No transactions found</td></tr>
                  ) : (
                    transactions.map((txn) => (
                      <tr key={txn.transaction_id}>
                        <td className="font-medium">{txn.user_name}</td>
                        <td className="capitalize">{txn.package_type}</td>
                        <td>${txn.amount}</td>
                        <td className="capitalize">{txn.payment_method}</td>
                        <td>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${txn.status === "confirmed" ? "bg-[#8FB392]/20 text-[#5A8F5E]" : "bg-[#E6C785]/20 text-[#B8963A]"}`}>
                            {txn.status}
                          </span>
                        </td>
                        <td>
                          {txn.status === "pending" && (
                            <Button onClick={() => handleConfirmTransaction(txn.transaction_id)} size="sm" className="bg-[#8FB392] hover:bg-[#7AA37D] text-white">
                              <CheckCircle className="w-4 h-4 mr-1" />Confirm
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

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-6">
            {settings && (
              <div className="space-y-6">
                {/* Hero Image */}
                <div className="card-base">
                  <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Hero Image</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label className="mb-2 block">Homepage Main Photo</Label>
                      <Input value={settings.hero_image || ""} onChange={(e) => updateSetting("hero_image", e.target.value)} placeholder="https://example.com/image.jpg" className="h-12 rounded-xl" />
                    </div>
                    <div className="flex items-center justify-center bg-[#FAFAFA] rounded-xl p-4">
                      {settings.hero_image ? (
                        <img src={settings.hero_image} alt="Hero" className="max-h-32 rounded-lg object-cover" onError={(e) => { e.target.src = "https://via.placeholder.com/200x150?text=Invalid"; }} />
                      ) : (
                        <div className="text-[#737373] text-center"><Image className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>No image</p></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* About Image */}
                <div className="card-base">
                  <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>About Image</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label className="mb-2 block">Secondary/About Photo</Label>
                      <Input value={settings.about_image || ""} onChange={(e) => updateSetting("about_image", e.target.value)} placeholder="https://example.com/about.jpg" className="h-12 rounded-xl" />
                    </div>
                    <div className="flex items-center justify-center bg-[#FAFAFA] rounded-xl p-4">
                      {settings.about_image ? (
                        <img src={settings.about_image} alt="About" className="max-h-32 rounded-lg object-cover" onError={(e) => { e.target.src = "https://via.placeholder.com/200x150?text=Invalid"; }} />
                      ) : (
                        <div className="text-[#737373] text-center"><Image className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>No image</p></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Gallery Images */}
                <div className="card-base">
                  <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Gallery Images</h3>
                  <p className="text-[#737373] mb-4">Add multiple images to showcase on your website</p>
                  
                  <div className="flex gap-3 mb-4">
                    <Input value={newGalleryImage} onChange={(e) => setNewGalleryImage(e.target.value)} placeholder="Paste image URL here..." className="h-12 rounded-xl flex-1" />
                    <Button onClick={addGalleryImage} className="btn-primary h-12">
                      <Plus className="w-4 h-4 mr-2" />Add
                    </Button>
                  </div>

                  {settings.gallery_images && settings.gallery_images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {settings.gallery_images.map((img, index) => (
                        <div key={index} className="relative group">
                          <img src={img} alt={`Gallery ${index + 1}`} className="w-full h-32 object-cover rounded-xl" onError={(e) => { e.target.src = "https://via.placeholder.com/200x150?text=Invalid"; }} />
                          <button onClick={() => removeGalleryImage(index)} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-[#FAFAFA] rounded-xl text-[#737373]">
                      <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No gallery images yet. Add some above!</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={savingSettings} className="btn-primary">
                    {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save Images</>}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Session Times Tab */}
          <TabsContent value="sessions" className="space-y-6">
            {settings && settings.session_times && (
              <div className="space-y-6">
                <div className="card-base">
                  <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Session Times</h3>
                  <p className="text-[#737373] mb-6">Configure your available training session times</p>

                  {/* Morning Session */}
                  <div className="p-4 bg-[#FAFAFA] rounded-xl mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-[#1A1A1A]">Morning Session</h4>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="morning-enabled" className="text-sm text-[#737373]">Enabled</Label>
                        <Switch id="morning-enabled" checked={settings.session_times.morning?.enabled !== false} onCheckedChange={(checked) => updateSessionTime("morning", "enabled", checked)} />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-2 block">Start Time</Label>
                        <Input value={settings.session_times.morning?.start || "5:30 AM"} onChange={(e) => updateSessionTime("morning", "start", e.target.value)} placeholder="5:30 AM" className="h-12 rounded-xl" />
                      </div>
                      <div>
                        <Label className="mb-2 block">End Time</Label>
                        <Input value={settings.session_times.morning?.end || "6:15 AM"} onChange={(e) => updateSessionTime("morning", "end", e.target.value)} placeholder="6:15 AM" className="h-12 rounded-xl" />
                      </div>
                    </div>
                  </div>

                  {/* Afternoon Session */}
                  <div className="p-4 bg-[#FAFAFA] rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-[#1A1A1A]">Mid-Morning Session</h4>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="afternoon-enabled" className="text-sm text-[#737373]">Enabled</Label>
                        <Switch id="afternoon-enabled" checked={settings.session_times.afternoon?.enabled !== false} onCheckedChange={(checked) => updateSessionTime("afternoon", "enabled", checked)} />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-2 block">Start Time</Label>
                        <Input value={settings.session_times.afternoon?.start || "9:30 AM"} onChange={(e) => updateSessionTime("afternoon", "start", e.target.value)} placeholder="9:30 AM" className="h-12 rounded-xl" />
                      </div>
                      <div>
                        <Label className="mb-2 block">End Time</Label>
                        <Input value={settings.session_times.afternoon?.end || "10:15 AM"} onChange={(e) => updateSessionTime("afternoon", "end", e.target.value)} placeholder="10:15 AM" className="h-12 rounded-xl" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={savingSettings} className="btn-primary">
                    {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save Session Times</>}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Theme Tab */}
          <TabsContent value="theme" className="space-y-6">
            {settings && settings.theme && (
              <div className="space-y-6">
                <div className="card-base">
                  <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Color Theme</h3>
                  <p className="text-[#737373] mb-6">Customize your website's color scheme</p>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Primary Color */}
                    <div className="p-4 bg-[#FAFAFA] rounded-xl">
                      <Label className="mb-2 block font-medium">Primary Color (Brand)</Label>
                      <div className="flex gap-3 items-center">
                        <input type="color" value={settings.theme.primary_color || "#F5D5D5"} onChange={(e) => updateThemeColor("primary_color", e.target.value)} className="w-12 h-12 rounded-lg border-0 cursor-pointer" />
                        <Input value={settings.theme.primary_color || "#F5D5D5"} onChange={(e) => updateThemeColor("primary_color", e.target.value)} className="h-12 rounded-xl flex-1" placeholder="#F5D5D5" />
                      </div>
                      <p className="text-sm text-[#737373] mt-2">Main brand color (buttons, accents)</p>
                    </div>

                    {/* Secondary Color */}
                    <div className="p-4 bg-[#FAFAFA] rounded-xl">
                      <Label className="mb-2 block font-medium">Secondary Color</Label>
                      <div className="flex gap-3 items-center">
                        <input type="color" value={settings.theme.secondary_color || "#E8B4B4"} onChange={(e) => updateThemeColor("secondary_color", e.target.value)} className="w-12 h-12 rounded-lg border-0 cursor-pointer" />
                        <Input value={settings.theme.secondary_color || "#E8B4B4"} onChange={(e) => updateThemeColor("secondary_color", e.target.value)} className="h-12 rounded-xl flex-1" placeholder="#E8B4B4" />
                      </div>
                      <p className="text-sm text-[#737373] mt-2">Hover states, secondary elements</p>
                    </div>

                    {/* Accent Color */}
                    <div className="p-4 bg-[#FAFAFA] rounded-xl">
                      <Label className="mb-2 block font-medium">Accent Color (Text/Buttons)</Label>
                      <div className="flex gap-3 items-center">
                        <input type="color" value={settings.theme.accent_color || "#1A1A1A"} onChange={(e) => updateThemeColor("accent_color", e.target.value)} className="w-12 h-12 rounded-lg border-0 cursor-pointer" />
                        <Input value={settings.theme.accent_color || "#1A1A1A"} onChange={(e) => updateThemeColor("accent_color", e.target.value)} className="h-12 rounded-xl flex-1" placeholder="#1A1A1A" />
                      </div>
                      <p className="text-sm text-[#737373] mt-2">Dark text and button backgrounds</p>
                    </div>

                    {/* Success Color */}
                    <div className="p-4 bg-[#FAFAFA] rounded-xl">
                      <Label className="mb-2 block font-medium">Success Color</Label>
                      <div className="flex gap-3 items-center">
                        <input type="color" value={settings.theme.success_color || "#8FB392"} onChange={(e) => updateThemeColor("success_color", e.target.value)} className="w-12 h-12 rounded-lg border-0 cursor-pointer" />
                        <Input value={settings.theme.success_color || "#8FB392"} onChange={(e) => updateThemeColor("success_color", e.target.value)} className="h-12 rounded-xl flex-1" placeholder="#8FB392" />
                      </div>
                      <p className="text-sm text-[#737373] mt-2">Available slots, confirmations</p>
                    </div>
                  </div>

                  {/* Color Preview */}
                  <div className="mt-6 p-4 bg-white rounded-xl border border-[#E5E5E5]">
                    <h4 className="font-medium mb-4">Preview</h4>
                    <div className="flex flex-wrap gap-4">
                      <div className="h-12 px-6 rounded-full flex items-center justify-center text-white font-medium" style={{ backgroundColor: settings.theme.accent_color }}>
                        Primary Button
                      </div>
                      <div className="h-12 px-6 rounded-full flex items-center justify-center font-medium" style={{ backgroundColor: settings.theme.primary_color, color: settings.theme.accent_color }}>
                        Secondary Button
                      </div>
                      <div className="h-12 px-6 rounded-full flex items-center justify-center text-white font-medium" style={{ backgroundColor: settings.theme.success_color }}>
                        Available
                      </div>
                    </div>
                  </div>
                </div>

                {/* Site Text */}
                <div className="card-base">
                  <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Site Text</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Site Title</Label>
                      <Input value={settings.site_title || ""} onChange={(e) => updateSetting("site_title", e.target.value)} placeholder="Stephanie Anderson Personal Training" className="h-12 rounded-xl" />
                    </div>
                    <div>
                      <Label className="mb-2 block">Site Tagline</Label>
                      <Input value={settings.site_tagline || ""} onChange={(e) => updateSetting("site_tagline", e.target.value)} placeholder="Personal Training & Small Group Fitness" className="h-12 rounded-xl" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={savingSettings} className="btn-primary">
                    {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save Theme</>}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Client Detail Dialog */}
        <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>Client Profile</DialogTitle>
            </DialogHeader>
            {selectedClient && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-[#F5F5F5]">
                  <div className="w-16 h-16 rounded-full bg-[#F5D5D5] flex items-center justify-center text-xl font-semibold">{selectedClient.initials}</div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedClient.name}</h3>
                    <p className="text-[#737373]">{selectedClient.email}</p>
                  </div>
                </div>
                {selectedClient.profile ? (
                  <div className="space-y-3">
                    {selectedClient.profile.phone && <div><p className="text-sm text-[#737373]">Phone</p><p className="font-medium">{selectedClient.profile.phone}</p></div>}
                    {selectedClient.profile.age && <div><p className="text-sm text-[#737373]">Age</p><p className="font-medium">{selectedClient.profile.age}</p></div>}
                    {selectedClient.profile.fitness_goals && <div><p className="text-sm text-[#737373]">Fitness Goals</p><p className="font-medium">{selectedClient.profile.fitness_goals}</p></div>}
                    {selectedClient.profile.health_conditions && <div><p className="text-sm text-[#737373]">Health Conditions</p><p className="font-medium text-[#D97575]">{selectedClient.profile.health_conditions}</p></div>}
                    {selectedClient.profile.previous_injuries && <div><p className="text-sm text-[#737373]">Previous Injuries</p><p className="font-medium text-[#E6C785]">{selectedClient.profile.previous_injuries}</p></div>}
                    {selectedClient.profile.emergency_contact_name && <div><p className="text-sm text-[#737373]">Emergency Contact</p><p className="font-medium">{selectedClient.profile.emergency_contact_name} {selectedClient.profile.emergency_contact_phone && `- ${selectedClient.profile.emergency_contact_phone}`}</p></div>}
                  </div>
                ) : (
                  <p className="text-[#737373] text-center py-4">Profile not completed yet</p>
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
