import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, getDashboardPath } from "@/contexts/AuthContext";
import { PublicBookingModal } from "@/components/PublicBookingModal";
import { getApprovedReviews } from "@/lib/api";
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  FileLock2,
  Gem,
  Heart,
  LogOut,
  MessageSquare,
  Microscope,
  Quote,
  Scale,
  ShieldCheck,
  UtensilsCrossed,
  Award,
  User,
  UserRoundCheck,
} from "lucide-react";

const fallbackTestimonials = [
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
  { label: "My blood reports", href: "/patient/profile#reports", icon: Heart },
  { label: "Help / Support", href: "/patient/support", icon: MessageSquare },
];

const trustBadges = [
  { key: 'ida', label: 'IDA Verified RDs', Icon: BadgeCheck },
  { key: 'nda', label: 'Strict NDA Policy', Icon: FileLock2 },
  { key: 'anon', label: 'Anonymous Consultations Available', Icon: UserRoundCheck },
  { key: 'dpdpa', label: 'DPDPA Compliant', Icon: ShieldCheck },
];

const logoChars = ["D", "i", "e", "t", " ", "B", "y", " "];

const Logo = () => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem("dbrd_logo_played")) {
      setAnimate(true);
      sessionStorage.setItem("dbrd_logo_played", "1");
    }
  }, []);

  return (
    <Link to="/" className="nav-logo" aria-label="Diet By RD">
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
        animate={
          animate
            ? { opacity: 1, scale: [1, 1.15, 1] }
            : { opacity: 1, scale: 1 }
        }
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        RD
      </motion.span>
    </Link>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [approvedTestimonials, setApprovedTestimonials] = useState<typeof fallbackTestimonials>([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement | null>(null);
  const revealRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "patient" && !isBookingModalOpen) {
      navigate(getDashboardPath(user.role));
    }
  }, [isAuthenticated, user, navigate, isBookingModalOpen]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("in");
        });
      },
      { threshold: 0.3 }
    );
    els.forEach((el) => observer.observe(el));
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

  const testimonialItems = approvedTestimonials.length > 0 ? approvedTestimonials : fallbackTestimonials;
  const inlineTestimonials = testimonialItems.slice(0, 3);
  const [approachActiveIdx, setApproachActiveIdx] = useState(0);
  const [isApproachPaused, setIsApproachPaused] = useState(false);

  useEffect(() => {
    getApprovedReviews(6)
      .then((reviews) => {
        setApprovedTestimonials(
          reviews.map((review) => ({
            text: review.body,
            name: review.patient_name || "Verified Patient",
            detail: "Verified Diet By RD patient",
            condition: review.condition_tag || `${review.rating}/5 review`,
            avatar: "★",
          }))
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setApproachActiveIdx(0);
  }, [testimonialItems.length]);

  useEffect(() => {
    if (testimonialItems.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setApproachActiveIdx((idx) =>
        isApproachPaused ? idx : (idx + 1) % testimonialItems.length
      );
    }, 7000);
    return () => window.clearInterval(intervalId);
  }, [testimonialItems.length, isApproachPaused]);

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

  const handleProfileLogout = () => {
    logout();
    setIsProfileMenuOpen(false);
    navigate("/");
  };

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToFooterPlatform = () => {
    document.getElementById('footer-platform')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleContactClick = () => {
    const contactTarget = document.getElementById('contact') ?? document.getElementById('trust');
    if (contactTarget) {
      contactTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // TODO: confirm support email with client
    window.location.href = 'mailto:support@dietbyrd.com';
  };

  const approachTestimonial = testimonialItems[approachActiveIdx] ?? testimonialItems[0];

  return (
    <div className="landing-page">
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
          background: #fff;
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

        /* Hero */
        .hero {
          min-height: auto; background: transparent;
          display: flex; align-items: center;
          padding: 96px 24px;
          position: relative; overflow: hidden;
        }
        .hero-bg {
          position: absolute; inset: 0;
          background: none;
          pointer-events: none;
        }
        .hero-content {
          max-width: 800px; margin: 0 auto; padding: 0;
          position: relative; z-index: 2; text-align: center;
          display: flex; flex-direction: column; align-items: center;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: transparent; border: none; padding: 0;
          font-size: 13px; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--teal);
          margin-bottom: 28px;
        }
        .hero-badge .hero-star { color: var(--gold); font-size: 12px; }
        .hero-h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.4rem, 5vw, 4rem); font-weight: 800; color: var(--text);
          line-height: 1.15; letter-spacing: -0.03em; margin-bottom: 22px;
        }
        .hero-h1 em { font-style: italic; color: var(--teal); }
        .hero-sub {
          font-size: 16px; color: var(--text2);
          max-width: 600px; line-height: 1.7; margin: 24px auto 40px;
          font-weight: 400; text-align: center;
        }
        .hero-sub strong { color: var(--text); font-weight: 600; }
        .hero-actions {
          display: flex; align-items: center; justify-content: center;
          gap: 16px; flex-wrap: wrap;
        }
        .btn-primary {
          display: inline-flex; align-items: center; gap: 10px;
          background: var(--teal); color: #fff; padding: 14px 28px;
          border-radius: 8px; font-size: 15px; font-weight: 600;
          text-decoration: none; transition: all 0.2s; border: none;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
        }
        .btn-primary:hover { background: var(--teal-m); transform: translateY(-1px); box-shadow: 0 12px 30px rgba(11,110,79,0.35); }
        .btn-primary .price {
          background: rgba(255,255,255,0.2); padding: 3px 10px;
          border-radius: 5px; font-size: 14px; font-weight: 700;
        }
        .btn-ghost-link {
          display: inline-flex; align-items: center; gap: 8px;
          color: var(--teal); font-size: 15px; text-decoration: none;
          font-weight: 500; transition: color 0.2s; background: none;
          border: none; cursor: pointer; font-family: 'DM Sans', sans-serif;
          padding: 14px 16px;
        }
        .btn-ghost-link:hover { text-decoration: underline; }
        .btn-outline-navy {
          display: inline-flex; align-items: center; gap: 8px;
          color: var(--navy); font-size: 15px; text-decoration: none;
          font-weight: 600; transition: all 0.2s;
          background: transparent;
          border: 1.5px solid var(--navy);
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          padding: 14px 28px; border-radius: 8px;
        }
        .btn-outline-navy:hover { background: var(--navy); color: #fff; }
        .hero-stats {
          display: flex; gap: 40px; margin-top: 56px; padding-top: 40px;
          border-top: 1px solid var(--border);
          flex-wrap: wrap; justify-content: center;
        }
        .hero-stat .num {
          font-family: 'Playfair Display', serif;
          font-size: 2rem; font-weight: 700; color: var(--navy); line-height: 1;
        }
        .hero-stat .lbl { font-size: 13px; color: var(--text3); margin-top: 4px; font-weight: 400; }

        /* Sections */
        .section { padding: 96px 24px; }
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

        /* CTA section */
        .cta-section {
          text-align: center; padding: 96px 24px;
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden;
        }
        .cta-section::before {
          content: none;
        }
        .cta-inner { max-width: 800px; margin: 0 auto; position: relative; z-index: 1; }
        .cta-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--teal); margin-bottom: 16px;
        }
        .cta-eyebrow .cta-star { color: var(--gold); font-size: 12px; }
        .cta-headline {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.4rem, 5vw, 4rem); font-weight: 800; color: var(--text);
          line-height: 1.15; letter-spacing: -0.03em; margin-bottom: 0;
        }
        .cta-headline em { font-style: italic; color: var(--teal); }
        .cta-actions {
          display: flex; align-items: center; justify-content: center;
          gap: 16px; flex-wrap: wrap;
        }

        .cta-price-badge {
          display: inline-flex; align-items: center; justify-content: center; gap: 16px;
          background: #fff; border: 1px solid var(--border);
          border-radius: 999px; padding: 8px 8px 8px 24px; margin-bottom: 28px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .cta-price-badge .pb-text { font-size: 14px; color: var(--text2); font-weight: 400; letter-spacing: 0; }
        .cta-price-badge .pb-price {
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--teal); color: #fff; border-radius: 999px;
          padding: 10px 20px; font-weight: 600; font-size: 15px; line-height: 1;
        }
        .cta-disclaimer { font-size: 13px; color: var(--text3); margin-top: 16px; }

        /* Compare section */
        .rd-section { overflow: hidden; position: relative; }
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
          background: var(--cream);
          border: 1px solid rgba(201,149,42,0.25); border-radius: 12px;
          padding: 16px 28px; text-align: center; color: var(--text);
          font-size: 15px; line-height: 1.7; max-width: 600px; margin: 0 auto 36px;
        }
        .awareness-tag strong { color: var(--gold); }

        /* Privacy carousel */
        .privacy-section {
          padding: 96px 24px; overflow: hidden; position: relative;
          border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
        }
        .privacy-inner { max-width: 1100px; margin: 0 auto; text-align: center; padding: 0; }
        .privacy-eyebrow {
          display: inline-block; font-size: 11px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--teal); margin-bottom: 10px;
        }
        .privacy-heading {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.3rem, 2.5vw, 1.85rem); color: var(--navy);
          margin-bottom: 10px; font-weight: 700; line-height: 1.25;
        }
        .privacy-sub {
          font-size: 14px; color: var(--text3); margin-bottom: 40px; font-weight: 400;
        }
        /* Marquee */
        .privacy-marquee-wrap { overflow: visible; position: relative; }
        .privacy-marquee-wrap::before, .privacy-marquee-wrap::after {
          content: none;
        }
        .privacy-marquee-wrap::before { left: 0; background: none; }
        .privacy-marquee-wrap::after { right: 0; background: none; }
        .privacy-marquee-track {
          display: flex; justify-content: center; flex-wrap: wrap; gap: 12px; width: auto;
        }
        .privacy-marquee-track:hover { animation-play-state: paused; }
        @keyframes privacyMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .privacy-badge {
          display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0;
          background: #FFFFFF; border: 1px solid var(--border);
          border-radius: 100px; padding: 10px 18px; color: var(--text);
          font-size: 14px; font-weight: 500;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          transition: all 0.2s ease;
        }
        .privacy-badge:hover {
          border-color: var(--teal);
        }
        .privacy-badge-icon { flex-shrink: 0; }

        /* Approach section — WHITE */
        .approach-section .section-eyebrow { color: var(--teal); }
        .approach-section .section-title { color: var(--navy); }
        .approach-section .section-sub { color: var(--text2); }
        .approach-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: start; margin-top: 48px; }
        .approach-features { display: flex; flex-direction: column; gap: 28px; }
        .feature-item { display: flex; gap: 18px; align-items: flex-start; }
        .feature-icon {
          width: 48px; height: 48px; background: var(--teal-l); color: var(--teal);
          border-radius: 12px; display: flex; align-items: center; justify-content: center;
          font-size: 22px; flex-shrink: 0; border: none;
        }
        .feature-text h4 { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
        .feature-text p { font-size: 14px; color: var(--text2); line-height: 1.7; }

        /* Testimonial */
        .testimonials-stack { display: flex; flex-direction: column; gap: 24px; }
        .testimonial-card {
          position: relative; overflow: hidden;
          background: #FFF; border-radius: 16px; padding: 32px 36px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.04); border: 1px solid var(--border);
        }
        .testimonial-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: var(--teal);
        }
        .testimonial-quote { color: var(--teal); width: 24px; height: 24px; margin-bottom: 16px; }
        .testimonial-text { font-family: 'Playfair Display', serif; font-size: 17px; font-style: italic; color: var(--text); line-height: 1.7; margin: 0 0 24px; font-weight: 400; }
        .testimonial-text strong, .testimonial-text b { font-weight: 700; color: var(--teal); }
        .testimonial-author { display: flex; align-items: center; gap: 12px; }
        .testimonial-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--teal-l); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .testimonial-name { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 16px; color: var(--navy); }
        .testimonial-detail { font-size: 13px; color: var(--text3); margin-top: 2px; font-weight: 400; }
        .testimonial-condition { margin-left: auto; background: rgba(11,110,79,0.10); color: var(--teal); font-size: 12px; font-weight: 500; padding: 6px 14px; border-radius: 100px; }

        /* Stats grid */
        .stats-bar-inner {
          max-width: 1100px; margin: 40px auto 0;
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .stat-item {
          padding: 40px 20px 36px; text-align: center;
          background: #fff;
          border: 1px solid rgba(11,110,79,0.15);
          border-radius: 20px;
          opacity: 0; transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
          display: flex; flex-direction: column; align-items: center;
          position: relative; overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
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
        .stat-item-num { font-family: 'Playfair Display', serif; font-size: 3rem; font-weight: 700; color: var(--navy); line-height: 1; margin-bottom: 10px; }
        .stat-item-num .gold { color: var(--gold); }
        .stat-item-lbl { font-size: 13px; color: var(--text3); line-height: 1.55; font-weight: 400; max-width: 130px; }

        /* About Us & Our Vision */
        .about-section {
          padding: 96px 24px;
        }
        .about-section .section-eyebrow { font-size: 12px; font-weight: 600; letter-spacing: 0.1em; color: var(--teal); }
        .about-section .section-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 700;
          color: var(--navy);
        }
        .about-inner { max-width: 820px; margin: 0 auto; }
        .about-quote {
          font-family: 'Playfair Display', serif;
          font-size: 24px; font-style: italic;
          color: var(--text); line-height: 1.45; margin-bottom: 44px;
          border-left: 4px solid var(--teal); padding-left: 24px;
        }
        .about-body { font-size: 15.5px; color: var(--text2); line-height: 1.9; }
        .about-body p { margin-bottom: 18px; }
        .about-body .highlight { color: var(--teal); font-weight: 600; }
        .about-body .bold { color: var(--navy); font-weight: 600; }

        .vision-section {
          padding: 96px 24px;
        }
        .vision-card {
          background: var(--navy);
          border-radius: 20px;
          padding: 56px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .vision-title {
          font-family: 'Playfair Display', serif;
          font-size: 40px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 40px;
        }
        .vision-pillars {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .vision-pillar {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }
        .vision-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 28px;
        }
        .vision-pillar h3 {
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 6px;
        }
        .vision-pillar p {
          font-size: 17px;
          font-weight: 400;
          color: rgba(255,255,255,0.78);
          line-height: 1.7;
        }

        /* Founder Story — WHITE */
        .founder-section { padding: 96px 24px 0; position: relative; overflow: hidden; }
        .founder-inner { max-width: 1100px; margin: 0 auto; }
        .founder-label { font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--teal); margin-bottom: 12px; }
        .founder-title { font-family: 'Playfair Display', serif; font-size: clamp(2rem, 4vw, 3rem); font-weight: 700; color: var(--navy); line-height: 1.15; margin-bottom: 0; }
        .founder-profile-grid {
          max-width: 1100px;
          margin: 64px auto;
          padding: 0 24px;
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 48px;
          align-items: stretch;
        }
        .founder-photo-card {
          background: var(--teal-l);
          border-radius: 24px;
          overflow: hidden;
          aspect-ratio: 4 / 5;
          min-height: 480px;
        }
        .founder-photo-card img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          object-position: bottom center;
        }
        .founder-brand-card {
          background: #fff;
          border-radius: 24px;
          padding: 40px;
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 16px;
        }
        .founder-brand-line {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          font-weight: 700;
          color: var(--navy);
          margin-bottom: 32px;
        }
        .founder-brand-line span { color: var(--gold); }
        .founder-brand-card h3 {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 700;
          color: var(--navy);
        }
        .founder-info-role { font-size: 14px; font-weight: 500; color: var(--text2); }
        .founder-info-location { font-size: 13px; font-weight: 400; color: var(--text3); }
        .founder-card-divider {
          width: 100%;
          height: 1px;
          background: var(--border);
          margin: 24px 0;
        }
        .founder-story-quote {
          border-left: 3px solid var(--teal);
          padding-left: 16px;
          font-family: 'Playfair Display', serif;
          font-style: italic;
          font-size: 16px;
          color: var(--text);
          line-height: 1.6;
        }
        .founder-purpose-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
          background: rgba(11,110,79,0.10);
          color: var(--teal);
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 500;
          margin-top: 16px;
        }
        .road-ahead-section {
          padding: 96px 24px;
        }
        .road-ahead-inner {
          max-width: 800px;
          margin: 0 auto;
        }
        .road-ahead-copy {
          font-size: 15px;
          color: var(--text2);
          line-height: 1.85;
          margin-bottom: 18px;
        }
        .road-ahead-copy strong { color: var(--navy); font-weight: 600; }
        .road-ahead-card {
          background: var(--navy);
          border-radius: 16px;
          padding: 36px;
          max-width: 800px;
          margin: 32px auto 0;
        }
        .road-ahead-card h3 {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 12px;
        }
        .road-ahead-card p {
          font-size: 15px;
          font-weight: 400;
          color: rgba(255,255,255,0.75);
          line-height: 1.75;
        }

        /* Clinician Referral */
        .clinician-referral-section {
          padding: 96px 24px;
        }
        .clinician-referral-inner {
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
        }
        .clinician-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.8rem, 3.4vw, 2.6rem);
          font-weight: 700;
          color: var(--navy);
          margin-bottom: 12px;
        }
        .clinician-body {
          color: var(--text2);
          font-size: 15px;
          line-height: 1.8;
          max-width: 720px;
          margin: 0 auto;
        }
        .clinician-logo-row {
          margin-top: 28px;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 16px;
          align-items: center;
        }
        .clinician-logo {
          height: 56px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text3);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          font-weight: 600;
          opacity: 0.6;
          filter: grayscale(1);
          transition: opacity 0.2s ease;
        }
        .clinician-logo:hover { opacity: 1; }

        /* Industry Standards */
        .standards-section {
          padding: 96px 24px;
        }
        .standards-section .section-eyebrow { color: var(--teal); }
        .standards-section .section-title { color: var(--navy); }
        .standards-section .section-sub { color: var(--text2); }
        .standards-inner { max-width: 1000px; margin: 0 auto; }
        .standards-list { display: flex; flex-direction: column; gap: 20px; margin-top: 48px; }
        .standard-card {
          background: #fafafa;
          border: 1px solid var(--border); border-radius: 16px;
          padding: 28px 32px; display: flex; gap: 20px; align-items: flex-start;
        }
        .standard-icon { width: 46px; height: 46px; background: rgba(11,110,79,0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
        .standard-content h4 { font-size: 15px; font-weight: 600; color: var(--navy); margin-bottom: 6px; }
        .standard-content p { font-size: 14px; color: var(--text2); line-height: 1.7; }

        /* Trust section */
        .trust-section { position: relative; overflow: hidden; }
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
          background: var(--navy);
          color: rgba(255,255,255,0.68); padding: 64px 24px 40px; border-top: 1px solid rgba(255,255,255,0.08);
        }
        .footer-email {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 13.5px; color: var(--text3);
          text-decoration: none; margin-top: 14px;
          padding: 8px 14px;
          background: var(--teal-l); border: 1px solid rgba(11,110,79,0.15);
          border-radius: 8px; transition: all 0.2s;
        }
        .footer-email:hover { color: var(--teal); background: rgba(11,110,79,0.1); border-color: rgba(11,110,79,0.25); }
        .footer-inner { max-width: 1200px; margin: 0 auto; }
        .footer-top { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr; gap: 48px; padding-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .footer-brand .fb-logo { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 10px; }
        .footer-brand .fb-logo span { color: var(--gold); }
        .footer-brand p { font-size: 13.5px; line-height: 1.8; color: rgba(255,255,255,0.58); font-weight: 300; max-width: 280px; }
        .footer-col h5 { font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #fff; margin-bottom: 16px; }
        .footer-col h4 { font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 12px; }
        .footer-col a { display: block; font-size: 13.5px; color: rgba(255,255,255,0.6); text-decoration: none; margin-bottom: 10px; transition: color 0.2s; }
        .footer-col a:hover { color: #fff; }
        .footer-col ul { list-style: none; padding: 0; margin: 0; }
        .footer-col li { margin-bottom: 10px; }
        .footer-col ul li a { font-size: 13px; color: rgba(255,255,255,.6); text-decoration: none; transition: color 0.2s; }
        .footer-col ul li a:hover { color: #fff; }
        .footer-bottom { display: flex; align-items: center; justify-content: space-between; padding-top: 28px; flex-wrap: wrap; gap: 16px; }
        .footer-bottom p { font-size: 13px; color: rgba(255,255,255,0.5); }
        .footer-badges { display: flex; gap: 10px; flex-wrap: wrap; }
        .f-badge { font-size: 11px; padding: 4px 10px; border-radius: 6px; font-weight: 500; background: var(--teal-l); color: var(--teal); border: 1px solid rgba(11,110,79,0.15); }

        /* Responsive */
        @media (max-width: 900px) {
          .compare-grid, .approach-grid { grid-template-columns: 1fr; }
          .approach-grid { gap: 48px; }
          .founder-profile-grid { grid-template-columns: 1fr; gap: 24px; }
          .stats-bar-inner { grid-template-columns: 1fr 1fr; }
          .footer-top { grid-template-columns: 1fr 1fr; }
          .nav-links .nav-mid { display: none; }
          .clinician-logo-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 600px) {
          .hero { padding: 64px 24px; }
          .hero-content { padding: 0; }
          .cta-section { padding: 64px 24px; }
          .cta-actions > * { width: 100%; justify-content: center; }
          .privacy-section,
          .about-section,
          .vision-section,
          .clinician-referral-section,
          .standards-section { padding: 64px 24px; }
          .vision-card { padding: 32px 24px; }
          .founder-section { padding: 64px 24px 0; }
          .founder-profile-grid { margin: 40px auto; padding: 0; }
          .founder-photo-card { min-height: 0; }
          .founder-brand-card { padding: 28px 24px; }
          .road-ahead-section { padding: 64px 24px; }
          .road-ahead-card { padding: 28px 24px; }
          .clinician-logo-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .footer-top { grid-template-columns: 1fr; }
          .nav-links { gap: 12px; }
          .section { padding: 64px 24px; }
          .stats-bar-inner { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* Navigation */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <Logo />
          <div className="nav-links">
            <a href="/" className="nav-mid">Home</a>
            <a href="#approach" className="nav-mid" onClick={scrollTo('approach')}>How It Works</a>
            <a href="#conditions" className="nav-mid" onClick={scrollTo('conditions')}>Conditions</a>
            <a href="#about" className="nav-mid" onClick={scrollTo('about')}>About Us</a>
            <a href="#reviews" className="nav-mid" onClick={scrollTo('reviews')}>Reviews</a>
            <a href="#trust" className="nav-mid" onClick={scrollTo('trust')}>Contact Us</a>
            <a href="/privacy" target="_blank" rel="noopener" className="nav-link">Privacy Policy</a>
            {isAuthenticated ? (
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
                  <Link to="/login" className="profile-avatar" aria-label="Login">
                    <User size={18} />
                  </Link>
                </div>
                <button onClick={() => setIsBookingModalOpen(true)} className="nav-cta">Book — ₹999</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* CTA — Page 1 */}
      <section className="cta-section" style={{ background: 'var(--cream)' }}>
        <div className="cta-inner">
          <h1 ref={addToRefs} className="cta-headline reveal reveal-delay-1">
            Your health deserves
            <em style={{ fontStyle: 'italic', color: 'var(--teal)' }}> clinical expertise</em>
            <br />
            — not a certificate course.
          </h1>
          <p ref={addToRefs} className="hero-sub reveal reveal-delay-2">
            India's First RD - Only Platform for Clinical Nutrition Consultations.
            <strong>Registered Dietitian</strong> — the only clinically credentialed nutrition professionals in India. Not coaches. Not influencers. <strong>The real thing.</strong>
          </p>
          <div ref={addToRefs} className="cta-actions reveal reveal-delay-3">
            <button onClick={() => setIsBookingModalOpen(true)} className="btn-primary">
              Book Your Consultation
            </button>
          </div>
        </div>
      </section>

      {/* Privacy + Stats */}
      <section className="privacy-section" style={{ background: 'var(--cream)' }}>
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
          <div className="trust-marquee" style={{ marginTop: '48px' }}>
            <div className="trust-marquee__track">
              {[...trustBadges, ...trustBadges].map(({ key, label, Icon }, index) => (
                <div key={`${key}-${index}`} className="privacy-badge">
                  <Icon
                    aria-hidden="true"
                    className="privacy-badge-icon"
                    size={18}
                    strokeWidth={2.25}
                    style={{ color: 'var(--teal)' }}
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* RD vs Nutritionist — Page 2 */}
      <section id="rd-section" className="section rd-section reveal" style={{ background: '#fff' }}>
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

      {/* How We Work — Page 3 */}
      <div id="reviews" style={{ position: 'relative', top: '-80px' }} aria-hidden="true" />
      <section id="approach" className="section approach-section reveal" style={{ background: 'var(--cream)' }}>
        <div className="section-inner">
          <div className="approach-grid">
            <div>
              <span ref={addToRefs} className="section-eyebrow reveal">How we work</span>
              <h2 ref={addToRefs} className="section-title reveal reveal-delay-1">
                Nutrition science meets<br /><em style={{ fontStyle: 'italic', color: 'var(--teal)' }}>your food language.</em>
              </h2>
              <p ref={addToRefs} className="section-sub reveal reveal-delay-2" style={{ marginBottom: '36px' }}>
                Work with Registered Dietitians who provide evidence-based, deeply personalised diet plans after a comprehensive one-on-one consultation — tailored to your schedule, your city, your budget, and your culture.
              </p>
              <div className="approach-features">
                <div ref={addToRefs} className="feature-item reveal reveal-delay-1">
                  <div className="feature-icon">🔬</div>
                  <div className="feature-text">
                    <h4>Evidence-based, always</h4>
                    <p>Every recommendation is backed by clinical research and ICMR nutritional standards — not trends, not viral videos, not someone's personal experience.</p>
                  </div>
                </div>
                <div ref={addToRefs} className="feature-item reveal reveal-delay-2">
                  <div className="feature-icon">🌾</div>
                  <div className="feature-text">
                    <h4>Built around your plate, not a stranger's</h4>
                    <p>Your RD understands that a Tamilian's plate looks nothing like a Punjabi's. Your diet plan works with what you already eat — not against it.</p>
                  </div>
                </div>
                <div ref={addToRefs} className="feature-item reveal reveal-delay-3">
                  <div className="feature-icon">💰</div>
                  <div className="feature-text">
                    <h4>Affordable without compromise</h4>
                    <p>Clinical expertise should not be a luxury. At ₹999/month, you get the same standard of care that hospitals charge ten times more for.</p>
                  </div>
                </div>
                <div ref={addToRefs} className="feature-item reveal reveal-delay-3">
                  <div className="feature-icon">🔁</div>
                  <div className="feature-text">
                    <h4>Consistent, not one-and-done</h4>
                    <p>Monthly consultations with the same RD who knows your history. Real progress comes from continuity — not a single diet chart PDF.</p>
                  </div>
                </div>
              </div>
            </div>
            <div ref={addToRefs} className="testimonial-carousel reveal reveal-delay-2" aria-label="Patient testimonials">
              {approachTestimonial && (
                <div
                  className="testimonial-card fade-in"
                  onMouseEnter={() => setIsApproachPaused(true)}
                  onMouseLeave={() => setIsApproachPaused(false)}
                >
                  <Quote className="testimonial-quote" aria-hidden="true" />
                  <p className="testimonial-text" dangerouslySetInnerHTML={{ __html: approachTestimonial.text || "" }} />
                  <div className="testimonial-author">
                    <div className="testimonial-avatar">{approachTestimonial.avatar}</div>
                    <div>
                      <div className="testimonial-name">{approachTestimonial.name}</div>
                      <div className="testimonial-detail">{approachTestimonial.detail}</div>
                    </div>
                    <div className="testimonial-condition">{approachTestimonial.condition || "General Wellness"}</div>
                  </div>
                </div>
              )}
              <div className="testimonial-controls">
                <button
                  type="button"
                  onClick={() =>
                    setApproachActiveIdx(
                      (approachActiveIdx - 1 + testimonialItems.length) % testimonialItems.length
                    )
                  }
                  aria-label="Previous testimonial"
                >
                  ←
                </button>
                <div className="testimonial-dots" role="tablist" aria-label="Testimonial pagination">
                  {testimonialItems.map((_, i) => (
                    <span
                      key={`testimonial-dot-${i}`}
                      className={i === approachActiveIdx ? "active" : ""}
                      role="button"
                      tabIndex={0}
                      onClick={() => setApproachActiveIdx(i)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setApproachActiveIdx(i);
                        }
                      }}
                      aria-label={`Go to testimonial ${i + 1}`}
                      aria-pressed={i === approachActiveIdx}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setApproachActiveIdx((approachActiveIdx + 1) % testimonialItems.length)}
                  aria-label="Next testimonial"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us & Our Vision — Page 4 */}
      <section
        id="about"
        className="about-section reveal"
        style={{ background: 'var(--cream)', padding: '96px 24px' }}
      >
        <style>
          {`@media (max-width: 900px) {
  .about-vision-grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .about-vision-card {
    position: static;
    top: auto;
  }
}`}
        </style>
        <div
          className="about-vision-grid"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr',
            gap: '64px',
            alignItems: 'start'
          }}
        >
          <div className="about-inner">
            <span ref={addToRefs} className="section-eyebrow reveal">WHO WE ARE</span>
            <h2 ref={addToRefs} className="section-title reveal reveal-delay-1">About Us &amp; Our Vision</h2>
            <blockquote ref={addToRefs} className="about-quote reveal reveal-delay-2">
              "In a country where anyone with a camera and half-baked knowledge can claim to be a 'health expert,' the truth often gets lost."
            </blockquote>
            <div ref={addToRefs} className="about-body reveal reveal-delay-2">
              <p>Misinformation spreads faster than science, and people end up paying the price — with their money, their trust, and sometimes even their health.</p>
              <p><span className="bold">Diet By RD was born to change that.</span></p>
              <p>We are not here to add noise. We are here to set new industry standards. At Diet By RD, you don't get self-proclaimed "coaches" or certificate-driven influencers. You get licensed professionals — experts who own their craft, stand by evidence, and remain committed to your goals. And we've made it possible at a price that respects the value of your hard-earned money.</p>
              <p>But we are not just about affordability or credibility. <span className="bold">We are about vision.</span></p>
            </div>
          </div>
          <div
            className="vision-card reveal about-vision-card"
            style={{ position: 'sticky', top: '96px', alignSelf: 'start' }}
          >
            <h2 ref={addToRefs} className="vision-title reveal">Our Vision</h2>
            <div className="vision-pillars">
              <div ref={addToRefs} className="vision-pillar reveal reveal-delay-1">
                <div className="vision-icon">
                  <Scale size={28} strokeWidth={2} className="text-white" />
                </div>
                <div>
                  <h3>Rooted in integrity</h3>
                  <p>Recommend what is right for the patient, even when it isn't the most profitable choice.</p>
                </div>
              </div>
              <div ref={addToRefs} className="vision-pillar reveal reveal-delay-1">
                <div className="vision-icon">
                  <Award size={28} strokeWidth={2} className="text-white" />
                </div>
                <div>
                  <h3>Set the New Industry Standards</h3>
                  <p>Make clinical credibility the baseline expectation — not a premium add-on — for nutrition care in India.</p>
                </div>
              </div>
              <div ref={addToRefs} className="vision-pillar reveal reveal-delay-2">
                <div className="vision-icon">
                  <Microscope size={28} strokeWidth={2} className="text-white" />
                </div>
                <div>
                  <h3>Science over noise</h3>
                  <p>In a world drowning in health content, be the one voice that always chooses evidence over engagement.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Story Behind Diet By RD — Page 5 */}
      <section className="founder-section reveal" style={{ background: 'var(--cream)' }}>
        <style>
          {`@media (max-width: 900px) {
  .founder-section { padding: 64px 24px; }
  .story-grid { grid-template-columns: 1fr; gap: 32px; }
}

@media (max-width: 700px) {
  .story-feature-grid { grid-template-columns: 1fr; }
}

.founder-section { padding: 96px 24px; }
.story-inner { max-width: 1200px; margin: 0 auto; }
.story-eyebrow {
  font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--teal);
  margin-bottom: 12px;
}
.story-title {
  font-family: 'Playfair Display', serif; font-size: clamp(2.2rem, 4vw, 3rem);
  font-weight: 700; color: var(--navy); margin-bottom: 48px;
}
.story-grid {
  display: grid; grid-template-columns: 1fr 1.2fr; gap: 48px; align-items: start;
}
.story-card {
  background: transparent; border-radius: 0; overflow: visible;
  box-shadow: none; border: 0;
}
.story-monogram {
  min-height: 560px; height: min(72vh, 720px); width: 100%; background: transparent;
  border-radius: 0; display: flex; align-items: flex-end; justify-content: center;
  overflow: visible; position: relative;
}
.story-monogram-text {
  font-family: 'Playfair Display', serif; font-size: 96px; font-weight: 700;
  color: rgba(255,255,255,0.15); letter-spacing: 0.05em;
}
.story-card-body { padding: 36px 32px; }
.story-name {
  font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700;
  color: var(--navy); margin-bottom: 4px;
}
.story-role {
  font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
  color: var(--teal); margin-bottom: 2px;
}
.story-location {
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 400;
  color: var(--text3); margin-bottom: 24px;
}
.story-quote {
  background: rgba(11,110,79,0.04); border-left: 3px solid var(--teal);
  padding: 16px 20px; border-radius: 0 8px 8px 0;
  font-family: 'Playfair Display', serif; font-style: italic; font-size: 15px;
  color: var(--text); line-height: 1.6;
}
.story-bio { display: flex; flex-direction: column; gap: 16px; }
.story-bio-text {
  font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 400;
  color: var(--text); line-height: 1.75; margin: 0;
}
.story-road-card {
  margin-top: 24px; background: var(--navy); border-radius: 16px; padding: 32px 36px;
}
.story-road-title {
  font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700;
  color: #fff; margin-bottom: 12px;
}
.story-road-body {
  font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 400;
  color: rgba(255,255,255,0.78); line-height: 1.7; margin: 0;
}
.story-feature-grid {
  margin-top: 64px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
}
.story-feature-card {
  background: #fff; border: 1px solid var(--border); border-radius: 16px;
  padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  display: flex; flex-direction: column; gap: 12px;
}
.story-feature-title {
  font-family: 'DM Sans', sans-serif; font-size: 17px; font-weight: 700;
  color: var(--navy);
}
.story-feature-body {
  font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 400;
  color: var(--text2); line-height: 1.6; margin: 0;
}
`}
        </style>
        <div className="story-inner">
          <div>
            <p ref={addToRefs} className="story-eyebrow reveal">THE PEOPLE BEHIND THIS</p>
            <h2 ref={addToRefs} className="story-title reveal reveal-delay-1">The Story Behind Diet By RD</h2>
          </div>
          <div ref={addToRefs} className="story-grid reveal reveal-delay-2">
            <div className="story-card">
              <div className="story-monogram">
                <img
                  src="/aryan-bhagat-founder.png"
                  alt="Aryan Bhagat, Founder of Diet By RD"
                  style={{
                    width: '112%',
                    height: '112%',
                    objectFit: 'contain',
                    objectPosition: 'bottom center',
                    display: 'block',
                    filter: 'none',
                    mixBlendMode: 'multiply',
                    transform: 'scale(1.08)',
                    transformOrigin: 'bottom center'
                  }}
                />
              </div>
            </div>
            <div className="story-bio">
              <div className="story-card-body">
                <div className="story-name">Aryan Bhagat</div>
                <div className="story-role">Founder, Diet By RD</div>
                <div className="story-location">Darbhanga, Bihar</div>
                <div className="story-quote">
                  "Everything in this world can be learnt." — the belief that started it all.
                </div>
              </div>
              <p className="story-bio-text">
                Diet By RD was founded by <strong style={{ color: 'var(--navy)' }}>Aryan Bhagat</strong>, a young mind from Darbhanga, Bihar, with a simple but powerful belief: <em>"Everything in this world can be learnt."</em>
              </p>
              <p className="story-bio-text">
                Coming from a lower-middle-class family, Aryan grew up knowing the weight of every rupee earned — and how unfair it is when misinformation in healthcare makes people lose it so easily. He saw how easily people were misled into spending it on false promises and pseudoscience.
              </p>
              <p className="story-bio-text">
                He watched families trust 'health experts' who were nothing more than confident content creators. He saw diabetic patients follow advice from coaches with no clinical training. He saw people spending money they didn't have on products they didn't need.
              </p>
              <p className="story-bio-text">
                That's the problem Diet By RD exists to solve. Not with more content — but with the <strong style={{ color: 'var(--navy)' }}>right credentials, the right professionals, and the right price.</strong>
              </p>
              <div className="story-road-card">
                <div className="story-road-title">The Road Ahead</div>
                <p className="story-road-body">
                  Diet By RD is rooted in India but built for the world. From Delhi to global shores — this journey is about creating something larger than one city, one founder, or one team. It's about giving people everywhere a chance to take control of their health, without being exploited.
                </p>
              </div>
            </div>
          </div>
          <div className="story-feature-grid" ref={addToRefs}>
            <div className="story-feature-card">
              <Gem size={24} strokeWidth={2} style={{ color: 'var(--teal)' }} />
              <div className="story-feature-title">Affordability without compromise</div>
              <p className="story-feature-body">Expert care at ₹999. Because quality should not be a privilege.</p>
            </div>
            <div className="story-feature-card">
              <Microscope size={24} strokeWidth={2} style={{ color: 'var(--teal)' }} />
              <div className="story-feature-title">Science over pseudoscience</div>
              <p className="story-feature-body">Evidence-led, not influencer-led. Always.</p>
            </div>
            <div className="story-feature-card">
              <ShieldCheck size={24} strokeWidth={2} style={{ color: 'var(--teal)' }} />
              <div className="story-feature-title">Transparency &amp; Trust</div>
              <p className="story-feature-body">Honest pricing, clear policies, and zero hidden agendas. Healthcare without games.</p>
            </div>
            <div className="story-feature-card">
              <BookOpen size={24} strokeWidth={2} style={{ color: 'var(--teal)' }} />
              <div className="story-feature-title">Education First</div>
              <p className="story-feature-body">We don't just hand out diet charts. We help you understand why every choice matters.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="clinician-referral-section reveal" style={{ background: 'var(--cream)' }}>
        <div className="section-inner">
          <div className="clinician-referral-inner">
            <span ref={addToRefs} className="section-eyebrow reveal">REFERRED BY LEADING CLINICIANS</span>
            <h2 ref={addToRefs} className="clinician-title reveal reveal-delay-1">Trusted by Doctors Across India</h2>
            <p ref={addToRefs} className="clinician-body reveal reveal-delay-2">
              Doctors across India refer their patients to Diet By RD because they trust the credentialing.
            </p>
            <div ref={addToRefs} className="clinician-logo-row reveal reveal-delay-2">
              <div className="clinician-logo" role="img" aria-label="Hospital icon">Hospital</div>
              <div className="clinician-logo" role="img" aria-label="Hospital icon">Hospital</div>
              <div className="clinician-logo" role="img" aria-label="Hospital icon">Hospital</div>
              <div className="clinician-logo" role="img" aria-label="Hospital icon">Hospital</div>
              <div className="clinician-logo" role="img" aria-label="Hospital icon">Hospital</div>
            </div>
          </div>
        </div>
      </section>

      {/* Setting the New Industry Standards — Page 6 */}
      <section className="standards-section" style={{ background: '#fff' }}>
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
      <section id="trust" className="section trust-section" style={{ background: 'var(--cream)' }}>
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
        </div>
      </section>

      <section id="conditions" className="section trust-section" style={{ background: 'var(--cream)' }}>
        <div className="section-inner trust-inner">
          <h2 ref={addToRefs} className="trust-title reveal reveal-delay-1">Conditions We Treat</h2>
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
      <section className="hero" style={{ background: 'var(--cream)' }}>
        <div className="hero-bg" />
        <div className="hero-content">
          <h1 ref={addToRefs} className="hero-h1 reveal reveal-delay-1">
            Your health deserves
            <em style={{ fontStyle: 'italic', color: 'var(--teal)' }}> clinical expertise</em>
            <br />
            — not a certificate course.
          </h1>
          <p ref={addToRefs} className="hero-sub reveal reveal-delay-2">
            India's First RD - Only Platform for Clinical Nutrition Consultations.
            <strong>Registered Dietitian</strong> — the only clinically credentialed nutrition professionals in India. Not coaches. Not influencers. <strong>The real thing.</strong>
          </p>
          <div ref={addToRefs} className="hero-actions reveal reveal-delay-3">
            <button onClick={() => setIsBookingModalOpen(true)} className="btn-primary">
              Book Your Consultation
            </button>
            <button onClick={scrollToFooterPlatform} className="btn-outline-navy">Are you a Doctor / Dietitian</button>
            <button onClick={handleContactClick} className="btn-ghost-link">Contact / Support →</button>
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
            <div id="footer-platform" className="footer-col">
              <h5>Platform</h5>
              <a href="#" onClick={(e) => { e.preventDefault(); setIsBookingModalOpen(true); }}>Book Consultation</a>
              <a href="#approach" onClick={scrollTo('approach')}>How It Works</a>
              <a href="#conditions" onClick={scrollTo('conditions')}>Conditions</a>
            </div>
            <div className="footer-col">
              <h5>Company</h5>
              <a href="#rd-section" onClick={scrollTo('rd-section')}>Why RD?</a>
              <a href="/login">For Doctors</a>
              <a href="/login">Join as Dietitian</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a></li>
                <li><a href="/terms" target="_blank" rel="noopener">Terms of Service</a></li>
                <li><a href="/refund" target="_blank" rel="noopener">Refund Policy</a></li>
                <li><a href="/cancellation" target="_blank" rel="noopener">Cancellation Policy</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Legal & Support</h5>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="/patient/support">Contact / Support</a>
              <a href="mailto:hello@dietbyrd.com">hello@dietbyrd.com</a>
              <div style={{ fontSize: '13.5px', color: 'var(--text3)', marginBottom: '10px' }}>
                Grievance: <a href="mailto:grievance@dietbyrd.com" style={{ color: 'var(--teal)' }}>grievance@dietbyrd.com</a>
              </div>
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
