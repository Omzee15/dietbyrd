import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, Heart, LogOut, Menu, MessageSquare, User, UtensilsCrossed, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PublicBookingModal } from "@/components/PublicBookingModal";

const logoChars = ["D", "i", "e", "t", " ", "B", "y", " "];

const Logo = () => {
  const [animate, setAnimate] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem("dbrd_logo_played")) {
      setAnimate(true);
      sessionStorage.setItem("dbrd_logo_played", "1");
    }
  }, []);

  // Navigating to "/" only resets scroll when the pathname actually
  // changes (see ScrollToTop), so clicking the logo while already on the
  // landing page did nothing. Scroll up directly in that case.
  const handleClick = (e: React.MouseEvent) => {
    if (location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Link to="/" className="nav-logo" aria-label="Diet By RD" onClick={handleClick}>
      {logoChars.map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          className="logo-char"
          initial={animate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.03, duration: 0.4 }}
        >
          {char}
        </motion.span>
      ))}
      <motion.span
        className="logo-rd"
        initial={animate ? { opacity: 0, scale: 1 } : false}
        animate={animate ? { opacity: 1, scale: [1, 1.15, 1] } : { opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        RD
      </motion.span>
    </Link>
  );
};

const patientNavItems = [
  { label: "My all bookings", href: "/patient/appointments", icon: CalendarDays },
  { label: "My diet charts", href: "/patient/diet-plans", icon: UtensilsCrossed },
  { label: "My blood reports", href: "/patient/profile#reports", icon: Heart },
  { label: "Help / Support", href: "/patient/support", icon: MessageSquare },
];

