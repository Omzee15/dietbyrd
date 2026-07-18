import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Star, UserX, Lock, MessageCircle, Heart, Quote, Mail, ArrowLeft, ArrowRight, Leaf } from "lucide-react";
import { getApprovedReviews, getReviewEligibility, submitReview, getMyReview, updateMyReview } from "@/lib/api";
import { PublicBookingModal } from "@/components/PublicBookingModal";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
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

// Female-only conditions — never assign male names to these
const FEMALE_CONDITIONS = ["pcos", "pcod", "pregnancy", "postpartum", "prenatal", "maternity"];

const FEMALE_NAMES = [
  "Priya M.", "Sneha R.", "Anjali C.", "Kavita L.", "Divya N.",
  "Neha D.", "Pooja B.", "Ritu S.", "Sanskriti M.", "Anika R.",
  "Simran K.", "Meera T.", "Pallavi V.", "Shreya G.", "Aditi J.",
  "Radhika P.", "Swati B.", "Nisha K.", "Preeti V.", "Mansi S.",
];

const MALE_NAMES = [
  "Rahul K.", "Amit V.", "Vikram M.", "Arjun T.", "Karan P.",
  "Rohan G.", "Siddharth Y.", "Aditya S.", "Harjeet S.", "Suresh K.",
  "Rishi T.", "Manish B.", "Gaurav D.", "Ankit R.", "Nikhil S.",
  "Deepak J.", "Sachin M.", "Pavan K.", "Tarun B.", "Abhishek N.",
];

const INDIAN_STATES = ["Delhi", "Maharashtra", "Karnataka", "Punjab", "Gujarat", "Tamil Nadu", "West Bengal", "Rajasthan", "Uttar Pradesh", "Kerala", "Haryana", "Telangana", "Madhya Pradesh", "Assam", "Sikkim"];

const getAnonymousIdentity = (uuid, conditionTag = "") => {
  if (!uuid) return { name: "Priya M.", state: "India" };
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const isFemaleCondition = FEMALE_CONDITIONS.some(fc =>
    conditionTag.toLowerCase().includes(fc)
  );
  const pool = isFemaleCondition ? FEMALE_NAMES : [...MALE_NAMES, ...FEMALE_NAMES];
  const nameIndex = Math.abs(hash) % pool.length;
  const stateIndex = Math.abs(hash >> 2) % INDIAN_STATES.length;
  return { name: pool[nameIndex], state: INDIAN_STATES[stateIndex] };
}

const formatReviewDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  const day = d.getDate();
  const suffix = ["th", "st", "nd", "rd"][day % 10 > 3 ? 0 : Number(day % 100 - day % 10 != 10) * day % 10] || "th";
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
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

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

        /* Hero */
        .hero {
          min-height: auto; background: transparent;
          display: flex; align-items: center;
          padding: clamp(48px, 8vw, 96px) clamp(20px, 5vw, 32px);
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
        .btn-outline-navy:hover { opacity: 0.8; }
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
          padding: clamp(48px, 8vw, 96px) clamp(20px, 5vw, 32px); overflow: hidden; position: relative;
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
          background: var(--teal-l); padding: clamp(48px, 8vw, 96px) clamp(20px, 5vw, 32px);
          border-bottom: 1px solid rgba(11,110,79,0.1);
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
          padding: clamp(48px, 8vw, 96px) clamp(20px, 5vw, 32px);
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

        /* Responsive */
        @media (max-width: 900px) {
          .compare-grid, .approach-grid { grid-template-columns: 1fr; }
          .approach-grid { gap: 48px; }
          .founder-profile-grid { grid-template-columns: 1fr; gap: 24px; }
          .stats-bar-inner { grid-template-columns: 1fr 1fr; }
          .clinician-logo-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 600px) {
          .hero-content { padding: 0; }
          .cta-actions { flex-direction: column; width: 100%; }
          .cta-actions > * { width: 100%; justify-content: center; }
          .vision-card { padding: 32px 24px; }
          .founder-profile-grid { margin: 40px auto; padding: 0; gap: 32px; }
          .founder-photo-card { min-height: 380px; }
          .founder-brand-card { padding: 28px 24px; }
          .founder-brand-card h3 { font-size: 24px; }
          .founder-title { font-size: 2.2rem; }
          .road-ahead-card { padding: 28px 24px; }
          .clinician-logo-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .stats-bar-inner { grid-template-columns: 1fr 1fr; gap: 16px; }
          .stat-item { padding: 12px; }
          .stat-num { font-size: 24px; }
          .trust-proof-row { gap: 24px; }
          .conditions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .condition-pill { width: 100%; padding: 20px 12px; }
          .standard-card { flex-direction: column; padding: 24px; gap: 16px; }
          .approach-card { padding: 24px; }
        }
      `}</style>

      <SiteHeader />
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
              {!eligibility?.has_reviewed && (
                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-[var(--navy)] border border-[#EBE7DF] rounded-xl text-[14px] font-bold transition-all shadow-sm w-full sm:w-auto"
                >
                  Experience Diet By RD to become eligible to post an honest review
                  <ArrowRight className="w-4 h-4 text-[#427A5B]" />
                </button>
              )}
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
              const identity = getAnonymousIdentity(review.id, review.condition_tag || "");
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

      <SiteFooter />

      <PublicBookingModal open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen} />
    </div>
  );
};

export default Reviews;

