// Food Library Page - Wrapper for dieticians
import { useNavigate } from "react-router-dom";
import { Apple, CalendarDays, LogOut, Settings, Users, UtensilsCrossed } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { FoodLibrary } from "@/components/diet/FoodLibrary";
import { useAuth } from "@/contexts/AuthContext";

const FoodLibraryPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const sidebarSections = [
    {
      title: "Dashboard",
      items: [
        { label: "My Patients", href: "/dietician", icon: Users },
        { label: "My Schedule", href: "/dietician/schedule", icon: CalendarDays },
        { label: "Diet Plans", href: "/dietician/diet", icon: UtensilsCrossed },
        { label: "Food Library", href: "/dietician/food-library", icon: Apple },
      ],
    },
    {
      title: "Settings",
      items: [{ label: "My Profile", href: "/dietician/settings", icon: Settings }],
    },
  ];

  const bottomContent = (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-400 hover:bg-red-500/10 transition-all duration-150"
    >
      <LogOut className="w-[18px] h-[18px] shrink-0" />
      <span>Sign Out</span>
    </button>
  );
  
  return (
    <div className="flex min-h-screen">
      <AppSidebar
        title="DietByRD"
        subtitle={user?.name || "Dietician Portal"}
        sections={sidebarSections}
        bottomContent={bottomContent}
      />
      <main className="flex-1 min-w-0">
        <FoodLibrary onBack={() => navigate('/dietician')} />
      </main>
    </div>
  );
};

export default FoodLibraryPage;
