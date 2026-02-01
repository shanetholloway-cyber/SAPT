import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Calendar, Users, CreditCard, CheckCircle, ArrowRight } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
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
    {
      icon: Calendar,
      title: "Easy Booking",
      description: "Book your sessions with just a few clicks. See availability in real-time.",
    },
    {
      icon: Users,
      title: "Small Groups",
      description: "Maximum 3 people per session for personalized attention and results.",
    },
    {
      icon: CreditCard,
      title: "Flexible Plans",
      description: "Choose from single sessions, multi-packs, or unlimited monthly access.",
    },
  ];

  const pricing = [
    {
      name: "Single Session",
      price: "$30",
      features: ["1 training session", "Personal attention", "Book any available slot"],
      popular: false,
    },
    {
      name: "Duo Pack",
      price: "$40",
      features: ["2 training sessions", "Save $20", "Flexible scheduling"],
      popular: false,
    },
    {
      name: "Unlimited",
      price: "$50",
      period: "/week",
      features: ["Unlimited sessions", "Priority booking", "Best value"],
      popular: true,
    },
  ];

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
                <Button variant="ghost" className="text-[#1A1A1A] hover:bg-[#F5D5D5]/50">
                  Login
                </Button>
              </Link>
              <Link to="/register" data-testid="landing-register-btn">
                <Button className="btn-primary">
                  Get Started
                </Button>
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
              <p className="text-sm text-[#737373] uppercase tracking-widest mb-4">
                Personal Training & Small Group Fitness
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1A1A] leading-tight mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
                Train with{" "}
                <span className="text-[#E8B4B4]">Stephanie Anderson</span>
              </h1>
              <p className="text-lg text-[#737373] mb-8 max-w-lg leading-relaxed">
                Experience personalized fitness training designed to help you achieve your goals. 
                Book sessions easily and join our supportive fitness community.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register" data-testid="hero-get-started-btn">
                  <Button className="btn-primary flex items-center gap-2">
                    Start Your Journey
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <a href="#pricing" data-testid="hero-view-pricing-btn">
                  <Button className="btn-secondary">
                    View Pricing
                  </Button>
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
                    <p className="text-sm text-[#737373]">5:30 - 6:15 AM</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#8FA6B3]/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[#5A8FA6]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#1A1A1A]">Mid-Morning</p>
                    <p className="text-sm text-[#737373]">9:30 - 10:15 AM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://customer-assets.emergentagent.com/job_fitness-booking-9/artifacts/mdv3ltvt_1000026645.jpg"
                  alt="Stephanie Anderson - Personal Trainer"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/20 to-transparent" />
              </div>
              {/* Floating Card */}
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
              Why Train With Us
            </h2>
            <p className="text-[#737373] max-w-2xl mx-auto">
              Get the personalized attention you deserve with our boutique fitness experience.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="card-base text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
                data-testid={`feature-card-${index}`}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#F5D5D5] flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="w-7 h-7 text-[#1A1A1A]" />
                </div>
                <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {feature.title}
                </h3>
                <p className="text-[#737373] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-[#FAFAFA]">
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
              <div
                key={plan.name}
                className={`card-base relative animate-fade-in ${
                  plan.popular ? "ring-2 ring-[#1A1A1A]" : ""
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
                data-testid={`pricing-card-${index}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#1A1A1A] text-white text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {plan.name}
                  </h3>
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
                  <Button
                    className={`w-full ${plan.popular ? "btn-primary" : "btn-secondary"}`}
                    data-testid={`pricing-cta-${index}`}
                  >
                    Get Started
                  </Button>
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
            Ready to Start Your Fitness Journey?
          </h2>
          <p className="text-[#A0A0A0] mb-8 max-w-2xl mx-auto">
            Join us today and experience the difference personalized training can make in your life.
          </p>
          <Link to="/register" data-testid="cta-signup-btn">
            <Button className="h-14 px-10 rounded-full bg-[#F5D5D5] text-[#1A1A1A] font-medium hover:bg-[#E8B4B4] transition-all">
              Create Your Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-white border-t border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F5D5D5] flex items-center justify-center font-bold text-[#1A1A1A] text-sm" style={{ fontFamily: 'Playfair Display, serif' }}>
              SA
            </div>
            <span className="text-sm text-[#737373]">
              Stephanie Anderson Personal Training
            </span>
          </div>
          <p className="text-sm text-[#737373]">
            © {new Date().getFullYear()} SAPT. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