// The one nav + mobile drawer used across every public page (Landing, Contact,
// Reviews, and the auth page) -- previously each page hand-copied its own
// version of this, and the auth page (Index.tsx) never got one at all.
export function SiteHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // On the home page, "About Us" smooth-scrolls to the in-page section;
  // anywhere else it navigates home first and scrolls once there.
  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname !== "/") {
      navigate(`/#${id}`);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleProfileLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <style>
        {`.landing-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  padding: 0 5%;
  transition: all 0.3s;
  background: rgba(10,22,40,.96);
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.landing-nav.scrolled {
  background: rgba(10,22,40,.96);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.nav-inner {
  max-width: 1200px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between; height: 68px;
}
.nav-logo {
  font-family: 'Playfair Display', serif;
  font-size: 22px; font-weight: 700; color: #fff;
  text-decoration: none; letter-spacing: -0.3px;
  white-space: pre;
}
.nav-logo .logo-char,
.nav-logo .logo-rd {
  display: inline-block;
}
.nav-logo .logo-rd { color: var(--gold); }
.nav-links { display: flex; align-items: center; gap: 32px; }
.nav-links a {
  color: rgba(255,255,255,.75); text-decoration: none;
  font-size: 14px; font-weight: 500; transition: color 0.2s;
}
.nav-links a:hover { color: #fff; }
.nav-link {
  color: rgba(255,255,255,.75); text-decoration: none;
  font-size: 14px; font-weight: 500; transition: color 0.2s;
}
.nav-link:hover { color: #fff; }
.nav-cta {
  background: var(--teal);
  color: #fff !important; padding: 9px 20px; border-radius: 8px;
  transition: background 0.2s !important; cursor: pointer; border: none;
  font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
}
.nav-cta:hover { background: var(--teal-m) !important; }

/* Profile avatar menu */
.profile-menu-wrap { position: relative; margin-left: 8px; }
.profile-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  background: linear-gradient(135deg, var(--teal), var(--teal-m));
  border: 2px solid rgba(255,255,255,0.25);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s; font-size: 16px;
}
.profile-avatar:hover { border-color: rgba(255,255,255,0.6); transform: scale(1.05); }
.profile-dropdown {
  position: absolute; top: calc(100% + 10px); right: 0; min-width: 210px;
  background: #fff;
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0,0,0,0.1); border-radius: 14px; padding: 6px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.12);
  opacity: 0; visibility: hidden; transform: translateY(-6px);
  transition: all 0.2s cubic-bezier(0.4,0,0.2,1); z-index: 9999;
}
.profile-dropdown.open { opacity: 1; visibility: visible; transform: translateY(0); }
.profile-dropdown-header {
  padding: 10px 12px 8px;
  border-bottom: 1px solid rgba(0,0,0,0.07); margin-bottom: 4px;
}
.profile-dropdown-header span { font-size: 13px; font-weight: 600; color: var(--navy); display: block; }
.profile-dropdown-header small { font-size: 11px; color: var(--text3); }
.profile-dropdown a, .profile-dropdown button {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 9px 12px; border-radius: 8px; font-size: 13px; font-weight: 500;
  color: var(--text2); text-decoration: none;
  background: transparent; border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif; transition: all 0.15s; text-align: left;
}
.profile-dropdown a:hover, .profile-dropdown button:hover { background: rgba(11,110,79,0.07); color: var(--navy); }
.profile-dropdown .logout-btn {
  color: rgba(220,38,38,0.8); margin-top: 2px;
  border-top: 1px solid rgba(0,0,0,0.06); padding-top: 10px;
}
.profile-dropdown .logout-btn:hover { background: rgba(239,68,68,0.07); color: rgb(220,38,38); }

/* Hamburger button */
.hamburger-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
  z-index: 1001;
}
.hamburger-btn:hover { background: rgba(255,255,255,0.1); }
.landing-nav:not(.scrolled) .hamburger-btn { border-color: rgba(27,43,58,0.2); color: var(--navy); }
.landing-nav:not(.scrolled) .hamburger-btn:hover { background: rgba(27,43,58,0.06); }

/* Mobile-only account/login shortcut, shown left of the hamburger button */
.mobile-account-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: white;
  transition: background 0.2s;
}
.mobile-account-btn:hover { background: rgba(255,255,255,0.1); }
.landing-nav:not(.scrolled) .mobile-account-btn { border-color: rgba(27,43,58,0.2); color: var(--navy); }
.landing-nav:not(.scrolled) .mobile-account-btn:hover { background: rgba(27,43,58,0.06); }

/* Mobile drawer */
.mobile-drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 9998;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.mobile-drawer-overlay.open { opacity: 1; pointer-events: auto; }

.mobile-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 280px;
  max-width: 85vw;
  height: 100vh;
  height: 100dvh;
  background: var(--navy);
  z-index: 9999;
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.mobile-drawer.open { transform: translateX(0); }

.mobile-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.mobile-drawer-header .fb-logo {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  font-size: 18px;
  color: #FDFCF8;
}
.mobile-drawer-header .fb-logo span { color: var(--teal); }
.mobile-drawer-close {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.mobile-drawer-close:hover { background: rgba(255,255,255,0.1); }

.mobile-drawer-links {
  display: flex;
  flex-direction: column;
  padding: 12px 0;
}
.mobile-drawer-links a,
.mobile-drawer-links button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  color: rgba(255,255,255,0.85);
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  font-family: 'DM Sans', sans-serif;
  transition: background 0.15s, color 0.15s;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  min-height: 48px;
}
.mobile-drawer-links a:hover,
.mobile-drawer-links button:hover {
  background: rgba(255,255,255,0.06);
  color: white;
}
.mobile-drawer-divider {
  height: 1px;
  background: rgba(255,255,255,0.1);
  margin: 8px 20px;
}
.mobile-drawer-cta {
  margin: 16px 20px;
  padding: 14px 24px;
  background: var(--teal);
  color: white !important;
  border-radius: 10px;
  font-weight: 700;
  font-size: 15px;
  text-align: center;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mobile-drawer-cta:hover { opacity: 0.9; }

/* Responsive */
@media (max-width: 900px) {
  .nav-links .nav-mid { display: none; }
  .nav-links .nav-link { display: none; }
  .nav-links .nav-cta { display: none; }
  .nav-links .profile-menu-wrap { display: none; }
  .mobile-account-btn { display: flex !important; margin-left: auto; }
  .hamburger-btn { display: flex !important; margin-left: 8px; }
}
@media (max-width: 600px) {
  .nav-links { gap: 12px; }
}
`}
      </style>

      <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-inner">
          <Logo />
          <div className="nav-links">
            <Link to="/" className="nav-mid">Home</Link>
            <a href="#about" className="nav-mid" onClick={scrollTo("about")}>About Us</a>
            <Link to="/reviews" className="nav-mid">Real Reviews</Link>
            <Link to="/contact" className="nav-mid">Contact Us</Link>
            <a href="/privacy" target="_blank" rel="noopener" className="nav-link">Privacy Policy</a>
            {isAuthenticated ? (
              <div
                className="profile-menu-wrap"
                onMouseEnter={() => setIsProfileMenuOpen(true)}
                onMouseLeave={() => setIsProfileMenuOpen(false)}
              >
                <button className="profile-avatar" aria-label="Profile menu">
                  <User size={18} />
                </button>
                <div className={`profile-dropdown${isProfileMenuOpen ? " open" : ""}`}>
                  <div className="profile-dropdown-header">
                    <span>{user?.name || "My Account"}</span>
                    <small>{user?.role === "patient" ? "Patient" : "Member"}</small>
                  </div>
                  {patientNavItems.map((item) => (
                    <Link key={item.href} to={item.href} onClick={() => setIsProfileMenuOpen(false)}>
                      <item.icon size={15} />
                      {item.label}
                    </Link>
                  ))}
                  <button className="logout-btn" onClick={handleProfileLogout}>
                    <LogOut size={15} />
                    Log out
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="profile-menu-wrap">
                  <Link to="/login" className="nav-link" style={{ fontWeight: 600 }}>
                    Login / Sign Up
                  </Link>
                </div>
                <button onClick={() => setIsBookingModalOpen(true)} className="nav-cta">Book — ₹999</button>
              </>
            )}
            <Link
              to={isAuthenticated ? "/patient" : "/login"}
              className="mobile-account-btn"
              aria-label={isAuthenticated ? "My Account" : "Login or Sign Up"}
            >
              <User size={18} />
            </Link>
            <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div className={`mobile-drawer-overlay${isMobileMenuOpen ? " open" : ""}`} onClick={() => setIsMobileMenuOpen(false)} />
      <div className={`mobile-drawer${isMobileMenuOpen ? " open" : ""}`}>
        <div className="mobile-drawer-header">
          <div className="fb-logo">Diet By <span>RD</span></div>
          <button className="mobile-drawer-close" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <div className="mobile-drawer-links">
          <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
          <a href="#about" onClick={(e) => { scrollTo("about")(e); setIsMobileMenuOpen(false); }}>About Us</a>
          <Link to="/reviews" onClick={() => setIsMobileMenuOpen(false)}>Real Reviews</Link>
          <Link to="/contact" onClick={() => setIsMobileMenuOpen(false)}>Contact Us</Link>
          <a href="/privacy" target="_blank" rel="noopener" onClick={() => setIsMobileMenuOpen(false)}>Privacy Policy</a>
          <div className="mobile-drawer-divider" />
          {isAuthenticated ? (
            <>
              {patientNavItems.map((item) => (
                <Link key={item.href} to={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
              <div className="mobile-drawer-divider" />
              <button onClick={() => { handleProfileLogout(); setIsMobileMenuOpen(false); }}>
                <LogOut size={18} />
                Log out
              </button>
            </>
          ) : (
            <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
              <User size={18} />
              Login / Sign Up
            </Link>
          )}
        </div>
        <button
          className="mobile-drawer-cta"
          onClick={() => { setIsBookingModalOpen(true); setIsMobileMenuOpen(false); }}
        >
          Book Consultation — ₹999
        </button>
      </div>

      <PublicBookingModal open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen} />
    </>
  );
}
