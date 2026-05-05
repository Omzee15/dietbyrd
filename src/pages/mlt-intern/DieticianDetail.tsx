import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, LogOut, Phone, UtensilsCrossed, Sparkles, Activity, Users, Stethoscope, UserPlus, Apple } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDietician } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const MLTInternDieticianDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { logout } = useAuth();

  const dieticianId = parseInt(id || "0", 10);

  const { data: dietician, isLoading } = useQuery({
    queryKey: ["dietician", dieticianId],
    queryFn: () => getDietician(dieticianId),
    enabled: !!dieticianId,
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const sidebarSections = [
    {
      title: "View",
      items: [
        { label: "Patients", href: "/mlt-intern/patients", icon: Users },
        { label: "Doctors", href: "/mlt-intern/doctors", icon: Stethoscope },
        { label: "Dieticians", href: "/mlt-intern/dieticians", icon: UtensilsCrossed },
        { label: "Join Requests", href: "/mlt-intern/join-requests", icon: UserPlus },
        { label: "Food Library", href: "/mlt-intern/food-library", icon: Apple },
      ],
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
    <div className="flex min-h-screen bg-gray-50">
      <AppSidebar title="DietByRD" subtitle="MLT Intern" sections={sidebarSections} bottomContent={bottomContent} />

      <main className="flex-1 p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/mlt-intern/dieticians")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dieticians
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Dietician Details</h1>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">Loading dietician details...</CardContent>
            </Card>
          ) : !dietician ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">Dietician not found</CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <UtensilsCrossed className="w-5 h-5" />
                      {dietician.name}
                    </span>
                    <Badge variant={dietician.is_active ? "default" : "secondary"}>
                      {dietician.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <p className="text-xs text-gray-500">Dietician ID</p>
                    <p className="font-medium">#{dietician.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Qualification</p>
                    <p className="font-medium">{dietician.qualification || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium flex items-center gap-2"><Phone className="w-4 h-4" />{dietician.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Active Patients</p>
                    <p className="font-medium">{dietician.active_patients ?? 0}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4" />Specializations</CardTitle>
                </CardHeader>
                <CardContent>
                  {dietician.specializations && dietician.specializations.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {dietician.specializations.map((specialization) => (
                        <Badge key={specialization} variant="secondary" className="px-3 py-1">
                          {specialization}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No specializations listed.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4" />Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{dietician.is_active ? "Currently available for patient assignments" : "Currently inactive"}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default MLTInternDieticianDetail;
