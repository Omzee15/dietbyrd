import React from "react";
import { Mail, Phone, ShieldCheck, Heart } from "lucide-react";

const ContactUs = () => {
  return (
    <div className="min-h-screen bg-[#FDFCF8] relative overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#427A5B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
            </svg>
            <div className="h-[1px] w-16 bg-[#427A5B]/30"></div>
          </div>

          <p className="text-[16px] md:text-[17px] font-bold text-[#427A5B] mb-12">
            Every health journey begins with a conversation.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-[14px] md:text-[15px] text-gray-700 leading-[1.8] font-medium max-w-[600px] mx-auto text-center md:text-left mb-16">
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
          <div className="bg-white border border-[#EBE7DF] rounded-2xl p-8 flex flex-col items-center text-center transition-all hover:shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#F3F4EE] flex items-center justify-center mb-6">
              <Mail className="w-7 h-7 text-[#427A5B]" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-[var(--navy)] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Email Us</h3>
            <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">
              Drop us a message anytime.<br />
              We aim to respond within 24 hours.
            </p>
            <a href="mailto:hello@dietbyrd.com" className="text-[15px] font-bold text-[#427A5B] hover:opacity-80 transition-opacity mt-auto">
              hello@dietbyrd.com
            </a>
          </div>

          <div className="bg-white border border-[#EBE7DF] rounded-2xl p-8 flex flex-col items-center text-center transition-all hover:shadow-sm">
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
    </div>
  );
};

export default ContactUs;
