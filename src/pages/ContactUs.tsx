import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PublicBookingModal } from "@/components/PublicBookingModal";
import { motion } from "framer-motion";
import { CalendarDays, UtensilsCrossed, MessageSquare, User, LogOut, Heart } from "lucide-react";
import { Mail, Phone, ShieldCheck, ChevronDown, Leaf, Menu, X } from "lucide-react";

const faqs = [
  {
    question: "What is RD?",
    answer: (
      <div className="space-y-4">
        <p>A Registered Dietitian (RD) is a qualified healthcare professional trained in the science of nutrition and dietetics.</p>
        <p>The title "Registered Dietitian" is legally regulated, which means not everyone can use it. Just as nobody can call themselves a Doctor without the required medical qualifications, nobody can legally use the title of Registered Dietitian without meeting the professional standards established by the regulatory authorities.</p>
        <p>Behind those two letters—<strong>RD</strong>—are years of education, clinical training, professional accountability, and a commitment to helping people improve their health through evidence-based nutrition.</p>
        <p>Because your health deserves more than advice.</p>
        <p>It deserves expertise.</p>
      </div>
    )
  },
  {
    question: "What does a Registered Dietitian do?",
    answer: (
      <div className="space-y-4">
        <p>Every person has a different story.</p>
        <div className="pl-2 space-y-1">
          <p>Different goals.</p>
          <p>Different medical conditions.</p>
          <p>Different cultures.</p>
          <p>Different routines.</p>
          <p>Different cravings.</p>
          <p>Different responsibilities.</p>
          <p>Different budgets.</p>
        </div>
        <p>A Registered Dietitian takes the time to understand that story before recommending what belongs on your plate.</p>
        <p>At Diet By RD, our Registered Dietitians are trained to look beyond calories and meal plans. They seek to understand your health, your lifestyle, your relationship with food, and the realities of your everyday life.</p>
        <p>The result is not a diet copied from a template.</p>
        <p>It is a personalised nutrition plan designed around you—your goals, your preferences, your schedule, your comfort foods, and your wellbeing.</p>
        <p>A diet that fits your life.</p>
        <p>A diet that respects who you are.</p>
        <p>A diet that loves you, and one that you can genuinely love back.</p>
      </div>
    )
  },
  {
    question: "What service does Diet By RD provide?",
    answer: (
      <div className="space-y-4">
        <p>We do something unusual.</p>
        <p>While many healthcare businesses try to offer a little bit of everything for money, we have chosen to focus on doing one thing exceptionally well.</p>
        <p><strong>Personalised Clinical Nutrition Consultation by Registered Dietitians.</strong></p>
        <p>That's it.</p>
        <div className="space-y-1">
          <p>No endless catalogue of services.</p>
          <p>No confusing packages.</p>
          <p>No distractions.</p>
        </div>
        <p>Just highly personalised, evidence-based nutrition guidance from professionals who have dedicated their careers to understanding the science of food, health, and human behaviour.</p>
        <p>Professionals who own their craft.</p>
      </div>
    )
  },
  {
    question: "Why should I choose Diet By RD over a RD available in my nearby Hospital (in non emergency case)?",
    answer: (
      <div className="space-y-4">
        <p>Let's be real, most of the RD's are good enough. But the quality is not standardised. Have you ever heard of a Registered Dietitian in hospital asking patients to give up on whey protein because it is not safe, not to eat egg yolk because it will cause them heart stroke and not to go gym because it will make them look like hulk? We all have seen it. Their textbooks never said this, these are their own beliefs that interfere in their practice. Diet By RD came to the rescue!</p>
        <p>At Diet By RD, we don't just hire the best Registered Dietitians, we train them to be exceptional!</p>
        <p>At Diet By RD, each and every Registered Dietitian(RD) goes through rigorous critical thinking training- This is to ensure you don't face a professional with a credible title and an unscientific mind.</p>
        <p>Each RD goes through all the relevant latest scientific studies and researches every single day- so that you don't have to face outdated knowledge of highly credentialed Registered Dietitians.</p>
        <p>Each dietitian is trained for India's Diverse Food Culture and knows how to build a diet for idli-dosa for South Indians, a poha breakfast for a busy Mumbaikar, dal bhat chokha for people of Bihar, sweet lassi at every cheering moment for Punjabians. Registered Dietitians at Diet By RD speak your food language.</p>
      </div>
    )
  },
  {
    question: "Is it an online consultation or offline?",
    answer: (
      <div className="space-y-4">
        <p>All consultations are conducted online through Google Meet. Every consultation is a private one-to-one conversation between you and your Registered Dietitian. No compromise on privacy</p>
      </div>
    )
  },
  {
    question: "How many consultations do I need to take?",
    answer: (
      <div className="space-y-4">
        <p>Healthcare should never be designed to maximise invoices. Most Nutritionists and Fitness coaches unnecessarily change the diet plan of their clients every 7 days. Don't fall for this gimmick, This is purely done to exploit your pocket and charge you money every week or to justify their 5000rs per month plan.</p>
        <p>At Diet By RD we don't sell our soul for money. For most individuals, 1 consultation per month by a Registered Dietitian is sufficient to review progress, make adjustments when necessary, and continue moving forward. meaningful progress usually comes from consistency, not constant changes</p>
      </div>
    )
  },
  {
    question: "What is the price? Any hidden fee?",
    answer: (
      <div className="space-y-4">
        <p>No hidden fees. No surprises. Just honest pricing.</p>
        <p>A consultation with a Registered Dietitian costs ₹999 per consultation.</p>
        <p>If you find value in our approach and wish to continue your journey with us, you can switch to our <strong>Subscribe & Save plan for ₹899 per month</strong>, with the freedom to cancel anytime.</p>
        <p>You may also purchase consultations in advance and store them safely in your consultation wallet, allowing you to use them whenever you need them. In this case, consultations are available at ₹899 per consultation.</p>
        <p>We believe healthcare pricing should be simple, transparent, and respectful of your hard-earned money.</p>
      </div>
    )
  }
];

