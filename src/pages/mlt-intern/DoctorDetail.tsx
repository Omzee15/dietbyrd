import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, LogOut, Phone, Stethoscope, Building2, MapPin, FileText, BadgeCheck, BadgeX, Users, UtensilsCrossed, UserPlus, Apple } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDoctor, getDoctorReferrals } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const MLTInternDoctorDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { logout } = useAuth();
  const [showReferredPatients, setShowReferredPatients] = useState(false);

  const doctorId = parseInt(id || "0", 10);

  const { data: doctor, isLoading } = useQuery({
    queryKey: ["doctor", doctorId],
    queryFn: () => getDoctor(doctorId),
    enabled: !!doctorId,
  });

  const { data: referrals = [], isLoading: referralsLoading } = useQuery({
    queryKey: ["doctorReferrals", doctorId],
    queryFn: () => getDoctorReferrals(doctorId),
    enabled: !!doctorId,
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
            <Button variant="outline" onClick={() => navigate("/mlt-intern/doctors")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Doctors
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Details</h1>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">Loading doctor details...</CardContent>
            </Card>
          ) : !doctor ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">Doctor not found</CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Stethoscope className="w-5 h-5" />
                      {doctor.name}
                    </span>
                    <Badge variant={doctor.is_verified ? "default" : "secondary"}>
                      {doctor.is_verified ? "Verified" : "Pending"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <p className="text-xs text-gray-500">Doctor ID</p>
                    <p className="font-medium">#{doctor.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Qualification</p>
                    <p className="font-medium">{doctor.qualification || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium flex items-center gap-2"><Phone className="w-4 h-4" />{doctor.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Referrals</p>
                    <p className="font-medium">{doctor.total_referrals ?? 0}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" />Clinic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500">Clinic Name</p>
                      <p className="font-medium">{doctor.clinic_name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />Clinic Address</p>
                      <p className="font-medium">{doctor.clinic_address || "N/A"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" />Professional Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500">Default Diagnosis</p>
                      <p className="font-medium">{doctor.default_diagnosis || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Verification Status</p>
                      <p className="font-medium flex items-center gap-2">
                        {doctor.is_verified ? <BadgeCheck className="w-4 h-4 text-emerald-600" /> : <BadgeX className="w-4 h-4 text-amber-600" />}
                        {doctor.is_verified ? "Verified" : "Pending Verification"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Referred Patients
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReferredPatients((prev) => !prev)}
                  >
                    {showReferredPatients ? "Hide List" : "View Patients Referred List"}
                  </Button>
                </CardHeader>
                {showReferredPatients && (
                  <CardContent>
                    {referralsLoading ? (
                      <p className="text-sm text-gray-500">Loading referred patients...</p>
                    ) : referrals.length === 0 ? (
                      <p className="text-sm text-gray-500">No patients have been referred by this doctor yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                              <th className="text-left py-2">Patient</th>
                              <th className="text-left py-2">Phone</th>
                              <th className="text-left py-2">Diagnosis</th>
                              <th className="text-left py-2">Referred On</th>
                            </tr>
                          </thead>
                          <tbody>
                            {referrals.map((referral) => {
                              const dateVal = referral.referred_at || referral.created_at;
                              return (
                                <tr key={referral.id} className="border-b last:border-0">
                                  <td className="py-2 font-medium">{referral.patient_name || "N/A"}</td>
                                  <td className="py-2">{referral.patient_phone || "N/A"}</td>
                                  <td className="py-2">{referral.diagnosis || "N/A"}</td>
                                  <td className="py-2 whitespace-nowrap">
                                    {dateVal ? new Date(dateVal).toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true
                                    }) : "N/A"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default MLTInternDoctorDetail;
