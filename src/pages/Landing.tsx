import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, getDashboardPath } from "@/contexts/AuthContext";
import { PublicBookingModal } from "@/components/PublicBookingModal";
import {
  CalendarDays,
  Heart,
  LogOut,
  MessageSquare,
  UtensilsCrossed,
  User,
} from "lucide-react";

const testimonials = [
  {
    text: 'My dietitian gave me a plan that helped me <strong>reverse diabetes</strong> — I went from HbA1c 6.3 to 5.9 in three months. And I didn\'t have to give up a single meal that matters to me. Idli, dosa, rice — it\'s all still there.',
    name: 'Suresh K.',
    detail: 'Chennai, Tamil Nadu · 54 years',
    condition: 'Type 2 Diabetes',
    avatar: '🧑'
  },
  {
    text: 'I had been struggling with PCOS for years. My RD didn\'t just hand me a meal plan — she explained the <strong>science behind every choice</strong>, adapted it to my Gujarati food habits. My periods are now regular for the first time in two years.',
    name: 'Priya M.',
    detail: 'Ahmedabad, Gujarat · 28 years',
    condition: 'PCOS',
    avatar: '👩'
  },
  {
    text: 'My doctor referred me here and I was skeptical — ₹999 seemed too good. Three months later, my <strong>LDL is down 40 points</strong> without medication. My RD knows Punjabi food inside out.',
    name: 'Harjeet S.',
    detail: 'Ludhiana, Punjab · 48 years',
    condition: 'High Cholesterol',
    avatar: '👨'
  },
  {
    text: 'As a competitive swimmer, I needed sports nutrition that actually makes sense. My RD created a plan that <strong>improved my endurance and recovery</strong> measurably within six weeks. Real science, not supplements.',
    name: 'Anika R.',
    detail: 'Bengaluru, Karnataka · 22 years',
    condition: 'Sports Nutrition',
    avatar: '🏊'
  },
];

const conditions = [
  { icon: '🩸', name: 'Type 2 Diabetes' },
  { icon: '❤️', name: 'High Blood Pressure' },
  { icon: '🫀', name: 'High Cholesterol' },
  { icon: '⚡', name: 'PCOS' },
  { icon: '🔄', name: 'Hormonal Imbalance' },
  { icon: '🌿', name: 'Gut Issues' },
  { icon: '💨', name: 'IBS' },
  { icon: '⚖️', name: 'Weight Management' },
  { icon: '💊', name: 'Deficiency Management' },
  { icon: '💚', name: 'General Health' },
  { icon: '🌱', name: 'Healthy Vegan Diet' },
  { icon: '🏋️', name: 'Sports Nutrition' },
  { icon: '💪', name: 'Gym Diet' },
];

