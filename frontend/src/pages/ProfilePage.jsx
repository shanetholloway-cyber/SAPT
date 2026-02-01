import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Phone, 
  Calendar, 
  Target, 
  Heart, 
  AlertTriangle, 
  UserPlus, 
  ArrowRight, 
  Loader2,
  CheckCircle
} from "lucide-react";

const ProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isNewUser = location.state?.isNewUser;
  
  // For new users coming from registration/oauth, they might not have context yet
  const [user, setUser] = useState(location.state?.user || null);
  const [loading, setLoading] = useState(!location.state?.user);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    phone: "",
    age: "",
    fitness_goals: "",
    health_conditions: "",
    previous_injuries: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      if (user) {
        // Populate form with existing profile data
        if (user.profile) {
          setFormData({
            phone: user.profile.phone || "",
            age: user.profile.age || "",
            fitness_goals: user.profile.fitness_goals || "",
            health_conditions: user.profile.health_conditions || "",
            previous_injuries: user.profile.previous_injuries || "",
            emergency_contact_name: user.profile.emergency_contact_name || "",
            emergency_contact_phone: user.profile.emergency_contact_phone || "",
          });
        }
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API}/auth/me`);
        setUser(response.data);
        if (response.data.profile) {
          setFormData({
            phone: response.data.profile.phone || "",
            age: response.data.profile.age || "",
            fitness_goals: response.data.profile.fitness_goals || "",
            health_conditions: response.data.profile.health_conditions || "",
            previous_injuries: response.data.profile.previous_injuries || "",
            emergency_contact_name: response.data.profile.emergency_contact_name || "",
            emergency_contact_phone: response.data.profile.emergency_contact_phone || "",
          });
        }
      } catch (error) {
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axios.put(`${API}/profile`, {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null,
      });
      toast.success("Profile updated successfully!");
      
      if (isNewUser) {
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="spinner"></div>
      </div>
    );
  }

  // Render without Layout for new users completing profile
  const content = (
    <div className={isNewUser ? "min-h-screen bg-[#FAFAFA] py-12 px-4" : "py-8 px-4 sm:px-6 lg:px-8"}>
      <div className="max-w-3xl mx-auto">
        {isNewUser && (
          <div className="text-center mb-10 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[#8FB392]/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-[#5A8F5E]" />
            </div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              Welcome to SAPT, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-[#737373] max-w-lg mx-auto">
              Please complete your fitness profile so Stephanie can provide you with the best personalized training experience.
            </p>
          </div>
        )}

        {!isNewUser && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'Playfair Display, serif' }}>
              My Profile
            </h1>
            <p className="text-[#737373] mt-2">
              Keep your fitness information up to date
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* User Info Card */}
          <div className="card-base">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#F5F5F5]">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#F5D5D5] flex items-center justify-center text-xl font-semibold text-[#1A1A1A]">
                  {user?.initials}
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-[#1A1A1A]">{user?.name}</h2>
                <p className="text-[#737373]">{user?.email}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="phone" className="text-[#1A1A1A] font-medium mb-1.5 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-[#E5E5E5] focus:ring-2 focus:ring-[#F5D5D5]"
                  data-testid="profile-phone-input"
                />
              </div>

              <div>
                <Label htmlFor="age" className="text-[#1A1A1A] font-medium mb-1.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Age
                </Label>
                <Input
                  id="age"
                  name="age"
                  type="number"
                  placeholder="Your age"
                  value={formData.age}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-[#E5E5E5] focus:ring-2 focus:ring-[#F5D5D5]"
                  data-testid="profile-age-input"
                />
              </div>
            </div>
          </div>

          {/* Fitness Goals */}
          <div className="card-base">
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              <Target className="w-5 h-5 text-[#8FB392]" />
              Fitness Goals
            </h3>
            <Textarea
              name="fitness_goals"
              placeholder="What are you hoping to achieve? (e.g., lose weight, build strength, improve flexibility, train for an event)"
              value={formData.fitness_goals}
              onChange={handleChange}
              className="min-h-[100px] rounded-xl border-[#E5E5E5] focus:ring-2 focus:ring-[#F5D5D5]"
              data-testid="profile-fitness-goals-input"
            />
          </div>

          {/* Health Information */}
          <div className="card-base">
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              <Heart className="w-5 h-5 text-[#D97575]" />
              Health Information
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="health_conditions" className="text-[#1A1A1A] font-medium mb-1.5 block">
                  Health Conditions
                </Label>
                <Textarea
                  id="health_conditions"
                  name="health_conditions"
                  placeholder="Any medical conditions we should be aware of? (e.g., asthma, diabetes, heart conditions)"
                  value={formData.health_conditions}
                  onChange={handleChange}
                  className="min-h-[80px] rounded-xl border-[#E5E5E5] focus:ring-2 focus:ring-[#F5D5D5]"
                  data-testid="profile-health-conditions-input"
                />
              </div>

              <div>
                <Label htmlFor="previous_injuries" className="text-[#1A1A1A] font-medium mb-1.5 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#E6C785]" />
                  Previous Injuries
                </Label>
                <Textarea
                  id="previous_injuries"
                  name="previous_injuries"
                  placeholder="Any past injuries that might affect your training? (e.g., knee surgery, back problems)"
                  value={formData.previous_injuries}
                  onChange={handleChange}
                  className="min-h-[80px] rounded-xl border-[#E5E5E5] focus:ring-2 focus:ring-[#F5D5D5]"
                  data-testid="profile-injuries-input"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="card-base">
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              <UserPlus className="w-5 h-5 text-[#8FA6B3]" />
              Emergency Contact
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="emergency_contact_name" className="text-[#1A1A1A] font-medium mb-1.5 block">
                  Contact Name
                </Label>
                <Input
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  type="text"
                  placeholder="Emergency contact name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-[#E5E5E5] focus:ring-2 focus:ring-[#F5D5D5]"
                  data-testid="profile-emergency-name-input"
                />
              </div>

              <div>
                <Label htmlFor="emergency_contact_phone" className="text-[#1A1A1A] font-medium mb-1.5 block">
                  Contact Phone
                </Label>
                <Input
                  id="emergency_contact_phone"
                  name="emergency_contact_phone"
                  type="tel"
                  placeholder="Emergency contact phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-[#E5E5E5] focus:ring-2 focus:ring-[#F5D5D5]"
                  data-testid="profile-emergency-phone-input"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            {!isNewUser && (
              <Button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="btn-secondary"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={saving}
              className="btn-primary"
              data-testid="profile-save-btn"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isNewUser ? "Continue to Dashboard" : "Save Changes"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  // New users see profile page without navigation
  if (isNewUser) {
    return content;
  }

  // Existing users see profile within the layout
  return <Layout>{content}</Layout>;
};

export default ProfilePage;
