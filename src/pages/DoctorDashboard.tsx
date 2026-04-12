import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { UserPlus, Users, BarChart3, MessageCircle, FileText, Send, Search, ArrowLeft, X, IndianRupee, TrendingUp, Loader2, LogOut, Settings, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getDoctorReferrals, getDoctor, createReferral, Referral, Doctor } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const diagnosisOptions = [
  "diabetes", "pcos", "thyroid", "hypertension", "obesity", "other"
];

type ActiveView = "refer" | "patients" | "analytics";

interface DoctorDashboardProps {
  defaultTab?: ActiveView;
}

const DoctorDashboard = ({ defaultTab = "refer" }: DoctorDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [diagnosis, setDiagnosis] = useState(diagnosisOptions[0]);
  const [activeView, setActiveView] = useState<ActiveView>(defaultTab);
  const [selectedPatient, setSelectedPatient] = useState<Referral | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  
  // Form state
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");

  // Sync activeView with URL
  useEffect(() => {
    if (location.pathname === "/doctor/patients") {
      setActiveView("patients");
    } else if (location.pathname === "/doctor/analytics") {
      setActiveView("analytics");
    } else if (location.pathname === "/doctor") {
      setActiveView("refer");
    }
  }, [location.pathname]);

  // Get current doctor from auth
  const { data: currentDoctor, isLoading: doctorLoading } = useQuery({
    queryKey: ["doctor", user?.profileId],
    queryFn: () => getDoctor(user!.profileId!),
    enabled: !!user?.profileId,
  });

  // Fetch referrals for current doctor
  const { data: referrals = [], isLoading: referralsLoading } = useQuery({
    queryKey: ["doctorReferrals", currentDoctor?.id],
    queryFn: () => getDoctorReferrals(currentDoctor!.id),
    enabled: !!currentDoctor?.id,
  });

  // Create referral mutation
  const createReferralMutation = useMutation({
    mutationFn: createReferral,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorReferrals"] });
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient referred successfully!");
      setPatientName("");
      setPatientPhone("");
      setClinicalNotes("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create referral");
    },
  });

  const handleSubmitReferral = () => {
    if (!patientPhone || !currentDoctor?.id) {
      toast.error("Please enter patient phone number");
      return;
    }
    createReferralMutation.mutate({
      patient_name: patientName,
      phone: patientPhone,
      diagnosis,
      diagnosis_description: clinicalNotes,
      doctor_id: currentDoctor.id,
    });
  };

  const filteredPatients = referrals.filter((p) =>
    (p.patient_name?.toLowerCase() || "").includes(patientSearch.toLowerCase()) ||
    (p.diagnosis?.toLowerCase() || "").includes(patientSearch.toLowerCase())
  );

  const handleNavClick = (view: ActiveView) => {
    setSelectedPatient(null);
    const paths: Record<ActiveView, string> = {
      refer: "/doctor",
      patients: "/doctor/patients",
      analytics: "/doctor/analytics",
    };
    navigate(paths[view]);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const sidebarSections = [
    {
      title: "Workspace",
      items: [
        { label: "Refer Patient", href: "/doctor", icon: UserPlus },
        { label: "My Patients", href: "/doctor/patients", icon: Users, badge: referrals.length },
        { label: "Analytics", href: "/doctor/analytics", icon: BarChart3 },
      ],
    },
  ];

  const bottomContent = (
    <div className="space-y-1">
      <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-primary-foreground transition-all duration-150">
        <MessageCircle className="w-[18px] h-[18px] shrink-0" />
        <span>WhatsApp Us</span>
      </a>
      <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-primary-foreground transition-all duration-150">
        <FileText className="w-[18px] h-[18px] shrink-0" />
        <span>MOU / Agreement</span>
      </a>
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-400 hover:bg-red-500/10 transition-all duration-150"
      >
        <LogOut className="w-[18px] h-[18px] shrink-0" />
        <span>Sign Out</span>
      </button>
    </div>
  );

  // Loading state
  if (doctorLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        title="DietByRD"
        subtitle="Doctor Portal"
        sections={sidebarSections}
        bottomContent={bottomContent}
      />

      <main className="flex-1 bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button variant={activeView === "refer" ? "default" : "ghost"} size="sm" onClick={() => handleNavClick("refer")} className="text-xs">
              Refer Patient
            </Button>
            <Button variant={activeView === "patients" ? "default" : "ghost"} size="sm" onClick={() => handleNavClick("patients")} className="text-xs">
              My Patients
            </Button>
            <Button variant={activeView === "analytics" ? "default" : "ghost"} size="sm" onClick={() => handleNavClick("analytics")} className="text-xs">
              Analytics
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:bg-muted rounded-lg px-2 py-1.5 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                  {currentDoctor?.name?.split(" ").slice(0, 2).map((n) => n[0]).join("") || "DR"}
                </div>
                <span className="text-sm font-medium">{currentDoctor?.name || "Loading..."}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/doctor/settings")} className="cursor-pointer">
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
        </div>

        {referralsLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Patient detail overlay */}
            {selectedPatient && (
              <div className="p-6">
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)} className="mb-4 gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <div className="bg-card rounded-xl border p-6 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                        {(selectedPatient.patient_name || "?").split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{selectedPatient.patient_name || "Unknown"}</h2>
                        <div className="text-sm text-muted-foreground">
                          {selectedPatient.patient_phone} · {selectedPatient.age || "?"} yrs · {selectedPatient.gender || "Unknown"}
                        </div>
                        <Badge variant="outline" className="mt-1 bg-info/10 text-info border-info/20">
                          Referred
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: "Diagnosis", value: selectedPatient.diagnosis || "Not specified" },
                      { label: "Referred On", value: new Date(selectedPatient.created_at).toLocaleDateString() },
                      { label: "Source", value: selectedPatient.source || "Doctor Portal" },
                    ].map((item) => (
                      <div key={item.label} className="bg-muted/50 rounded-xl p-4">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</div>
                        <div className="font-semibold mt-1 capitalize">{item.value}</div>
                      </div>
                    ))}
                  </div>
                  {selectedPatient.notes && (
                    <div>
                      <div className="text-sm font-semibold mb-2">Clinical Notes</div>
                      <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">{selectedPatient.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Refer Patient view */}
            {!selectedPatient && activeView === "refer" && (
              <div className="p-6 space-y-6">
                <div className="bg-card rounded-xl p-6 border">
                  <h2 className="text-lg font-semibold">Refer a Patient</h2>
                  <p className="text-sm text-muted-foreground mt-1">Enter patient details to create a referral. We'll handle the rest.</p>
                  <div className="grid grid-cols-3 gap-4 mt-5">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient Name</label>
                      <Input 
                        placeholder="e.g. Ananya Rao" 
                        className="mt-1.5" 
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mobile Number *</label>
                      <Input 
                        placeholder="9876543210" 
                        className="mt-1.5" 
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Diagnosis</label>
                      <select value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm capitalize">
                        {diagnosisOptions.map((d) => (<option key={d} value={d} className="capitalize">{d}</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-4 items-end">
                    <div className="flex-1">
                      <Input 
                        placeholder="Optional: clinical notes for the dietician..." 
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                      />
                    </div>
                    <Button 
                      className="gap-2 px-6" 
                      onClick={handleSubmitReferral}
                      disabled={createReferralMutation.isPending}
                    >
                      {createReferralMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>Send Referral <Send className="w-4 h-4" /></>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Recent referrals */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Recent Referrals</h2>
                    <span className="text-sm text-muted-foreground">{referrals.length} referrals</span>
                  </div>
                  <div className="bg-card rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="text-left p-4 font-semibold">Patient</th>
                          <th className="text-left p-4 font-semibold">Diagnosis</th>
                          <th className="text-left p-4 font-semibold">Date</th>
                          <th className="text-right p-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referrals.slice(0, 10).map((r) => (
                          <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedPatient(r)}>
                            <td className="p-4">
                              <div className="font-medium">{r.patient_name || "Unknown"}</div>
                              <div className="text-xs text-muted-foreground">{r.patient_phone}</div>
                            </td>
                            <td className="p-4 capitalize">{r.diagnosis || "—"}</td>
                            <td className="p-4 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                            <td className="p-4 text-right">
                              <Button variant="outline" size="sm" className="text-xs">View</Button>
                            </td>
                          </tr>
                        ))}
                        {referrals.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-muted-foreground">No referrals yet. Create your first referral above!</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* My Patients view */}
            {!selectedPatient && activeView === "patients" && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">My Patients</h2>
                  <span className="text-sm text-muted-foreground">{referrals.length} patients</span>
                </div>
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search patients..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} className="pl-9" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPatients.map((p) => (
                    <div key={p.id} className="bg-card border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md hover:border-primary/50" onClick={() => setSelectedPatient(p)}>
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {(p.patient_name || "?").split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">{p.patient_name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground capitalize">{p.diagnosis || "No diagnosis"} · {p.age || "?"} yrs</div>
                        </div>
                        <Badge variant="outline" className="text-xs bg-info/10 text-info border-info/20">
                          Referred
                        </Badge>
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-between text-xs text-muted-foreground">
                        <span>{p.patient_phone}</span>
                        <span>{new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {filteredPatients.length === 0 && (
                    <div className="col-span-3 text-center text-muted-foreground py-8">No patients found</div>
                  )}
                </div>
              </div>
            )}

            {/* Analytics view */}
            {!selectedPatient && activeView === "analytics" && (
              <div className="p-6 space-y-6">
                <h2 className="text-lg font-semibold">Analytics & Earnings</h2>

                {/* Income banner */}
                <div className="bg-sidebar text-sidebar-foreground rounded-xl p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-sidebar-foreground/60">Clinical collaboration income — per patient you refer</p>
                    <p className="text-3xl font-bold mt-1 text-primary">up to ₹1,490</p>
                    <p className="text-xs text-sidebar-foreground/50 mt-1">₹500 when they book + ₹90 per session · up to 12 sessions</p>
                  </div>
                  <div className="flex gap-8 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{referrals.length}</div>
                      <div className="text-xs text-sidebar-foreground/50">total referrals</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">{currentDoctor?.total_referrals || 0}</div>
                      <div className="text-xs text-sidebar-foreground/50">converted</div>
                    </div>
                  </div>
                </div>

                {/* Earnings breakdown */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Total Referrals", value: referrals.length, icon: Users, color: "text-primary" },
                    { label: "This Month", value: referrals.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length, icon: TrendingUp, color: "text-success" },
                    { label: "Est. Earnings", value: `₹${(referrals.length * 500).toLocaleString()}`, icon: IndianRupee, color: "text-info" },
                  ].map((s) => (
                    <div key={s.label} className="bg-card rounded-xl border p-5 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                        <s.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{s.value}</div>
                        <div className="text-sm text-muted-foreground">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent referrals list */}
                <div className="bg-card rounded-xl border p-6">
                  <h3 className="text-sm font-semibold mb-4">Recent Referrals</h3>
                  <div className="space-y-3">
                    {referrals.slice(0, 5).map((r) => (
                      <div key={r.id} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <div className="font-medium text-sm">{r.patient_name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground capitalize">{r.diagnosis || "No diagnosis"}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                    {referrals.length === 0 && (
                      <div className="text-center text-muted-foreground py-4">No referrals yet</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default DoctorDashboard;
