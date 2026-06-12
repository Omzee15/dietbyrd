import { useState, useEffect, useMemo, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { UserPlus, Users, BarChart3, MessageCircle, Search, ArrowLeft, X, IndianRupee, TrendingUp, Loader2, LogOut, Settings, ChevronDown, UserCheck, Plus, Trash2, Send, ChevronUp, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getDoctorReferrals, getDoctor, getDoctorStats, getDoctorAssistants, createAssistant, deleteAssistant, createReferral, lookupPhoneNumber, getDoctorPatients, getMe, updatePatientImprovementScore, MeUser, Referral, DoctorPatientSummary } from "@/lib/api";
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
  const digits = value.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const getReferralDateValue = (referral: Referral): string | undefined => {
  const referralWithReferredAt = referral as Referral & { referred_at?: string };
  return referralWithReferredAt.referred_at || referral.created_at;
};

const formatReferralDate = (referral: Referral): string => {
  const dateValue = getReferralDateValue(referral);
  if (!dateValue) return "—";
  const parsedDate = new Date(dateValue);
  return Number.isNaN(parsedDate.getTime()) ? "—" : parsedDate.toLocaleDateString();
};

const formatDateValue = (value?: string | null): string => {
  if (!value) return "—";
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? "—" : parsedDate.toLocaleDateString();
};

type ActiveView = "refer_patient" | "overview" | "patients" | "admin" | "assistants";

interface DoctorDashboardProps {
  defaultTab?: ActiveView;
}

const DoctorDashboard = ({ defaultTab = "overview" }: DoctorDashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<ActiveView>(defaultTab);
  const [selectedPatient, setSelectedPatient] = useState<Referral | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [userChip, setUserChip] = useState<MeUser | "loading" | "error">("loading");
  
  // Check if current user is an assistant (not a doctor)
  const isAssistant = user?.role === "assistant";
  
  
  // Form state
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState(diagnosisOptions[0]);

  const { data: phoneSuggestions = [] } = useQuery({
    queryKey: ["phone-lookup", patientPhone],
    queryFn: () => lookupPhoneNumber(patientPhone),
    enabled: patientPhone.length === 10 && isValidIndianPhone(patientPhone),
    staleTime: 30000,
  });

  const isExistingPatient = phoneSuggestions.some((patient: any) => patient.phone === patientPhone);
  
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneForDisplay(value);
    setPatientPhone(formatted);
  };

  // Assistant management state (only for doctors)
  const [newAssistantName, setNewAssistantName] = useState("");
  const [newAssistantPhone, setNewAssistantPhone] = useState("");
  const [newAssistantPassword, setNewAssistantPassword] = useState("");
  const [showAddAssistant, setShowAddAssistant] = useState(false);
  
  // For assistants, get the doctor ID from user.doctorId, for doctors use profileId
  const doctorId = isAssistant ? user?.doctorId : user?.profileId;

  // Sync activeView with URL
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
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setUserChip("error");
    }, 5000);

    const me = getMe();
    if (cancelled) return;
    clearTimeout(timeout);
    setUserChip(me ?? "error");

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [user]);

  // Get current doctor from auth (for assistants, use doctorId to get their linked doctor)
  const { data: currentDoctor, isLoading: doctorLoading } = useQuery({
    queryKey: ["doctor", doctorId],
    queryFn: () => getDoctor(doctorId!),
    enabled: !!doctorId,
  });

  // Fetch stats for the doctor (Patients Helped, onboarded, commission)
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

  const { data: doctorPatients = [], isLoading: doctorPatientsLoading } = useQuery({
    queryKey: ["doctorPatients"],
    queryFn: getDoctorPatients,
    enabled: !!user,
  });

  const filteredDoctorPatients = useMemo(() => {
    const query = patientSearch.trim().toLowerCase();
    return doctorPatients.filter((patient: DoctorPatientSummary) => {
      const paymentStatus = String(patient.payment_status || "unpaid").toLowerCase();
      if (paymentFilter !== "all" && paymentStatus !== paymentFilter) return false;
      if (!query) return true;
      return (
        (patient.name || "").toLowerCase().includes(query) ||
        String(patient.phone || "").toLowerCase().includes(query)
      );
    });
  }, [doctorPatients, patientSearch, paymentFilter]);

  
  // Create referral mutation
  const createReferralMutation = useMutation({
    mutationFn: createReferral,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["doctorReferrals"] });
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });

      if (data?.referral_sms?.sent) {
        const referredPatientName = data.patient_name?.trim() || patientName.trim() || "patient";
        toast.success(`Onboarding message to the ${referredPatientName} sent.`);
      }

      setPatientName("");
      setPatientPhone("");
      setClinicalNotes("");
      setDiagnosis(diagnosisOptions[0]);
    },
    onError: (error: any) => {
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
    } as any);
  };

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

  const handleAddAssistant = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const assistantName = newAssistantName.trim();
    const assistantPhone = formatPhoneForDisplay(newAssistantPhone);

    if (!assistantName || !assistantPhone || !newAssistantPassword) {
      toast.error("Please fill all fields");
      return;
    }
    if (!isValidIndianPhone(assistantPhone)) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (newAssistantPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!currentDoctor?.id) {
      toast.error("Doctor profile is still loading. Please try again.");
      return;
    }

    try {
      await createAssistantMutation.mutateAsync({
        doctor_id: currentDoctor.id,
        name: assistantName,
        phone: assistantPhone,
        password: newAssistantPassword,
      });
    } catch (error) {
      console.error("[create assistant] Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create assistant account");
    }
  };

  const handleNavClick = (view: ActiveView) => {
    setSelectedPatient(null);
    const paths: Record<ActiveView, string> = {
      refer_patient: "/doctor/referrals",
      overview: "/doctor",
      patients: "/doctor/patients",
      admin: "/doctor/admin",
      assistants: "/doctor/assistants",
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
        { label: "Refer Patient", href: "/doctor/referrals", icon: UserPlus },
        { label: "Overview", href: "/doctor", icon: BarChart3 },
        { label: "My Patients", href: "/doctor/patients", icon: Users, badge: referrals.length },
        // Only show for doctors, not assistants
        ...(!isAssistant ? [
          { label: "Assistants", href: "/doctor/assistants", icon: UserCheck },
          { label: "Analytics", href: "/doctor/admin", icon: BarChart3 },
        ] : []),
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin has not approved</h2>
          <p className="text-gray-600 mb-8 text-lg">
            Your account is not approved by admin. Please contact support or wait for approval to access your dashboard.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleLogout} className="gap-2 px-6">
              <ArrowLeft className="w-4 h-4" />
              Back
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
        subtitle={isAssistant ? "Assistant Portal" : "Doctor Portal"}
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
                  {userChip === "loading" || userChip === "error"
                    ? "DR"
                    : (userChip.name || "")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("") || "DR"}
                </div>
                <span className="text-sm font-medium">
                  {userChip === "loading"
                    ? "Loading..."
                    : userChip === "error"
                      ? "—"
                      : userChip.name || userChip.email || userChip.phone || "—"}
                </span>
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
                          Helped
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
                      { label: "Helped On", value: formatReferralDate(selectedPatient) },
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
                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <Button onClick={() => navigate(`/doctor/patient/patient-${selectedPatient.patient_name?.toLowerCase().replace(/\s+/g, '-') || 'user'}-${selectedPatient.id}/create-diet`)}>
                      Create Diet Plan
                    </Button>
                  </div>
                </div>
              </div>
            )}

            
            {/* Help Patient view */}
            {!selectedPatient && activeView === "refer_patient" && (
              <div className="p-6 space-y-6">
                {/* Refer Patient Form */}
                <div className="bg-card rounded-xl border p-6">
                  <h2 className="text-lg font-semibold mb-4">Refer a New Patient</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient Name</label>
                      <Input 
                        placeholder="e.g. Priya Sharma" 
                        className="mt-1.5" 
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mobile Number *</label>
                      <Input 
                        type="tel"
                        inputMode="numeric"
                        placeholder="9876543210" 
                        className="mt-1.5" 
                        value={patientPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        maxLength={10}
                        pattern="[6-9][0-9]{9}"
                      />
                      {patientPhone && !isValidIndianPhone(patientPhone) && (
                        <p className="text-xs text-red-500 mt-1">Enter valid 10-digit number starting with 6-9</p>
                      )}
                      {patientPhone.length === 10 && isValidIndianPhone(patientPhone) && isExistingPatient && (
                        <p className="text-xs text-amber-600 mt-1">This number already exists</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Diagnosis</label>
                      <select value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm capitalize">
                        {diagnosisOptions.map((d) => (<option key={d} value={d} className="capitalize">{d}</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 mt-4 items-end">
                    <div className="flex-1 w-full">
                      <Input 
                        placeholder="Optional: clinical notes for the dietician..." 
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                      />
                    </div>
                    <Button 
                      className="gap-2 px-6 w-full md:w-auto" 
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
              </div>
            )}

            {/* Overview view */}
            {!selectedPatient && activeView === "overview" && (
              <div className="p-6 space-y-6">
                {/* Stats Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-card rounded-xl border p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-primary">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{doctorStats?.total_referred || referrals.length}</div>
                      <div className="text-sm text-muted-foreground">Patients Helped</div>
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
                  <div className="bg-card rounded-xl border p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-info">
                      <IndianRupee className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">₹{(doctorStats?.total_commission || 0).toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Total Money Earned</div>
                    </div>
                  </div>
                </div>

                {/* Recent patients helped */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Recent Patients Helped</h2>
                    <span className="text-sm text-muted-foreground">{referrals.length} patients helped</span>
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
                            <td className="p-4 text-muted-foreground">{formatReferralDate(r)}</td>
                            <td className="p-4 text-right">
                              <Button variant="outline" size="sm" className="text-xs">View</Button>
                            </td>
                          </tr>
                        ))}
                        {referrals.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-12 text-center">
                              <div className="text-3xl mb-2">🌱</div>
                              <p className="font-medium text-foreground">No patients helped yet</p>
                              <p className="text-sm text-muted-foreground mt-1">Your first patient help is one step away. Every patient journey starts here.</p>
                            </td>
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
                  <div className="flex items-center gap-3">
                    <select
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value as "all" | "paid" | "unpaid")}
                      className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
                    >
                      <option value="all">All payments</option>
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                    </select>
                    <span className="text-sm text-muted-foreground">{filteredDoctorPatients.length} shown</span>
                  </div>
                </div>
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search patients..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} className="pl-9" />
                </div>
                <div className="bg-card rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="text-left p-4 font-semibold">Patient</th>
                        <th className="text-left p-4 font-semibold">Phone</th>
                        <th className="text-left p-4 font-semibold">Helped on</th>
                        <th className="text-left p-4 font-semibold">Payment status</th>
                        <th className="text-left p-4 font-semibold">Consultation status</th>
                        <th className="text-left p-4 font-semibold">Improvement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorPatientsLoading && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            Loading patients...
                          </td>
                        </tr>
                      )}
                      {!doctorPatientsLoading && filteredDoctorPatients.map((patient) => {
                        const paymentStatus = String(patient.payment_status || "unpaid").toLowerCase();
                        const paymentLabel = paymentStatus === "paid" ? "Paid" : "Unpaid";
                        const paymentBadgeClass = paymentStatus === "paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200";
                        const consultationStatus = String(patient.consultation_status || "not_yet").toLowerCase();
                        const consultationLabel = consultationStatus === "completed"
                          ? "Completed"
                          : consultationStatus === "booked"
                            ? "Booked"
                            : "Not yet";
                        const consultationBadgeClass = consultationStatus === "completed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : consultationStatus === "booked"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-muted text-muted-foreground border-muted";

                        return (
                          <tr key={patient.id} className="border-b last:border-0">
                            <td className="p-4 font-medium">{patient.name || "Unknown"}</td>
                            <td className="p-4 text-muted-foreground">{patient.phone}</td>
                            <td className="p-4 text-muted-foreground">{formatDateValue(patient.referred_at)}</td>
                            <td className="p-4">
                              <Badge variant="outline" className={`text-xs ${paymentBadgeClass}`}>{paymentLabel}</Badge>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className={`text-xs ${consultationBadgeClass}`}>{consultationLabel}</Badge>
                            </td>
                            <td className="p-4">
                              <Select 
                                value={patient.improvement_score ? String(patient.improvement_score) : ""} 
                                onValueChange={async (value) => {
                                  try {
                                    await updatePatientImprovementScore(patient.id, Number(value));
                                    queryClient.invalidateQueries({ queryKey: ["doctorPatients"] });
                                    toast.success("Patient score updated");
                                  } catch (err) {
                                    console.error("Failed to update improvement score", err);
                                    toast.error("Failed to update score");
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[110px] h-8 text-xs">
                                  <SelectValue placeholder="Not rated" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({length: 10}, (_, i) => i + 1).map(n => (
                                    <SelectItem key={n} value={String(n)}>{n} / 10</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        );
                      })}
                      {!doctorPatientsLoading && filteredDoctorPatients.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">No patients found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Assistants view - Only for doctors, not assistants */}
            {!selectedPatient && activeView === "assistants" && !isAssistant && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">My Assistants</h2>
                    <p className="text-sm text-muted-foreground mt-1">Assistants can help patients on your behalf but cannot view your fees or analytics.</p>
                  </div>
                  <Button size="sm" onClick={() => setShowAddAssistant(true)} className="gap-1">
                    <Plus className="w-4 h-4" />
                    Add Assistant
                  </Button>
                </div>

                {/* Add Assistant Form */}
                {showAddAssistant && (
                  <form className="bg-card rounded-xl border p-6 space-y-4" onSubmit={handleAddAssistant}>
                    <h3 className="text-sm font-semibold">Create Assistant Account</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name *</label>
                        <Input
                          autoFocus
                          placeholder="e.g. Priya Sharma"
                          className="mt-1.5"
                          value={newAssistantName}
                          onChange={(e) => setNewAssistantName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone *</label>
                        <Input
                          type="tel"
                          inputMode="numeric"
                          placeholder="9876543210"
                          className="mt-1.5"
                          value={newAssistantPhone}
                          onChange={(e) => setNewAssistantPhone(formatPhoneForDisplay(e.target.value))}
                          maxLength={10}
                          pattern="[6-9][0-9]{9}"
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
                      <Button type="submit" disabled={createAssistantMutation.isPending}>
                        {createAssistantMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                        ) : "Create Assistant Account"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => {
                        setShowAddAssistant(false);
                        setNewAssistantName("");
                        setNewAssistantPhone("");
                        setNewAssistantPassword("");
                      }}>Cancel</Button>
                    </div>
                  </form>
                )}

                {/* Assistants List */}
                <div className="bg-card rounded-xl border overflow-hidden">
                  <div className="divide-y">
                    {assistants.length > 0 ? (
                      assistants.map((assistant) => (
                        <div key={assistant.id} className="flex items-center justify-between p-4">
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
                                if (confirm(`Remove ${assistant.name}?`)) {
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
                      <div className="text-center text-muted-foreground py-12">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">No assistants yet</p>
                        <p className="text-xs mt-1">Add an assistant to help manage patient help requests</p>
                        <Button size="sm" className="mt-4 gap-1" onClick={() => setShowAddAssistant(true)}>
                          <Plus className="w-4 h-4" /> Add First Assistant
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Analytics view - Only for doctors, not assistants */}
            {!selectedPatient && activeView === "admin" && !isAssistant && (
              <div className="p-6 space-y-6">
                <h2 className="text-lg font-semibold">Analytics</h2>

                {/* Income info banner */}
                <div className="bg-sidebar text-sidebar-foreground rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-sidebar-foreground/60">Total Money Earned</p>
                      <p className="text-3xl font-bold mt-1 text-primary">₹{(doctorStats?.total_commission || 0).toLocaleString()}</p>
                      <p className="text-xs text-sidebar-foreground/50 mt-1">Clinical collaboration fees from your patients</p>
                    </div>
                    <div className="flex gap-8 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">{doctorStats?.total_referred || referrals.length}</div>
                        <div className="text-xs text-sidebar-foreground/50">Patients Helped</div>
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
                    { label: "Patients Helped", value: doctorStats?.total_referred || referrals.length, icon: Users, color: "text-primary" },
                    { label: "Onboarded Patients", value: doctorStats?.total_onboarded || 0, icon: UserCheck, color: "text-success" },
                    { label: "Fees Earned", value: `₹${(doctorStats?.total_commission || 0).toLocaleString()}`, icon: IndianRupee, color: "text-info" },
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
                  <h3 className="text-sm font-semibold mb-4">Recent Patients Helped</h3>
                  <div className="space-y-3">
                    {referrals.slice(0, 5).map((r) => (
                      <div key={r.id} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <div className="font-medium text-sm">{r.patient_name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground capitalize">{r.diagnosis || "No diagnosis"}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">{formatReferralDate(r)}</div>
                        </div>
                      </div>
                    ))}
                    {referrals.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-sm font-medium text-foreground">No patients helped yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Help your first patient to get started.</p>
                      </div>
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



