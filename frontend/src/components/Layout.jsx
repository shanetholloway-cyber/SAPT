import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, CreditCard, User, LogOut, LayoutDashboard, Settings, Menu, X } from "lucide-react";
import { useState } from "react";
import NotificationBell from "@/components/NotificationBell";

export const Layout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/");
    }
  };

  const navItems = [
    { path: "/dashboard", label: "Book Session", icon: Calendar },
    { path: "/bookings", label: "My Bookings", icon: LayoutDashboard },
    { path: "/credits", label: "Buy Credits", icon: CreditCard },
  ];

  if (user?.is_admin) {
    navItems.push({ path: "/admin", label: "Admin", icon: Settings });
  }

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Navigation */}
      <nav className="bg-white border-b border-[#E5E5E5] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-3" data-testid="nav-logo">
              <div className="logo-circle">
                <span className="text-lg">SA</span>
              </div>
              <span className="hidden sm:block font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Playfair Display, serif' }}>
                SAPT
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 py-2 transition-colors ${
                    isActive(item.path)
                      ? "text-[#1A1A1A] border-b-2 border-[#1A1A1A]"
                      : "text-[#737373] hover:text-[#1A1A1A]"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notification Bell */}
              <NotificationBell />

              {/* Credits Badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#F5D5D5] rounded-full">
                <CreditCard className="w-4 h-4 text-[#1A1A1A]" />
                <span className="text-sm font-medium text-[#1A1A1A]" data-testid="nav-credits">
                  {user?.has_unlimited ? "Unlimited" : `${user?.credits || 0} credits`}
                </span>
              </div>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 p-2 rounded-full hover:bg-[#F5F5F5] transition-colors"
                    data-testid="user-menu-trigger"
                  >
                    {user?.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#F5D5D5] flex items-center justify-center text-sm font-medium text-[#1A1A1A]">
                        {user?.initials || "XX"}
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="font-medium text-[#1A1A1A]">{user?.name}</p>
                    <p className="text-sm text-[#737373]">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 cursor-pointer" data-testid="menu-profile">
                      <User className="w-4 h-4" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/credits" className="flex items-center gap-2 cursor-pointer" data-testid="menu-credits">
                      <CreditCard className="w-4 h-4" />
                      Buy Credits
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-[#D97575] cursor-pointer"
                    data-testid="menu-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Toggle */}
              <button
                className="md:hidden p-2 rounded-lg hover:bg-[#F5F5F5]"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-toggle"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-[#E5E5E5]">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive(item.path)
                      ? "bg-[#F5D5D5] text-[#1A1A1A]"
                      : "text-[#737373] hover:bg-[#F5F5F5]"
                  }`}
                  data-testid={`mobile-nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
              {/* Mobile Credits Display */}
              <div className="flex items-center gap-2 px-4 py-3 mt-2 bg-[#F5D5D5]/50 rounded-xl">
                <CreditCard className="w-5 h-5 text-[#1A1A1A]" />
                <span className="font-medium text-[#1A1A1A]">
                  {user?.has_unlimited ? "Unlimited Credits" : `${user?.credits || 0} Credits`}
                </span>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="page-transition">{children}</main>
    </div>
  );
};

export default Layout;