const patientNavItems = [
  { label: "My all bookings", href: "/patient/appointments", icon: CalendarDays },
  { label: "My diet charts", href: "/patient/diet-plans", icon: UtensilsCrossed },
  { label: "My blood reports", href: "/patient", icon: Heart },
  { label: "Help/support", href: "/patient/support", icon: MessageSquare },
];

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement | null>(null);
  const revealRefs = useRef<(HTMLElement | null)[]>([]);

  const isPatient = isAuthenticated && user?.role === "patient";

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "patient" && !isBookingModalOpen) {
      navigate(getDashboardPath(user.role));
    }
  }, [isAuthenticated, user, navigate, isBookingModalOpen]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('revealed');
        });
      },
      { threshold: 0.12 }
    );
    revealRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, []);

  // Stats bar intersection observer
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".profile-menu-wrap")) setIsProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isProfileMenuOpen]);

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  };

  const goToLogin = () => {
    setIsTransitioning(true);
    setTimeout(() => navigate('/login'), 200);
  };

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={`landing-page ${isTransitioning ? 'transitioning' : ''}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

        .landing-page {
          --navy: #0A1628;
          --teal: #0B6E4F;
          --teal-l: #E8F5F0;
          --teal-m: #0F8A63;
          --gold: #C9952A;
          --gold-l: #FBF4E6;
          --cream: #FDFAF5;
          --white: #FFFFFF;
          --text: #1A1A2E;
          --text2: #4A5568;
          --text3: #718096;
          --border: #E2E8F0;
          --red: #C53030;
          --header-height: 72px;
          font-family: 'DM Sans', sans-serif;
          background: var(--navy);
          color: var(--text);
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
          scroll-behavior: smooth;
        }
        .landing-page * { box-sizing: border-box; margin: 0; padding: 0; }

        .landing-page {
          transition: opacity 0.2s ease;
        }
        .landing-page.transitioning {
          opacity: 0;
        }

        /* Navigation */
        .landing-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
          padding: 0 5%;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(10, 22, 40, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .landing-nav.scrolled {
          background: rgba(10, 22, 40, 0.98);
          box-shadow: 0 4px 30px rgba(0,0,0,0.15);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .nav-inner {
          max-width: 1200px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between; height: 72px;
        }
        .nav-logo {
          font-family: 'Playfair Display', serif;
          font-size: 24px; font-weight: 700; color: #fff;
          text-decoration: none; letter-spacing: -0.3px;
        }
        .nav-logo span { color: var(--gold); }
        .nav-links { display: flex; align-items: center; gap: 8px; }
        .nav-links a {
          color: rgba(255,255,255,0.7); text-decoration: none;
          font-size: 14px; font-weight: 500; transition: all 0.2s;
          padding: 8px 16px; border-radius: 8px;
        }
        .nav-links a:hover { color: #fff; background: rgba(255,255,255,0.08); }
        .nav-cta {
          background: linear-gradient(135deg, var(--teal), var(--teal-m)) !important;
          color: #fff !important; padding: 10px 24px; border-radius: 10px;
          transition: all 0.25s !important; cursor: pointer; border: none;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          margin-left: 8px; box-shadow: 0 2px 12px rgba(11,110,79,0.3);
        }
        .nav-cta:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(11,110,79,0.4) !important; }

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
          background: rgba(10, 22, 40, 0.97);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 6px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          opacity: 0; visibility: hidden; transform: translateY(-6px);
          transition: all 0.2s cubic-bezier(0.4,0,0.2,1); z-index: 9999;
        }
        .profile-dropdown.open { opacity: 1; visibility: visible; transform: translateY(0); }
        .profile-dropdown-header {
          padding: 10px 12px 8px;
          border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 4px;
        }
        .profile-dropdown-header span { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9); display: block; }
        .profile-dropdown-header small { font-size: 11px; color: rgba(255,255,255,0.4); }
        .profile-dropdown a, .profile-dropdown button {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 9px 12px; border-radius: 8px; font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.75); text-decoration: none;
          background: transparent; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; transition: all 0.15s; text-align: left;
        }
        .profile-dropdown a:hover, .profile-dropdown button:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .profile-dropdown .logout-btn {
          color: rgba(239,68,68,0.8); margin-top: 2px;
          border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px;
        }
        .profile-dropdown .logout-btn:hover { background: rgba(239,68,68,0.1); color: rgb(239,68,68); }

        /* Hero */
        .hero {
          min-height: 100vh; background: var(--navy);
          display: flex; align-items: center;
          position: relative; overflow: hidden;
        }
        .hero-bg {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(11,110,79,0.18) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-grid {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 60px 60px; pointer-events: none;
        }
        .hero-content {
          max-width: 1100px; margin: 0 auto; padding: 120px 5% 80px;
          position: relative; z-index: 2; text-align: center;
          display: flex; flex-direction: column; align-items: center;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(201,149,42,0.15); border: 1px solid rgba(201,149,42,0.3);
          border-radius: 100px; padding: 6px 16px; font-size: 13px; font-weight: 500;
          color: var(--gold); margin-bottom: 28px; letter-spacing: 0.02em;
        }
        .hero-badge::before { content: '★'; font-size: 11px; }
        .hero-h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.8rem, 5.5vw, 5rem); font-weight: 900; color: #fff;
          line-height: 1.08; letter-spacing: -0.03em; margin-bottom: 22px;
        }
        .hero-h1 em { font-style: italic; color: var(--gold); }
        .hero-sub {
          font-size: clamp(1rem, 1.8vw, 1.2rem); color: rgba(255,255,255,0.65);
          max-width: 600px; line-height: 1.75; margin-bottom: 40px;
          font-weight: 300; text-align: center;
        }
        .hero-sub strong { color: #fff; font-weight: 600; }
        .hero-actions {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; flex-wrap: wrap;
        }
        .btn-primary {
          display: inline-flex; align-items: center; gap: 10px;
          background: var(--teal); color: #fff; padding: 16px 32px;
          border-radius: 10px; font-size: 16px; font-weight: 600;
          text-decoration: none; transition: all 0.2s; border: none;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
        }
        .btn-primary:hover { background: var(--teal-m); transform: translateY(-1px); box-shadow: 0 12px 30px rgba(11,110,79,0.35); }
        .btn-primary .price {
          background: rgba(255,255,255,0.2); padding: 3px 10px;
          border-radius: 5px; font-size: 14px; font-weight: 700;
        }
        .btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          color: rgba(255,255,255,0.7); font-size: 15px; text-decoration: none;
          font-weight: 500; transition: color 0.2s; background: none;
          border: none; cursor: pointer; font-family: 'DM Sans', sans-serif;
        }
        .btn-ghost:hover { color: #fff; }
        .btn-outline {
          display: inline-flex; align-items: center; gap: 8px;
          color: rgba(255,255,255,0.75); font-size: 14px; text-decoration: none;
          font-weight: 500; transition: all 0.2s;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.18);
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          padding: 13px 22px; border-radius: 10px;
        }
        .btn-outline:hover { background: rgba(255,255,255,0.13); color: #fff; border-color: rgba(255,255,255,0.3); }
        .hero-stats {
          display: flex; gap: 40px; margin-top: 56px; padding-top: 40px;
          border-top: 1px solid rgba(255,255,255,0.1);
          flex-wrap: wrap; justify-content: center;
        }
        .hero-stat .num {
          font-family: 'Playfair Display', serif;
          font-size: 2rem; font-weight: 700; color: #fff; line-height: 1;
        }
        .hero-stat .lbl { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 4px; font-weight: 400; }

        /* Sections */
        .section { padding: 96px 5%; }
        .section-inner { max-width: 1200px; margin: 0 auto; }
        .section-eyebrow {
          display: inline-block; font-size: 12px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--teal); margin-bottom: 12px;
        }
        .section-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2rem, 4vw, 3rem); font-weight: 700;
          line-height: 1.15; letter-spacing: -0.02em;
          color: var(--navy); margin-bottom: 16px;
        }
        .section-sub {
          font-size: 1.05rem; color: var(--text2);
          max-width: 600px; line-height: 1.75; font-weight: 300;
        }

        /* Reveal animations */
        .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .reveal.revealed { opacity: 1; transform: none; }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }

        /* CTA section */
        .cta-section {
          background-image:
            radial-gradient(ellipse 80% 60% at 50% 35%, rgba(11,110,79,0.14) 0%, transparent 70%),
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(180deg, var(--navy) 0%, #081220 100%);
          background-size: 100% 100%, 60px 60px, 60px 60px, 100% 100%;
          text-align: center; padding: 100px 5%;
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
        }
        .cta-inner { max-width: 700px; margin: 0 auto; }
        .cta-eyebrow {
          display: inline-block; font-size: 11px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: #5FCC99; margin-bottom: 14px;
        }
        .cta-headline {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.8rem, 3.5vw, 2.8rem); font-weight: 900; color: #fff;
          line-height: 1.15; letter-spacing: -0.02em; margin-bottom: 16px;
        }
        .cta-headline em { font-style: italic; color: #5FCC99; }
        .cta-body {
          font-size: 1rem; color: rgba(255,255,255,0.65); line-height: 1.75;
          margin-bottom: 36px; font-weight: 300;
        }
        .cta-body strong { color: #fff; font-weight: 600; }
        .cta-price-badge {
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
          border-radius: 20px; padding: 18px 32px; margin-bottom: 28px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.25);
        }
        .cta-price-badge .pb-text { font-size: 14px; color: rgba(255,255,255,0.75); font-weight: 400; letter-spacing: 0.01em; }
        .cta-price-badge .pb-price {
          background: var(--teal); color: #fff; padding: 8px 24px;
          border-radius: 100px; font-weight: 700; font-size: 18px; margin-top: 8px;
          display: inline-block;
        }
        .cta-disclaimer { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 16px; }

        /* Compare section - WHITE */
        .rd-section { background: #fff; overflow: hidden; position: relative; }
        .rd-section .section-eyebrow { color: var(--teal); }
        .rd-section .section-title { color: var(--navy); }
        .rd-section .section-sub { color: var(--text2); }
        .compare-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 0; margin: 48px 0; border-radius: 20px; overflow: hidden;
          box-shadow: 0 4px 30px rgba(0,0,0,0.08);
        }
        .compare-col { padding: 40px 36px; }
        .compare-col.rd-col { background: linear-gradient(135deg, #E8F5F0 0%, #D1F0E4 100%); border: 1px solid rgba(11,110,79,0.15); }
        .compare-col.nut-col { background: linear-gradient(135deg, #FFF5F5 0%, #FED7D7 100%); border: 1px solid rgba(197,48,48,0.12); }
        .compare-header { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
        .compare-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .compare-icon.rd { background: rgba(11,110,79,0.2); }
        .compare-icon.nut { background: rgba(197,48,48,0.15); }
        .compare-title { font-family: 'Playfair Display', serif; font-size: 1.4rem; font-weight: 700; color: var(--navy); }
        .compare-subtitle { font-size: 12px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 2px; }
        .compare-subtitle.rd { color: var(--teal); }
        .compare-subtitle.nut { color: var(--red); }
        .compare-list { list-style: none; display: flex; flex-direction: column; gap: 14px; }
        .compare-list li { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; line-height: 1.6; color: var(--text); }
        .compare-list li .ci { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; margin-top: 1px; }
        .compare-list li .ci.ok { background: rgba(11,110,79,0.2); color: var(--teal); }
        .compare-list li .ci.no { background: rgba(197,48,48,0.15); color: var(--red); }
        .awareness-tag {
          background: linear-gradient(135deg, #FBF4E6 0%, #F5E6C8 100%);
          border: 1px solid rgba(201,149,42,0.25); border-radius: 12px;
          padding: 16px 28px; text-align: center; color: var(--text);
          font-size: 15px; line-height: 1.7; max-width: 600px; margin: 0 auto 36px;
        }
        .awareness-tag strong { color: var(--gold); }

        /* Privacy carousel */
        .privacy-section {
          background-image:
            radial-gradient(ellipse 80% 60% at 50% 50%, rgba(11,110,79,0.1) 0%, transparent 65%),
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(180deg, var(--navy) 0%, #0d1f35 100%);
          background-size: 100% 100%, 60px 60px, 60px 60px, 100% 100%;
          padding: 80px 0; overflow: hidden; position: relative;
        }
        .privacy-section::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        }
        .privacy-section::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
        }
        .privacy-inner { max-width: 1100px; margin: 0 auto; text-align: center; padding: 0 5%; }
        .privacy-eyebrow {
          display: inline-block; font-size: 11px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #5FCC99; margin-bottom: 10px;
        }
        .privacy-heading {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.3rem, 2.5vw, 1.85rem); color: #fff;
          margin-bottom: 10px; font-weight: 700; line-height: 1.25;
        }
        .privacy-sub {
          font-size: 14px; color: rgba(255,255,255,0.5); margin-bottom: 40px; font-weight: 400;
        }
        /* Marquee */
        .privacy-marquee-wrap { overflow: hidden; position: relative; }
        .privacy-marquee-wrap::before, .privacy-marquee-wrap::after {
          content: ''; position: absolute; top: 0; bottom: 0; width: 100px; z-index: 2; pointer-events: none;
        }
        .privacy-marquee-wrap::before { left: 0; background: linear-gradient(90deg, #0d1f35, transparent); }
        .privacy-marquee-wrap::after { right: 0; background: linear-gradient(-90deg, #0d1f35, transparent); }
        .privacy-marquee-track {
          display: flex; gap: 16px; width: max-content;
          animation: privacyMarquee 22s linear infinite;
        }
        .privacy-marquee-track:hover { animation-play-state: paused; }
        @keyframes privacyMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .privacy-badge {
          display: flex; align-items: center; gap: 12px; flex-shrink: 0;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px; padding: 16px 28px; color: #fff;
          font-size: 14px; font-weight: 600;
        }
        .privacy-badge-icon { font-size: 22px; }

        /* Approach section — WHITE */
        .approach-section { background: #fff; }
        .approach-section .section-eyebrow { color: var(--teal); }
        .approach-section .section-title { color: var(--navy); }
        .approach-section .section-sub { color: var(--text2); }
        .approach-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; margin-top: 48px; }
        .approach-features { display: flex; flex-direction: column; gap: 28px; }
        .feature-item { display: flex; gap: 18px; align-items: flex-start; }
        .feature-icon {
          width: 48px; height: 48px; background: rgba(11,110,79,0.1);
          border-radius: 12px; display: flex; align-items: center; justify-content: center;
          font-size: 22px; flex-shrink: 0; border: 1px solid rgba(11,110,79,0.18);
        }
        .feature-text h4 { font-size: 16px; font-weight: 600; color: var(--navy); margin-bottom: 4px; }
        .feature-text p { font-size: 14px; color: var(--text2); line-height: 1.65; }
        .approach-section .testimonial-card { background: var(--navy); box-shadow: 0 8px 40px rgba(10,22,40,0.18); }
        .approach-section .carousel-btn { border: 1px solid var(--border); background: rgba(0,0,0,0.04); color: var(--navy); }
        .approach-section .carousel-btn:hover { background: var(--teal); color: #fff; border-color: var(--teal); }
        .approach-section .carousel-dot { background: rgba(0,0,0,0.15); }
        .approach-section .carousel-dot.active { background: var(--teal); width: 24px; }

        /* Testimonial */
        .testimonial-card {
          background: rgba(255,255,255,0.06); border-radius: 20px; padding: 36px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);
          position: relative; overflow: hidden; transition: opacity 0.3s, transform 0.3s;
          backdrop-filter: blur(12px);
        }
        .testimonial-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, var(--teal), var(--teal-m));
        }
        .testimonial-quote { font-size: 56px; font-family: 'Playfair Display', serif; color: #5FCC99; opacity: 0.4; line-height: 0.8; margin-bottom: 12px; }
        .testimonial-text { font-size: 16px; color: rgba(255,255,255,0.85); line-height: 1.8; margin-bottom: 20px; font-style: italic; font-weight: 300; }
        .testimonial-text strong { font-style: normal; font-weight: 600; color: #5FCC99; }
        .testimonial-author { display: flex; align-items: center; gap: 14px; }
        .testimonial-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--teal), var(--teal-m)); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .testimonial-name { font-weight: 600; font-size: 15px; color: #fff; }
        .testimonial-detail { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 1px; }
        .testimonial-condition { display: inline-block; background: rgba(11,110,79,0.25); color: #5FCC99; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 100px; margin-top: 6px; letter-spacing: 0.03em; }
        .carousel-nav { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
        .carousel-btn { width: 38px; height: 38px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); cursor: pointer; font-size: 16px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; color: #fff; }
        .carousel-btn:hover { background: var(--teal); color: #fff; border-color: var(--teal); }
        .carousel-dots { display: flex; gap: 8px; margin-top: 20px; justify-content: center; }
        .carousel-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.25); cursor: pointer; transition: all 0.2s; border: none; }
        .carousel-dot.active { background: var(--teal); width: 24px; border-radius: 4px; }

        /* Stats grid (inside privacy section) */
        .stats-bar-inner {
          max-width: 1100px; margin: 40px auto 0;
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .stat-item {
          padding: 40px 20px 36px; text-align: center;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(11,110,79,0.22);
          border-radius: 20px;
          opacity: 0; transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
          display: flex; flex-direction: column; align-items: center;
          position: relative; overflow: hidden;
        }
        .stat-item::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, var(--teal), var(--teal-m));
        }
        .stat-item.stat-visible { opacity: 1; transform: none; }
        .stat-item:nth-child(2) { transition-delay: 0.1s; }
        .stat-item:nth-child(3) { transition-delay: 0.2s; }
        .stat-item:nth-child(4) { transition-delay: 0.3s; }
        .stat-item-icon { font-size: 28px; margin-bottom: 14px; }
        .stat-item-num { font-family: 'Playfair Display', serif; font-size: 3rem; font-weight: 700; color: #fff; line-height: 1; margin-bottom: 10px; }
        .stat-item-num .gold { color: var(--gold); }
        .stat-item-lbl { font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.55; font-weight: 400; max-width: 130px; }

        /* About Us & Our Vision — DARK */
        .about-section {
          background-image:
            radial-gradient(ellipse 80% 60% at 50% 35%, rgba(11,110,79,0.13) 0%, transparent 70%),
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(180deg, var(--navy) 0%, #0d1f35 100%);
          background-size: 100% 100%, 60px 60px, 60px 60px, 100% 100%;
          padding: 96px 5%;
        }
        .about-section .section-eyebrow { color: #5FCC99; }
        .about-section .section-title { color: #fff; }
        .about-inner { max-width: 820px; margin: 0 auto; }
        .about-quote {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.3rem, 2.5vw, 1.9rem); font-style: italic;
          color: rgba(255,255,255,0.9); line-height: 1.45; margin-bottom: 44px;
          border-left: 4px solid #5FCC99; padding-left: 24px;
        }
        .about-body { font-size: 15.5px; color: rgba(255,255,255,0.65); line-height: 1.9; }
        .about-body p { margin-bottom: 18px; }
        .about-body .highlight { color: #5FCC99; font-weight: 600; }
        .about-body .bold { color: #fff; font-weight: 600; }

        /* Founder Story — WHITE */
        .founder-section { background: #fff; padding: 96px 5%; position: relative; overflow: hidden; }
        .founder-inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 280px 1fr; gap: 64px; align-items: center; }
        .founder-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--teal); margin-bottom: 12px; }
        .founder-title { font-family: 'Playfair Display', serif; font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 700; color: var(--navy); line-height: 1.15; margin-bottom: 28px; }
        .founder-body { font-size: 15px; color: var(--text2); line-height: 1.85; }
        .founder-body p { margin-bottom: 16px; }
        .founder-body .bold { color: var(--navy); font-weight: 600; }
        .founder-pull-quote {
          border-left: 3px solid var(--teal); background: rgba(11,110,79,0.06);
          border-radius: 0 12px 12px 0; padding: 14px 20px;
          margin: 20px 0; font-style: italic; color: var(--text2);
          font-size: 15px; line-height: 1.7;
        }
        .founder-cta { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--border); }
        .founder-cta .cta-p { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-style: italic; color: var(--navy); margin-bottom: 4px; }
        .founder-cta small { color: var(--text3); font-size: 13px; }
        .founder-avatar-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .founder-avatar {
          width: 220px; height: 280px;
          background: linear-gradient(145deg, rgba(11,110,79,0.1), rgba(15,138,99,0.04));
          border-radius: 24px; border: 1px solid rgba(11,110,79,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 80px; position: relative; overflow: hidden;
          box-shadow: 0 12px 40px rgba(0,0,0,0.1);
        }
        .founder-avatar::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0;
          height: 45%; background: linear-gradient(to top, rgba(11,110,79,0.07), transparent);
        }
        .founder-name { font-size: 17px; font-weight: 700; color: var(--navy); }
        .founder-desc { font-size: 12px; color: var(--text3); text-align: center; margin-top: 2px; }
        .founder-credential {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(11,110,79,0.07); border: 1px solid rgba(11,110,79,0.18);
          border-radius: 20px; padding: 5px 14px;
          font-size: 12px; color: var(--teal); font-weight: 500; margin-top: 4px;
        }

        /* Industry Standards — DARK */
        .standards-section {
          background-image:
            radial-gradient(ellipse 80% 60% at 50% 35%, rgba(11,110,79,0.13) 0%, transparent 70%),
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(180deg, var(--navy) 0%, #0d1f35 100%);
          background-size: 100% 100%, 60px 60px, 60px 60px, 100% 100%;
          padding: 96px 5%;
        }
        .standards-section .section-eyebrow { color: #5FCC99; }
        .standards-section .section-title { color: #fff; }
        .standards-section .section-sub { color: rgba(255,255,255,0.65); }
        .standards-inner { max-width: 1000px; margin: 0 auto; }
        .standards-list { display: flex; flex-direction: column; gap: 20px; margin-top: 48px; }
        .standard-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
          padding: 28px 32px; display: flex; gap: 20px; align-items: flex-start;
        }
        .standard-icon { width: 46px; height: 46px; background: rgba(11,110,79,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
        .standard-content h4 { font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 6px; }
        .standard-content p { font-size: 14px; color: rgba(255,255,255,0.65); line-height: 1.7; }

        /* Trust section - WHITE */
        .trust-section { background: #fff; position: relative; overflow: hidden; }
        .trust-inner { position: relative; z-index: 1; }
        .trust-title { font-family: 'Playfair Display', serif; font-size: clamp(2rem, 4vw, 3rem); font-weight: 700; color: var(--navy); text-align: center; margin-bottom: 12px; }
        .trust-sub { text-align: center; color: var(--text2); font-size: 1rem; margin-bottom: 56px; font-weight: 300; }
        .trust-section .section-eyebrow { color: var(--teal); }
        .doctor-trust-banner { background: linear-gradient(135deg, #E8F5F0 0%, #D1F0E4 100%); border: 1px solid rgba(11,110,79,0.15); border-radius: 20px; padding: 40px; text-align: center; margin-bottom: 56px; }
        .trust-quote-big { font-family: 'Playfair Display', serif; font-size: clamp(1.1rem, 2vw, 1.4rem); font-style: italic; color: var(--text); line-height: 1.6; max-width: 700px; margin: 0 auto 20px; }
        .trust-proof-row { display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; }
        .trust-proof { text-align: center; }
        .trust-proof .tp-num { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; color: var(--teal); }
        .trust-proof .tp-lbl { font-size: 12px; color: var(--text3); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.06em; }
        .conditions-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-bottom: 64px; }
        .condition-pill { background: #FAFAFA; border: 1px solid var(--border); border-radius: 12px; padding: 14px 18px; text-align: center; transition: all 0.2s; cursor: default; min-width: 140px; flex: 0 1 160px; }
        .condition-pill:hover { background: var(--teal-l); border-color: rgba(11,110,79,0.3); transform: translateY(-2px); box-shadow: 0 4px 15px rgba(11,110,79,0.1); }
        .condition-pill .cicon { font-size: 24px; margin-bottom: 7px; }
        .condition-pill .ctxt { font-size: 13px; color: var(--text); font-weight: 500; line-height: 1.3; }

        /* Footer */
        .landing-footer {
          background-image:
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(180deg, #07080f 0%, #07080f 100%);
          background-size: 60px 60px, 60px 60px, 100% 100%;
          color: rgba(255,255,255,0.6); padding: 64px 5% 40px; border-top: 1px solid rgba(255,255,255,0.06);
        }
        .footer-email {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 13.5px; color: rgba(255,255,255,0.55);
          text-decoration: none; margin-top: 14px;
          padding: 8px 14px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; transition: all 0.2s;
        }
        .footer-email:hover { color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }
        .footer-inner { max-width: 1200px; margin: 0 auto; }
        .footer-top { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 48px; padding-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .footer-brand .fb-logo { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 10px; }
        .footer-brand .fb-logo span { color: var(--gold); }
        .footer-brand p { font-size: 13.5px; line-height: 1.8; color: rgba(255,255,255,0.5); font-weight: 300; max-width: 280px; }
        .footer-col h5 { font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.85); margin-bottom: 16px; }
        .footer-col a { display: block; font-size: 13.5px; color: rgba(255,255,255,0.5); text-decoration: none; margin-bottom: 10px; transition: color 0.2s; }
        .footer-col a:hover { color: #fff; }
        .footer-bottom { display: flex; align-items: center; justify-content: space-between; padding-top: 28px; flex-wrap: wrap; gap: 16px; }
        .footer-bottom p { font-size: 13px; color: rgba(255,255,255,0.3); }
        .footer-badges { display: flex; gap: 10px; flex-wrap: wrap; }
        .f-badge { font-size: 11px; padding: 4px 10px; border-radius: 6px; font-weight: 500; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.08); }

        /* Responsive */
        @media (max-width: 900px) {
          .compare-grid, .approach-grid, .founder-inner { grid-template-columns: 1fr; }
          .stats-bar-inner { grid-template-columns: 1fr 1fr; }
          .footer-top { grid-template-columns: 1fr 1fr; }
          .nav-links .nav-mid { display: none; }
          .founder-avatar-wrap { order: -1; }
          .founder-avatar { width: 160px; height: 200px; font-size: 60px; }
        }
        @media (max-width: 600px) {
          .hero-content { padding: 110px 5% 60px; }
          .footer-top { grid-template-columns: 1fr; }
          .nav-links { gap: 12px; }
          .section { padding: 64px 5%; }
          .stats-bar-inner { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* Navigation */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <Link to="/" className="nav-logo" style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span>Diet <span style={{ color: 'var(--gold)' }}>By RD</span></span>
            <span style={{ fontSize: '9px', fontWeight: 500, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>The Gold Standard Clinical Nutrition</span>
          </Link>
          <div className="nav-links">
            <a href="/" className="nav-mid">Home</a>
            <a href="#approach" className="nav-mid" onClick={scrollTo('approach')}>How It Works</a>
            <a href="#about" className="nav-mid" onClick={scrollTo('about')}>About Us</a>
            <a href="#reviews" className="nav-mid" onClick={scrollTo('reviews')}>Reviews</a>
            <a href="#trust" className="nav-mid" onClick={scrollTo('trust')}>Contact Us</a>
            {isPatient ? (
              <div className="profile-menu-wrap">
                <button
                  className="profile-avatar"
                  onClick={() => setIsProfileMenuOpen((p) => !p)}
                  aria-label="Profile menu"
                >
                  <User size={18} />
                </button>
                <div className={`profile-dropdown${isProfileMenuOpen ? " open" : ""}`}>
                  <div className="profile-dropdown-header">
                    <span>{user?.name || "My Account"}</span>
                    <small>Patient</small>
                  </div>
                  {patientNavItems.map((item) => (
                    <a key={item.href} href={item.href} onClick={() => setIsProfileMenuOpen(false)}>
                      <item.icon size={15} />
                      {item.label}
                    </a>
                  ))}
                  <button className="logout-btn" onClick={() => { logout(); setIsProfileMenuOpen(false); }}>
                    <LogOut size={15} />
                    Log out
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={goToLogin} className="nav-cta">Login / Sign Up</button>
            )}
          </div>
        </div>
      </nav>

      {/* CTA — Page 1 */}
      <section className="cta-section">
        <div className="cta-inner">
          <span ref={addToRefs} className="cta-eyebrow reveal">Your health deserves better</span>
          <h2 ref={addToRefs} className="cta-headline reveal reveal-delay-1">
            Your health deserves a<br /><em>Registered Dietitian</em>,<br />not an Instagram influencer.
          </h2>
          <p ref={addToRefs} className="cta-body reveal reveal-delay-2">
            One consultation changes the direction. An RD who understands your food, your condition, and your life — not a generic PDF, not a supplement upsell. <strong>Real clinical nutrition, personalised for you.</strong>
          </p>
          <div ref={addToRefs} className="reveal reveal-delay-2">
            <div className="cta-price-badge">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span className="pb-text">Honest pricing · Absolutely No hidden charges</span>
                <span className="pb-price">₹999</span>
              </div>
            </div>
          </div>
          <button ref={addToRefs} onClick={() => setIsBookingModalOpen(true)} className="btn-primary reveal reveal-delay-3" style={{ fontSize: '18px', padding: '18px 40px' }}>
            Book Your Consultation Now →
          </button>
          <p ref={addToRefs} className="cta-disclaimer reveal reveal-delay-3">100% Registered Dietitians · IDA Certified · Evidence-Based</p>
        </div>
      </section>

      {/* RD vs Nutritionist — Page 2 */}
      <section id="rd-section" className="section rd-section">
        <div className="section-inner">
          <div style={{ textAlign: 'center' }}>
            <span ref={addToRefs} className="section-eyebrow reveal">The truth no one tells you</span>
            <h2 ref={addToRefs} className="section-title reveal reveal-delay-1" style={{ textAlign: 'center', margin: '0 auto 12px' }}>
              Before you trust anyone<br />with your health — <em style={{ fontStyle: 'italic', color: 'var(--teal)' }}>know the difference.</em>
            </h2>
            <p ref={addToRefs} className="section-sub reveal reveal-delay-2" style={{ margin: '0 auto', textAlign: 'center' }}>
              In India today, anyone can call themselves a "nutritionist." The consequences of not knowing this are very real.
            </p>
          </div>

          <div ref={addToRefs} className="compare-grid reveal reveal-delay-1">
            <div className="compare-col rd-col">
              <div className="compare-header">
                <div className="compare-icon rd">🩺</div>
                <div>
                  <div className="compare-title">Registered Dietitian (RD)</div>
                  <div className="compare-subtitle rd">Legally Protected · Clinically Qualified</div>
                </div>
              </div>
              <ul className="compare-list">
                <li><span className="ci ok">✓</span><span>The title "RD" is <strong style={{ color: 'var(--navy)' }}>legally protected in India</strong>. Only qualified healthcare professionals can use it.</span></li>
                <li><span className="ci ok">✓</span><span>At Diet by RD, all Dietitians hold a <strong style={{ color: 'var(--navy)' }}>B.Sc / M.Sc</strong> in Nutrition and Dietetics, cleared the RD exam, and are well clinically trained to manage your weight, lifestyle, and medical condition.</span></li>
                <li><span className="ci ok">✓</span><span>Recognised as the <strong style={{ color: 'var(--navy)' }}>gold standard for clinical nutrition</strong> in India.</span></li>
                <li><span className="ci ok">✓</span><span>Complete, evidence-based knowledge of how the human body functions and interacts with every nutrient you consume.</span></li>
              </ul>
            </div>
            <div className="compare-col nut-col">
              <div className="compare-header">
                <div className="compare-icon nut">⚠️</div>
                <div>
                  <div className="compare-title">Nutritionist</div>
                  <div className="compare-subtitle nut">Unregulated · No Standard Qualification</div>
                </div>
              </div>
              <ul className="compare-list">
                <li><span className="ci no">✗</span><span>Can be anyone with an <strong style={{ color: 'var(--navy)' }}>unrelated degree + a 3–6 month certificate course</strong> — or even just a short online diploma.</span></li>
                <li><span className="ci no">✗</span><span>No single standardised qualification required anywhere in India to legally advertise as a "nutritionist" or "health coach."</span></li>
                <li><span className="ci no">✗</span><span>High chances of practising <strong style={{ color: 'var(--navy)' }}>bro science, detox myths, fad diets</strong> — with a confident social media following. You genuinely cannot know how much credibility exists behind the title.</span></li>
                <li><span className="ci no">✗</span><span>You may be paying for <strong style={{ color: 'var(--navy)' }}>false promises, fearmongering</strong> and individual experiences, not facts — with your money and your health. This could be dangerous if it went wrong.</span></li>
              </ul>
            </div>
          </div>

          <div ref={addToRefs} className="awareness-tag reveal reveal-delay-2">
            <strong>Most people don't know this. Now you do.</strong><br />
            Every consultation on Diet By RD is exclusively with a verified Registered Dietitian.
          </div>

          <div style={{ textAlign: 'center' }} ref={addToRefs} className="reveal reveal-delay-3">
            <button onClick={() => setIsBookingModalOpen(true)} className="btn-primary">
              Book with a Registered Dietitian
              <span className="price">₹999</span>
            </button>
          </div>
        </div>
      </section>

      {/* Privacy + Stats */}
      <section className="privacy-section">
        <div className="privacy-inner">
          <span ref={addToRefs} className="privacy-eyebrow reveal">Our commitment to you</span>
          <h3 ref={addToRefs} className="privacy-heading reveal reveal-delay-1">
            Because we deeply care about you<br />and your privacy
          </h3>
          <p ref={addToRefs} className="privacy-sub reveal reveal-delay-2">
            Your health data is personal. We hold it to the highest standards — legally and ethically.
          </p>
          <div className="stats-bar-inner" ref={statsRef}>
            <div className={`stat-item${statsVisible ? ' stat-visible' : ''}`}>
              <div className="stat-item-icon">⚖️</div>
              <div className="stat-item-num">RD</div>
              <div className="stat-item-lbl">Legally protected title in India</div>
            </div>
            <div className={`stat-item${statsVisible ? ' stat-visible' : ''}`}>
              <div className="stat-item-icon">🎓</div>
              <div className="stat-item-num">100%</div>
              <div className="stat-item-lbl">Clinically credentialed dietitians</div>
            </div>
            <div className={`stat-item${statsVisible ? ' stat-visible' : ''}`}>
              <div className="stat-item-icon">💚</div>
              <div className="stat-item-num"><span className="gold">₹</span>999</div>
              <div className="stat-item-lbl">Honest pricing</div>
            </div>
            <div className={`stat-item${statsVisible ? ' stat-visible' : ''}`}>
              <div className="stat-item-icon">🤝</div>
              <div className="stat-item-num">1:1</div>
              <div className="stat-item-lbl">Personalised consultation</div>
            </div>
          </div>
          <div className="privacy-marquee-wrap" style={{ marginTop: '48px' }}>
            <div className="privacy-marquee-track">
              {[...Array(2)].flatMap((_, ri) => [
                <div key={`dpdpa-${ri}`} className="privacy-badge"><span className="privacy-badge-icon">🛡️</span><span>DPDPA Compliant</span></div>,
                <div key={`gdpr-${ri}`} className="privacy-badge"><span className="privacy-badge-icon">🇪🇺</span><span>EU GDPR Aligned</span></div>,
                <div key={`ssl-${ri}`} className="privacy-badge"><span className="privacy-badge-icon">🔒</span><span>256-bit SSL Secured</span></div>,
                <div key={`ida-${ri}`} className="privacy-badge"><span className="privacy-badge-icon">✅</span><span>IDA Verified RDs</span></div>,
                <div key={`nda-${ri}`} className="privacy-badge"><span className="privacy-badge-icon">📋</span><span>Strict NDA Policy</span></div>,
                <div key={`anon-${ri}`} className="privacy-badge"><span className="privacy-badge-icon">🔐</span><span>Anonymous Consultations Available</span></div>,
              ])}
            </div>
          </div>
        </div>
      </section>

      {/* How We Work + Testimonial — Page 3 */}
      <div id="reviews" style={{ position: 'relative', top: '-80px' }} aria-hidden="true" />
      <section id="approach" className="section approach-section">
        <div className="section-inner">
          <div className="approach-grid">
            <div>
              <span ref={addToRefs} className="section-eyebrow reveal">How we work</span>
              <h2 ref={addToRefs} className="section-title reveal reveal-delay-1">
                Nutrition science meets<br /><em style={{ fontStyle: 'italic', color: '#5FCC99' }}>your food language.</em>
              </h2>
              <p ref={addToRefs} className="section-sub reveal reveal-delay-2" style={{ marginBottom: '36px' }}>
                Work with Registered Dietitians who provide evidence-based, deeply personalised diet plans — tailored to your schedule, your city, and your culture.
              </p>
              <div className="approach-features">
                <div ref={addToRefs} className="feature-item reveal reveal-delay-1">
                  <div className="feature-icon">🔬</div>
                  <div className="feature-text">
                    <h4>Evidence-based, always</h4>
                    <p>Every recommendation is backed by clinical research and ICMR nutritional standards — not trends.</p>
                  </div>
                </div>
                <div ref={addToRefs} className="feature-item reveal reveal-delay-2">
                  <div className="feature-icon">🌾</div>
                  <div className="feature-text">
                    <h4>Built around your plate, not a stranger's</h4>
                    <p>Your RD understands that a Tamilian's plate looks nothing like a Punjabi's.</p>
                  </div>
                </div>
                <div ref={addToRefs} className="feature-item reveal reveal-delay-3">
                  <div className="feature-icon">💰</div>
                  <div className="feature-text">
                    <h4>Affordable without compromise</h4>
                    <p>Clinical expertise at ₹999. The same standard of care hospitals charge ten times more for.</p>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '36px' }} ref={addToRefs} className="reveal reveal-delay-3">
                <button onClick={() => setIsBookingModalOpen(true)} className="btn-primary">
                  Start your journey
                  <span className="price">₹999</span>
                </button>
              </div>
            </div>
            <div ref={addToRefs} className="testimonial-wrap reveal reveal-delay-2">
              <div className="testimonial-card">
                <div className="testimonial-quote">"</div>
                <p className="testimonial-text" dangerouslySetInnerHTML={{ __html: testimonials[currentTestimonial].text }} />
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{testimonials[currentTestimonial].avatar}</div>
                  <div>
                    <div className="testimonial-name">{testimonials[currentTestimonial].name}</div>
                    <div className="testimonial-detail">{testimonials[currentTestimonial].detail}</div>
                    <div className="testimonial-condition">{testimonials[currentTestimonial].condition}</div>
                  </div>
                </div>
              </div>
              <div className="carousel-nav">
                <button className="carousel-btn" onClick={() => setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}>←</button>
                <button className="carousel-btn" onClick={() => setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)}>→</button>
              </div>
              <div className="carousel-dots">
                {testimonials.map((_, i) => (
                  <button key={i} className={`carousel-dot ${i === currentTestimonial ? 'active' : ''}`} onClick={() => setCurrentTestimonial(i)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us & Our Vision — Page 4 */}
      <section id="about" className="about-section">
        <div className="section-inner">
          <div className="about-inner">
            <span ref={addToRefs} className="section-eyebrow reveal">Who we are</span>
            <h2 ref={addToRefs} className="section-title reveal reveal-delay-1">About Us &amp; Our Vision</h2>
            <blockquote ref={addToRefs} className="about-quote reveal reveal-delay-2">
              "In a country where anyone with a camera and half-baked knowledge can claim to be a 'health expert,' the truth often gets lost."
            </blockquote>
            <div ref={addToRefs} className="about-body reveal reveal-delay-2">
              <p><span className="bold">Somewhere in India right now, someone is getting it wrong.</span></p>
              <p>Not because they're careless. Because they care too much — and they trusted the wrong person.</p>
              <p>They Googled their symptoms at midnight. They found a confident face on Instagram. The person had thousands of followers, a clean aesthetic, and the word "nutritionist" in their bio. They paid. They followed the plan. And weeks later, nothing changed — or worse, something did.</p>
              <p><span className="highlight">Misinformation spreads faster than science, and people end up paying the price — with their money, their trust, and sometimes even their health.</span></p>
              <p>This happens every single day. In every city. In every language. To people who are trying their absolute best.</p>
              <p><span className="bold">Diet By RD was born to change that.</span></p>
              <p><span className="highlight">We are not here to add noise. We are here to set new industry standards.</span> At Diet By RD, you don't get self-proclaimed "coaches" or certificate-driven influencers. You get licensed professionals — experts who own their craft, stand by evidence, and remain committed to your goals. And we've made it possible at a price that respects the value of your hard-earned money.</p>
              <p>But we are not just about affordability or credibility. <span className="bold">We are about vision.</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* The Story Behind Diet By RD — Page 5 */}
      <section className="founder-section">
        <div className="section-inner">
          <div className="founder-inner">
            <div ref={addToRefs} className="founder-avatar-wrap reveal">
              <div className="founder-avatar">👨‍💼</div>
              <div className="founder-name">Aryan Bhagat</div>
              <div className="founder-desc">Founder, Diet By RD<br />Darbhanga, Bihar</div>
              <div className="founder-credential">🌱 Built with purpose</div>
            </div>
            <div>
              <p ref={addToRefs} className="founder-label reveal">The people behind this</p>
              <h2 ref={addToRefs} className="founder-title reveal reveal-delay-1">The Story Behind<br />Diet By RD</h2>
              <div ref={addToRefs} className="founder-body reveal reveal-delay-2">
                <p>Diet By RD was founded by <span className="bold">Aryan Bhagat</span>, a young mind from Darbhanga, Bihar — in a household where money was counted carefully and trust was given completely.</p>
                <p>He saw people around him losing their health on detox programmes, and their hard-earned money on advice that was confidently delivered and clinically worthless.</p>
                <div className="founder-pull-quote">
                  "The people with the least room for error were the most exposed to it. That felt wrong. Deeply, personally wrong."
                </div>
                <p><span className="bold">Diet By RD was built for you.</span></p>
                <p>Not by a corporation. Not by investors looking for a return. By someone who grew up watching the problem happen in real time, who studied hard enough to understand it, and who decided that the most useful thing he could do with that knowledge and skin in the game was to make it available to the people who needed it most.</p>
              </div>
              <div ref={addToRefs} className="founder-cta reveal reveal-delay-3">
                <p className="cta-p">Diet By RD.</p>
                <p className="cta-p" style={{ fontStyle: 'normal', fontSize: '1rem', color: 'rgba(255,255,255,0.75)', fontFamily: 'DM Sans, sans-serif' }}>Gold standard clinical nutrition. Honest price. Real credentials.</p>
                <small>Your first consultation is one decision away.</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Setting the New Industry Standards — Page 6 */}
      <section className="standards-section">
        <div className="section-inner">
          <div className="standards-inner">
            <span ref={addToRefs} className="section-eyebrow reveal">At Diet By RD</span>
            <h2 ref={addToRefs} className="section-title reveal reveal-delay-1">Setting the New<br />Industry Standards</h2>
            <p ref={addToRefs} className="section-sub reveal reveal-delay-2">
              We don't just hire Registered Dietitians. We train them to be exceptional.
            </p>
            <div ref={addToRefs} className="standards-list reveal reveal-delay-2">
              <div className="standard-card">
                <div className="standard-icon">🧠</div>
                <div className="standard-content">
                  <h4>Critical Thinking Training</h4>
                  <p>Each Registered Dietitian goes through a critical thinking training. This is to ensure you don't face a professional with a credible title and an unscientific mind.</p>
                </div>
              </div>
              <div className="standard-card">
                <div className="standard-icon">📚</div>
                <div className="standard-content">
                  <h4>Always Up to Date</h4>
                  <p>Each Registered Dietitian is updated with the latest literature, research, and findings in their subject. No dietitians with outdated or stale knowledge.</p>
                </div>
              </div>
              <div className="standard-card">
                <div className="standard-icon">🌏</div>
                <div className="standard-content">
                  <h4>Trained for India's Diverse Food Culture</h4>
                  <p>Each dietitian knows how to build a diet for idli-dosa for South Indians, a poha breakfast for a busy Mumbaikar, dal bhat chokha for people of Bihar, sweet lassi at every cheering moment for Punjabians. With our expertise, you get a tailored diet that loves you, and you love back.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Referred by Leading Clinicians + Conditions — Page 7 */}
      <section id="trust" className="section trust-section">
        <div className="section-inner trust-inner">
          <div ref={addToRefs} className="doctor-trust-banner reveal">
            <span className="section-eyebrow">Referred by leading clinicians</span>
            <p className="trust-quote-big">"Doctors across India refer their patients to Diet By RD because they know exactly who will pick up — a Registered Dietitian, not a coach."</p>
            <div className="trust-proof-row">
              <div className="trust-proof">
                <div className="tp-num">100%</div>
                <div className="tp-lbl">RD-only consultations</div>
              </div>
              <div className="trust-proof">
                <div className="tp-num">IDA</div>
                <div className="tp-lbl">Certified dietitians</div>
              </div>
              <div className="trust-proof">
                <div className="tp-num">₹999</div>
                <div className="tp-lbl">Honest pricing</div>
              </div>
            </div>
          </div>

          <h2 ref={addToRefs} className="trust-title reveal reveal-delay-1">What we can help you with</h2>
          <p ref={addToRefs} className="trust-sub reveal reveal-delay-2">
            Your RD is trained to manage these conditions clinically — not with generic advice, but with a personalised plan designed around your specific case.
          </p>
          <div ref={addToRefs} className="conditions-grid reveal reveal-delay-2">
            {conditions.map((c, i) => (
              <div key={i} className="condition-pill">
                <div className="cicon">{c.icon}</div>
                <div className="ctxt">{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="hero-content">
          <div ref={addToRefs} className="hero-badge reveal">India's First · Registered Dietitian Only Platform</div>
          <h1 ref={addToRefs} className="hero-h1 reveal reveal-delay-1">
            Your health deserves<br />
            <em>clinical expertise —</em><br />
            not a certificate course.
          </h1>
          <p ref={addToRefs} className="hero-sub reveal reveal-delay-2">
            India's first platform where every single consultation is exclusively with a <strong>Registered Dietitian</strong> — the only clinically credentialed nutrition professionals in India. Not coaches. Not influencers. The real thing.
          </p>
          <div ref={addToRefs} className="hero-actions reveal reveal-delay-3">
            <button onClick={() => setIsBookingModalOpen(true)} className="btn-primary">
              Book Your Consultation
              <span className="price">₹999</span>
            </button>
            <button onClick={goToLogin} className="btn-outline">Join as Doctor / Dietitian</button>
            <a href="#trust" className="btn-ghost" onClick={scrollTo('trust')}>Contact / Support →</a>
          </div>
          <div ref={addToRefs} className="hero-stats reveal reveal-delay-3">
            <div className="hero-stat">
              <div className="num">RD</div>
              <div className="lbl">Legally protected title in India</div>
            </div>
            <div className="hero-stat">
              <div className="num">100%</div>
              <div className="lbl">Clinically credentialed dietitians</div>
            </div>
            <div className="hero-stat">
              <div className="num">₹999</div>
              <div className="lbl">Honest pricing</div>
            </div>
            <div className="hero-stat">
              <div className="num">1:1</div>
              <div className="lbl">Personalised consultation</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="fb-logo">Diet <span>By RD</span></div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '-6px', marginBottom: '10px' }}>The Gold Standard Clinical Nutrition</div>
              <p>India's first clinical nutrition platform where every consultation is exclusively with a Registered Dietitian. Evidence-based. Affordable. Honest.</p>
              <a href="mailto:hello@dietbyrd.com" className="footer-email">✉️ hello@dietbyrd.com</a>
            </div>
            <div className="footer-col">
              <h5>Platform</h5>
              <a href="#" onClick={(e) => { e.preventDefault(); setIsBookingModalOpen(true); }}>Book Consultation</a>
              <a href="#approach" onClick={scrollTo('approach')}>How It Works</a>
              <a href="#trust" onClick={scrollTo('trust')}>Conditions</a>
            </div>
            <div className="footer-col">
              <h5>Company</h5>
              <a href="#rd-section" onClick={scrollTo('rd-section')}>Why RD?</a>
              <a href="/login">For Doctors</a>
              <a href="/login">Join as Dietitian</a>
            </div>
            <div className="footer-col">
              <h5>Legal & Support</h5>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="/patient/support">Contact / Support</a>
              <a href="mailto:hello@dietbyrd.com">hello@dietbyrd.com</a>
              <a href="mailto:grievance@dietbyrd.com">Grievance: grievance@dietbyrd.com</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 Diet By RD Private Limited · All rights reserved.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <a href="https://www.instagram.com/dietbyrd/?hl=en" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.color = '#fff')} onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                Instagram
              </a>
              <a href="https://www.youtube.com/@DietByRD" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.color = '#fff')} onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                YouTube
              </a>
              <div className="footer-badges">
                <span className="f-badge">DPDPA Compliant</span>
                <span className="f-badge">GDPR Aligned</span>
                <span className="f-badge">256-bit SSL</span>
                <span className="f-badge">IDA Verified RDs</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <PublicBookingModal open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen} />
    </div>
  );
};

export default Landing;
