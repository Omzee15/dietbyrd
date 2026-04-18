import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { UserPlus, Users, BarChart3, MessageCircle, FileText, Send, Search, ArrowLeft, X, IndianRupee, TrendingUp, Loader2, LogOut, Settings, ChevronDown, User, UserCheck, Plus, Trash2, Shield } from "lucide-react";
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
import { getDoctorReferrals, getDoctor, getDoctorStats, getDoctorAssistants, createAssistant, deleteAssistant, createReferral, lookupPhoneNumber, Referral, Doctor, PhoneLookupResult, Assistant } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const diagnosisOptions = [
  "diabetes", "pcos", "thyroid", "hypertension", "obesity", "other"
];

// Phone validation: 10 digits, starts with 6-9 (Indian mobile format)
const isValidIndianPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return /^[6-9]\d{9}$/.test(cleaned);
};

const formatPhoneForDisplay = (value: string): string => {
  // Only allow digits, limit to 10
  return value.replace(/\D/g, '').slice(0, 10);
};

type ActiveView = "refer" | "patients" | "admin";

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
  
  // Check if current user is an assistant (not a doctor)
  const isAssistant = user?.role === "assistant";
  
  // Form state
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  
  // Assistant management state (only for doctors)
  const [newAssistantName, setNewAssistantName] = useState("");
  const [newAssistantPhone, setNewAssistantPhone] = useState("");
  const [newAssistantPassword, setNewAssistantPassword] = useState("");
  const [showAddAssistant, setShowAddAssistant] = useState(false);
  
  // For assistants, get the doctor ID from user.doctorId, for doctors use profileId
  const doctorId = isAssistant ? user?.doctorId : user?.profileId;
  
  // Phone lookup state
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);

  // Phone number lookup query
  const { data: phoneSuggestions = [] } = useQuery({
    queryKey: ["phone-lookup", patientPhone],
    queryFn: () => lookupPhoneNumber(patientPhone),
    enabled: patientPhone.length >= 3 && patientPhone.length < 10,
    staleTime: 30000,
  });

  // Check if the entered phone is a new patient
  const isExistingPatient = phoneSuggestions.some(p => p.phone === patientPhone);
  const isNewPatient = patientPhone.length === 10 && isValidIndianPhone(patientPhone) && !isExistingPatient;

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneForDisplay(value);
    setPatientPhone(formatted);
    setShowPhoneSuggestions(formatted.length >= 3 && formatted.length < 10);
  };

  const selectPhoneSuggestion = (patient: PhoneLookupResult) => {
    setPatientPhone(patient.phone);
    setPatientName(patient.name || "");
    if (patient.diagnosis && diagnosisOptions.includes(patient.diagnosis)) {
      setDiagnosis(patient.diagnosis);
    }
    setShowPhoneSuggestions(false);
  };

  // Sync activeView with URL
  useEffect(() => {
    if (location.pathname === "/doctor/patients") {
      setActiveView("patients");
    } else if (location.pathname === "/doctor/admin" || location.pathname === "/doctor/analytics") {
      setActiveView("admin");
    } else if (location.pathname === "/doctor") {
      setActiveView("refer");
    }
  }, [location.pathname]);

  // Get current doctor from auth (for assistants, use doctorId to get their linked doctor)
  const { data: currentDoctor, isLoading: doctorLoading } = useQuery({
    queryKey: ["doctor", doctorId],
    queryFn: () => getDoctor(doctorId!),
    enabled: !!doctorId,
  });

  // Fetch stats for the doctor (total referred, onboarded, commission)
  const { data: doctorStats } = useQuery({
    queryKey: ["doctorStats", currentDoctor?.id],
    queryFn: () => getDoctorStats(currentDoctor!.id),
    enabled: !!currentDoctor?.id,
  });

  // Fetch assistants (only for doctors, not assistants)
  const { data: assistants = [] } = useQuery({
    queryKey: ["doctorAssistants", currentDoctor?.id],
    queryFn: () => getDoctorAssistants(currentDoctor!.id),
    enabled: !!currentDoctor?.id && !isAssistant,
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["doctorReferrals"] });
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["phone-lookup"] });
      
      if (data?.is_new_patient) {
        toast.success("New patient referred! Registration SMS will be sent.");
      } else {
        toast.success("Patient referred successfully!");
      }
      
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
    if (!isValidIndianPhone(patientPhone)) {
      toast.error("Please enter a valid 10-digit Indian mobile number starting with 6-9");
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

  // Create assistant mutation (only for doctors)
  const createAssistantMutation = useMutation({
    mutationFn: createAssistant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorAssistants"] });
      toast.success("Assistant account created successfully!");
      setNewAssistantName("");
      setNewAssistantPhone("");
      setNewAssistantPassword("");
      setShowAddAssistant(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create assistant account");
    },
  });

  // Delete assistant mutation
  const deleteAssistantMutation = useMutation({
    mutationFn: deleteAssistant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorAssistants"] });
      toast.success("Assistant account removed");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove assistant");
    },
  });

  const handleAddAssistant = () => {
    if (!newAssistantName || !newAssistantPhone || !newAssistantPassword) {
      toast.error("Please fill all fields");
      return;
    }
    if (!isValidIndianPhone(newAssistantPhone)) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (newAssistantPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    createAssistantMutation.mutate({
      doctor_id: currentDoctor!.id,
      name: newAssistantName,
      phone: newAssistantPhone,
      password: newAssistantPassword,
    });
  };

  const handleNavClick = (view: ActiveView) => {
    setSelectedPatient(null);
    const paths: Record<ActiveView, string> = {
      refer: "/doctor",
      patients: "/doctor/patients",
      admin: "/doctor/admin",
    };
    navigate(paths[view]);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Sidebar sections - Admin option only for doctors, not assistants
  const sidebarSections = [
    {
      title: "Workspace",
      items: [
        { label: "Refer Patient", href: "/doctor", icon: UserPlus },
        { label: "My Patients", href: "/doctor/patients", icon: Users, badge: referrals.length },
        // Only show Admin for doctors, not assistants
        ...(!isAssistant ? [{ label: "Admin", href: "/doctor/admin", icon: Shield }] : []),
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

  // Pending verification state
  if (user?.isVerified === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md mx-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Pending</h2>
          <p className="text-gray-600 mb-6">
            Your account is currently under review. Our admin team will verify your credentials soon.
            You'll be able to access all features once verified.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
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
          {/* Left side - Doctor's name (for assistants) */}
          <div>
            {isAssistant && currentDoctor && (
              <span className="text-sm text-muted-foreground">
                Working for <span className="font-semibold text-lg text-foreground">{currentDoctor.name}</span>
              </span>
            )}
          </div>
          
          {/* Right side - User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:bg-muted rounded-lg px-2 py-1.5 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                  {(isAssistant ? user?.name : currentDoctor?.name)?.split(" ").slice(0, 2).map((n: string) => n[0]).join("") || "DR"}
                </div>
                <span className="text-sm font-medium">{isAssistant ? user?.name : currentDoctor?.name || "Loading..."}</span>
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
                {/* Stats Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-card rounded-xl border p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-primary">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{doctorStats?.total_referred || referrals.length}</div>
                      <div className="text-sm text-muted-foreground">Patients Referred</div>
                    </div>
                  </div>
                  <div className="bg-card rounded-xl border p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-success">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{doctorStats?.total_onboarded || 0}</div>
                      <div className="text-sm text-muted-foreground">Onboarded Patients</div>
                    </div>
                  </div>
                  {/* Only show commission to doctors, not assistants */}
                  {!isAssistant && (
                    <div className="bg-card rounded-xl border p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-info">
                        <IndianRupee className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">₹{(doctorStats?.total_commission || 0).toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Commission Earned</div>
                      </div>
                    </div>
                  )}
                  {/* Show different card for assistants */}
                  {isAssistant && (
                    <div className="bg-card rounded-xl border p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-info">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{referrals.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length}</div>
                        <div className="text-sm text-muted-foreground">This Month</div>
                      </div>
                    </div>
                  )}
                </div>

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
                    <div className="relative">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mobile Number *</label>
                      <Input 
                        placeholder="9876543210" 
                        className={`mt-1.5 ${patientPhone && !isValidIndianPhone(patientPhone) ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        value={patientPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        onFocus={() => setShowPhoneSuggestions(patientPhone.length >= 3 && patientPhone.length < 10)}
                        onBlur={() => setTimeout(() => setShowPhoneSuggestions(false), 200)}
                        maxLength={10}
                      />
                      {/* Phone suggestions dropdown */}
                      {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                          {phoneSuggestions.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                              onMouseDown={() => selectPhoneSuggestion(p)}
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <div className="text-sm font-medium">{p.name || "Unknown"}</div>
                                <div className="text-xs text-muted-foreground">{p.phone} · {p.diagnosis || "No diagnosis"}</div>
                              </div>
                              <Badge variant="outline" className="ml-auto text-xs">Existing</Badge>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Validation / New patient indicator */}
                      {patientPhone && !isValidIndianPhone(patientPhone) && (
                        <p className="text-xs text-red-500 mt-1">Enter valid 10-digit number starting with 6-9</p>
                      )}
                      {isNewPatient && (
                        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">New Patient</Badge>
                          Will receive registration SMS
                        </p>
                      )}
                      {isExistingPatient && patientPhone.length === 10 && (
                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">Existing Patient</Badge>
                        </p>
                      )}
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

            {/* Admin view - Only for doctors, not assistants */}
            {!selectedPatient && activeView === "admin" && !isAssistant && (
              <div className="p-6 space-y-6">
                <h2 className="text-lg font-semibold">Admin Dashboard</h2>

                {/* Income info banner */}
                <div className="bg-sidebar text-sidebar-foreground rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-sidebar-foreground/60">Clinical collaboration income — per patient you refer</p>
                      <p className="text-3xl font-bold mt-1 text-primary">up to ₹1,490</p>
                      <p className="text-xs text-sidebar-foreground/50 mt-1">₹500 when they book + ₹90 per session · up to 12 sessions</p>
                    </div>
                    <div className="flex gap-8 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">{doctorStats?.total_referred || referrals.length}</div>
                        <div className="text-xs text-sidebar-foreground/50">total referrals</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">{doctorStats?.total_onboarded || 0}</div>
                        <div className="text-xs text-sidebar-foreground/50">onboarded</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Total Referred", value: doctorStats?.total_referred || referrals.length, icon: Users, color: "text-primary" },
                    { label: "Onboarded Patients", value: doctorStats?.total_onboarded || 0, icon: UserCheck, color: "text-success" },
                    { label: "Commission Earned", value: `₹${(doctorStats?.total_commission || 0).toLocaleString()}`, icon: IndianRupee, color: "text-info" },
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

                {/* Assistant Management Section */}
                <div className="bg-card rounded-xl border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Manage Assistants</h3>
                    <Button size="sm" onClick={() => setShowAddAssistant(true)} className="gap-1">
                      <Plus className="w-4 h-4" />
                      Add Assistant
                    </Button>
                  </div>

                  {/* Add Assistant Form */}
                  {showAddAssistant && (
                    <div className="mb-6 p-4 bg-muted/50 rounded-lg space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name *</label>
                          <Input 
                            placeholder="e.g. Priya Sharma" 
                            className="mt-1.5"
                            value={newAssistantName}
                            onChange={(e) => setNewAssistantName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone *</label>
                          <Input 
                            placeholder="9876543210" 
                            className="mt-1.5"
                            value={newAssistantPhone}
                            onChange={(e) => setNewAssistantPhone(formatPhoneForDisplay(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password *</label>
                          <Input 
                            type="password"
                            placeholder="Min 6 characters" 
                            className="mt-1.5"
                            value={newAssistantPassword}
                            onChange={(e) => setNewAssistantPassword(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleAddAssistant}
                          disabled={createAssistantMutation.isPending}
                        >
                          {createAssistantMutation.isPending ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                          ) : (
                            "Create Assistant Account"
                          )}
                        </Button>
                        <Button variant="outline" onClick={() => {
                          setShowAddAssistant(false);
                          setNewAssistantName("");
                          setNewAssistantPhone("");
                          setNewAssistantPassword("");
                        }}>
                          Cancel
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Assistants can refer patients on your behalf but cannot see commission details.
                      </p>
                    </div>
                  )}

                  {/* Assistants List */}
                  <div className="space-y-3">
                    {assistants.length > 0 ? (
                      assistants.map((assistant) => (
                        <div key={assistant.id} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {assistant.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{assistant.name}</div>
                              <div className="text-xs text-muted-foreground">{assistant.phone}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Assistant</Badge>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (confirm(`Are you sure you want to remove ${assistant.name}?`)) {
                                  deleteAssistantMutation.mutate(assistant.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No assistants added yet</p>
                        <p className="text-xs mt-1">Add an assistant to help you manage patient referrals</p>
                      </div>
                    )}
                  </div>
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
