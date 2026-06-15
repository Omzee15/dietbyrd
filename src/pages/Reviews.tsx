import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Star, UserX, Lock, MessageCircle, Heart, Quote, Mail, ArrowLeft } from "lucide-react";
import { getApprovedReviews, getReviewEligibility, submitReview, getMyReview, updateMyReview } from "@/lib/api";
import { PublicBookingModal } from "@/components/PublicBookingModal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const reviewGuidelinePatterns = [
  /\b(fuck|shit|bitch|asshole|bastard|slut|whore)\b/i,
  /\b(kill|suicide|self[-\s]?harm|rape|molest)\b/i,
  /\b\d{10}\b/,
  /https?:\/\//i,
  /www\./i,
  /@[a-z0-9_.-]+\.[a-z]{2,}/i,
];

const violatesGuidelines = (value: string) =>
  reviewGuidelinePatterns.some((pattern) => pattern.test(value));


import { CalendarDays, UtensilsCrossed, User } from "lucide-react";

const patientNavItems = [
  { label: "My all bookings", href: "/patient/appointments", icon: CalendarDays },
  { label: "My diet charts", href: "/patient/diet-plans", icon: UtensilsCrossed },
  { label: "My blood reports", href: "/patient/profile#reports", icon: Heart },
  { label: "Help / Support", href: "/patient/support", icon: MessageCircle },
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
    <Link to="/" className="nav-logo" aria-label="Diet By RD Home">
      <span className="logo-text">
        {logoChars.map((char, index) => (
          <span key={index} className="logo-char" style={{ animationDelay: `${index * 0.05}s` }}>
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </span>
      <span className="logo-rd" style={{ animationDelay: `${logoChars.length * 0.05}s` }}>RD</span>
    </Link>
  );
};

const INDIAN_NAMES = ["Rahul S.", "Priya K.", "Amit V.", "Neha D.", "Vikram M.", "Sneha R.", "Arjun T.", "Pooja B.", "Karan P.", "Divya N.", "Rohan G.", "Anjali C.", "Siddharth Y.", "Kavita L.", "Aditya S."];
const INDIAN_STATES = ["Delhi", "Maharashtra", "Karnataka", "Punjab", "Gujarat", "Tamil Nadu", "West Bengal", "Rajasthan", "Uttar Pradesh", "Sikkim", "Kerala", "Haryana", "Telangana", "Madhya Pradesh", "Assam"];

const getAnonymousIdentity = (uuid) => {
  if (!uuid) return { name: "A Verified Patient", state: "India" };
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const nameIndex = Math.abs(hash) % INDIAN_NAMES.length;
  const stateIndex = Math.abs(hash >> 2) % INDIAN_STATES.length;
  return { name: INDIAN_NAMES[nameIndex], state: INDIAN_STATES[stateIndex] };
}

const formatReviewDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  const day = d.getDate();
  const suffix = ["th", "st", "nd", "rd"][day % 10 > 3 ? 0 : (day % 100 - day % 10 != 10) * day % 10] || "th";
  const formattedDate = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  return `${day}${suffix} ${formattedDate} ${time}`;
};
const Reviews = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [conditionTag, setConditionTag] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleProfileLogout = () => {
    // Add simple logout logic if needed, or import from useAuth
  };

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    if (window.location.pathname !== '/') {
      navigate('/#' + id);
    } else {
      const el = document.getElementById(id);
      if (el) {
        const offset = 80;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }
  };


  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["approved-reviews"],
    queryFn: () => getApprovedReviews(30, 0),
  });

  const { data: eligibility, isLoading: eligibilityLoading } = useQuery({
    queryKey: ["review-eligibility", user?.id],
    queryFn: getReviewEligibility,
    enabled: isAuthenticated && user?.role === "patient",
  });

  const { data: myReview } = useQuery({
    queryKey: ["my-review", user?.id],
    queryFn: getMyReview,
    enabled: !!eligibility?.has_reviewed && isEditing,
  });

  useEffect(() => {
    if (myReview && isEditing) {
      setRating(myReview.rating);
      setBody(myReview.body);
      setConditionTag(myReview.condition_tag || "");
    }
  }, [myReview, isEditing]);

  const guidelineError = useMemo(() => {
    if (!body.trim()) return "";
    if (body.trim().length < 20) return "Write at least 20 characters.";
    if (violatesGuidelines(body)) {
      return "Remove personal contact details, links, abusive words, or unsafe content.";
    }
    return "";
  }, [body]);

  const submitMutation = useMutation({
    mutationFn: () => {
      const payload = {
        rating,
        body: body.trim(),
        condition_tag: conditionTag.trim() || undefined,
      };
      return isEditing ? updateMyReview(payload) : submitReview(payload);
    },
    onSuccess: () => {
      toast.success(isEditing ? "Review updated and submitted for approval" : "Review submitted for approval");
      setBody("");
      setConditionTag("");
      setRating(5);
      if (isEditing) setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["approved-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["review-eligibility", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-review", user?.id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || (isEditing ? "Could not update review" : "Could not submit review"));
    },
  });

  const canSubmit =
    user?.role === "patient" &&
    (eligibility?.eligible || isEditing) &&
    !guidelineError &&
    body.trim().length >= 20 &&
    !submitMutation.isPending;

  return (
    <div className="min-h-screen bg-[#FDFCF8] relative" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Background elements */}
      <img src="https://images.unsplash.com/photo-1620054813524-7eb3268cb320?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="" className="absolute top-0 left-0 w-64 md:w-96 opacity-10 pointer-events-none mix-blend-multiply rounded-full" onError={(e) => e.currentTarget.style.display = 'none'} />
      <img src="https://images.unsplash.com/photo-1620054813524-7eb3268cb320?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="" className="absolute top-[40%] right-0 w-64 md:w-96 opacity-10 pointer-events-none mix-blend-multiply rounded-full" onError={(e) => e.currentTarget.style.display = 'none'} />

      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 pt-8 relative z-10">
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
        .approach-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; margin-top: 48px; }
        @media (min-width: 901px) {
          .testimonial-carousel { transform: translateY(-40px); }
        }
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
        .testimonial-text { font-family: 'DM Sans', sans-serif; font-size: 15px; font-style: italic; color: var(--text); line-height: 1.6; margin: 0 0 24px; font-weight: 400; }
        .testimonial-text strong, .testimonial-text b { font-weight: 600; color: var(--teal); }
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
        .hero-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(11,110,79,0.08);
          border: 1px solid rgba(11,110,79,0.15);
          color: var(--teal);
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 600;
          margin: 0 auto 24px auto;
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
<nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <Logo />
          <div className="nav-links">
            <Link to="/" className="nav-mid">Home</Link>

                        <a href="#about" className="nav-mid" onClick={scrollTo('about')}>About Us</a>
            <Link to="/reviews" className="nav-mid">Real Reviews</Link>
            <Link to="/contact" className="nav-mid">Contact Us</Link>
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
                  <Link to="/login" className="nav-link" style={{ fontWeight: 600 }}>
                    Login / Sign Up
                  </Link>
                </div>
                <button onClick={() => setIsBookingModalOpen(true)} className="nav-cta">Book — ₹999</button>
              </>
            )}
          </div>
        </div>
      </nav>

        <div className="text-center mb-16 max-w-4xl mx-auto">
          <p className="text-[11px] font-bold tracking-[0.15em] text-[#427A5B] uppercase mb-4">
            Real People. Real Stories. Real Impact.
          </p>
          <h1 className="text-4xl md:text-[56px] text-[var(--navy)] tracking-tight mb-4 leading-tight" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            100% Real Reviews<br className="hidden md:block" /> from Real People.
          </h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#427A5B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
          </div>
          <p className="text-[16px] font-medium text-gray-700">
            Because your health journey deserves honesty you can trust.
          </p>
        </div>

        {/* 5 Value Props */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-5xl mx-auto mb-20">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border border-[#EBE7DF] flex items-center justify-center mb-4 bg-white shadow-sm">
              <ShieldCheck className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
            </div>
            <h4 className="text-[11px] font-bold text-[var(--navy)] mb-2 uppercase tracking-wide">Real & Verified</h4>
            <p className="text-[12px] text-gray-500 leading-relaxed max-w-[140px]">
              Only verified patients who purchased and took a consultation can leave a review.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border border-[#EBE7DF] flex items-center justify-center mb-4 bg-white shadow-sm">
              <UserX className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
            </div>
            <h4 className="text-[11px] font-bold text-[var(--navy)] mb-2 uppercase tracking-wide">No Bots. No Fakes.</h4>
            <p className="text-[12px] text-gray-500 leading-relaxed max-w-[140px]">
              No self-written or incentivised reviews. Just real experiences from real people.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border border-[#EBE7DF] flex items-center justify-center mb-4 bg-white shadow-sm">
              <Lock className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
            </div>
            <h4 className="text-[11px] font-bold text-[var(--navy)] mb-2 uppercase tracking-wide">Anonymous & Private</h4>
            <p className="text-[12px] text-gray-500 leading-relaxed max-w-[140px]">
              We keep you anonymous by changing your name on your posted review to protect your privacy and comfort.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border border-[#EBE7DF] flex items-center justify-center mb-4 bg-white shadow-sm">
              <Heart className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
            </div>
            <h4 className="text-[11px] font-bold text-[var(--navy)] mb-2 uppercase tracking-wide">No Judgement</h4>
            <p className="text-[12px] text-gray-500 leading-relaxed max-w-[140px]">
              Nobody judges nobody. This is a safe space for honest sharing.
            </p>
          </div>
          <div className="flex flex-col items-center text-center col-span-2 md:col-span-1">
            <div className="w-12 h-12 rounded-full border border-[#EBE7DF] flex items-center justify-center mb-4 bg-white shadow-sm">
              <MessageCircle className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
            </div>
            <h4 className="text-[11px] font-bold text-[var(--navy)] mb-2 uppercase tracking-wide">One Review Per User</h4>
            <p className="text-[12px] text-gray-500 leading-relaxed max-w-[140px]">
              Each user is allowed to post only one review. Always fair. Always real.
            </p>
          </div>
        </div>

        {/* Why real reviews matter */}
        <div className="max-w-3xl mx-auto bg-[#F5F4EE] border border-[#EBE7DF] rounded-2xl p-8 md:p-10 flex gap-6 items-start mb-20 relative">
          <Quote className="w-16 h-16 text-[#EAEBE4] shrink-0 absolute -top-6 right-8 rotate-180" />
          <div className="relative z-10">
            <h3 className="text-[15px] font-bold text-[var(--navy)] mb-2">Why real reviews matter?</h3>
            <p className="text-[14px] text-gray-600 leading-relaxed">
              Before buying anything online, we all look for reviews. They shape our decisions. At Diet By RD, we believe in transparency, honesty and real human experiences.
            </p>
          </div>
        </div>

        {/* Share Your Experience Form */}
        <div className="max-w-[700px] mx-auto bg-white border border-[#EBE7DF] rounded-3xl p-8 md:p-12 mb-32 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="text-center mb-8">
            <h2 className="text-3xl text-[var(--navy)] mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
              Share Your Experience
            </h2>
            <p className="text-[14px] text-gray-500">
              Your experience can help someone take the first step towards better health.
            </p>
          </div>

          <div className="bg-[#FAF9F5] border border-[#EAEBE4] rounded-xl p-4 flex items-center gap-3 mb-10">
            <ShieldCheck className="w-5 h-5 text-[#427A5B] shrink-0" strokeWidth={1.5} />
            <p className="text-[13px] text-gray-600 font-medium">
              Only verified patients who have purchased and taken a consultation can post a review.
            </p>
          </div>

          {!isAuthenticated || user?.role !== "patient" ? (
            <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-600 mb-4">Please log in as a patient to submit a review.</p>
              <button onClick={() => navigate('/login')} className="px-6 py-2.5 bg-[var(--navy)] hover:opacity-90 text-white rounded-lg text-sm font-medium transition-opacity">
                Log In as Patient
              </button>
            </div>
          ) : eligibilityLoading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking eligibility...
            </div>
          ) : (!eligibility?.eligible && !isEditing) ? (
            <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-600 font-medium mb-3">
                {eligibility?.reason || "Only paid patients can submit a review."}
              </p>
              {eligibility?.has_reviewed && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-[#427A5B] hover:text-[#346148] underline transition-colors focus:outline-none"
                >
                  Click here to view and edit your review
                </button>
              )}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmit) submitMutation.mutate();
              }}
            >
              <div className="mb-8">
                <label className="block text-[13px] font-bold text-[var(--navy)] mb-3 uppercase tracking-wide">
                  How would you rate your experience?
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`w-8 h-8 ${value <= rating ? "fill-[#427A5B] text-[#427A5B]" : "text-gray-200"}`} 
                        strokeWidth={1}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-[13px] font-bold text-[var(--navy)] mb-3 uppercase tracking-wide">
                  Your Review
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 2000))}
                  rows={5}
                  placeholder="Share your honest experience..."
                  className="w-full bg-[#FDFCF8] border border-[#EBE7DF] rounded-xl p-4 text-[15px] focus:outline-none focus:border-[#427A5B] focus:ring-1 focus:ring-[#427A5B] transition-all resize-none"
                />
                <div className="flex justify-between items-center mt-2 px-1">
                  <span className="text-[12px] text-gray-400">Minimum 20 characters</span>
                  <span className="text-[12px] text-gray-400">{body.length}/2000</span>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-[13px] font-bold text-[var(--navy)] mb-3 uppercase tracking-wide">
                  Condition Treated (Optional)
                </label>
                <input
                  type="text"
                  value={conditionTag}
                  onChange={(e) => setConditionTag(e.target.value.slice(0, 40))}
                  placeholder="e.g. Weight Management, PCOS"
                  className="w-full bg-[#FDFCF8] border border-[#EBE7DF] rounded-xl p-4 text-[15px] focus:outline-none focus:border-[#427A5B] focus:ring-1 focus:ring-[#427A5B] transition-all"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#427A5B]" />
                  <span className="text-[12px] text-gray-500 font-medium">
                    Your identity will always remain anonymous.
                  </span>
                </div>
                
                <div className="w-full sm:w-auto text-center sm:text-right">
                  {guidelineError && body.length >= 20 && (
                    <p className="text-red-500 text-[12px] mb-2 max-w-xs text-left sm:text-right">
                      {guidelineError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#427A5B] hover:bg-[#346148] text-white rounded-lg font-bold text-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                  >
                    {submitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit Your Review
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Reviews List */}
        <div className="text-center mb-16">
          <p className="text-[11px] font-bold tracking-[0.15em] text-[#427A5B] uppercase mb-4">
            VOICES THAT INSPIRE
          </p>
          <h2 className="text-4xl text-[var(--navy)] mb-4" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            Real Stories. Real Results.
          </h2>
          <p className="text-[15px] text-gray-600 max-w-2xl mx-auto">
            Anonymous reviews from real patients who chose better health with Diet By RD.
          </p>
        </div>

        {reviewsLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#427A5B]" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20 text-gray-500 bg-white border border-[#EBE7DF] rounded-2xl max-w-2xl mx-auto">
            No approved reviews yet.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-32 max-w-7xl mx-auto">
            {reviews.map((review) => {
              const identity = getAnonymousIdentity(review.id);
              return (
              <div key={review.id} className="bg-white border border-[#EBE7DF] rounded-2xl p-8 flex flex-col shadow-sm">
                <div className="flex justify-center gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star 
                      key={value} 
                      className={`w-4 h-4 ${value <= review.rating ? "fill-[#427A5B] text-[#427A5B]" : "text-gray-200"}`} 
                    />
                  ))}
                </div>
                
                <div className="relative mb-8 text-center px-4 flex-1">
                  <Quote className="w-6 h-6 text-[#EAEBE4] absolute -top-2 left-0 rotate-180" />
                  <Quote className="w-6 h-6 text-[#EAEBE4] absolute -bottom-2 right-0" />
                  <p className="text-[14px] text-gray-700 leading-relaxed font-medium italic relative z-10">
                    "{review.body}"
                  </p>
                </div>
                
                <div className="text-center mb-6">
                  <p className="text-[12px] font-bold text-[var(--navy)] uppercase tracking-wide">
                    — {identity.name}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">
                    {formatReviewDate(review.created_at)} 📍 {identity.state}
                  </p>
                </div>

                {review.condition_tag && (
                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#FAF9F5] flex items-center justify-center shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#427A5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Consultation taken for</p>
                      <p className="text-[12px] font-bold text-gray-700">{review.condition_tag}</p>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="fb-logo">Diet <span>By RD</span></div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '-6px', marginBottom: '10px' }}>The Gold Standard Clinical Nutrition</div>
              <p>India's first clinical nutrition platform where every consultation is exclusively with a Registered Dietitian. Evidence-based. Affordable. Honest.</p>
              <a href="https://mail.google.com/mail/?view=cm&fs=1&to=hello@dietbyrd.com" target="_blank" rel="noopener noreferrer" className="footer-email">✉️ hello@dietbyrd.com</a>
            </div>
            <div id="footer-platform" className="footer-col">
              <h5>Platform</h5>
              <a href="#" onClick={(e) => { e.preventDefault(); setIsBookingModalOpen(true); }}>Book Consultation</a>

                          </div>
            <div className="footer-col">
              <h5>Company</h5>
              <a href="#rd-section" onClick={scrollTo('rd-section')}>Why RD?</a>
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
              </ul>
            </div>
            <div id="contact" className="footer-col">
              <h5>Legal & Support</h5>
              <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>
              <a href="/terms" target="_blank" rel="noopener">Terms of Service</a>
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
              <div className="footer-badges">
                <span className="f-badge">DPDPA Compliant</span>
                <span className="f-badge">EUGDPR Aligned</span>
                <span className="f-badge">256-bit SSL</span>
                <span className="f-badge">IDA Verified RDs</span>
              </div>
            </div>
          </div>
        </div>
      </footer>      <PublicBookingModal open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen} />    </div>
  );
};

export default Reviews;

