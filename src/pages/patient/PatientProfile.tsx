import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  FileText,
  Heart,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Scale,
  Settings,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import AppSidebar from "@/components/AppSidebar";
import { getPatient, getPatientDietPlans } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const PatientProfile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", user?.profileId],
    queryFn: () => getPatient(user!.profileId!),
    enabled: !!user?.profileId,
  });

  const { data: dietPlans } = useQuery({
    queryKey: ["patient-diet-plans", user?.profileId],
    queryFn: () => getPatientDietPlans(user!.profileId!),
    enabled: !!user?.profileId,
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getInitials = (name: string) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?";

  // Get latest weight from diet plans
  const latestWeight = dietPlans?.find((p) => p.is_active)?.plan_json?.weight || 
    dietPlans?.[0]?.plan_json?.weight;

  const sidebarSections = [
    {
      title: "Dashboard",
      items: [
        { label: "Overview", href: "/patient", icon: User },
        { label: "My Profile", href: "/patient/profile", icon: Heart },
        { label: "Diet Plans", href: "/patient/diet-plans", icon: UtensilsCrossed },
      ],
    },
    {
      title: "Settings",
      items: [{ label: "Preferences", href: "/patient/settings", icon: Settings }],
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
        subtitle="Patient Portal"
        sections={sidebarSections}
        bottomContent={bottomContent}
      />

      <main className="flex-1 bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/patient")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">My Profile</h1>
          </div>
          {patient && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-muted rounded-lg px-2 py-1.5 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                    {getInitials(patient.name || "?")}
                  </div>
                  <span className="text-sm font-medium">{patient.name}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/patient/settings")} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading profile...</span>
          </div>
        )}

        {/* Content */}
        {!isLoading && patient && (
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-3xl font-bold text-primary mb-4">
                    {getInitials(patient.name || "?")}
                  </div>
                  <h2 className="text-2xl font-bold">{patient.name || "Patient"}</h2>
                  <p className="text-muted-foreground mt-1">
                    Patient ID: #{patient.id}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="secondary" className="capitalize">
                      {patient.dietary_preference || "No preference"}
                    </Badge>
                    {patient.diagnosis && (
                      <Badge variant="outline" className="capitalize">
                        {patient.diagnosis}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Phone Number</p>
                      <p className="font-semibold">{patient.phone || patient.user_phone || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Age</p>
                      <p className="font-semibold">{patient.age ? `${patient.age} years` : "Not provided"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Gender</p>
                      <p className="font-semibold capitalize">{patient.gender || "Not specified"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                      <p className="font-semibold">{patient.email || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl md:col-span-2">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Address</p>
                      <p className="font-semibold">{patient.address || "Not provided"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Health Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="w-5 h-5" />
                  Health Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Diagnosis</p>
                      <p className="font-semibold capitalize">{patient.diagnosis || "General wellness"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <UtensilsCrossed className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Dietary Preference</p>
                      <p className="font-semibold capitalize">{patient.dietary_preference || "Not specified"}</p>
                    </div>
                  </div>

                  {latestWeight && (
                    <>
                      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                        <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                          <Scale className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Weight</p>
                          <p className="font-semibold">
                            {latestWeight.current ? `${latestWeight.current} kg` : "Not recorded"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                        <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                          <Scale className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Target Weight</p>
                          <p className="font-semibold">
                            {latestWeight.target ? `${latestWeight.target} kg` : "Not set"}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {patient.diagnosis_description && (
                  <>
                    <Separator />
                    <div className="p-4 bg-muted/30 rounded-xl">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Health Notes</p>
                      <p className="text-sm leading-relaxed">{patient.diagnosis_description}</p>
                    </div>
                  </>
                )}

                {patient.allergies && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900">
                    <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">Allergies</p>
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">{patient.allergies}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Referring Doctor */}
            {patient.doctor_name && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5" />
                    Referring Doctor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {getInitials(patient.doctor_name)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{patient.doctor_name}</p>
                      {patient.doctor_specialization && (
                        <p className="text-sm text-muted-foreground capitalize">
                          {patient.doctor_specialization}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5" />
                  Account Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-3xl font-bold text-primary">{dietPlans?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Diet Plans</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-3xl font-bold text-green-600">
                      {dietPlans?.filter((p) => p.is_active).length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Active Plans</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-3xl font-bold text-blue-600">
                      {patient.created_at ? Math.floor((Date.now() - new Date(patient.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Days with us</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-3xl font-bold text-orange-600">
                      {dietPlans?.[0]?.plan_json?.totals?.calories || "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">Daily Calories</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default PatientProfile;
