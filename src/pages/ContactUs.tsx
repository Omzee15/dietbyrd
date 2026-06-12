import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Phone } from "lucide-react";

// Official Gmail Logo SVG
const GmailIcon = () => (
  <svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12.713l-11.985-9.713h23.971z" fill="#ea4335" />
    <path d="M24 5.736v15.264h-5.264v-9.764z" fill="#34a853" />
    <path d="M5.264 21h-5.264v-15.264l12 9.728z" fill="#4285f4" />
    <path d="M0 3v2.736l12 9.728 12-9.728v-2.736c0-1.657-1.343-3-3-3h-18c-1.657 0-3 1.343-3 3z" fill="#fbbc04" />
  </svg>
);

const ContactUs = () => {
  return (
    <div className="min-h-screen bg-[var(--cream)]" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Simple Header */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link to="/" className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-12 pb-24">
        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-serif text-[var(--navy)] mb-10 tracking-tight leading-tight">
          We're Here to Help
        </h1>

        {/* Content */}
        <div className="space-y-6 text-lg text-gray-800 leading-relaxed font-medium">
          <p>
            Every health journey begins with a conversation.
          </p>
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

        {/* Contact Info */}
        <div className="mt-16 pt-12 border-t border-gray-200 flex flex-col md:flex-row gap-10 md:gap-20">
          <a href="mailto:hello@dietbyrd.com" className="flex items-center gap-4 group hover:opacity-80 transition-opacity">
            <GmailIcon />
            <div className="text-2xl font-semibold text-[var(--navy)] tracking-tight group-hover:text-[var(--teal)] transition-colors">
              hello@dietbyrd.com
            </div>
          </a>

          <a href="tel:+91XXXXXXXXXX" className="flex items-center gap-4 group hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
              <Phone className="w-4 h-4 fill-current" />
            </div>
            <div className="text-2xl font-semibold text-[var(--navy)] tracking-tight group-hover:text-[var(--teal)] transition-colors">
              +91 XXXXXXXXXX
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