const FAQItem = ({ faq }: { faq: typeof faqs[0] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`bg-white border transition-colors duration-300 rounded-xl overflow-hidden shadow-sm ${isOpen ? 'border-[#427A5B]/30' : 'border-[#EBE7DF]'}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left focus:outline-none bg-white hover:bg-[#FAF9F5] transition-colors"
      >
        <h3 className="text-[17px] font-bold text-[var(--navy)] pr-8" style={{ fontFamily: "'Playfair Display', serif" }}>
          {faq.question}
        </h3>
        <ChevronDown 
          className={`w-5 h-5 text-[#427A5B] flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          strokeWidth={2}
        />
      </button>
      <div 
        className={`px-6 text-[15px] text-gray-700 leading-[1.8] overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'pb-6 max-h-[1200px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
      >
        {faq.answer}
      </div>
    </div>
  );
};


const patientNavItems = [
  { label: "My all bookings", href: "/patient/appointments", icon: CalendarDays },
  { label: "My diet charts", href: "/patient/diet-plans", icon: UtensilsCrossed },
  { label: "My blood reports", href: "/patient/profile#reports", icon: Heart },
  { label: "Help / Support", href: "/patient/support", icon: MessageSquare },
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

const ContactUs = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleProfileLogout = () => {
    logout();
    navigate('/');
  };

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    navigate('/#' + id);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] relative overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
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
        }
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
          width: 160px;
          flex-shrink: 0;
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
        .doctor-trust-banner { padding: 40px; text-align: center; margin-bottom: 56px; }
        .trust-quote-big { font-family: 'Playfair Display', serif; font-size: clamp(0.9rem, 1.5vw, 1.25rem); font-style: italic; color: var(--text); line-height: 1.6; max-width: 100%; margin: 0 auto 20px; }
        .trust-proof-row { display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; }
        .trust-proof { text-align: center; }
        .trust-proof .tp-num { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; color: var(--teal); }
        .trust-proof .tp-lbl { font-size: 12px; color: var(--text3); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.06em; }
        .conditions-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; margin-bottom: 64px; max-width: 1100px; margin-left: auto; margin-right: auto; position: relative; z-index: 2; }
        .condition-pill { background: #FFFFFF; border: 1px solid rgba(0,0,0,0.06); border-radius: 16px; padding: 24px 16px; text-align: center; transition: all 0.2s; cursor: default; width: 140px; display: flex; flex-direction: column; align-items: center; box-shadow: 0 4px 14px rgba(0,0,0,0.03); }
        .condition-pill:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); border-color: rgba(11,110,79,0.15); }
        .condition-pill .cicon { width: 64px; height: 64px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; }
        .condition-pill .cicon img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .condition-pill .ctxt { font-family: 'Playfair Display', serif; font-size: 15px; color: var(--navy); font-weight: 700; line-height: 1.3; }

        .conditions-bg-leaf { position: absolute; opacity: 0.15; z-index: 0; pointer-events: none; }
        .conditions-bg-leaf.left { top: 0; left: 0; width: 200px; }
        .conditions-bg-leaf.right { top: 0; right: 0; width: 200px; transform: scaleX(-1); }
        .conditions-bg-leaf.bottom { bottom: 0; left: 50%; transform: translateX(-50%); width: 120px; opacity: 0.2; }

        /* Footer */
        .landing-footer {
          background: var(--navy);
          color: rgba(255,255,255,0.68); padding: 64px 24px 40px; border-top: 1px solid rgba(255,255,255,0.08);
        }
        .footer-email {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 13.5px; color: rgba(255, 255, 255, 0.8);
          text-decoration: none; margin-top: 14px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px; transition: all 0.2s;
        }
        .footer-email:hover { color: #fff; background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.25); }
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
          padding: clamp(48px, 8vw, 96px) clamp(20px, 5vw, 32px);
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
          padding: clamp(48px, 8vw, 96px) clamp(20px, 5vw, 32px);
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
          width: 160px;
          flex-shrink: 0;
        }
        .clinician-logo:hover { opacity: 1; }

        /* Industry Standards */
        .standards-section {
          padding: clamp(48px, 8vw, 96px) clamp(20px, 5vw, 32px);
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
        .doctor-trust-banner { padding: 40px; text-align: center; margin-bottom: 56px; }
        .trust-quote-big { font-family: 'Playfair Display', serif; font-size: clamp(0.9rem, 1.5vw, 1.25rem); font-style: italic; color: var(--text); line-height: 1.6; max-width: 100%; margin: 0 auto 20px; }
        .trust-proof-row { display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; }
        .trust-proof { text-align: center; }
        .trust-proof .tp-num { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; color: var(--teal); }
        .trust-proof .tp-lbl { font-size: 12px; color: var(--text3); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.06em; }
        .conditions-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; margin-bottom: 64px; max-width: 1100px; margin-left: auto; margin-right: auto; position: relative; z-index: 2; }
        .condition-pill { background: #FFFFFF; border: 1px solid rgba(0,0,0,0.06); border-radius: 16px; padding: 24px 16px; text-align: center; transition: all 0.2s; cursor: default; width: 140px; display: flex; flex-direction: column; align-items: center; box-shadow: 0 4px 14px rgba(0,0,0,0.03); }
        .condition-pill:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); border-color: rgba(11,110,79,0.15); }
        .condition-pill .cicon { width: 64px; height: 64px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; }
        .condition-pill .cicon img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .condition-pill .ctxt { font-family: 'Playfair Display', serif; font-size: 15px; color: var(--navy); font-weight: 700; line-height: 1.3; }

        .conditions-bg-leaf { position: absolute; opacity: 0.15; z-index: 0; pointer-events: none; }
        .conditions-bg-leaf.left { top: 0; left: 0; width: 200px; }
        .conditions-bg-leaf.right { top: 0; right: 0; width: 200px; transform: scaleX(-1); }
        .conditions-bg-leaf.bottom { bottom: 0; left: 50%; transform: translateX(-50%); width: 120px; opacity: 0.2; }

        /* Footer */
        .landing-footer {
          background: var(--navy);
          color: rgba(255,255,255,0.68); padding: clamp(48px, 8vw, 64px) clamp(20px, 5vw, 32px) 40px; border-top: 1px solid rgba(255,255,255,0.08);
        }
        .footer-email {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 13.5px; color: rgba(255, 255, 255, 0.8);
          text-decoration: none; margin-top: 14px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px; transition: all 0.2s;
        }
        .footer-email:hover { color: #fff; background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.25); }
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
        .footer-bottom { display: flex; align-items: center; justify-content: space-between; padding-top: 28px; flex-wrap: wrap; gap: 16px; border-top: 1px solid rgba(255,255,255,0.1); }
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
          .nav-links .nav-link { display: none; }
          .nav-links .nav-cta { display: none; }
          .nav-links .profile-menu-wrap { display: none; }
          .hamburger-btn { display: flex !important; margin-left: auto; }
          .clinician-logo-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 600px) {
          .hero-content { padding: 0; }
          .cta-actions { flex-direction: column; width: 100%; }
          .cta-actions > * { width: 100%; justify-content: center; }
          .footer-bottom { flex-direction: column; align-items: flex-start; }
          .footer-bottom p { text-align: left; }
          .vision-card { padding: 32px 24px; }
          .founder-profile-grid { margin: 40px auto; padding: 0; gap: 32px; }
          .founder-photo-card { min-height: 380px; }
          .founder-brand-card { padding: 28px 24px; }
          .founder-brand-card h3 { font-size: 24px; }
          .founder-title { font-size: 2.2rem; }
          .road-ahead-card { padding: 28px 24px; }
          .clinician-logo-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .footer-top { grid-template-columns: 1fr; gap: 32px; }
          .nav-links { gap: 12px; }
          .stats-bar-inner { grid-template-columns: 1fr 1fr; gap: 16px; }
          .stat-item { padding: 12px; }
          .stat-num { font-size: 24px; }
          .trust-proof-row { gap: 24px; }
          .conditions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .condition-pill { width: 100%; padding: 20px 12px; }
          .standard-card { flex-direction: column; padding: 24px; gap: 16px; }
          .approach-card { padding: 24px; }
        }

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
      `}</style>
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <Logo />
          <div className="nav-links">
            <Link to="/" className="nav-mid">Home</Link>

                        <a href="/#about" className="nav-mid" onClick={(e) => { e.preventDefault(); navigate("/#about"); }}>About Us</a>
            <Link to="/reviews" className="nav-mid">Real Reviews</Link>
            <Link to="/contact" className="nav-mid">Contact Us</Link>
            <a href="/privacy" target="_blank" rel="noopener" className="nav-link">Privacy Policy</a>
            {isAuthenticated ? (
              <div 
                className="profile-menu-wrap"
                onMouseEnter={() => setIsProfileMenuOpen(true)}
                onMouseLeave={() => setIsProfileMenuOpen(false)}
              >
                <button
                  className="profile-avatar"
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
                  <Link to="/login" className="nav-link" style={{ fontWeight: 600 }}>
                    Login / Sign Up
                  </Link>
                </div>
                <button onClick={() => setIsBookingModalOpen(true)} className="nav-cta">Book — ₹999</button>
              </>
            )}
            <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div className={`mobile-drawer-overlay${isMobileMenuOpen ? ' open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />
      <div className={`mobile-drawer${isMobileMenuOpen ? ' open' : ''}`}>
        <div className="mobile-drawer-header">
          <div className="fb-logo">Diet By <span>RD</span></div>
          <button className="mobile-drawer-close" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <div className="mobile-drawer-links">
          <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
          <a href="/#about" onClick={(e) => { e.preventDefault(); navigate("/#about"); setIsMobileMenuOpen(false); }}>About Us</a>
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
        <button className="mobile-drawer-cta" onClick={() => { setIsBookingModalOpen(true); setIsMobileMenuOpen(false); }}>
          Book Consultation — ₹999
        </button>
      </div>

      {/* Decorative Leaves (Top Left) */}
      <img 
        src="https://images.unsplash.com/photo-1620054813524-7eb3268cb320?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" 
        alt="" 
        className="absolute -top-10 -left-20 w-64 md:w-80 opacity-10 pointer-events-none mix-blend-multiply rounded-full" 
        onError={(e) => e.currentTarget.style.display = 'none'} 
      />
      {/* Decorative Leaves (Right) */}
      <img 
        src="https://images.unsplash.com/photo-1620054813524-7eb3268cb320?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" 
        alt="" 
        className="absolute top-1/3 -right-20 w-64 md:w-80 opacity-10 pointer-events-none mix-blend-multiply rounded-full" 
        onError={(e) => e.currentTarget.style.display = 'none'} 
      />

      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16 relative z-10">
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold tracking-[0.15em] text-[#427A5B] uppercase mb-4">
            We're here for you
          </p>
          <h1 className="text-5xl md:text-6xl text-[var(--navy)] tracking-tight mb-6" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            CONTACT US
          </h1>
          
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-[1px] w-16 bg-[#427A5B]/30"></div>
            <Leaf className="w-5 h-5 text-[#427A5B]" strokeWidth={1.5} />
            <div className="h-[1px] w-16 bg-[#427A5B]/30"></div>
          </div>

          <p className="text-[16px] md:text-[17px] font-bold text-[#427A5B] mb-12">
            Every health journey begins with a conversation.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-[14px] md:text-[15px] text-gray-700 leading-[1.8] font-medium max-w-4xl mx-auto text-center md:text-center mb-16 px-4 md:px-0 text-[15px] md:text-[16px]">
          <p>
            Whether you have a question about our services, need guidance before booking, or simply want clarity about your nutrition concerns, have any feedback or anything else, we are here to listen. No automated scripts, no rushed responses—just thoughtful support from a team that genuinely cares about your wellbeing.
          </p>
          <p>
            Because healthcare isn't built on transactions. It is built on trust, understanding, and the confidence that someone is willing to help when you need it most.
          </p>
          <p>
            Reach out to us, and we'll do our best to guide you in the right direction. Every message is received with the same respect, attention, and sincerity we would offer to a member of our own family.
          </p>
        </div>

        {/* Separator */}
        <div className="flex items-center justify-center gap-4 mb-10 max-w-[600px] mx-auto">
          <div className="h-[1px] flex-1 bg-gray-200"></div>
          <span className="text-[11px] font-bold tracking-[0.1em] text-[#427A5B] uppercase px-2">
            The best way to reach us
          </span>
          <div className="h-[1px] flex-1 bg-gray-200"></div>
        </div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12 max-w-[600px] mx-auto">
          <div className="bg-white border border-[#EBE7DF] rounded-2xl p-8 flex flex-col items-center text-center transition-all hover:shadow-sm hover:border-[#427A5B]/30">
            <div className="w-16 h-16 rounded-full bg-[#F3F4EE] flex items-center justify-center mb-6">
              <Mail className="w-7 h-7 text-[#427A5B]" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-[var(--navy)] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Email Us</h3>
            <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">
              Drop us a message anytime.<br />
              We aim to respond within 24 hours.
            </p>
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=hello@dietbyrd.com" target="_blank" rel="noopener noreferrer" className="text-[15px] font-bold text-[#427A5B] hover:opacity-80 transition-opacity mt-auto">
              hello@dietbyrd.com
            </a>
          </div>

          {/* Call / WhatsApp Us Block (Hidden until real phone number is provided) */}
          <div className="bg-white border border-[#EBE7DF] rounded-2xl p-8 flex flex-col items-center text-center transition-all hover:shadow-sm hover:border-[#427A5B]/30">
            <div className="w-16 h-16 rounded-full bg-[#F3F4EE] flex items-center justify-center mb-6">
              <Phone className="w-7 h-7 text-[#427A5B]" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-[var(--navy)] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Call / WhatsApp Us</h3>
            <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">
              Speak to our care team directly.<br />
              Mon – Sat | 10 AM – 7 PM
            </p>
            <a href="tel:+91XXXXXXXXXX" className="text-[15px] font-bold text-[#427A5B] hover:opacity-80 transition-opacity mt-auto">
              +91 XXXXX XXXXX
            </a>
          </div>
        </div>

        {/* Safe Hands Banner */}
        <div className="bg-[#FAF9F5] rounded-xl p-6 flex flex-col md:flex-row items-center justify-center gap-6 max-w-[600px] mx-auto border border-[#EBE7DF]/50">
          <div className="w-12 h-12 rounded-full border border-[#427A5B] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#427A5B]" strokeWidth={1.5} />
          </div>
          <div className="text-center md:text-left border-t md:border-t-0 md:border-l border-[#D6D2C4]/50 pt-4 md:pt-0 md:pl-6">
            <h4 className="font-bold text-[var(--navy)] text-[15px] mb-1">You're in safe hands.</h4>
            <p className="text-[13px] text-gray-600 leading-relaxed">
              Your privacy and trust mean everything to us.<br />
              Your information is never shared with anyone.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-[800px] mx-auto px-6 pt-16 pb-24 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl text-[var(--navy)] tracking-tight mb-4" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            Frequently Asked Questions
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="h-[1px] w-12 bg-[#427A5B]/30"></div>
            <Leaf className="w-4 h-4 text-[#427A5B]" strokeWidth={1.5} />
            <div className="h-[1px] w-12 bg-[#427A5B]/30"></div>
          </div>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem key={index} faq={faq} />
          ))}
        </div>
      </div>

      {/* Bottom Footer Banner */}
      <div className="border-t border-[#EBE7DF] bg-[#FDFCF8] py-10 relative z-10">
        <div className="max-w-3xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-6">
          <div className="w-12 h-12 rounded-full bg-[#F3F4EE] flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-[#427A5B]" strokeWidth={2} />
          </div>
          <div className="text-center md:text-left">
            <h4 className="font-bold text-[var(--navy)] text-[16px] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
              We're more than just a team. We're a family that cares.
            </h4>
            <p className="text-[14px] font-bold text-[#427A5B]">
              Thank you for trusting Diet By RD.
            </p>
          </div>
        </div>
      </div>
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="fb-logo">Diet By <span>RD</span></div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '-6px', marginBottom: '10px' }}>The Gold Standard Clinical Nutrition</div>
              <p>India's first clinical nutrition platform where every consultation is exclusively with a Registered Dietitian. Evidence-based. Affordable. Honest.</p>
              <a href="https://mail.google.com/mail/?view=cm&fs=1&to=hello@dietbyrd.com" target="_blank" rel="noopener noreferrer" className="footer-email">✉️ hello@dietbyrd.com</a>
              <div style={{ marginTop: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', width: 'max-content', maxWidth: '100%', textAlign: 'left' }}>
                Registered Office: DPT 808B F 79 &amp; 80, 8TH FLOOR DLF PRIME TOWER,<br />
                Okhla Industrial Estate, New Delhi, South Delhi- 110020, Delhi
              </div>
            </div>
            <div id="footer-platform" className="footer-col">
              <h5>Platform</h5>
              <a href="#" onClick={(e) => { e.preventDefault(); setIsBookingModalOpen(true); }}>Book Consultation</a>

                          </div>
            <div className="footer-col">
              <h5>Company</h5>
              <a href="#rd-section" onClick={(e) => { e.preventDefault(); navigate("/#rd-section"); }}>Why RD?</a>
              <Link to="/join">For Doctors</Link>
              <Link to="/join">Join as Dietitian</Link>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a></li>
                <li><a href="/terms" target="_blank" rel="noopener">Terms of Service</a></li>
                <li><a href="/refund" target="_blank" rel="noopener">Refund Policy</a></li>
                <li><a href="/cancellation" target="_blank" rel="noopener">Cancellation Policy</a></li>
                <li style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>CIN: U86909DL2026PTC466538</li>
                <li style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Udyam: UDYAM-DL-08-0127249</li>
              </ul>
            </div>
            <div id="contact" className="footer-col">
              <h5>Support</h5>
              <Link to="/contact">Contact / Support</Link>
              <a href="https://mail.google.com/mail/?view=cm&fs=1&to=hello@dietbyrd.com" target="_blank" rel="noopener noreferrer">hello@dietbyrd.com</a>
              <div style={{ fontSize: '13.5px', color: 'var(--text3)', marginBottom: '10px' }}>
                Grievance: <a href="https://mail.google.com/mail/?view=cm&fs=1&to=grievance@dietbyrd.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)' }}>grievance@dietbyrd.com</a>
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
              <a href="https://www.linkedin.com/company/dietbyrd/" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.color = '#fff')} onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                LinkedIn
              </a>
              <a href="https://x.com/DietByRD" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.color = '#fff')} onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Twitter
              </a>
              <a href="https://www.facebook.com/dietbyrd" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.color = '#fff')} onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </a>
              <div className="footer-badges">
                <span className="f-badge">DPDPA Compliant</span>
                <span className="f-badge">EUGDPR Aligned</span>
                <span className="f-badge">256-bit SSL</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
      <PublicBookingModal open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen} />
    </div>
  );
};

export default ContactUs;
