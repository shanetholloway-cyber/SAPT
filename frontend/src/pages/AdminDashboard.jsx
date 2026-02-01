import { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Users, CreditCard, CheckCircle, Clock, XCircle, Search, Eye, DollarSign, Image, Save, Loader2, Plus, Trash2, Palette, FileText, Edit } from "lucide-react";
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
  const [editingClient, setEditingClient] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [newGalleryImage, setNewGalleryImage] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleConfirmTransaction = async (transactionId) => {
    try {
      await axios.put(`${API}/admin/transactions/${transactionId}/confirm`);
      toast.success("Transaction confirmed and credits added");
      fetchData();
    } catch (error) {
      toast.error("Failed to confirm transaction");
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await axios.delete(`${API}/admin/bookings/${bookingId}`);
      toast.success("Booking cancelled");
      fetchData();
    } catch (error) {
      toast.error("Failed to cancel booking");
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await axios.put(`${API}/admin/settings`, settings);
      toast.success("Settings saved! Refresh to see changes on the site.");
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
      session_times: { ...prev.session_times, [slot]: { ...prev.session_times[slot], [field]: value } }
    }));
  };

  const updateThemeColor = (key, value) => {
    setSettings(prev => ({ ...prev, theme: { ...prev.theme, [key]: value } }));
  };

  const addGalleryImage = () => {
    if (!newGalleryImage.trim()) return;
    updateSetting("gallery_images", [...(settings.gallery_images || []), newGalleryImage.trim()]);
    setNewGalleryImage("");
    toast.success("Image added");
  };

  const removeGalleryImage = (index) => {
    updateSetting("gallery_images", (settings.gallery_images || []).filter((_, i) => i !== index));
  };

  const openEditClient = (client) => {
    setEditingClient({
      ...client,
      phone: client.profile?.phone || "",
      age: client.profile?.age || "",
      fitness_goals: client.profile?.fitness_goals || "",
      health_conditions: client.profile?.health_conditions || "",
      previous_injuries: client.profile?.previous_injuries || "",
      emergency_contact_name: client.profile?.emergency_contact_name || "",
      emergency_contact_phone: client.profile?.emergency_contact_phone || "",
    });
    setShowEditDialog(true);
  };

  const handleSaveClient = async () => {
    if (!editingClient) return;
    setSavingClient(true);
    try {
      await axios.put(`${API}/admin/users/${editingClient.user_id}/profile`, editingClient);
      toast.success("Client profile updated");
      setShowEditDialog(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to update client");
    } finally {
      setSavingClient(false);
    }
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

  if (loading) return <Layout><div className="min-h-[50vh] flex items-center justify-center"><div className="spinner"></div></div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'Playfair Display, serif' }}>Admin Dashboard</h1>
          <p className="text-[#737373] mt-2">Manage bookings, clients, and customize your site</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="card-base">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}><stat.icon className="w-5 h-5 text-[#1A1A1A]" /></div>
                <div><p className="text-2xl font-bold text-[#1A1A1A]">{stat.value}</p><p className="text-sm text-[#737373]">{stat.label}</p></div>
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="bg-[#F5F5F5] p-1 rounded-xl flex-wrap gap-1">
            <TabsTrigger value="bookings" className="rounded-lg data-[state=active]:bg-white"><Calendar className="w-4 h-4 mr-2" />Bookings</TabsTrigger>
            <TabsTrigger value="clients" className="rounded-lg data-[state=active]:bg-white"><Users className="w-4 h-4 mr-2" />Clients</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg data-[state=active]:bg-white">
              <CreditCard className="w-4 h-4 mr-2" />Payments
              {pendingTransactions.length > 0 && <span className="ml-2 px-2 py-0.5 text-xs bg-[#E6C785] text-white rounded-full">{pendingTransactions.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="images" className="rounded-lg data-[state=active]:bg-white"><Image className="w-4 h-4 mr-2" />Images</TabsTrigger>
            <TabsTrigger value="text" className="rounded-lg data-[state=active]:bg-white"><FileText className="w-4 h-4 mr-2" />Website Text</TabsTrigger>
            <TabsTrigger value="sessions" className="rounded-lg data-[state=active]:bg-white"><Clock className="w-4 h-4 mr-2" />Sessions</TabsTrigger>
            <TabsTrigger value="theme" className="rounded-lg data-[state=active]:bg-white"><Palette className="w-4 h-4 mr-2" />Theme</TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <div className="card-base overflow-x-auto">
              <table className="admin-table">
                <thead><tr><th>Date</th><th>Time</th><th>Client</th><th>Actions</th></tr></thead>
                <tbody>
                  {bookings.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-[#737373]">No bookings</td></tr> :
                    bookings.map((b) => (
                      <tr key={b.booking_id}>
                        <td className="font-medium">{format(parseISO(b.date), "MMM d, yyyy")}</td>
                        <td>{b.time_display}</td>
                        <td><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-[#F5D5D5] flex items-center justify-center text-sm font-medium">{b.user_initials}</div>{b.user_name}</div></td>
                        <td><Button onClick={() => handleCancelBooking(b.booking_id)} variant="ghost" size="sm" className="text-[#D97575]"><XCircle className="w-4 h-4" /></Button></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373]" />
              <Input placeholder="Search clients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 h-12 rounded-xl" />
            </div>
            <div className="card-base overflow-x-auto">
              <table className="admin-table">
                <thead><tr><th>Client</th><th>Email</th><th>Credits</th><th>Profile</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredClients.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-[#737373]">No clients</td></tr> :
                    filteredClients.map((c) => (
                      <tr key={c.user_id}>
                        <td><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-[#F5D5D5] flex items-center justify-center text-sm font-medium">{c.initials}</div><span className="font-medium">{c.name}</span></div></td>
                        <td className="text-[#737373]">{c.email}</td>
                        <td><span className={`px-2 py-1 rounded-full text-sm ${c.has_unlimited ? "bg-[#8FB392]/20 text-[#5A8F5E]" : c.credits > 0 ? "bg-[#F5D5D5]" : "bg-[#D97575]/20 text-[#C25050]"}`}>{c.has_unlimited ? "Unlimited" : `${c.credits} credits`}</span></td>
                        <td>{c.profile_completed ? <CheckCircle className="w-5 h-5 text-[#8FB392]" /> : <Clock className="w-5 h-5 text-[#E6C785]" />}</td>
                        <td className="flex gap-2">
                          <Button onClick={() => { setSelectedClient(c); setShowClientDialog(true); }} variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button onClick={() => openEditClient(c)} variant="ghost" size="sm" className="text-[#8FA6B3]"><Edit className="w-4 h-4" /></Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="card-base overflow-x-auto">
              <table className="admin-table">
                <thead><tr><th>Client</th><th>Package</th><th>Amount</th><th>Method</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {transactions.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-[#737373]">No transactions</td></tr> :
                    transactions.map((t) => (
                      <tr key={t.transaction_id}>
                        <td className="font-medium">{t.user_name}</td>
                        <td className="capitalize">{t.package_type}</td>
                        <td>${t.amount}</td>
                        <td className="capitalize">{t.payment_method}</td>
                        <td><span className={`px-3 py-1 rounded-full text-sm ${t.status === "confirmed" ? "bg-[#8FB392]/20 text-[#5A8F5E]" : "bg-[#E6C785]/20 text-[#B8963A]"}`}>{t.status}</span></td>
                        <td>{t.status === "pending" && <Button onClick={() => handleConfirmTransaction(t.transaction_id)} size="sm" className="bg-[#8FB392] text-white"><CheckCircle className="w-4 h-4 mr-1" />Confirm</Button>}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-6">
            {settings && (
              <>
                <div className="card-base">
                  <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Main Images</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label className="mb-2 block">Hero Image (Homepage)</Label>
                      <Input value={settings.hero_image || ""} onChange={(e) => updateSetting("hero_image", e.target.value)} className="h-12 rounded-xl" />
                      {settings.hero_image && <img src={settings.hero_image} alt="Hero" className="mt-2 h-24 rounded-lg object-cover" />}
                    </div>
                    <div>
                      <Label className="mb-2 block">About Image</Label>
                      <Input value={settings.about_image || ""} onChange={(e) => updateSetting("about_image", e.target.value)} className="h-12 rounded-xl" />
                      {settings.about_image && <img src={settings.about_image} alt="About" className="mt-2 h-24 rounded-lg object-cover" />}
                    </div>
                  </div>
                </div>

                <div className="card-base">
                  <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Gallery Images</h3>
                  <div className="flex gap-3 mb-4">
                    <Input value={newGalleryImage} onChange={(e) => setNewGalleryImage(e.target.value)} placeholder="Paste image URL..." className="h-12 rounded-xl flex-1" />
                    <Button onClick={addGalleryImage} className="btn-primary h-12"><Plus className="w-4 h-4 mr-2" />Add</Button>
                  </div>
                  {settings.gallery_images?.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {settings.gallery_images.map((img, i) => (
                        <div key={i} className="relative group">
                          <img src={img} alt={`Gallery ${i}`} className="w-full h-32 object-cover rounded-xl" />
                          <button onClick={() => removeGalleryImage(i)} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-[#737373] text-center py-8 bg-[#FAFAFA] rounded-xl">No gallery images yet</p>}
                </div>
                <div className="flex justify-end"><Button onClick={handleSaveSettings} disabled={savingSettings} className="btn-primary">{savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save Images</>}</Button></div>
              </>
            )}
          </TabsContent>

          {/* Website Text Tab */}
          <TabsContent value="text" className="space-y-6">
            {settings && (
              <>
                <div className="card-base">
                  <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Site Identity</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><Label className="mb-2 block">Site Title</Label><Input value={settings.site_title || ""} onChange={(e) => updateSetting("site_title", e.target.value)} className="h-12 rounded-xl" /></div>
                    <div><Label className="mb-2 block">Site Tagline</Label><Input value={settings.site_tagline || ""} onChange={(e) => updateSetting("site_tagline", e.target.value)} className="h-12 rounded-xl" /></div>
                  </div>
                </div>

                <div className="card-base">
                  <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Hero Section</h3>
                  <div className="space-y-4">
                    <div><Label className="mb-2 block">Main Heading</Label><Input value={settings.hero_heading || ""} onChange={(e) => updateSetting("hero_heading", e.target.value)} className="h-12 rounded-xl" /></div>
                    <div><Label className="mb-2 block">Sub-heading</Label><Textarea value={settings.hero_subheading || ""} onChange={(e) => updateSetting("hero_subheading", e.target.value)} className="rounded-xl" rows={3} /></div>
                  </div>
                </div>

                <div className="card-base">
                  <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Features Section</h3>
                  <div className="space-y-4">
                    <div><Label className="mb-2 block">Section Title</Label><Input value={settings.about_title || ""} onChange={(e) => updateSetting("about_title", e.target.value)} className="h-12 rounded-xl" /></div>
                    <div><Label className="mb-2 block">Section Description</Label><Textarea value={settings.about_text || ""} onChange={(e) => updateSetting("about_text", e.target.value)} className="rounded-xl" rows={2} /></div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 mt-6">
                    <div className="p-4 bg-[#FAFAFA] rounded-xl">
                      <Label className="mb-2 block font-medium">Feature 1 Title</Label>
                      <Input value={settings.feature_1_title || ""} onChange={(e) => updateSetting("feature_1_title", e.target.value)} className="h-10 rounded-lg mb-2" />
                      <Label className="mb-2 block text-sm">Description</Label>
                      <Textarea value={settings.feature_1_text || ""} onChange={(e) => updateSetting("feature_1_text", e.target.value)} className="rounded-lg" rows={2} />
                    </div>
                    <div className="p-4 bg-[#FAFAFA] rounded-xl">
                      <Label className="mb-2 block font-medium">Feature 2 Title</Label>
                      <Input value={settings.feature_2_title || ""} onChange={(e) => updateSetting("feature_2_title", e.target.value)} className="h-10 rounded-lg mb-2" />
                      <Label className="mb-2 block text-sm">Description</Label>
                      <Textarea value={settings.feature_2_text || ""} onChange={(e) => updateSetting("feature_2_text", e.target.value)} className="rounded-lg" rows={2} />
                    </div>
                    <div className="p-4 bg-[#FAFAFA] rounded-xl">
                      <Label className="mb-2 block font-medium">Feature 3 Title</Label>
                      <Input value={settings.feature_3_title || ""} onChange={(e) => updateSetting("feature_3_title", e.target.value)} className="h-10 rounded-lg mb-2" />
                      <Label className="mb-2 block text-sm">Description</Label>
                      <Textarea value={settings.feature_3_text || ""} onChange={(e) => updateSetting("feature_3_text", e.target.value)} className="rounded-lg" rows={2} />
                    </div>
                  </div>
                </div>

                <div className="card-base">
                  <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Call-to-Action Section</h3>
                  <div className="space-y-4">
                    <div><Label className="mb-2 block">CTA Title</Label><Input value={settings.cta_title || ""} onChange={(e) => updateSetting("cta_title", e.target.value)} className="h-12 rounded-xl" /></div>
                    <div><Label className="mb-2 block">CTA Text</Label><Textarea value={settings.cta_text || ""} onChange={(e) => updateSetting("cta_text", e.target.value)} className="rounded-xl" rows={2} /></div>
                  </div>
                </div>
                <div className="flex justify-end"><Button onClick={handleSaveSettings} disabled={savingSettings} className="btn-primary">{savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save Text</>}</Button></div>
              </>
            )}
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            {settings?.session_times && (
              <>
                <div className="card-base">
                  <h3 className="text-lg font-semibold mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Session Times</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-[#FAFAFA] rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">Morning Session</h4>
                        <div className="flex items-center gap-2"><Label className="text-sm">Enabled</Label><Switch checked={settings.session_times.morning?.enabled !== false} onCheckedChange={(v) => updateSessionTime("morning", "enabled", v)} /></div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div><Label className="mb-2 block">Start</Label><Input value={settings.session_times.morning?.start || ""} onChange={(e) => updateSessionTime("morning", "start", e.target.value)} className="h-12 rounded-xl" /></div>
                        <div><Label className="mb-2 block">End</Label><Input value={settings.session_times.morning?.end || ""} onChange={(e) => updateSessionTime("morning", "end", e.target.value)} className="h-12 rounded-xl" /></div>
                      </div>
                    </div>
                    <div className="p-4 bg-[#FAFAFA] rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">Mid-Morning Session</h4>
                        <div className="flex items-center gap-2"><Label className="text-sm">Enabled</Label><Switch checked={settings.session_times.afternoon?.enabled !== false} onCheckedChange={(v) => updateSessionTime("afternoon", "enabled", v)} /></div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div><Label className="mb-2 block">Start</Label><Input value={settings.session_times.afternoon?.start || ""} onChange={(e) => updateSessionTime("afternoon", "start", e.target.value)} className="h-12 rounded-xl" /></div>
                        <div><Label className="mb-2 block">End</Label><Input value={settings.session_times.afternoon?.end || ""} onChange={(e) => updateSessionTime("afternoon", "end", e.target.value)} className="h-12 rounded-xl" /></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end"><Button onClick={handleSaveSettings} disabled={savingSettings} className="btn-primary">{savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save Sessions</>}</Button></div>
              </>
            )}
          </TabsContent>

          {/* Theme Tab */}
          <TabsContent value="theme" className="space-y-6">
            {settings?.theme && (
              <>
                <div className="card-base">
                  <h3 className="text-lg font-semibold mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Color Theme</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {[
                      { key: "primary_color", label: "Primary (Brand)", desc: "Main brand color", default: "#F5D5D5" },
                      { key: "secondary_color", label: "Secondary", desc: "Hover states", default: "#E8B4B4" },
                      { key: "accent_color", label: "Accent (Dark)", desc: "Text and buttons", default: "#1A1A1A" },
                      { key: "success_color", label: "Success", desc: "Available slots", default: "#8FB392" },
                    ].map(({ key, label, desc, default: def }) => (
                      <div key={key} className="p-4 bg-[#FAFAFA] rounded-xl">
                        <Label className="mb-2 block font-medium">{label}</Label>
                        <div className="flex gap-3 items-center">
                          <input type="color" value={settings.theme[key] || def} onChange={(e) => updateThemeColor(key, e.target.value)} className="w-12 h-12 rounded-lg border-0 cursor-pointer" />
                          <Input value={settings.theme[key] || def} onChange={(e) => updateThemeColor(key, e.target.value)} className="h-12 rounded-xl flex-1" />
                        </div>
                        <p className="text-sm text-[#737373] mt-2">{desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-white rounded-xl border">
                    <h4 className="font-medium mb-4">Preview</h4>
                    <div className="flex flex-wrap gap-4">
                      <div className="h-12 px-6 rounded-full flex items-center justify-center text-white font-medium" style={{ backgroundColor: settings.theme.accent_color }}>Primary Button</div>
                      <div className="h-12 px-6 rounded-full flex items-center justify-center font-medium" style={{ backgroundColor: settings.theme.primary_color }}>Secondary</div>
                      <div className="h-12 px-6 rounded-full flex items-center justify-center text-white font-medium" style={{ backgroundColor: settings.theme.success_color }}>Available</div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end"><Button onClick={handleSaveSettings} disabled={savingSettings} className="btn-primary">{savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save Theme</>}</Button></div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* View Client Dialog */}
        <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>Client Profile</DialogTitle></DialogHeader>
            {selectedClient && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b">
                  <div className="w-16 h-16 rounded-full bg-[#F5D5D5] flex items-center justify-center text-xl font-semibold">{selectedClient.initials}</div>
                  <div><h3 className="text-lg font-semibold">{selectedClient.name}</h3><p className="text-[#737373]">{selectedClient.email}</p></div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex-1 p-3 bg-[#FAFAFA] rounded-lg"><p className="text-[#737373]">Credits</p><p className="font-semibold">{selectedClient.has_unlimited ? "Unlimited" : selectedClient.credits}</p></div>
                  <div className="flex-1 p-3 bg-[#FAFAFA] rounded-lg"><p className="text-[#737373]">Profile</p><p className="font-semibold">{selectedClient.profile_completed ? "Complete" : "Incomplete"}</p></div>
                </div>
                {selectedClient.profile && (
                  <div className="space-y-3 text-sm">
                    {selectedClient.profile.phone && <div><span className="text-[#737373]">Phone:</span> {selectedClient.profile.phone}</div>}
                    {selectedClient.profile.age && <div><span className="text-[#737373]">Age:</span> {selectedClient.profile.age}</div>}
                    {selectedClient.profile.fitness_goals && <div><span className="text-[#737373]">Goals:</span> {selectedClient.profile.fitness_goals}</div>}
                    {selectedClient.profile.health_conditions && <div className="text-[#D97575]"><span className="text-[#737373]">Health:</span> {selectedClient.profile.health_conditions}</div>}
                    {selectedClient.profile.previous_injuries && <div className="text-[#E6C785]"><span className="text-[#737373]">Injuries:</span> {selectedClient.profile.previous_injuries}</div>}
                    {selectedClient.profile.emergency_contact_name && <div><span className="text-[#737373]">Emergency:</span> {selectedClient.profile.emergency_contact_name} {selectedClient.profile.emergency_contact_phone}</div>}
                  </div>
                )}
                <Button onClick={() => { setShowClientDialog(false); openEditClient(selectedClient); }} className="w-full btn-secondary"><Edit className="w-4 h-4 mr-2" />Edit Profile</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Client Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>Edit Client Profile</DialogTitle></DialogHeader>
            {editingClient && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="mb-1 block">Name</Label><Input value={editingClient.name || ""} onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })} className="h-10 rounded-lg" /></div>
                  <div><Label className="mb-1 block">Email</Label><Input value={editingClient.email || ""} onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })} className="h-10 rounded-lg" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="mb-1 block">Credits</Label><Input type="number" value={editingClient.credits || 0} onChange={(e) => setEditingClient({ ...editingClient, credits: e.target.value })} className="h-10 rounded-lg" /></div>
                  <div className="flex items-center gap-2 pt-6"><Switch checked={editingClient.has_unlimited || false} onCheckedChange={(v) => setEditingClient({ ...editingClient, has_unlimited: v })} /><Label>Unlimited</Label></div>
                </div>
                <hr />
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="mb-1 block">Phone</Label><Input value={editingClient.phone || ""} onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })} className="h-10 rounded-lg" /></div>
                  <div><Label className="mb-1 block">Age</Label><Input type="number" value={editingClient.age || ""} onChange={(e) => setEditingClient({ ...editingClient, age: e.target.value })} className="h-10 rounded-lg" /></div>
                </div>
                <div><Label className="mb-1 block">Fitness Goals</Label><Textarea value={editingClient.fitness_goals || ""} onChange={(e) => setEditingClient({ ...editingClient, fitness_goals: e.target.value })} className="rounded-lg" rows={2} /></div>
                <div><Label className="mb-1 block">Health Conditions</Label><Textarea value={editingClient.health_conditions || ""} onChange={(e) => setEditingClient({ ...editingClient, health_conditions: e.target.value })} className="rounded-lg" rows={2} /></div>
                <div><Label className="mb-1 block">Previous Injuries</Label><Textarea value={editingClient.previous_injuries || ""} onChange={(e) => setEditingClient({ ...editingClient, previous_injuries: e.target.value })} className="rounded-lg" rows={2} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="mb-1 block">Emergency Contact</Label><Input value={editingClient.emergency_contact_name || ""} onChange={(e) => setEditingClient({ ...editingClient, emergency_contact_name: e.target.value })} className="h-10 rounded-lg" /></div>
                  <div><Label className="mb-1 block">Emergency Phone</Label><Input value={editingClient.emergency_contact_phone || ""} onChange={(e) => setEditingClient({ ...editingClient, emergency_contact_phone: e.target.value })} className="h-10 rounded-lg" /></div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={() => setShowEditDialog(false)} variant="outline" className="flex-1">Cancel</Button>
                  <Button onClick={handleSaveClient} disabled={savingClient} className="flex-1 btn-primary">{savingClient ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
