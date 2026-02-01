import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Calendar, Users, CreditCard, CheckCircle, ArrowRight } from "lucide-react";

const DEFAULT_SETTINGS = {
  hero_image: "https://customer-assets.emergentagent.com/job_fitness-booking-9/artifacts/mdv3ltvt_1000026645.jpg",
  site_title: "Stephanie Anderson Personal Training",
  site_tagline: "Personal Training & Small Group Fitness",
  hero_heading: "Train with Stephanie Anderson",
  hero_subheading: "Experience personalized fitness training designed to help you achieve your goals. Book sessions easily and join our supportive fitness community.",
  about_title: "Why Train With Us",
  about_text: "Get the personalized attention you deserve with our boutique fitness experience.",
  feature_1_title: "Easy Booking",
  feature_1_text: "Book your sessions with just a few clicks. See availability in real-time.",
  feature_2_title: "Small Groups",
  feature_2_text: "Maximum 3 people per session for personalized attention and results.",
  feature_3_title: "Flexible Plans",
  feature_3_text: "Choose from single sessions, multi-packs, or unlimited weekly access.",
  cta_title: "Ready to Start Your Fitness Journey?",
  cta_text: "Join us today and experience the difference personalized training can make in your life.",
  gallery_images: [],
  session_times: {
    morning: { start: "5:30 AM", end: "6:15 AM" },
    afternoon: { start: "9:30 AM", end: "10:15 AM" }
  }
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    axios.get(`${API}/settings`)
      .then(res => setSettings({ ...DEFAULT_SETTINGS, ...res.data }))
      .catch(() => {});

    const checkAuth = async () => {
      try {
        await axios.get(`${API}/auth/me`);
        navigate("/dashboard", { replace: true });
      } catch {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="spinner"></div>
      </div>
    );
  }

  const features = [
    { icon: Calendar, title: settings.feature_1_title, description: settings.feature_1_text },
    { icon: Users, title: settings.feature_2_title, description: settings.feature_2_text },
    { icon: CreditCard, title: settings.feature_3_title, description: settings.feature_3_text },
  ];

  const pricing = [
    { name: "Single Session", price: "$30", features: ["1 training session", "Book any available slot"], popular: false },
    { name: "Duo Pack", price: "$40", features: ["2 training sessions", "Save $20", "Flexible scheduling"], popular: false },
    { name: "Unlimited", price: "$50", period: "/week", features: ["Unlimited sessions", "Priority booking", "Best value"], popular: true },
  ];

  const morningTime = settings.session_times?.morning || { start: "5:30 AM", end: "6:15 AM" };
  const afternoonTime = settings.session_times?.afternoon || { start: "9:30 AM", end: "10:15 AM" };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F5D5D5] flex items-center justify-center font-bold text-[#1A1A1A]" style={{ fontFamily: 'Playfair Display, serif' }}>
                SA
              </div>
              <span className="font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Playfair Display, serif' }}>
                SAPT
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" data-testid="landing-login-btn">
                <Button variant="ghost" className="text-[#1A1A1A] hover:bg-[#F5D5D5]/50">Login</Button>
              </Link>
              <Link to="/register" data-testid="landing-register-btn">
                <Button className="btn-primary">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 hero-gradient">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <p className="text-sm text-[#737373] uppercase tracking-widest mb-4">{settings.site_tagline}</p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1A1A] leading-tight mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
                {settings.hero_heading?.includes("Stephanie") ? (
                  <>Train with <span className="text-[#E8B4B4]">Stephanie Anderson</span></>
                ) : settings.hero_heading}
              </h1>
              <p className="text-lg text-[#737373] mb-8 max-w-lg leading-relaxed">{settings.hero_subheading}</p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register" data-testid="hero-get-started-btn">
                  <Button className="btn-primary flex items-center gap-2">Start Your Journey<ArrowRight className="w-4 h-4" /></Button>
                </Link>
                <a href="#pricing" data-testid="hero-view-pricing-btn">
                  <Button className="btn-secondary">View Pricing</Button>
                </a>
              </div>
              
              {/* Session Times */}
              <div className="mt-10 flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#8FB392]/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[#5A8F5E]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#1A1A1A]">Morning</p>
                    <p className="text-sm text-[#737373]">{morningTime.start} - {morningTime.end}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#8FA6B3]/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[#5A8FA6]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#1A1A1A]">Mid-Morning</p>
                    <p className="text-sm text-[#737373]">{afternoonTime.start} - {afternoonTime.end}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img src={settings.hero_image} alt="Stephanie Anderson - Personal Trainer" className="w-full h-[500px] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/20 to-transparent" />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl border border-[#F5F5F5]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#F5D5D5] flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#1A1A1A]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">Small Groups</p>
                    <p className="text-sm text-[#737373]">Max 3 per session</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#1A1A1A] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              {settings.about_title}
            </h2>
            <p className="text-[#737373] max-w-2xl mx-auto">{settings.about_text}</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card-base text-center animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="w-14 h-14 rounded-2xl bg-[#F5D5D5] flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="w-7 h-7 text-[#1A1A1A]" />
                </div>
                <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>{feature.title}</h3>
                <p className="text-[#737373] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      {settings.gallery_images && settings.gallery_images.length > 0 && (
        <section className="py-20 px-4 bg-[#FAFAFA]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-semibold text-[#1A1A1A] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                Gallery
              </h2>
              <p className="text-[#737373]">See our training sessions in action</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {settings.gallery_images.map((img, index) => (
                <div key={index} className="relative group overflow-hidden rounded-2xl aspect-square">
                  <img src={img} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-[#1A1A1A]/0 group-hover:bg-[#1A1A1A]/20 transition-colors duration-300" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#1A1A1A] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Simple, Transparent Pricing
            </h2>
            <p className="text-[#737373] max-w-2xl mx-auto">
              Choose the plan that works best for you. Pay cash on arrival or via direct transfer.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricing.map((plan, index) => (
              <div key={plan.name} className={`card-base relative animate-fade-in ${plan.popular ? "ring-2 ring-[#1A1A1A]" : ""}`} style={{ animationDelay: `${index * 0.1}s` }}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#1A1A1A] text-white text-xs font-medium rounded-full">Most Popular</div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-[#1A1A1A]">{plan.price}</span>
                    {plan.period && <span className="text-[#737373]">{plan.period}</span>}
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[#8FB392] flex-shrink-0" />
                      <span className="text-[#737373]">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="block">
                  <Button className={`w-full ${plan.popular ? "btn-primary" : "btn-secondary"}`}>Get Started</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-[#1A1A1A]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
            {settings.cta_title}
          </h2>
          <p className="text-[#A0A0A0] mb-8 max-w-2xl mx-auto">{settings.cta_text}</p>
          <Link to="/register" data-testid="cta-signup-btn">
            <Button className="h-14 px-10 rounded-full bg-[#F5D5D5] text-[#1A1A1A] font-medium hover:bg-[#E8B4B4] transition-all">
              Create Your Account<ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-white border-t border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F5D5D5] flex items-center justify-center font-bold text-[#1A1A1A] text-sm" style={{ fontFamily: 'Playfair Display, serif' }}>SA</div>
            <span className="text-sm text-[#737373]">{settings.site_title}</span>
          </div>
          <p className="text-sm text-[#737373]">© {new Date().getFullYear()} SAPT. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
