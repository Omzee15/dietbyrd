import { CalendarDays, Heart, Home, MessageSquare, UtensilsCrossed, Star } from "lucide-react";

export const getPatientSidebarSections = () => [
  {
    title: "Dashboard",
    items: [
      { label: "My Dashboard", href: "/patient", icon: Home },
      { label: "My Profile", href: "/patient/profile", icon: Heart },
      { label: "Diet Plans", href: "/patient/diet-plans", icon: UtensilsCrossed },
      { label: "Appointments", href: "/patient/appointments", icon: CalendarDays },
      { label: "Support", href: "/patient/support", icon: MessageSquare },
      { label: "Reviews", href: "/reviews", icon: Star },
    ],
  },
];

