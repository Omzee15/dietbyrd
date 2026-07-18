import { Link } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  Flag,
  Heart,
  Leaf,
  MessageCircle,
  Quote,
  Scale,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

const guidelines = [
  {
    icon: ShieldCheck,
    title: "1. Be Respectful",
    body: "Treat everyone with kindness and respect. No abusive, rude, threatening or disrespectful language.",
  },
  {
    icon: UserX,
    title: "2. No Personal Attacks",
    body: "Do not target or attack any individual, professional, or community. Share your experience, not your judgement.",
  },
  {
    icon: Quote,
    title: "3. Stay Relevant",
    body: "Keep your review focused on your consultation and experience with Diet By RD. Avoid unrelated content, politics or promotional messages.",
  },
  {
    icon: Scale,
    title: "4. No Judgement",
    body: "Everyone's health journey is unique. Avoid body-shaming, assumptions or comments about anyone's choices, lifestyle or background.",
  },
  {
    icon: Eye,
    title: "5. Respect Privacy",
    body: "Do not share your own or others' personal, medical or contact information. This includes names, addresses, phone numbers or identifiable details.",
  },
  {
    icon: MessageCircle,
    title: "6. Be Honest",
    body: "Share your genuine experience. Do not post false, misleading or exaggerated reviews.",
  },
  {
    icon: Heart,
    title: "7. Keep It Helpful",
    body: "Focus on what others can learn from your experience. Helpful reviews create real impact.",
  },
  {
    icon: Flag,
    title: "8. Zero Tolerance",
    body: "We do not allow hate speech, harassment, discrimination, spam or any content that violates the law.",
  },
];

const CommunityGuidelines = () => {
  return (
    <div className="min-h-screen bg-[#FDFCF8] relative overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <SiteHeader />

      {/* Decorative Leaves (Top Left) */}
      <img
        src="https://images.unsplash.com/photo-1620054813524-7eb3268cb320?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
        alt=""
        className="absolute -top-10 -left-20 w-64 md:w-80 opacity-10 pointer-events-none mix-blend-multiply rounded-full"
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
      {/* Decorative Leaves (Right) */}
      <img
        src="https://images.unsplash.com/photo-1620054813524-7eb3268cb320?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
        alt=""
        className="absolute top-1/3 -right-20 w-64 md:w-80 opacity-10 pointer-events-none mix-blend-multiply rounded-full"
        onError={(e) => (e.currentTarget.style.display = "none")}
      />

      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16 relative z-10">
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold tracking-[0.15em] text-[#427A5B] uppercase mb-4">
            Our community. Our responsibility.
          </p>
          <h1 className="text-5xl md:text-6xl text-[var(--navy)] tracking-tight mb-6" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            Community Guidelines
          </h1>

          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-[1px] w-16 bg-[#427A5B]/30"></div>
            <Leaf className="w-5 h-5 text-[#427A5B]" strokeWidth={1.5} />
            <div className="h-[1px] w-16 bg-[#427A5B]/30"></div>
          </div>

          <p className="text-[16px] md:text-[17px] font-bold text-[#427A5B] mb-8">
            A safe space for real people to share real experiences.
          </p>

          <p className="text-[15px] md:text-[16px] text-gray-700 leading-[1.8] font-medium max-w-3xl mx-auto">
            Our reviews are built on trust, honesty and respect. These guidelines help us keep Diet By RD a supportive community where everyone feels heard, valued and safe.
          </p>
        </div>

        <div className="text-center mb-14 mt-16">
          <h2 className="text-2xl md:text-3xl text-[var(--navy)] mb-4" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            Be Kind. Be Respectful. Be Real.
          </h2>
          <p className="text-[15px] text-gray-600 leading-[1.8] max-w-2xl mx-auto">
            Your reviews can help someone take the first step towards better health.<br />
            Please take a moment to ensure it aligns with the values of our community.
          </p>
        </div>

        {/* Guideline cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {guidelines.map((item) => (
            <div
              key={item.title}
              className="bg-white border border-[#EBE7DF] rounded-2xl p-6 flex items-start gap-5 transition-all hover:shadow-sm hover:border-[#427A5B]/30"
            >
              <div className="w-14 h-14 rounded-full bg-[#F3F4EE] flex items-center justify-center shrink-0">
                <item.icon className="w-6 h-6 text-[#427A5B]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--navy)] mb-1.5" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {item.title}
                </h3>
                <p className="text-[14px] text-gray-600 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Separator */}
        <div className="flex items-center justify-center gap-4 mb-10 max-w-[600px] mx-auto">
          <div className="h-[1px] flex-1 bg-gray-200"></div>
          <Leaf className="w-4 h-4 text-[#427A5B]" strokeWidth={1.5} />
          <div className="h-[1px] flex-1 bg-gray-200"></div>
        </div>

        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl text-[var(--navy)] mb-4" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            Together, we build a space of trust and care.
          </h2>
          <p className="text-[15px] text-gray-600 leading-[1.8]">
            When we treat each other with respect and empathy, we empower more people to share, learn and grow. Thank you for being a part of the Diet By RD community.
          </p>
        </div>

        {/* Closing banner */}
        <div className="bg-[#FAF9F5] border border-[#EAEBE4] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 max-w-4xl mx-auto">
          <div className="w-14 h-14 rounded-full bg-[#427A5B] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>
          <p className="text-[14px] text-gray-600 leading-relaxed text-center md:text-left flex-1">
            By posting a review, you agree to follow our <strong className="text-[var(--navy)] font-bold">Community Guidelines</strong> and help us keep this community safe, supportive and meaningful for all.
          </p>
          <Link
            to="/reviews"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2B5239] hover:bg-[#234630] text-white rounded-xl text-[14px] font-bold transition-all shrink-0 whitespace-nowrap"
          >
            Back to Reviews
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
};

export default CommunityGuidelines;
