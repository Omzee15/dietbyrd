import { Users, Stethoscope, UtensilsCrossed, UserCheck, UserPlus, BarChart3, Tag } from "lucide-react";

export const getAdminSidebarSections = (counts?: {
  patients?: number;
  doctors?: number;
  dieticians?: number;
  joinRequests?: number;
}) => [
  {
    title: "Management",
    items: [
      { label: "Patients", href: "/admin", icon: Users, badge: counts?.patients },
      { label: "Doctors", href: "/admin/doctors", icon: Stethoscope, badge: counts?.doctors },
      { label: "Dieticians", href: "/admin/dieticians", icon: UtensilsCrossed, badge: counts?.dieticians },
      { label: "MLT Interns", href: "/admin/mlt-interns", icon: UserCheck },
      { label: "Support Team", href: "/admin/support-team", icon: UserCheck },
      { label: "Join Requests", href: "/admin/join-requests", icon: UserPlus, badge: counts?.joinRequests || undefined },
      { label: "Analytics", href: "/admin/referrals", icon: BarChart3 },
    ],
  },
  {
    title: "Data",
    items: [
      { label: "Food Library", href: "/admin/food-library", icon: UtensilsCrossed },
      { label: "Coupon Codes", href: "/admin/coupons", icon: Tag },
    ],
  },
];
