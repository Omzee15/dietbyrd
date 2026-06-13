import fs from 'fs';

let content = fs.readFileSync('src/pages/DoctorDashboard.tsx', 'utf8');

// Normalize line endings to \n
content = content.replace(/\r\n/g, '\n');

// 1. Add ChevronUp, Mail, Phone to imports
content = content.replace(
  'import { UserPlus, Users, BarChart3, MessageCircle, Search, ArrowLeft, X, IndianRupee, TrendingUp, Loader2, LogOut, Settings, ChevronDown, UserCheck, Plus, Trash2, Send } from "lucide-react";',
  'import { UserPlus, Users, BarChart3, MessageCircle, Search, ArrowLeft, X, IndianRupee, TrendingUp, Loader2, LogOut, Settings, ChevronDown, UserCheck, Plus, Trash2, Send, ChevronUp, Mail, Phone } from "lucide-react";'
);

// 2. Fix URL syncing logic
const oldUrlSync = `  // Sync activeView with URL
  useEffect(() => {
    if (location.pathname === "/doctor/patients") {
      setActiveView("patients");
    } else if (location.pathname === "/doctor/admin" || location.pathname === "/doctor/analytics") {
      setActiveView("admin");
    } else if (location.pathname === "/doctor/assistants") {
      setActiveView("assistants");
    } else if (location.pathname === "/doctor") {
      setActiveView("refer");
    }
  }, [location.pathname]);`;

const newUrlSync = `  // Sync activeView with URL
  useEffect(() => {
    if (location.pathname === "/doctor/patients") {
      setActiveView("patients");
    } else if (location.pathname === "/doctor/admin" || location.pathname === "/doctor/analytics") {
      setActiveView("admin");
    } else if (location.pathname === "/doctor/assistants") {
      setActiveView("assistants");
    } else if (location.pathname === "/doctor/referrals") {
      setActiveView("refer_patient");
    } else if (location.pathname === "/doctor") {
      setActiveView("overview");
    }
  }, [location.pathname]);`;

if (!content.includes(oldUrlSync)) {
  console.log("oldUrlSync not found!");
} else {
  content = content.replace(oldUrlSync, newUrlSync);
  console.log("Replaced URL sync logic.");
}

// 3. Fix Contact Support
const oldContact = `    const bottomContent = (
      <div className="space-y-1">
        <a href="mailto:doctors@dietbyrd.com" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-primary-foreground transition-all duration-150">
          <MessageCircle className="w-[18px] h-[18px] shrink-0" />
          <span>Contact Support</span>
        </a>`;

const newContact = `    const bottomContent = (
      <div className="space-y-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-primary-foreground transition-all duration-150">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-[18px] h-[18px] shrink-0" />
                <span>Contact Support</span>
              </div>
              <ChevronUp className="w-4 h-4 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 mb-2 border-sidebar-accent/20 bg-sidebar shadow-lg rounded-xl">
            <div className="flex flex-col gap-1 p-1">
              <a href="mailto:doctors@dietbyrd.com" className="flex items-center gap-3 px-2 py-2.5 text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-primary-foreground rounded-lg transition-colors">
                <Mail className="w-[16px] h-[16px] text-sidebar-foreground/70" />
                <span>doctors@dietbyrd.com</span>
              </a>
              <a href="tel:+918000000000" className="flex items-center gap-3 px-2 py-2.5 text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-primary-foreground rounded-lg transition-colors">
                <Phone className="w-[16px] h-[16px] text-sidebar-foreground/70" />
                <span>+91 80000 00000</span>
              </a>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>`;

if (!content.includes(oldContact)) {
  console.log("oldContact not found!");
} else {
  content = content.replace(oldContact, newContact);
  console.log("Replaced Contact Support.");
}

fs.writeFileSync('src/pages/DoctorDashboard.tsx', content);
console.log("Done.");
