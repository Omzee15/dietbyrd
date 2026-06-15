const fs = require('fs');

const extracted = JSON.parse(fs.readFileSync('extracted.json', 'utf8'));
let reviews = fs.readFileSync('src/pages/Reviews.tsx', 'utf8');

// 1. Extract what we need from extracted.json
let styleBlock = `<style>{\`${extracted.style}\`}</style>\n`;
// the nav needs variables like isProfileMenuOpen, user, isAuthenticated, patientNavItems, etc.
// Reviews.tsx already has: const { user, isAuthenticated } = useAuth();
// We need to add state for profile menu and booking modal.
const stateVars = `
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
`;

// Add patientNavItems and Logo before Reviews component
const extraComponents = `
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
          <span key={index} className="logo-char" style={{ animationDelay: \`\${index * 0.05}s\` }}>
            {char === " " ? "\\u00A0" : char}
          </span>
        ))}
      </span>
      <span className="logo-rd" style={{ animationDelay: \`\${logoChars.length * 0.05}s\` }}>RD</span>
    </Link>
  );
};
`;

const indianNames = `
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
  return \`\${day}\${suffix} \${formattedDate} \${time}\`;
};
`;

// Inject extra components and helpers before \`const Reviews = () => {\`
reviews = reviews.replace('const Reviews = () => {', extraComponents + indianNames + '\\nconst Reviews = () => {');

// Inject state variables
reviews = reviews.replace('const [conditionTag, setConditionTag] = useState("");', 'const [conditionTag, setConditionTag] = useState("");\\n' + stateVars);

// Replace "Back to Home" with the Navbar and style block
const backToHomeRegex = /<Link to="\/" className="inline-flex items-center.*?<\/Link>/s;
reviews = reviews.replace(backToHomeRegex, styleBlock + extracted.nav);

// Replace generic footer with extracted footer
const footerRegex = /{\/\* Bottom Footer Banner \*\/}.*?<\/div>\s*<\/div>\s*<\/div>/s;
reviews = reviews.replace(footerRegex, extracted.footer + '\\n    </div>\\n');

// Replace "A Verified Patient" and add Date/Location metadata
reviews = reviews.replace(/{reviews\.map\(\(review\) => \([\s\S]*?<div className="text-center mb-6">[\s\S]*?— A Verified Patient[\s\S]*?<\/div>/g, (match) => {
  return `{reviews.map((review) => {
              const identity = getAnonymousIdentity(review.id);
              return (
              <div key={review.id} className="bg-white border border-[#EBE7DF] rounded-2xl p-8 flex flex-col shadow-sm">
                <div className="flex justify-center gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star 
                      key={value} 
                      className={\`w-4 h-4 \${value <= review.rating ? "fill-[#427A5B] text-[#427A5B]" : "text-gray-200"}\`} 
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
                </div>`;
});

// Fix PublicBookingModal import and usage if necessary
reviews = reviews.replace('import { getApprovedReviews, getReviewEligibility, submitReview } from "@/lib/api";', 'import { getApprovedReviews, getReviewEligibility, submitReview } from "@/lib/api";\\nimport { PublicBookingModal } from "@/components/PublicBookingModal";');
reviews = reviews.replace('</footer>', '</footer>\\n      <PublicBookingModal open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen} />');

fs.writeFileSync('src/pages/Reviews.tsx', reviews);
