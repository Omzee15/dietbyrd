import React, { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Heart } from "lucide-react";
import { Mail, Phone, ShieldCheck, ChevronDown, Leaf } from "lucide-react";

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

const FAQItem = ({ faq, isOpen, onToggle }: { faq: typeof faqs[0]; isOpen: boolean; onToggle: () => void }) => {
  return (
    <div className={`bg-white border transition-colors duration-300 rounded-xl overflow-hidden shadow-sm ${isOpen ? 'border-[#427A5B]/30' : 'border-[#EBE7DF]'}`}>
      <button
        onClick={onToggle}
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
        onClick={isOpen ? onToggle : undefined}
        className={`px-6 text-[15px] text-gray-700 leading-[1.8] overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'pb-6 max-h-[1200px] opacity-100 mt-2 cursor-pointer' : 'max-h-0 opacity-0'}`}
      >
        {faq.answer}
      </div>
    </div>
  );
};


const ContactUs = () => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

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
        .section { padding: clamp(48px, 8vw, 96px) clamp(20px, 5vw, 32px); }
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

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16 relative z-10">
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold tracking-[0.15em] text-[#427A5B] uppercase mb-4">
            We're here for you
          </p>
          <h1 className="text-5xl md:text-6xl text-[var(--navy)] tracking-tight mb-6" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            CONTACT US
          </h1>

          <p className="text-[16px] md:text-[17px] font-bold text-[#427A5B] mb-12">
            Every health journey begins with a conversation.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-[15px] md:text-[16px] text-gray-700 leading-[1.8] font-medium max-w-7xl mx-auto text-center mb-16 px-4 md:px-0">
          <p>
            Whether you have a question about our services, need guidance before booking, or simply want clarity about your nutrition concerns, have any feedback or anything else, we are here to listen. No automated scripts, no rushed responses—just thoughtful support from a team that genuinely cares about your wellbeing.
          </p>
          <p>
            Because healthcare isn't built on transactions. It is built on trust, understanding, and the confidence that someone is willing to help when you need it most.
          </p>
          <p>
            Reach out to us, and we'll do our best to guide you in the right direction.<br />
            Every message is received with the same respect, attention, and sincerity we would offer to a member of our own family.
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
        <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-[820px] mx-auto">
          <div className="bg-white border border-[#EBE7DF] rounded-2xl p-10 flex flex-col items-center text-center transition-all hover:shadow-sm hover:border-[#427A5B]/30">
            <div className="w-20 h-20 rounded-full bg-[#F3F4EE] flex items-center justify-center mb-6">
              <Mail className="w-8 h-8 text-[#427A5B]" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-bold text-[var(--navy)] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Email Us</h3>
            <p className="text-[14px] text-gray-500 mb-6 leading-relaxed">
              Drop us a message anytime.<br />
              We aim to respond within 24 hours.
            </p>
            <a href="mailto:hello@dietbyrd.com" className="text-[16px] font-bold text-[#427A5B] hover:opacity-80 transition-opacity mt-auto">
              hello@dietbyrd.com
            </a>
          </div>

          {/* Call / WhatsApp Us Block (Hidden until real phone number is provided) */}
          <div className="bg-white border border-[#EBE7DF] rounded-2xl p-10 flex flex-col items-center text-center transition-all hover:shadow-sm hover:border-[#427A5B]/30">
            <div className="w-20 h-20 rounded-full bg-[#F3F4EE] flex items-center justify-center mb-6">
              <Phone className="w-8 h-8 text-[#427A5B]" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-bold text-[var(--navy)] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Call / WhatsApp Us</h3>
            <p className="text-[14px] text-gray-500 mb-6 leading-relaxed">
              Speak to our care team directly.<br />
              Mon – Sat | 10 AM – 7 PM
            </p>
            <a href="tel:+91XXXXXXXXXX" className="text-[16px] font-bold text-[#427A5B] hover:opacity-80 transition-opacity mt-auto">
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
            <FAQItem
              key={index}
              faq={faq}
              isOpen={openFaqIndex === index}
              onToggle={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
            />
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

      <SiteFooter />
    </div>
  );
};

export default ContactUs;
