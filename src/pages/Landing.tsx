import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, getDashboardPath } from "@/contexts/AuthContext";

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

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const revealRefs = useRef<(HTMLElement | null)[]>([]);

  // Redirect authenticated users
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDashboardPath(user.role));
    }
  }, [isAuthenticated, user, navigate]);

  // Scroll effects
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection observer for reveal animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.12 }
    );

    revealRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  };

  const goToLogin = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      navigate('/login');
    }, 600);
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
          height: 100vh;
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
          scroll-behavior: smooth;
          scroll-padding-top: var(--header-height);
        }

        .landing-page * { box-sizing: border-box; margin: 0; padding: 0; }

        /* Page transition */
        .landing-page.transitioning {
          animation: slideUpOut 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes slideUpOut {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(-100%);
            opacity: 0;
          }
        }

        /* Navigation */
        .landing-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
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
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 72px;
        }
        .nav-logo {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          text-decoration: none;
          letter-spacing: -0.3px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nav-logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, var(--teal), var(--teal-m));
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        .nav-logo span { color: var(--gold); }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nav-links a {
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          padding: 8px 16px;
          border-radius: 8px;
        }
        .nav-links a:hover {
          color: #fff;
          background: rgba(255,255,255,0.08);
        }
        .nav-cta {
          background: linear-gradient(135deg, var(--teal), var(--teal-m)) !important;
          color: #fff !important;
          padding: 10px 24px;
          border-radius: 10px;
          transition: all 0.25s !important;
          cursor: pointer;
          border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          margin-left: 8px;
          box-shadow: 0 2px 12px rgba(11,110,79,0.3);
        }
        .nav-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(11,110,79,0.4) !important;
        }

        /* Hero */
        .hero {
          min-height: 100vh;
          background: var(--navy);
          display: flex;
          align-items: center;
          position: relative;
          overflow: hidden;
          scroll-snap-align: start;
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(11,110,79,0.18) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }
        .hero-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 120px 5% 80px;
          position: relative;
          z-index: 2;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(201,149,42,0.15);
          border: 1px solid rgba(201,149,42,0.3);
          border-radius: 100px;
          padding: 6px 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--gold);
          margin-bottom: 28px;
          letter-spacing: 0.02em;
        }
        .hero-badge::before { content: '★'; font-size: 11px; }
        .hero-h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.8rem, 5.5vw, 5rem);
          font-weight: 900;
          color: #fff;
          line-height: 1.08;
          letter-spacing: -0.03em;
          margin-bottom: 22px;
        }
        .hero-h1 em {
          font-style: italic;
          color: var(--gold);
        }
        .hero-sub {
          font-size: clamp(1rem, 1.8vw, 1.2rem);
          color: rgba(255,255,255,0.65);
          max-width: 580px;
          line-height: 1.75;
          margin-bottom: 40px;
          font-weight: 300;
        }
        .hero-sub strong {
          color: #fff;
          font-weight: 600;
        }
        .hero-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: var(--teal);
          color: #fff;
          padding: 16px 32px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          border: none;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-primary:hover {
          background: var(--teal-m);
          transform: translateY(-1px);
          box-shadow: 0 12px 30px rgba(11,110,79,0.35);
        }
        .btn-primary .price {
          background: rgba(255,255,255,0.2);
          padding: 3px 10px;
          border-radius: 5px;
          font-size: 14px;
          font-weight: 700;
        }
        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: rgba(255,255,255,0.7);
          font-size: 15px;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-ghost:hover { color: #fff; }
        .hero-stats {
          display: flex;
          gap: 40px;
          margin-top: 56px;
          padding-top: 40px;
          border-top: 1px solid rgba(255,255,255,0.1);
          flex-wrap: wrap;
        }
        .hero-stat .num {
          font-family: 'Playfair Display', serif;
          font-size: 2rem;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }
        .hero-stat .lbl {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          margin-top: 4px;
          font-weight: 400;
        }
        .hero-floating {
          position: absolute;
          right: 5%;
          top: 50%;
          transform: translateY(-50%);
          width: min(420px, 40vw);
          opacity: 0.9;
        }
        .hero-card {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 28px;
          backdrop-filter: blur(12px);
        }
        .hero-card-title {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 16px;
          font-weight: 500;
        }
        .hero-card-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .hero-card-item:last-child { border-bottom: none; }
        .hero-card-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--teal-m);
          flex-shrink: 0;
        }
        .hero-card-text {
          font-size: 14px;
          color: rgba(255,255,255,0.8);
          font-weight: 400;
        }

        /* Sections */
        .section {
          padding: 96px 5%;
          scroll-snap-align: center;
        }
        .section-inner {
          max-width: 1200px;
          margin: 0 auto;
        }
        .section-eyebrow {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--teal);
          margin-bottom: 12px;
        }
        .section-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -0.02em;
          color: var(--navy);
          margin-bottom: 16px;
        }
        .section-sub {
          font-size: 1.05rem;
          color: var(--text2);
          max-width: 600px;
          line-height: 1.75;
          font-weight: 300;
        }

        /* Reveal animations */
        .reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .reveal.revealed {
          opacity: 1;
          transform: none;
        }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }

        /* Compare section - WHITE */
        .rd-section {
          background: #fff;
          overflow: hidden;
          position: relative;
        }
        .rd-section .section-eyebrow {
          color: var(--teal);
        }
        .rd-section .section-title {
          color: var(--navy);
        }
        .rd-section .section-sub {
          color: var(--text2);
        }
        .compare-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          margin: 48px 0;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 30px rgba(0,0,0,0.08);
        }
        .compare-col {
          padding: 40px 36px;
        }
        .compare-col.rd-col {
          background: linear-gradient(135deg, #E8F5F0 0%, #D1F0E4 100%);
          border: 1px solid rgba(11,110,79,0.15);
        }
        .compare-col.nut-col {
          background: linear-gradient(135deg, #FFF5F5 0%, #FED7D7 100%);
          border: 1px solid rgba(197,48,48,0.12);
        }
        .compare-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }
        .compare-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .compare-icon.rd { background: rgba(11,110,79,0.2); }
        .compare-icon.nut { background: rgba(197,48,48,0.15); }
        .compare-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--navy);
        }
        .compare-subtitle {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .compare-subtitle.rd { color: var(--teal); }
        .compare-subtitle.nut { color: var(--red); }
        .compare-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .compare-list li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 14px;
          line-height: 1.6;
          color: var(--text);
        }
        .compare-list li .ci {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          margin-top: 1px;
        }
        .compare-list li .ci.ok { background: rgba(11,110,79,0.2); color: var(--teal); }
        .compare-list li .ci.no { background: rgba(197,48,48,0.15); color: var(--red); }
        .awareness-tag {
          background: linear-gradient(135deg, #FBF4E6 0%, #F5E6C8 100%);
          border: 1px solid rgba(201,149,42,0.25);
          border-radius: 12px;
          padding: 16px 28px;
          text-align: center;
          color: var(--text);
          font-size: 15px;
          line-height: 1.7;
          max-width: 600px;
          margin: 0 auto 36px;
        }
        .awareness-tag strong { color: var(--gold); }

        /* Approach section */
        .approach-section { 
          background: linear-gradient(180deg, var(--navy) 0%, #0d1f35 100%);
        }
        .approach-section .section-eyebrow {
          color: #5FCC99;
        }
        .approach-section .section-title {
          color: #fff;
        }
        .approach-section .section-sub {
          color: rgba(255,255,255,0.65);
        }
        .approach-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
          margin-top: 48px;
        }
        .approach-features {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .feature-item {
          display: flex;
          gap: 18px;
          align-items: flex-start;
        }
        .feature-icon {
          width: 48px;
          height: 48px;
          background: rgba(11,110,79,0.25);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
          border: 1px solid rgba(11,110,79,0.3);
        }
        .feature-text h4 {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 4px;
        }
        .feature-text p {
          font-size: 14px;
          color: rgba(255,255,255,0.65);
          line-height: 1.65;
        }

        /* Testimonial */
        .testimonial-card {
          background: rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 36px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          position: relative;
          overflow: hidden;
          transition: opacity 0.3s, transform 0.3s;
          backdrop-filter: blur(12px);
        }
        .testimonial-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--teal), var(--teal-m));
        }
        .testimonial-quote {
          font-size: 56px;
          font-family: 'Playfair Display', serif;
          color: #5FCC99;
          opacity: 0.4;
          line-height: 0.8;
          margin-bottom: 12px;
        }
        .testimonial-text {
          font-size: 16px;
          color: rgba(255,255,255,0.85);
          line-height: 1.8;
          margin-bottom: 20px;
          font-style: italic;
          font-weight: 300;
        }
        .testimonial-text strong {
          font-style: normal;
          font-weight: 600;
          color: #5FCC99;
        }
        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .testimonial-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--teal), var(--teal-m));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .testimonial-name {
          font-weight: 600;
          font-size: 15px;
          color: #fff;
        }
        .testimonial-detail {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          margin-top: 1px;
        }
        .testimonial-condition {
          display: inline-block;
          background: rgba(11,110,79,0.25);
          color: #5FCC99;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 100px;
          margin-top: 6px;
          letter-spacing: 0.03em;
        }
        .carousel-nav {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 16px;
        }
        .carousel-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.08);
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .carousel-btn:hover {
          background: var(--teal);
          color: #fff;
          border-color: var(--teal);
        }
        .carousel-dots {
          display: flex;
          gap: 8px;
          margin-top: 20px;
          justify-content: center;
        }
        .carousel-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.25);
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        .carousel-dot.active {
          background: var(--teal);
          width: 24px;
          border-radius: 4px;
        }

        /* Trust section - WHITE */
        .trust-section {
          background: #fff;
          position: relative;
          overflow: hidden;
        }
        .trust-inner { position: relative; z-index: 1; }
        .trust-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 700;
          color: var(--navy);
          text-align: center;
          margin-bottom: 12px;
        }
        .trust-sub {
          text-align: center;
          color: var(--text2);
          font-size: 1rem;
          margin-bottom: 56px;
          font-weight: 300;
        }
        .doctor-trust-banner {
          background: linear-gradient(135deg, #E8F5F0 0%, #D1F0E4 100%);
          border: 1px solid rgba(11,110,79,0.15);
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          margin-bottom: 56px;
        }
        .trust-quote-big {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.1rem, 2vw, 1.4rem);
          font-style: italic;
          color: var(--text);
          line-height: 1.6;
          max-width: 700px;
          margin: 0 auto 20px;
        }
        .trust-proof-row {
          display: flex;
          justify-content: center;
          gap: 40px;
          flex-wrap: wrap;
        }
        .trust-proof { text-align: center; }
        .trust-proof .tp-num {
          font-family: 'Playfair Display', serif;
          font-size: 2rem;
          font-weight: 700;
          color: var(--teal);
        }
        .trust-proof .tp-lbl {
          font-size: 12px;
          color: var(--text3);
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .conditions-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-bottom: 64px;
        }
        .condition-pill {
          background: #FAFAFA;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px 18px;
          text-align: center;
          transition: all 0.2s;
          cursor: default;
          min-width: 140px;
          flex: 0 1 160px;
        }
        .condition-pill:hover {
          background: var(--teal-l);
          border-color: rgba(11,110,79,0.3);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(11,110,79,0.1);
        }
        .condition-pill .cicon { font-size: 24px; margin-bottom: 7px; }
        .condition-pill .ctxt {
          font-size: 13px;
          color: var(--text);
          font-weight: 500;
          line-height: 1.3;
        }

        /* CTA section */
        .cta-section {
          background: linear-gradient(180deg, var(--navy) 0%, #081220 100%);
          text-align: center;
          padding: 100px 5%;
          scroll-snap-align: center;
        }
        .cta-inner {
          max-width: 700px;
          margin: 0 auto;
        }
        .cta-eyebrow {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #5FCC99;
          margin-bottom: 14px;
        }
        .cta-headline {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.8rem, 3.5vw, 2.8rem);
          font-weight: 900;
          color: #fff;
          line-height: 1.15;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }
        .cta-headline em {
          font-style: italic;
          color: #5FCC99;
        }
        .cta-body {
          font-size: 1rem;
          color: rgba(255,255,255,0.65);
          line-height: 1.75;
          margin-bottom: 36px;
          font-weight: 300;
        }
        .cta-body strong {
          color: #fff;
          font-weight: 600;
        }
        .cta-price-badge {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 100px;
          padding: 8px 8px 8px 20px;
          margin-bottom: 28px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.2);
        }
        .cta-price-badge .pb-text {
          font-size: 15px;
          color: rgba(255,255,255,0.7);
          font-weight: 400;
        }
        .cta-price-badge .pb-price {
          background: var(--teal);
          color: #fff;
          padding: 8px 16px;
          border-radius: 100px;
          font-weight: 700;
          font-size: 16px;
        }
        .cta-disclaimer {
          font-size: 12px;
          color: rgba(255,255,255,0.45);
          margin-top: 16px;
        }

        /* Footer */
        .landing-footer {
          background: var(--navy);
          color: rgba(255,255,255,0.6);
          padding: 60px 5% 36px;
          scroll-snap-align: center;
        }
        .footer-inner {
          max-width: 1200px;
          margin: 0 auto;
        }
        .footer-top {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 48px;
          padding-bottom: 40px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .footer-brand .fb-logo {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 10px;
        }
        .footer-brand .fb-logo span { color: var(--gold); }
        .footer-brand p {
          font-size: 13.5px;
          line-height: 1.8;
          color: rgba(255,255,255,0.5);
          font-weight: 300;
          max-width: 280px;
        }
        .footer-col h5 {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.85);
          margin-bottom: 16px;
        }
        .footer-col a {
          display: block;
          font-size: 13.5px;
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          margin-bottom: 10px;
          transition: color 0.2s;
        }
        .footer-col a:hover { color: #fff; }
        .footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .footer-bottom p {
          font-size: 13px;
          color: rgba(255,255,255,0.3);
        }
        .footer-badges {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .f-badge {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 500;
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.4);
          border: 1px solid rgba(255,255,255,0.08);
        }

        /* Responsive */
        @media (max-width: 900px) {
          .compare-grid, .approach-grid { grid-template-columns: 1fr; }
          .hero-floating { display: none; }
          .footer-top { grid-template-columns: 1fr 1fr; }
          .nav-links .nav-mid { display: none; }
        }
        @media (max-width: 600px) {
          .hero-content { padding: 110px 5% 60px; }
          .hero-stats { gap: 24px; }
          .footer-top { grid-template-columns: 1fr; }
          .nav-links { gap: 12px; }
          .section { padding: 64px 5%; }
        }
      `}</style>

      {/* Navigation */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <Link to="/" className="nav-logo">
            <div className="nav-logo-icon">🥗</div>
            Diet <span>By RD</span>
          </Link>
          <div className="nav-links">
            <a href="#rd-section" className="nav-mid">Why RD?</a>
            <a href="#approach" className="nav-mid">How It Works</a>
            <a href="#trust" className="nav-mid">Conditions</a>
            <button onClick={goToLogin} className="nav-cta">Get Started →</button>
          </div>
        </div>
      </nav>

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
            <button onClick={goToLogin} className="btn-primary">
              Book Your Consultation
              <span className="price">₹999</span>
            </button>
            <a href="#rd-section" className="btn-ghost">What is an RD? →</a>
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
              <div className="lbl">Per month. Cancel anytime.</div>
            </div>
            <div className="hero-stat">
              <div className="num">1:1</div>
              <div className="lbl">Personalised consultation</div>
            </div>
          </div>
        </div>
        <div className="hero-floating">
          <div ref={addToRefs} className="hero-card reveal reveal-delay-2">
            <div className="hero-card-title">Your RD handles</div>
            <div className="hero-card-item">
              <div className="hero-card-dot" />
              <div className="hero-card-text">Type 2 Diabetes management</div>
            </div>
            <div className="hero-card-item">
              <div className="hero-card-dot" />
              <div className="hero-card-text">PCOS & hormonal nutrition</div>
            </div>
            <div className="hero-card-item">
              <div className="hero-card-dot" />
              <div className="hero-card-text">Thyroid diet planning</div>
            </div>
            <div className="hero-card-item">
              <div className="hero-card-dot" />
              <div className="hero-card-text">Cultural food compatibility</div>
            </div>
            <div className="hero-card-item">
              <div className="hero-card-dot" />
              <div className="hero-card-text">Evidence-based, not trend-based</div>
            </div>
          </div>
        </div>
      </section>

      {/* RD vs Nutritionist */}
      <section id="rd-section" className="section rd-section">
        <div className="section-inner">
          <div style={{ textAlign: 'center' }}>
            <span ref={addToRefs} className="section-eyebrow reveal">
              The truth no one tells you
            </span>
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
                <li><span className="ci ok">✓</span><span>The title "RD" is <strong style={{ color: 'var(--navy)' }}>legally protected in India</strong> — only those who clear the RD exam may use it.</span></li>
                <li><span className="ci ok">✓</span><span>Holds a B.Sc. in Nutrition/Dietetics plus completed internship and cleared the IDA's RD examination.</span></li>
                <li><span className="ci ok">✓</span><span>Recognised as the <strong style={{ color: 'var(--navy)' }}>gold standard for clinical nutrition</strong> in India.</span></li>
                <li><span className="ci ok">✓</span><span>Complete, evidence-based knowledge of how the human body functions.</span></li>
                <li><span className="ci ok">✓</span><span>Trained to manage medical conditions — diabetes, PCOS, thyroid, hypertension.</span></li>
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
                <li><span className="ci no">✗</span><span>Can be anyone with an <strong style={{ color: 'var(--navy)' }}>unrelated degree + a 3–6 month certificate course</strong>.</span></li>
                <li><span className="ci no">✗</span><span>No single standardised qualification required anywhere in India.</span></li>
                <li><span className="ci no">✗</span><span>Could be a practitioner of <strong style={{ color: 'var(--navy)' }}>bro science, detox myths, fad diets</strong>.</span></li>
                <li><span className="ci no">✗</span><span>The title "Nutritionist" is <strong style={{ color: 'var(--navy)' }}>highly unregulated globally.</strong></span></li>
                <li><span className="ci no">✗</span><span>You may be paying for false promises, pseudoscience advice, and fearmongering.</span></li>
              </ul>
            </div>
          </div>

          <div ref={addToRefs} className="awareness-tag reveal reveal-delay-2">
            <strong>Most people don't know this. Now you do.</strong><br />
            Every consultation on Diet By RD is exclusively with a verified Registered Dietitian.
          </div>

          <div style={{ textAlign: 'center' }} ref={addToRefs} className="reveal reveal-delay-3">
            <button onClick={goToLogin} className="btn-primary">
              Book with a Registered Dietitian
              <span className="price">₹999</span>
            </button>
          </div>
        </div>
      </section>

      {/* Approach + Testimonial */}
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
                    <p>Clinical expertise at ₹999/month. The same standard of care hospitals charge ten times more for.</p>
                  </div>
                </div>
                <div ref={addToRefs} className="feature-item reveal reveal-delay-3">
                  <div className="feature-icon">📅</div>
                  <div className="feature-text">
                    <h4>Consistent, not one-and-done</h4>
                    <p>Monthly consultations with the same RD who knows your history.</p>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '36px' }} ref={addToRefs} className="reveal reveal-delay-3">
                <button onClick={goToLogin} className="btn-primary">
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
                  <button
                    key={i}
                    className={`carousel-dot ${i === currentTestimonial ? 'active' : ''}`}
                    onClick={() => setCurrentTestimonial(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust + Conditions */}
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
                <div className="tp-lbl">Per month subscription</div>
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

      {/* CTA */}
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
              <span className="pb-text">Monthly subscription</span>
              <span className="pb-price">₹999 / month</span>
            </div>
          </div>
          <button ref={addToRefs} onClick={goToLogin} className="btn-primary reveal reveal-delay-3" style={{ fontSize: '18px', padding: '18px 40px' }}>
            Book Your Consultation Now →
          </button>
          <p ref={addToRefs} className="cta-disclaimer reveal reveal-delay-3">Cancel anytime · No lock-in · 100% Registered Dietitians</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="fb-logo">Diet <span>By RD</span></div>
              <p>India's first clinical nutrition platform where every consultation is exclusively with a Registered Dietitian. Evidence-based. Affordable. Honest.</p>
            </div>
            <div className="footer-col">
              <h5>Platform</h5>
              <a href="#" onClick={(e) => { e.preventDefault(); goToLogin(); }}>Book Consultation</a>
              <a href="#approach">How It Works</a>
              <a href="#trust">Conditions</a>
            </div>
            <div className="footer-col">
              <h5>Company</h5>
              <a href="#rd-section">Why RD?</a>
              <a href="#">For Doctors</a>
              <a href="#">Careers</a>
            </div>
            <div className="footer-col">
              <h5>Legal</h5>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Contact</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 Diet By RD Private Limited · All rights reserved.</p>
            <div className="footer-badges">
              <span className="f-badge">DPDPA Compliant</span>
              <span className="f-badge">GDPR Aligned</span>
              <span className="f-badge">256-bit SSL</span>
              <span className="f-badge">IDA Verified RDs</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
