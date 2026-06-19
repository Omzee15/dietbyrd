import React, { useState } from "react";
import { Mail, Phone, ShieldCheck, Heart, ChevronDown, Leaf } from "lucide-react";

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
            <Leaf className="w-5 h-5 text-[#427A5B]" strokeWidth={1.5} />
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
    </div>
  );
};

export default ContactUs;
