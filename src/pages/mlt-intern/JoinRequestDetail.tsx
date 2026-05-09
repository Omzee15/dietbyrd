import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, LogOut, UserPlus, Phone, Building2, MapPin, FileText, CalendarDays, UserCheck, CircleX, Users, Stethoscope, UtensilsCrossed, Apple } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getJoinRequests } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const MLTInternJoinRequestDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { logout } = useAuth();

  const requestId = parseInt(id || "0", 10);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["join-requests"],
    queryFn: () => getJoinRequests(),
  });

  const request = requests.find((item) => item.id === requestId);

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
            <Button variant="outline" onClick={() => navigate("/mlt-intern/join-requests")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Join Requests
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Join Request Details</h1>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">Loading join request details...</CardContent>
            </Card>
          ) : !request ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">Join request not found</CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      {request.name}
                    </span>
                    <Badge variant={request.status === "approved" ? "default" : request.status === "rejected" ? "destructive" : "secondary"} className="capitalize">
                      {request.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <p className="text-xs text-gray-500">Request ID</p>
                    <p className="font-medium">#{request.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Requested Role</p>
                    <p className="font-medium capitalize">{request.requested_role}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium flex items-center gap-2"><Phone className="w-4 h-4" />{request.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Applied On</p>
                    <p className="font-medium flex items-center gap-2"><CalendarDays className="w-4 h-4" />{new Date(request.created_at).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" />Professional Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500">Qualification</p>
                      <p className="font-medium">{request.qualification || "N/A"}</p>
                    </div>
                    {request.requested_role === "doctor" && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500 flex items-center gap-1"><Building2 className="w-3 h-3" />Clinic Name</p>
                          <p className="font-medium">{request.clinic_name || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />Clinic Address</p>
                          <p className="font-medium">{request.clinic_address || "N/A"}</p>
                        </div>
                      </>
                    )}
                    {request.requested_role === "rd" && (
                      <div>
                        <p className="text-xs text-gray-500">Specializations</p>
                        {request.specializations && request.specializations.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {request.specializations.map((specialization) => (
                              <Badge key={specialization} variant="secondary">{specialization}</Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="font-medium">N/A</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Review Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500">Reviewed By</p>
                      <p className="font-medium">{request.reviewed_by_name || "Not reviewed yet"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Reviewed At</p>
                      <p className="font-medium">{request.reviewed_at ? new Date(request.reviewed_at).toLocaleString() : "Not reviewed yet"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Decision</p>
                      <p className="font-medium flex items-center gap-2">
                        {request.status === "approved" ? <UserCheck className="w-4 h-4 text-emerald-600" /> : request.status === "rejected" ? <CircleX className="w-4 h-4 text-red-600" /> : null}
                        <span className="capitalize">{request.status}</span>
                      </p>
                    </div>
                    {request.rejection_reason && (
                      <div>
                        <p className="text-xs text-gray-500">Rejection Reason</p>
                        <p className="font-medium">{request.rejection_reason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default MLTInternJoinRequestDetail;
