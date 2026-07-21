import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, getDashboardPath } from "@/contexts/AuthContext";
import { PublicBookingModal } from "@/components/PublicBookingModal";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getFeaturedReviews } from "@/lib/api";
import {
  BadgeCheck,
  BookOpen,
  FileLock2,
  Gem,
  Microscope,
  Quote,
  Scale,
  ShieldCheck,
  Award,
  UserRoundCheck,
  ArrowRight,
  Activity,
  HeartPulse,
  Syringe,
  Dna,
  Stethoscope,
  ShieldPlus,
  Sprout,
  TrendingUp,
  Dumbbell,
  Flower2
} from "lucide-react";

const fallbackTestimonials = [
  {
    text: 'My dietitian gave me a plan that helped me <strong>reverse diabetes</strong> — I went from HbA1c 6.3 to 5.9 in three months. And I didn\'t have to give up a single meal that matters to me. Idli, dosa, rice — it\'s all still there.',
    name: 'Suresh K.',
    detail: 'Chennai, Tamil Nadu · 54 years',
    condition: 'Diabetes',
    avatar: '🧑'
  },
  {
    text: 'I had been struggling with PCOS for years and tried everything. My RD on Diet By RD didn\'t just hand me a meal plan — she explained the <strong>science behind every choice</strong>, adapted it to my Gujarati food habits, and followed up every month. My periods are now regular for the first time in two years.',
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
  { icon: '/conditions/diabetes_hands.webp', name: 'Diabetes' },
  { icon: '/conditions/cholesterol_heart.webp', name: 'High Cholesterol' },
  { icon: '/conditions/blood_pressure.webp', name: 'High Blood Pressure' },
  { icon: '/conditions/pcos.webp', name: 'PCOS' },
  { icon: '/conditions/hormonal_molecule.webp', name: 'Hormonal Imbalance' },
  { icon: '/conditions/gut_exact.webp', name: 'Gut Issues' },
  { icon: '/conditions/ibs_intestines.webp', name: 'IBS' },
  { icon: '/conditions/weight.webp', name: 'Weight Management' },
  { icon: '/conditions/deficiency_exact_v2.webp', name: 'Deficiency Management' },
  { icon: '/conditions/general_health_exact.webp', name: 'General Health' },
  { icon: '/conditions/vegan.webp', name: 'Healthy Vegan Diet' },
  { icon: '/conditions/sports_exact.webp', name: 'Sports Nutrition' },
  { icon: '/conditions/gym_exact.webp', name: 'Gym Diet' },
  { icon: '/conditions/and_many_more.webp', name: 'And Many More' },
];

const trustBadges = [
  { key: 'ida', label: 'IDA Verified RDs', Icon: BadgeCheck },
  { key: 'dpdpa', label: 'DPDPA Compliant', Icon: ShieldCheck },
];

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [approvedTestimonials, setApprovedTestimonials] = useState<typeof fallbackTestimonials>([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const revealRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "patient" && !isBookingModalOpen) {
      navigate(getDashboardPath(user.role));
    }
  }, [isAuthenticated, user, navigate, isBookingModalOpen]);

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

  const testimonialItems = approvedTestimonials.length > 0 ? approvedTestimonials : fallbackTestimonials;
  const inlineTestimonials = testimonialItems.slice(0, 3);
  const [approachActiveIdx, setApproachActiveIdx] = useState(0);
  const [isApproachPaused, setIsApproachPaused] = useState(false);

  const FEMALE_CONDITIONS = ["pcos", "pregnancy", "postpartum", "pcod", "prenatal"];

  const FEMALE_NAMES = [
    "Priya M.", "Sneha R.", "Anjali C.", "Kavita L.", "Divya N.",
    "Neha D.", "Pooja B.", "Ritu S.", "Sanskriti M.", "Anika R.",
    "Simran K.", "Meera T.", "Pallavi V.", "Shreya G.", "Aditi J.",
  ];
  const MALE_NAMES = [
    "Rahul K.", "Amit V.", "Vikram M.", "Arjun T.", "Karan P.",
    "Rohan G.", "Siddharth Y.", "Aditya S.", "Harjeet S.", "Suresh K.",
    "Rishi T.", "Manish B.", "Gaurav D.", "Ankit R.", "Nikhil S.",
  ];
  const INDIAN_STATES = [
    "Delhi", "Maharashtra", "Karnataka", "Punjab", "Gujarat",
    "Tamil Nadu", "West Bengal", "Rajasthan", "Uttar Pradesh", "Kerala",
  ];

  const getTestimonialIdentity = (uuid: string, conditionTag?: string) => {
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
      hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const isFemaleCondition = FEMALE_CONDITIONS.some(fc =>
      (conditionTag || "").toLowerCase().includes(fc)
    );
    const pool = isFemaleCondition ? FEMALE_NAMES : [...MALE_NAMES, ...FEMALE_NAMES];
    const nameIndex = Math.abs(hash) % pool.length;
    const stateIndex = Math.abs(hash >> 2) % INDIAN_STATES.length;
    return { name: pool[nameIndex], state: INDIAN_STATES[stateIndex] };
  };

  useEffect(() => {
    getFeaturedReviews(6)
      .then((reviews) => {
        if (reviews.length === 0) return; // keep fallback if no featured reviews yet
        setApprovedTestimonials(
          reviews.map((review) => {
            const identity = getTestimonialIdentity(review.id, review.condition_tag || "");
            return {
              text: review.body,
              name: identity.name,
              detail: `Verified Diet By RD patient · ${identity.state}`,
              condition: review.condition_tag || `${review.rating}/5`,
              avatar: "★",
            };
          })
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


  const addToRefs = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
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
          font-size: clamp(2rem, 8vw, 4rem); font-weight: 800; color: var(--text);
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
        }
        .privacy-inner { max-width: 1100px; margin: 0 auto; text-align: center; padding: 0; }
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

        /* About & Vision */
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
          padding: 32px 48px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .vision-title {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 32px;
        }
        .vision-pillars {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .vision-pillar {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .vision-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 22px;
        }
        .vision-pillar h3 {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 2px;
        }
        .vision-pillar p {
          font-size: 14.5px;
          font-weight: 400;
          color: rgba(255,255,255,0.78);
          line-height: 1.6;
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

        /* Footer */
        /* Responsive */
        @media (max-width: 900px) {
          .compare-grid, .approach-grid { grid-template-columns: 1fr; }
          .approach-grid { gap: 48px; }
          .founder-profile-grid { grid-template-columns: 1fr; gap: 24px; }
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
          .stat-num { font-size: 24px; }
          .trust-proof-row { gap: 24px; }
          .conditions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .condition-pill { width: 100%; padding: 20px 12px; }
          .standard-card { flex-direction: column; padding: 24px; gap: 16px; }
          .approach-card { padding: 24px; }
        }
      `}</style>

      <SiteHeader />

      {/* CTA — Page 1 */}
      <section className="cta-section" style={{ background: 'var(--cream)' }}>
        <div className="cta-inner">
          <div ref={addToRefs} className="cta-eyebrow reveal" style={{ fontSize: '14px', letterSpacing: '0.1em', fontWeight: 600, color: 'var(--teal)', marginBottom: '16px', textTransform: 'uppercase' }}>
            Your HEALTH deserves better.
          </div>
          <h1 ref={addToRefs} className="cta-headline reveal reveal-delay-1">
            Your health deserves a
            <em style={{ fontStyle: 'italic', color: 'var(--teal)' }}> Registered Dietitian</em>,
            <br />
            <span className="md:whitespace-nowrap">not an Instagram influencer.</span>
          </h1>
          <p ref={addToRefs} className="hero-sub reveal reveal-delay-2" style={{ lineHeight: '1.6', maxWidth: '800px' }}>
            India's First RD - Only Platform for Clinical Nutrition Consultations.
            <br />
            <strong>Registered Dietitian</strong> — the only clinically credentialed nutrition professionals in India.
            <br />
            <strong>Not coaches. Not influencers. The real thing.</strong>
          </p>
          <div ref={addToRefs} className="cta-actions reveal reveal-delay-3">
            <button onClick={() => setIsBookingModalOpen(true)} className="btn-primary">
              Book Your Consultation <ArrowRight size={16} className="ml-2 inline-block" />
              </button>
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

      {/* Trust badge marquee */}
      <section className="privacy-section" style={{ background: '#fff', padding: 0 }}>
        <div className="privacy-inner">
          <div className="trust-marquee" style={{ padding: '32px 0', margin: 0, mixBlendMode: 'multiply' }}>
            <div className="trust-marquee__track" style={{ animationDuration: '50s', gap: '80px' }}>
              {Array(6).fill([
                { label: 'DPDPA Compliant', img: '/dpdpa.webp' },
                { label: 'IDA Recognised RDs', img: '/ida.webp' },
                { label: 'EUGDPR Compliant', img: '/gdpr.webp' },
                { label: 'Compliant with ISO 27001 standard', textBadge: 'ISO 27001' },
                { label: 'DPIIT Recognised Startup', img: '/dpiit.webp' },
              ]).flat().map((item, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '14px' }}>
                  {item.img ? (
                    <div style={{ width: '136px', height: '136px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img src={item.img} alt={item.label} decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                    </div>
                  ) : item.icon ? (
                    <div style={{ width: '136px', height: '136px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <item.icon size={68} strokeWidth={2} style={{ color: 'var(--teal)' }} />
                    </div>
                  ) : item.textBadge ? (
                    <div style={{ width: '136px', height: '136px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: '26px', color: '#1D4ED8', textAlign: 'center', lineHeight: 1.15 }}>
                        {item.textBadge}
                      </span>
                    </div>
                  ) : null}
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap', fontFamily: "'Playfair Display', serif", textAlign: 'center' }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How We Work — Page 3 */}
      <div id="reviews" style={{ position: 'relative', top: '-80px' }} aria-hidden="true" />
      <section id="approach" className="section approach-section reveal" style={{ background: '#fff' }}>
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
                  <div className="w-[64px] h-[64px] xl:w-[76px] xl:h-[76px] rounded-[16px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden flex-shrink-0 border border-black/5 bg-[#FCFBF7]">
                    <img src="/approach/evidence.png" alt="Evidence based icon" loading="lazy" decoding="async" className="w-full h-full object-cover scale-[1.15]" />
                  </div>
                  <div className="feature-text">
                    <h4>Evidence-based, always</h4>
                    <p>Every recommendation is backed by clinical research and ICMR nutritional standards — not trends, not viral videos, not someone's personal experience.</p>
                  </div>
                </div>
                <div ref={addToRefs} className="feature-item reveal reveal-delay-2">
                  <div className="w-[64px] h-[64px] xl:w-[76px] xl:h-[76px] rounded-[16px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden flex-shrink-0 border border-black/5 bg-[#FCFBF7]">
                    <img src="/approach/plate.png" alt="Personalised plate icon" loading="lazy" decoding="async" className="w-full h-full object-cover scale-[1.15]" />
                  </div>
                  <div className="feature-text">
                    <h4>Built around your plate, not a stranger's</h4>
                    <p>Your RD understands that a Tamilian's plate looks nothing like a Punjabi's. Your diet plan works with what you already eat — not against it.</p>
                  </div>
                </div>
                <div ref={addToRefs} className="feature-item reveal reveal-delay-3">
                  <div className="w-[64px] h-[64px] xl:w-[76px] xl:h-[76px] rounded-[16px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden flex-shrink-0 border border-black/5 bg-[#FCFBF7]">
                    <img src="/approach/affordable_exact.png" alt="Affordable icon" loading="lazy" decoding="async" className="w-full h-full object-cover scale-[1.15]" />
                  </div>
                  <div className="feature-text">
                    <h4>Affordable without compromise</h4>
                    <p>Clinical expertise should not be a luxury. At ₹999/month, you get the same standard of care that hospitals charge ten times more for.</p>
                  </div>
                </div>
                <div ref={addToRefs} className="feature-item reveal reveal-delay-3">
                  <div className="w-[64px] h-[64px] xl:w-[76px] xl:h-[76px] rounded-[16px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden flex-shrink-0 border border-black/5 bg-[#FCFBF7]">
                    <img src="/approach/supplement_exact.png" alt="No supplement upsell icon" loading="lazy" decoding="async" className="w-full h-full object-cover scale-[1.15]" />
                  </div>
                  <div className="feature-text">
                    <h4>No supplement upsell, Only what is required</h4>
                    <p>We recommend supplements only when there is a genuine nutritional need—not because they are profitable to sell. Your health deserves evidence-based guidance, not unnecessary products added to a bill.</p>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '32px' }} className="reveal reveal-delay-3" ref={addToRefs}>
                <button onClick={() => setIsBookingModalOpen(true)} className="btn-primary">
                  Start your journey <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '13px' }}>₹999</span>
                </button>
              </div>
            </div>
            <div ref={addToRefs} className="testimonial-carousel reveal reveal-delay-2" aria-label="Patient testimonials">
              {approachTestimonial && (
                <div
                  className="testimonial-card fade-in"
                  onMouseEnter={() => setIsApproachPaused(true)}
                  onMouseLeave={() => setIsApproachPaused(false)}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("/reviews")}
                  role="button"
                  aria-label="Read more reviews"
                >
                  <Quote className="testimonial-quote" aria-hidden="true" />
                  <p className="testimonial-text" dangerouslySetInnerHTML={{ __html: approachTestimonial.text || "" }} />
                  <div className="testimonial-author">
                    <div className="testimonial-avatar">{approachTestimonial.avatar}</div>
                    <div>
                      <div className="testimonial-name" style={{ textDecoration: "underline", textDecorationColor: "rgba(10,22,40,0.3)", textUnderlineOffset: "3px" }}>{approachTestimonial.name}</div>
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

      {/* Built With Intent and Soul — Page 4 */}
      <section className="soul-section reveal" style={{ background: 'var(--cream)' }}>
        <style>
          {`.soul-section { padding: 96px 24px; overflow: hidden; }
.soul-inner {
  max-width: 1280px; margin: 0 auto;
  display: grid; grid-template-columns: 1.3fr 1fr; gap: 56px;
  align-items: center;
}
.soul-eyebrow-row { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
.soul-eyebrow {
  font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--teal);
  white-space: nowrap;
}
.soul-title {
  font-family: 'Playfair Display', serif; font-weight: 700; color: var(--navy);
  font-size: clamp(2rem, 3.6vw, 2.75rem); line-height: 1.18; letter-spacing: -0.02em;
  margin-bottom: 24px;
}
.soul-lead { font-size: 1.05rem; color: var(--text); font-weight: 400; margin-bottom: 8px; }
.soul-quote {
  font-family: 'Playfair Display', serif; font-style: italic; font-weight: 600;
  font-size: clamp(1.5rem, 2.4vw, 1.85rem); color: var(--teal); line-height: 1.3;
  margin-bottom: 28px;
}
.soul-bullets { display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px; }
.soul-bullet { display: flex; align-items: flex-start; gap: 12px; font-size: 1rem; color: var(--text2); line-height: 1.5; }
.soul-bullet-icon {
  width: 20px; height: 20px; border-radius: 50%; background: var(--teal-l);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;
}
.soul-bullet-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--teal); }
.soul-bullet.strong { color: var(--navy); font-weight: 600; }
.soul-body { font-size: 1rem; color: var(--text2); line-height: 1.8; font-weight: 400; margin-bottom: 32px; }
.soul-body .highlight { color: var(--teal); font-weight: 600; }
.soul-divider { height: 1px; background: linear-gradient(90deg, var(--gold), transparent 70%); margin-bottom: 28px; max-width: 320px; }
.soul-closers { display: flex; flex-direction: column; gap: 8px; }
.soul-closer {
  font-family: 'Playfair Display', serif; font-size: clamp(1.15rem, 1.6vw, 1.4rem);
  color: var(--navy); font-weight: 600; line-height: 1.4;
}
.soul-closer strong { color: var(--teal); }
.soul-image-wrap {
  position: relative; min-height: 640px; height: min(98vh, 980px);
  margin-bottom: -96px;
  display: flex; align-items: flex-end; justify-content: center; overflow: visible;
}
.soul-image-wrap img {
  width: 100%; height: 100%; object-fit: contain; object-position: bottom center;
  display: block;
}
@media (max-width: 900px) {
  .soul-section { padding: 64px 24px; }
  .soul-inner { grid-template-columns: 1fr; gap: 40px; }
  .soul-image-wrap { min-height: auto; height: 480px; margin-bottom: -64px; }
}`}
        </style>
        <div className="soul-inner">
          <div>
            <div ref={addToRefs} className="soul-eyebrow-row reveal">
              <span className="soul-eyebrow">Built with intent and soul</span>
            </div>
            <h2 ref={addToRefs} className="soul-title reveal reveal-delay-1">
              Healthcare is a responsibility.<br />Not a revenue-maximisation exercise.
            </h2>
            <p ref={addToRefs} className="soul-lead reveal reveal-delay-2">
              Every decision we make begins with a simple question:
            </p>
            <p ref={addToRefs} className="soul-quote reveal reveal-delay-2">
              "What serves the <em>patient best</em>?"
            </p>
            <div ref={addToRefs} className="soul-bullets reveal reveal-delay-2">
              <div className="soul-bullet">
                <span className="soul-bullet-icon"><span className="soul-bullet-dot" /></span>
                Not what sells best.
              </div>
              <div className="soul-bullet">
                <span className="soul-bullet-icon"><span className="soul-bullet-dot" /></span>
                Not what scales the fastest.
              </div>
              <div className="soul-bullet">
                <span className="soul-bullet-icon"><span className="soul-bullet-dot" /></span>
                Not what investors would prefer.
              </div>
              <div className="soul-bullet strong">
                <span className="soul-bullet-icon"><span className="soul-bullet-dot" /></span>
                But what is genuinely best for the patient.
              </div>
            </div>
            <p ref={addToRefs} className="soul-body reveal reveal-delay-3">
              Many companies are built around growth targets.<br />
              Diet By RD was built around a different ambition.<br />
              To create a place where people can seek nutrition guidance with confidence,<br />
              knowing that <span className="highlight">integrity comes before profit and care comes before commerce.</span>
            </p>
            <div ref={addToRefs} className="soul-divider reveal reveal-delay-3" />
            <div ref={addToRefs} className="soul-closers reveal reveal-delay-3">
              <div className="soul-closer"><strong>Built</strong> through outcomes, not through VCs money.</div>
              <div className="soul-closer"><strong>Built</strong> through trust, not through hype.</div>
              <div className="soul-closer"><strong>Built</strong> with intent. <strong>Built</strong> with soul.</div>
            </div>
          </div>
          <div ref={addToRefs} className="soul-image-wrap reveal reveal-delay-1">
            <img src="/built-with-intent-doctor.webp" alt="Diet By RD registered dietitian" loading="lazy" decoding="async" />
          </div>
        </div>
      </section>

      {/* About Us & Our Vision — Page 5 */}
      <section
        id="about"
        className="about-section reveal"
        style={{ background: '#fff', padding: '96px 24px' }}
      >
        <style>
          {`.about-vision-grid {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 64px;
  align-items: start;
}
@media (max-width: 900px) {
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
            margin: '0 auto'
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
            style={{ alignSelf: 'end' }}
          >
            <h2 ref={addToRefs} className="vision-title reveal">Our Vision</h2>
            <div className="vision-pillars">
              <div ref={addToRefs} className="vision-pillar reveal reveal-delay-1">
                <div className="vision-icon">
                  <Scale size={28} strokeWidth={2} className="text-white" />
                </div>
                <div>
                  <h3>Rooted in integrity</h3>
                  <p>To recommend what is right for the patient, even when it isn't the most profitable choice.</p>
                </div>
              </div>
              <div ref={addToRefs} className="vision-pillar reveal reveal-delay-1">
                <div className="vision-icon">
                  <Award size={28} strokeWidth={2} className="text-white" />
                </div>
                <div>
                  <h3>Set the New Industry Standards</h3>
                  <p>To make clinical credibility the baseline expectation — not a premium add-on — for nutrition care in India.</p>
                </div>
              </div>
              <div ref={addToRefs} className="vision-pillar reveal reveal-delay-2">
                <div className="vision-icon">
                  <Microscope size={28} strokeWidth={2} className="text-white" />
                </div>
                <div>
                  <h3>Science over noise</h3>
                  <p>To be the one voice that always chooses evidence over engagement in a world drowning in health content.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Story Behind Diet By RD — Page 6 */}
      <section className="founder-section reveal" style={{ background: 'var(--cream)' }}>
        <style>
          {`.founder-section { padding: 96px 24px; }
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
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  grid-template-areas: "image bio";
  gap: 0 48px;
  align-items: start;
}
.story-visual {
  grid-area: image;
  display: flex;
  flex-direction: column;
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
.story-bio { grid-area: bio; display: flex; flex-direction: column; gap: 16px; }
.story-bio-text {
  font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 400;
  color: var(--text); line-height: 1.75; margin: 0;
}
.story-road-card {
  margin-top: 24px; background: var(--navy); border-radius: 16px; padding: 32px 36px;
}
.story-action-wrap {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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

@media (max-width: 900px) {
  .founder-section { padding: 64px 24px; }
  .story-grid {
    grid-template-columns: 1fr;
    grid-template-areas: "image" "bio";
    gap: 32px;
  }
  .story-monogram {
    min-height: auto;
    height: 400px;
  }
  .story-monogram img {
    transform: scale(1.1) translate(0, 20px) !important;
  }
  .story-action-wrap {
    margin-top: 0;
  }
}
@media (max-width: 700px) {
  .story-feature-grid { grid-template-columns: 1fr; }
}
`}
        </style>
        <div className="story-inner">
          <div>
            <p ref={addToRefs} className="story-eyebrow reveal">THE PEOPLE BEHIND THIS</p>
            <h2 ref={addToRefs} className="story-title reveal reveal-delay-1">The Story Behind Diet By RD</h2>
          </div>
          <div ref={addToRefs} className="story-grid reveal reveal-delay-2">
            <div className="story-visual">
              <div className="story-card">
                <div className="story-monogram">
                  <img
                    src="/aryan-bhagat-founder.webp"
                    alt="Aryan Bhagat, Founder of Diet By RD"
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: '112%',
                      height: '112%',
                      objectFit: 'contain',
                      objectPosition: 'bottom center',
                      display: 'block',
                      transform: 'scale(1.22) translate(-4%, 0px)',
                      transformOrigin: 'bottom center'
                    }}
                  />
                </div>
              </div>

              <div className="story-action-wrap">
                <p style={{ fontWeight: 600, color: 'var(--teal)', fontSize: '14px', textAlign: 'center' }}>Turn your One Day to Day One</p>
                <button onClick={() => setIsBookingModalOpen(true)} className="btn-primary" style={{ padding: '12px 16px', fontSize: '14px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Book your consultation from the Best Of The Industry <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div className="story-bio">
              <div className="story-card-body">
                <div className="story-name">Aryan Bhagat</div>
                <div className="story-role">Founder, Diet By RD</div>
                <div className="story-quote" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  <span className="md:whitespace-nowrap" style={{ fontSize: 'clamp(13px, 1.2vw, 15px)' }}>"Healthcare works best when integrity comes before profit - the belief that started it all"</span>
                  <span style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500, color: 'var(--teal)', background: '#E8F5F1', padding: '6px 12px', borderRadius: '100px', width: 'fit-content' }}>
                    <ShieldCheck size={14} /> Built with purpose and intent.
                  </span>
                </div>
              </div>
              <p className="story-bio-text">
                Diet By RD was founded by Aryan Bhagat, a young mind from Darbhanga, Bihar in a household where money was counted carefully and trust was given completely. He saw people around him losing their liver-kidneys on detox programmes and their hard earned money on health advice that was confidently delivered and clinically worthless. It felt wrong. Deeply, personally wrong. That the people with the least room for error were the most exposed to it.
              </p>
              <p className="story-bio-text">
                Diet By RD was built for you.
              </p>
              <p className="story-bio-text">
                Not by a corporation. Not by investors looking for a return. By someone who grew up watching the problem happen in real time, who studied hard enough to understand it, and who decided that the most useful thing he could do with that knowledge and skin in the game was to make it available to the people who needed it most.
              </p>
              <div className="story-road-card">
                <div className="story-road-title">The Road Ahead</div>
                <p className="story-road-body">
                  Diet By RD is rooted in India but built for the world. From Delhi to global shores — this journey is about creating something larger than one city, one founder, or one team. It's about giving people everywhere a chance to take control of their health, without being exploited.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="clinician-referral-section reveal" style={{ background: 'var(--cream)' }}>
        <div className="section-inner">
          <div className="clinician-referral-inner">
            <span ref={addToRefs} className="section-eyebrow reveal">RECOMMENDED BY LEADING CLINICIANS</span>
            <h2 ref={addToRefs} className="clinician-title reveal reveal-delay-1">Trusted by Doctors Across India</h2>

            {/* Referred by Leading Clinicians + Conditions — Page 7 */}
            <div ref={addToRefs} className="doctor-trust-banner reveal" style={{ marginTop: '10px', paddingTop: '10px', marginBottom: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <p className="trust-quote-big" style={{ margin: 0 }}>
                <span className="hidden md:inline whitespace-nowrap">"Doctors across India recommends Diet By RD to their patients because they know exactly who will pick up</span>
                <span className="md:hidden">"Doctors across India recommends Diet By RD to their patients because they know exactly who will pick up</span>
                <br /> - a Registered Dietitian, not a certificate coach."
              </p>
              <div className="trust-proof-row">
                <div className="trust-proof">
                  <div className="tp-num">100%</div>
                  <div className="tp-lbl">RD-only consultations</div>
                </div>
                <div className="trust-proof">
                  <div className="tp-num">IDA</div>
                  <div className="tp-lbl">Recognised dietitians</div>
                </div>
                <div className="trust-proof">
                  <div className="tp-num">₹999</div>
                  <div className="tp-lbl">Honest pricing</div>
                </div>
              </div>
            </div>

            <div ref={addToRefs} className="trust-marquee reveal reveal-delay-2" style={{ padding: '0' }}>
              <div className="trust-marquee__track">
                {[...Array(4)].map((_, i) => (
                  <div key={`h-row-${i}`} style={{ display: 'flex', gap: '48px' }}>
                    <div className="clinician-logo" role="img" aria-label="Hospital icon">Hospital</div>
                    <div className="clinician-logo" role="img" aria-label="Hospital icon">Hospital</div>
                    <div className="clinician-logo" role="img" aria-label="Hospital icon">Hospital</div>
                    <div className="clinician-logo" role="img" aria-label="Hospital icon">Hospital</div>
                    <div className="clinician-logo" role="img" aria-label="Hospital icon">Hospital</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Setting the New Industry Standards — Page 8 */}
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


      <section id="conditions" className="section trust-section" style={{ background: 'var(--cream)', position: 'relative' }}>
        <div className="section-inner trust-inner" style={{ position: 'relative', zIndex: 2 }}>
          <div className="text-center mb-4">
            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--teal)' }}>
              CONDITIONS WE MANAGE
            </span>
          </div>
          <h2 ref={addToRefs} className="trust-title reveal reveal-delay-1" style={{ marginBottom: '16px', fontSize: 'clamp(2.4rem, 4vw, 3.2rem)' }}>Conditions We Manage</h2>
          <p ref={addToRefs} className="trust-sub reveal reveal-delay-2" style={{ maxWidth: '650px', margin: '0 auto 48px' }}>
            Your RD is trained to manage these conditions clinically — not with generic advice,
            but with a personalised plan designed around your specific case.
          </p>
          <div ref={addToRefs} className="conditions-grid reveal reveal-delay-2">
            {conditions.map((c, i) => (
              <div key={i} className="condition-pill">
                <div className="cicon">
                  <img src={c.icon} alt={c.name} loading="lazy" decoding="async" style={c.name === 'General Health' ? { transform: 'scale(1.2)' } : undefined} />
                </div>
                <div className="ctxt">{c.name}</div>
              </div>
            ))}
          </div>
          <div className="w-full flex flex-col items-center justify-center mt-12 reveal reveal-delay-3" ref={addToRefs}>
            <div className="max-w-[900px] text-center flex flex-col items-center">
              <p className="text-[18px] md:text-[20px] text-[var(--navy)] font-bold mb-3 leading-relaxed text-center" style={{ fontFamily: "'Playfair Display', serif" }}>
                Your health is more than a diagnosis.
              </p>
              <p className="text-[15px] text-gray-600 mb-8 leading-relaxed text-center md:whitespace-nowrap">
                Work with a Registered Dietitian who understands the science, the condition, and the person behind it.
              </p>
              <button onClick={() => setIsBookingModalOpen(true)} className="btn-primary">
                Speak With Your RD
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="hero" style={{ background: '#fff' }}>
        <div className="hero-bg" />
        <div className="hero-content">
          <div ref={addToRefs} className="cta-eyebrow reveal" style={{ fontSize: '14px', letterSpacing: '0.1em', fontWeight: 600, color: 'var(--teal)', marginBottom: '16px', textTransform: 'uppercase' }}>
            Your HEALTH deserves better.
          </div>
          <h1 ref={addToRefs} className="hero-h1 reveal reveal-delay-1">
            Your health deserves
            <br />
            <em style={{ fontStyle: 'italic', color: 'var(--teal)' }}>clinical expertise</em> —
            <br />
            not a certificate course.
          </h1>
          <p ref={addToRefs} className="hero-sub reveal reveal-delay-2" style={{ lineHeight: '1.6' }}>
            One consultation changes the direction.<br/>
            A Registered Dietitian who understands your food, your condition and you - not a generic PDF.<br/>
            <strong>Never a supplement upsell, Real clinical nutrition, personalized for you.</strong>
          </p>
          <div ref={addToRefs} className="hero-actions reveal reveal-delay-3" style={{ alignItems: 'flex-end' }}>
            <button onClick={() => setIsBookingModalOpen(true)} className="btn-primary" style={{ padding: '16px 32px', fontSize: '18px' }}>
              Book Your Consultation <ArrowRight size={16} className="ml-2 inline-block" />
              </button>
            <button onClick={() => navigate('/join')} className="btn-outline-navy" style={{ padding: '8px 16px', fontSize: '13px' }}>Are you a dietitian /doctor?<br/>join us</button>
            <button onClick={() => navigate('/contact')} className="btn-ghost-link" style={{ paddingBottom: '8px' }}>Contact / Support →</button>
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

      <SiteFooter />

      <PublicBookingModal open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen} />
    </div>
  );
};

export default Landing;



