const fs = require('fs');

const landingCode = fs.readFileSync('c:/ClientWo/dietbyrd/src/pages/Landing.tsx', 'utf8');
const contactCode = fs.readFileSync('c:/ClientWo/dietbyrd/src/pages/ContactUs.tsx', 'utf8');

// 1. Extract the Nav/Footer/Style dependencies from Landing.tsx
const patientNavItemsMatch = landingCode.match(/const patientNavItems = \[[\s\S]*?\];/)[0];
const logoCharsMatch = landingCode.match(/const logoChars = \[.*?\];/)[0];
const logoComponentMatch = landingCode.match(/const Logo = \(\) => \{[\s\S]*?<\/Link>\s*\);\s*\};/)[0];
const styleBlockMatch = landingCode.match(/<style>\{`[\s\S]*?`\}<\/style>/)[0];
const navBlockMatch = landingCode.match(/<nav className=\{`landing-nav[\s\S]*?<\/nav>/)[0];
const footerBlockMatch = landingCode.match(/<footer className="landing-footer">[\s\S]*?<\/footer>/)[0];

// 2. Build the new ContactUs.tsx
let newContactCode = contactCode.replace('import React, { useState } from "react";', `import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PublicBookingModal } from "@/components/PublicBookingModal";
import { motion } from "framer-motion";
import { CalendarDays, UtensilsCrossed, MessageSquare, User, LogOut, Heart } from "lucide-react";`);

newContactCode = newContactCode.replace('const ContactUs = () => {', `
${patientNavItemsMatch}
${logoCharsMatch}
${logoComponentMatch}

const ContactUs = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
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
`);

newContactCode = newContactCode.replace('<div className="min-h-screen bg-[#FDFCF8] relative overflow-hidden" style={{ fontFamily: "\'DM Sans\', sans-serif" }}>', `<div className="min-h-screen bg-[#FDFCF8] relative overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      ${styleBlockMatch}
      ${navBlockMatch.replace('onClick={scrollTo(\'about\')}', 'onClick={(e) => { e.preventDefault(); navigate("/#about"); }}').replace('onClick={scrollTo(\'rd-section\')}', 'onClick={(e) => { e.preventDefault(); navigate("/#rd-section"); }}')}
`);

newContactCode = newContactCode.replace('</div>\n    </div>\n  );\n};\n\nexport default ContactUs;', `</div>
      ${footerBlockMatch.replace('onClick={scrollTo(\'rd-section\')}', 'onClick={(e) => { e.preventDefault(); navigate("/#rd-section"); }}')}
      <PublicBookingModal open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen} />
    </div>
  );
};

export default ContactUs;`);

// Also change the max-w-[600px] to max-w-[900px] for the content paragraph
newContactCode = newContactCode.replace('max-w-[600px] mx-auto text-center md:text-left mb-16', 'max-w-4xl mx-auto text-center md:text-center mb-16 px-4 md:px-0 text-[15px] md:text-[16px]');
// The original was 'max-w-[600px] mx-auto text-center md:text-left mb-16' which applied to the div containing the paragraphs.

fs.writeFileSync('c:/ClientWo/dietbyrd/src/pages/ContactUs.tsx', newContactCode);
console.log("ContactUs updated successfully.");
