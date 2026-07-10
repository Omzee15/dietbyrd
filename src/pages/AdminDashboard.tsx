import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { Users, UserCheck, UserPlus, Stethoscope, UtensilsCrossed, BarChart3, Search, ArrowLeft, X, TrendingUp, Loader2, LogOut, Settings, Tag, Trash2, AlertTriangle, MapPin, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { getPatients, getDoctors, getDieticians, getAnalytics, getReferrals, assignDietician, getJoinRequests, Patient, Doctor, Dietician, Referral, getUserSessions, logoutAllUserSessions, logoutDeviceSession } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminSidebarSections } from "@/lib/admin-sidebar";

type ActiveTab = "patients" | "doctors" | "dieticians" | "analytics";
type TimeRangeFilter = "all" | "last_week" | "last_month" | "last_6_months" | "last_year" | "custom";

interface PatientWithReferral extends Patient {
  referredBy?: string;
  dietician?: string;
  dieticianId?: number | null;
}

interface AdminDoctorAssistant {
  id: number;
  user_id: number | null;
  doctor_id: number;
  name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

const PATIENT_PROGRESS_STEPS = [
  "Registration",
  "Payment",
  "Appointment",
  "Consultation",
] as const;

const getPatientCompletionSteps = (patient: PatientWithReferral) => {
  const hasRegistration = Boolean(patient.name && patient.phone);
  const hasPayment = isPatientPaid(patient);
  const hasAppointment = Boolean(patient.assigned_rd_id);
  const hasConsultation = false; // TODO: Check if patient has completed consultation

  return [hasRegistration, hasPayment, hasAppointment, hasConsultation];
};

const paidPaymentStatuses = new Set(["success", "paid", "captured"]);

const isPatientPaid = (patient: Pick<Patient, "payment_status" | "payment_history">) =>
  patient.payment_status === "paid" ||
  (patient.payment_history?.some((payment) => paidPaymentStatuses.has(String(payment.status).toLowerCase())) ?? false);

const ManageUserSessionsDialog = ({ userId, onClose }: { userId: number | null; onClose: () => void }) => {
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["userSessions", userId],
    queryFn: () => userId ? getUserSessions(userId) : Promise.resolve([]),
    enabled: !!userId,
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => logoutAllUserSessions(userId!),
    onSuccess: () => {
      toast.success("All sessions terminated successfully");
      queryClient.invalidateQueries({ queryKey: ["userSessions", userId] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to terminate all sessions");
    }
  });

  const logoutDeviceMutation = useMutation({
    mutationFn: (sessionToken: string) => logoutDeviceSession(sessionToken),
    onSuccess: () => {
      toast.success("Session terminated successfully");
      queryClient.invalidateQueries({ queryKey: ["userSessions", userId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to terminate session");
    }
  });

  return (
    <Dialog open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Active Sessions</DialogTitle>
          <DialogDescription>
            View and terminate active sessions for this user.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !sessions || sessions.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">No active sessions found.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => logoutAllMutation.mutate()}
                disabled={logoutAllMutation.isPending}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                {logoutAllMutation.isPending ? "Terminating..." : "Logout All Devices"}
              </Button>
            </div>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Device / Browser</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Expires At</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{session.ip_address}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs" title={session.user_agent}>
                        {session.user_agent || "Unknown"}
                      </TableCell>
                      <TableCell className="text-xs">{new Date(session.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{new Date(session.expires_at).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => logoutDeviceMutation.mutate(session.session_token)}
                          disabled={logoutDeviceMutation.isPending}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState<ActiveTab>("patients");
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientWithReferral | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "patient" | "doctor" | "dietician"; id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [doctorSearch, setDoctorSearch] = useState("");
  const [dieticianSearch, setDieticianSearch] = useState("");
  const [commissionDrafts, setCommissionDrafts] = useState<Record<number, string>>({});
  const [savingCommissionId, setSavingCommissionId] = useState<number | null>(null);
  const [selectedAssistantDoctorId, setSelectedAssistantDoctorId] = useState<number | null>(null);
  const [sessionUserId, setSessionUserId] = useState<number | null>(null);

  // Patient list filter state
  const [referredByFilter, setReferredByFilter] = useState<string>("all");
  const [dieticianFilter, setDieticianFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRangeFilter>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [patientPage, setPatientPage] = useState(1);
  const [patientPageSize, setPatientPageSize] = useState(10);

  // Sync activeTab with URL
  useEffect(() => {
    if (location.pathname === "/admin/patients") {
      setActiveTab("patients");
    } else if (location.pathname === "/admin/doctors") {
      setActiveTab("doctors");
    } else if (location.pathname === "/admin/dieticians") {
      setActiveTab("dieticians");
    } else if (location.pathname === "/admin/analytics" || location.pathname === "/admin/referrals") {
      setActiveTab("analytics");
    } else if (location.pathname === "/admin") {
      setActiveTab("patients");
    }
  }, [location.pathname]);

  const handleTabChange = (tab: ActiveTab) => {
    const paths: Record<ActiveTab, string> = {
      patients: "/admin/patients",
      doctors: "/admin/doctors",
      dieticians: "/admin/dieticians",
      analytics: "/admin/referrals",
    };
    navigate(paths[tab]);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Fetch data from API
  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: getPatients,
  });

  const { data: doctors = [], isLoading: doctorsLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: getDoctors,
  });

  const { data: selectedDoctorAssistants = [], isLoading: assistantsLoading, isError: assistantsError } = useQuery({
    queryKey: ["adminDoctorAssistants", selectedAssistantDoctorId],
    queryFn: async () => {
      if (!user || !selectedAssistantDoctorId) return [];

      const response = await fetch(`/api/admin/doctors/${selectedAssistantDoctorId}/assistants`, {
        headers: {
          "x-user-id": String(user.id),
          "x-user-role": String(user.role),
        },
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load doctor assistants");
      }

      return data.data as AdminDoctorAssistant[];
    },
    enabled: !!user && !!selectedAssistantDoctorId,
  });

  const { data: dieticians = [], isLoading: dieticiansLoading } = useQuery({
    queryKey: ["dieticians"],
    queryFn: getDieticians,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: getAnalytics,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["referrals"],
    queryFn: getReferrals,
  });

  const updateCommissionMutation = useMutation({
    mutationFn: async ({ doctorUserId, percent }: { doctorUserId: number; percent: number; doctorName: string }) => {
      if (!user) {
        throw new Error("Not authenticated");
      }
      const response = await fetch(`/api/admin/doctors/${doctorUserId}/commission`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
          "x-user-role": String(user.role),
        },
        body: JSON.stringify({ percent }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to update commission");
      }

      return data.data as { commission_percent?: number };
    },
    onMutate: ({ doctorUserId }) => {
      setSavingCommissionId(doctorUserId);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["doctors"], (old = []) =>
        (old as Array<Record<string, any>>).map((doc) =>
          doc.user_id === variables.doctorUserId
            ? { ...doc, commission_percent: data?.commission_percent ?? variables.percent }
            : doc
        )
      );
      toast.success(`Commission set to ${variables.percent}% for Dr. ${variables.doctorName}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update commission");
    },
    onSettled: () => {
      setSavingCommissionId(null);
    },
  });

  // Mutation for assigning dietician
  const assignDieticianMutation = useMutation({
    mutationFn: ({ patientId, dieticianId }: { patientId: number; dieticianId: number }) =>
      assignDietician(patientId, dieticianId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      const dieticianName = dieticians.find(d => d.id === variables.dieticianId)?.name;
      toast.success(`Patient assigned to ${dieticianName || "dietician"}`);
      if (selectedPatient) {
        setSelectedPatient({
          ...selectedPatient,
          dietician: dieticianName,
          dieticianId: variables.dieticianId,
        });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign dietician");
    },
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const urlMap = { patient: "patients", doctor: "doctors", dietician: "dieticians" };
      const res = await fetch(`/api/${urlMap[deleteTarget.type]}/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      const queryKey = [urlMap[deleteTarget.type]] as const;

      if (!data.success) {
        const errorMessage = typeof data.error === "string" ? data.error : "Delete failed";
        const isNotFound = errorMessage.toLowerCase().includes("not found");
        if (!isNotFound) {
          throw new Error(errorMessage);
        }
      }

      queryClient.setQueryData(queryKey, (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((item: { id: number }) => item.id !== deleteTarget.id);
      });
      queryClient.invalidateQueries({ queryKey });
      toast.success(`${deleteTarget.name} deleted successfully`);
      setDeleteTarget(null);
      if (selectedPatient?.id === deleteTarget.id) setSelectedPatient(null);
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  // Enrich patients with referral and dietician info
  const enrichedPatients: PatientWithReferral[] = patients.map((p) => {
    const referral = referrals.find((r) => r.patient_id === p.id);
    return {
      ...p,
      referredBy: referral?.doctor_name || "Direct",
      dietician: p.assigned_dietician_name || undefined,
      dieticianId: p.assigned_rd_id,
    };
  });

  // Get unique referring doctors for filter dropdown
  const referringDoctors = [...new Set(enrichedPatients.map(p => p.referredBy).filter(Boolean))];

  const getDoctorCommissionValue = (doctor: Doctor) => {
    const draft = commissionDrafts[doctor.id];
    if (draft !== undefined) {
      return draft;
    }
    const current = (doctor as Doctor & { commission_percent?: number }).commission_percent;
    if (current === null || current === undefined || Number.isNaN(Number(current))) {
      return "15";
    }
    return String(current);
  };

  const handleSaveCommission = (doctor: Doctor) => {
    const doctorUserId = (doctor as Doctor & { user_id?: number }).user_id;
    if (!doctorUserId) {
      toast.error("Doctor account is missing a linked user ID.");
      return;
    }

    const rawValue = getDoctorCommissionValue(doctor);
    const percent = Number(rawValue);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      toast.error("Commission must be a number between 0 and 100.");
      return;
    }

    updateCommissionMutation.mutate({ doctorUserId, percent, doctorName: doctor.name });
  };

  const matchesTimeRange = (createdAt: string) => {
    if (timeRangeFilter === "all") return true;

    const createdDate = new Date(createdAt);
    if (Number.isNaN(createdDate.getTime())) return false;

    if (timeRangeFilter === "custom") {
      if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        if (createdDate < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        if (createdDate > end) return false;
      }
      return true;
    }

    const now = new Date();
    const start = new Date(now);

    if (timeRangeFilter === "last_week") {
      start.setDate(start.getDate() - 7);
    } else if (timeRangeFilter === "last_month") {
      start.setMonth(start.getMonth() - 1);
    } else if (timeRangeFilter === "last_6_months") {
      start.setMonth(start.getMonth() - 6);
    } else if (timeRangeFilter === "last_year") {
      start.setFullYear(start.getFullYear() - 1);
    }

    return createdDate >= start;
  };

  const filteredPatients = enrichedPatients.filter((p) => {
    // Search filter
    const matchesSearch = 
      (p.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (p.diagnosis?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (p.referredBy?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (p.dietician?.toLowerCase() || "").includes(search.toLowerCase());
    
    // Referred by filter
    const matchesReferredBy = referredByFilter === "all" || p.referredBy === referredByFilter;
    
    // Dietician filter
    let matchesDietician = true;
    if (dieticianFilter === "not-assigned") {
      matchesDietician = !p.dieticianId;
    } else if (dieticianFilter !== "all") {
      matchesDietician = p.dieticianId?.toString() === dieticianFilter;
    }
    
    // Payment status filter
    let matchesStatus = true;
    if (statusFilter === "paid") {
      matchesStatus = isPatientPaid(p);
    } else if (statusFilter === "unpaid") {
      matchesStatus = !isPatientPaid(p);
    }

    const matchesTime = matchesTimeRange(p.created_at);
    
    return matchesSearch && matchesReferredBy && matchesDietician && matchesStatus && matchesTime;
  });

  useEffect(() => {
    setPatientPage(1);
  }, [search, referredByFilter, dieticianFilter, statusFilter, timeRangeFilter, customStartDate, customEndDate]);

  const totalPatientPages = Math.max(1, Math.ceil(filteredPatients.length / patientPageSize));

  useEffect(() => {
    if (patientPage > totalPatientPages) {
      setPatientPage(totalPatientPages);
    }
  }, [patientPage, totalPatientPages]);

  const paginatedPatients = filteredPatients.slice(
    (patientPage - 1) * patientPageSize,
    patientPage * patientPageSize
  );

  const paidCount = patients.filter(isPatientPaid).length;
  const unpaidCount = patients.length - paidCount;

  // Calculate registration status counts
  const registeredCount = patients.filter((p) => p.dietary_preference || p.age || p.gender).length;
  const pendingCount = patients.length - registeredCount;

  // Fetch pending join requests count
  const { data: joinRequests = [] } = useQuery({
    queryKey: ["join-requests", "pending"],
    queryFn: () => getJoinRequests("pending"),
  });

  const sidebarSections = getAdminSidebarSections({
    patients: patients.length,
    doctors: doctors.length,
    dieticians: dieticians.length,
    joinRequests: joinRequests.length,
  });

  const bottomContent = (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-400 hover:bg-red-500/10 transition-all duration-150"
    >
      <LogOut className="w-[18px] h-[18px] shrink-0" />
      <span>Sign Out</span>
    </button>
  );

  const isLoading = patientsLoading || doctorsLoading || dieticiansLoading;

  return (
    <div className="flex min-h-screen">
      <AppSidebar title="DietByRD" subtitle={user?.name || "Admin Panel"} sections={sidebarSections} bottomContent={bottomContent} />

      <main className="flex-1 bg-background">
        <div className="flex items-center justify-end px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sidebar text-sidebar-primary-foreground flex items-center justify-center text-xs font-semibold">
              {user?.name?.split(" ").map(n => n[0]).join("") || "AD"}
            </div>
            <span className="text-sm font-medium">{user?.name || "Admin"}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Patient Detail */}
            {selectedPatient ? (
              <div className="p-6">
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)} className="mb-4 gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <div className="bg-card rounded-xl border p-6 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                        {(selectedPatient.name || "?").split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{selectedPatient.name || "Unknown"}</h2>
                        <div className="text-sm text-muted-foreground">
                          {selectedPatient.age || "?"} yrs · {selectedPatient.gender || "Unknown"} · {selectedPatient.phone}
                        </div>
                        <Badge variant="outline" className={`mt-1 ${isPatientPaid(selectedPatient) ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}`}>
                          {isPatientPaid(selectedPatient) ? "Paid" : "Unpaid"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSessionUserId(selectedPatient.id)} className="gap-2 text-muted-foreground h-8">
                        <Settings className="w-3.5 h-3.5" /> Sessions
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)} className="h-8"><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Diagnosis", value: selectedPatient.diagnosis || "Not specified" },
                      { label: "Recommended By", value: selectedPatient.referredBy || "Direct" },
                      { label: "Created", value: new Date(selectedPatient.created_at).toLocaleDateString() },
                      { label: "Diet Preference", value: selectedPatient.dietary_preference || "Not set" },
                    ].map((item) => (
                      <div key={item.label} className="bg-muted/50 rounded-xl p-4">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</div>
                        <div className="font-semibold mt-1 capitalize">{item.value}</div>
                      </div>
                    ))}
                  </div>
                  {selectedPatient.diagnosis_description && (
                    <div>
                      <div className="text-sm font-semibold mb-2">Diagnosis Details</div>
                      <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">{selectedPatient.diagnosis_description}</div>
                    </div>
                  )}
                  
                  {/* Dietician Assignment Section */}
                  <div className="border-t pt-6">
                    <div className="text-sm font-semibold mb-3">Assigned Dietician</div>
                    <div className="flex items-center gap-4">
                      <Select
                        value={selectedPatient.dieticianId?.toString() || ""}
                        onValueChange={(value) => {
                          if (value) {
                            assignDieticianMutation.mutate({
                              patientId: selectedPatient.id,
                              dieticianId: parseInt(value),
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select a dietician" />
                        </SelectTrigger>
                        <SelectContent>
                          {dieticians.map((d) => (
                            <SelectItem key={d.id} value={d.id.toString()}>
                              {d.name} {d.specializations?.length ? `(${d.specializations.join(", ")})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {assignDieticianMutation.isPending && (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      )}
                      {selectedPatient.dietician && (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          Currently: {selectedPatient.dietician}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Patients Tab */}
                {activeTab === "patients" && (
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Total Patients", value: patients.length, icon: Users, color: "text-primary" },
                        { label: "Paid", value: paidCount, icon: UserCheck, color: "text-success" },
                        { label: "Unpaid", value: unpaidCount, icon: Users, color: "text-warning" },
                      ].map((s) => (
                        <div key={s.label} className="bg-card rounded-xl border p-5 flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center ${s.color}`}><s.icon className="w-6 h-6" /></div>
                          <div>
                            <div className="text-2xl font-bold">{s.value}</div>
                            <div className="text-sm text-muted-foreground">{s.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                      </div>
                      <Select value={referredByFilter} onValueChange={setReferredByFilter}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Recommended By" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sources</SelectItem>
                          {referringDoctors.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={dieticianFilter} onValueChange={setDieticianFilter}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Dietician" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Dieticians</SelectItem>
                          <SelectItem value="not-assigned">Not Assigned</SelectItem>
                          {dieticians.map(d => (
                            <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[170px]">
                          <SelectValue placeholder="Payment Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Payment Status</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={timeRangeFilter} onValueChange={(value) => setTimeRangeFilter(value as TimeRangeFilter)}>
                        <SelectTrigger className="w-[170px]">
                          <SelectValue placeholder="Time Range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="last_week">Last Week</SelectItem>
                          <SelectItem value="last_month">Last Month</SelectItem>
                          <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                          <SelectItem value="last_year">Last Year</SelectItem>
                          <SelectItem value="custom">Custom Date</SelectItem>
                        </SelectContent>
                      </Select>
                      {timeRangeFilter === "custom" && (
                        <>
                          <Input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="w-[170px]"
                          />
                          <Input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-[170px]"
                          />
                        </>
                      )}
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Rows</span>
                        <Select
                          value={patientPageSize.toString()}
                          onValueChange={(value) => {
                            setPatientPageSize(parseInt(value, 10));
                            setPatientPage(1);
                          }}
                        >
                          <SelectTrigger className="w-[90px]">
                            <SelectValue placeholder="Rows" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="bg-card rounded-xl border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                            <th className="text-left p-4 font-semibold">Patient</th>
                            <th className="text-left p-4 font-semibold">Progress</th>
                            <th className="text-left p-4 font-semibold">Recommended By</th>
                            <th className="text-left p-4 font-semibold">Dietician</th>
                            <th className="text-right p-4 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPatients.map((p) => (
                            <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedPatient(p)}>
                              <td className="p-4 font-medium">{p.name || "Unknown"}</td>
                              <td className="p-4 min-w-[320px]">
                                {(() => {
                                  const completionSteps = getPatientCompletionSteps(p);
                                  const completedCount = completionSteps.filter(Boolean).length;
                                  return (
                                    <div className="space-y-2">
                                      <div className="grid grid-cols-4 gap-1.5">
                                        {completionSteps.map((isComplete, stepIndex) => (
                                          <div
                                            key={PATIENT_PROGRESS_STEPS[stepIndex]}
                                            title={PATIENT_PROGRESS_STEPS[stepIndex]}
                                            className={`h-2.5 rounded-full ${isComplete ? "bg-primary" : "bg-muted"}`}
                                          />
                                        ))}
                                      </div>
                                      <p className="text-[11px] text-muted-foreground">
                                        {completedCount}/4 completed
                                      </p>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="p-4 text-muted-foreground">{p.referredBy}</td>
                              <td className="p-4">
                                {p.dietician ? (
                                  <span className="text-primary font-medium">{p.dietician}</span>
                                ) : (
                                  <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/20">
                                    Not Assigned
                                  </Badge>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="outline" size="sm" className="text-xs">{isPatientPaid(p) ? "View" : "Awaiting Payment"}</Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "patient", id: p.id, name: p.name || "Patient" }); }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredPatients.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-muted-foreground">No patients found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      {filteredPatients.length > 0 && (
                        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
                          <span>
                            Showing {(patientPage - 1) * patientPageSize + 1}
                            -{Math.min(patientPage * patientPageSize, filteredPatients.length)} of {filteredPatients.length}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPatientPage((prev) => Math.max(1, prev - 1))}
                              disabled={patientPage === 1}
                            >
                              Previous
                            </Button>
                            <span>
                              Page {patientPage} of {totalPatientPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPatientPage((prev) => Math.min(totalPatientPages, prev + 1))}
                              disabled={patientPage >= totalPatientPages}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Doctors Tab */}
                {activeTab === "doctors" && (
                  <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Doctors ({doctors.length})</h2>
                      <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, city, clinic..."
                          value={doctorSearch}
                          onChange={(e) => setDoctorSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {doctors.filter((d) => {
                        if (!doctorSearch) return true;
                        const s = doctorSearch.toLowerCase();
                        return (
                          d.name.toLowerCase().includes(s) ||
                          (d.clinic_name || "").toLowerCase().includes(s) ||
                          (d.clinic_address || "").toLowerCase().includes(s) ||
                          d.qualification.toLowerCase().includes(s)
                        );
                      }).map((d) => (
                        <div
                          key={d.id}
                          className={`bg-card border rounded-2xl p-5 ${selectedAssistantDoctorId === d.id ? "md:col-span-2 lg:col-span-3" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {d.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold">{d.name}</div>
                              <div className="text-xs text-muted-foreground">{d.qualification}</div>
                                {d.email && <div className="text-xs text-muted-foreground">{d.email}</div>}
                              <div className="text-xs text-muted-foreground">{d.clinic_name || "Independent"}</div>
                              {d.clinic_address && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {d.clinic_address}
                                </div>
                              )}
                              {(d as any).phone && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <Phone className="w-3 h-3" />
                                  {(d as any).phone}
                                </div>
                              )}
                            </div>
                            <Badge variant="outline" className={d.is_verified ? "text-success border-success/30" : "text-warning border-warning/30"}>
                              {d.is_verified ? "Verified" : "Pending"}
                            </Badge>
                          </div>
                          <div className="mt-3 pt-3 border-t space-y-2 text-xs text-muted-foreground">
                            <div className="flex items-center justify-between">
                              <span>{d.total_referrals || 0} patients referred</span>
                              <div className="flex gap-1">
                                {d.user_id && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-7 text-muted-foreground hover:bg-muted"
                                    onClick={(e) => { e.stopPropagation(); setSessionUserId(d.user_id!); }}
                                  >
                                    <Settings className="w-3 h-3 mr-1" /> Sessions
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs h-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "doctor", id: d.id, name: d.name }); }}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px]">Commission %</span>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.5"
                                  min={0}
                                  max={100}
                                  value={getDoctorCommissionValue(d)}
                                  onChange={(e) =>
                                    setCommissionDrafts((prev) => ({
                                      ...prev,
                                      [d.id]: e.target.value,
                                    }))
                                  }
                                  className="h-7 w-20 text-xs"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-[11px]"
                                  disabled={savingCommissionId === (d as Doctor & { user_id?: number }).user_id}
                                  onClick={() => handleSaveCommission(d)}
                                >
                                  {savingCommissionId === (d as Doctor & { user_id?: number }).user_id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    "Save"
                                  )}
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px]">Assistants</span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px]"
                                onClick={() =>
                                  setSelectedAssistantDoctorId((current) => current === d.id ? null : d.id)
                                }
                              >
                                {selectedAssistantDoctorId === d.id ? "Hide" : "View"}
                              </Button>
                            </div>
                            {selectedAssistantDoctorId === d.id && (
                              <div className="mt-3 rounded-lg border bg-background p-3">
                                <div className="mb-3">
                                  <div className="text-sm font-semibold text-foreground">Assistants</div>
                                  <div className="text-xs text-muted-foreground">
                                    People who have access to this doctor's portal
                                  </div>
                                </div>
                                {assistantsLoading ? (
                                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading assistants...
                                  </div>
                                ) : assistantsError ? (
                                  <p className="py-4 text-sm text-destructive">Failed to load assistants.</p>
                                ) : selectedDoctorAssistants.length === 0 ? (
                                  <p className="py-4 text-sm text-muted-foreground">No assistants assigned</p>
                                ) : (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Joined</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {selectedDoctorAssistants.map((assistant) => (
                                        <TableRow key={assistant.id}>
                                          <TableCell className="font-medium">{assistant.name}</TableCell>
                                          <TableCell>{assistant.phone || "Not provided"}</TableCell>
                                          <TableCell>{assistant.email || "Not provided"}</TableCell>
                                          <TableCell>
                                            <Badge
                                              variant="outline"
                                              className={assistant.is_active ? "text-success border-success/30" : "text-muted-foreground"}
                                            >
                                              {assistant.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>{new Date(assistant.created_at).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {doctors.filter((d) => {
                        if (!doctorSearch) return true;
                        const s = doctorSearch.toLowerCase();
                        return d.name.toLowerCase().includes(s) || (d.clinic_name||"").toLowerCase().includes(s) || (d.clinic_address||"").toLowerCase().includes(s);
                      }).length === 0 && (
                        <div className="col-span-3 text-center text-muted-foreground py-8">No doctors found</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dieticians Tab */}
                {activeTab === "dieticians" && (
                  <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Dieticians ({dieticians.length})</h2>
                      <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, specialization..."
                          value={dieticianSearch}
                          onChange={(e) => setDieticianSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dieticians.filter((d) => {
                        if (!dieticianSearch) return true;
                        const s = dieticianSearch.toLowerCase();
                        return (
                          d.name.toLowerCase().includes(s) ||
                          d.qualification.toLowerCase().includes(s) ||
                          (d.specializations || []).some((sp) => sp.toLowerCase().includes(s))
                        );
                      }).map((d) => (
                        <div key={d.id} className="bg-card border rounded-2xl p-5">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {d.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold">{d.name}</div>
                              <div className="text-xs text-muted-foreground">{d.qualification}</div>
                                {d.email && <div className="text-xs text-muted-foreground">{d.email}</div>}
                              {d.clinic_address && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{d.clinic_address}</div>}
                              <div className="text-xs text-muted-foreground">{d.phone || "—"}</div>
                            </div>
                            <Badge variant="outline" className={d.is_active ? "text-success border-success/30" : "text-muted-foreground"}>
                              {d.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="mt-3 pt-3 border-t flex justify-between text-xs text-muted-foreground">
                            <span>{d.active_patients || 0} active patients</span>
                            <div className="flex gap-1">
                              {d.user_id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs h-7 text-muted-foreground hover:bg-muted"
                                  onClick={(e) => { e.stopPropagation(); setSessionUserId(d.user_id!); }}
                                >
                                  <Settings className="w-3 h-3 mr-1" /> Sessions
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "dietician", id: d.id, name: d.name }); }}
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {dieticians.filter((d) => {
                        if (!dieticianSearch) return true;
                        const s = dieticianSearch.toLowerCase();
                        return d.name.toLowerCase().includes(s) || d.qualification.toLowerCase().includes(s) || (d.specializations||[]).some(sp=>sp.toLowerCase().includes(s));
                      }).length === 0 && (
                        <div className="col-span-3 text-center text-muted-foreground py-8">No dieticians found</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Analytics Tab */}
                {activeTab === "analytics" && (
                  <div className="p-6 space-y-6">
                    <h2 className="text-lg font-semibold">Platform Analytics</h2>
                    {analyticsLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {[
                            { label: "Total Patients", value: analytics?.total_patients || 0, icon: Users, color: "text-primary" },
                            { label: "Total Referrals", value: analytics?.total_referrals || 0, icon: TrendingUp, color: "text-success" },
                            { label: "Active Doctors", value: analytics?.active_doctors || 0, icon: Stethoscope, color: "text-info" },
                            { label: "Active Dieticians", value: analytics?.active_dieticians || 0, icon: UtensilsCrossed, color: "text-warning" },
                          ].map((s) => (
                            <div key={s.label} className="bg-card rounded-xl border p-5">
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${s.color}`}><s.icon className="w-5 h-5" /></div>
                                <div className="text-sm text-muted-foreground">{s.label}</div>
                              </div>
                              <div className="text-2xl font-bold">{s.value}</div>
                            </div>
                          ))}
                        </div>

                        {/* Payment Statistics */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="bg-card rounded-xl border p-6">
                            <h3 className="text-sm font-semibold mb-4">Payment Overview</h3>
                            <div className="space-y-4">
                              {(() => {
                                const paymentsByDate = patients.reduce((acc: Record<string, { count: number; total: number }>, p) => {
                                  if (p.payment_history && p.payment_history.length > 0) {
                                    p.payment_history.forEach((payment) => {
                                      if (payment.status === 'success' && payment.created_at) {
                                        const date = new Date(payment.created_at).toLocaleDateString();
                                        if (!acc[date]) {
                                          acc[date] = { count: 0, total: 0 };
                                        }
                                        acc[date].count += 1;
                                        // Convert paise to rupees by dividing by 100
                                        acc[date].total += (payment.amount || 0) / 100;
                                      }
                                    });
                                  }
                                  return acc;
                                }, {});

                                const sortedDates = Object.entries(paymentsByDate)
                                  .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                                  .slice(0, 7);

                                const totalPayments = Object.values(paymentsByDate).reduce((sum, item) => sum + item.count, 0);
                                const totalAmount = Object.values(paymentsByDate).reduce((sum, item) => sum + item.total, 0);

                                return (
                                  <>
                                    <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg">
                                      <div>
                                        <div className="text-xs text-muted-foreground uppercase">Total Payments</div>
                                        <div className="text-2xl font-bold text-success">{totalPayments}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs text-muted-foreground uppercase">Total Amount</div>
                                        <div className="text-xl font-bold text-success">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="text-xs font-medium text-muted-foreground uppercase">Recent by Date</div>
                                      {sortedDates.length > 0 ? sortedDates.map(([date, data]) => (
                                        <div key={date} className="flex items-center justify-between py-2 border-b last:border-0">
                                          <div className="text-sm">{date}</div>
                                          <div className="flex items-center gap-4">
                                            <span className="text-sm text-muted-foreground">{data.count} payment{data.count !== 1 ? 's' : ''}</span>
                                            <span className="text-sm font-medium">₹{data.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                          </div>
                                        </div>
                                      )) : (
                                        <div className="text-center text-muted-foreground py-4 text-sm">No payments yet</div>
                                      )}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Patient Growth Chart */}
                          <div className="bg-card rounded-xl border p-6">
                            <h3 className="text-sm font-semibold mb-4">Patient Growth</h3>
                            {(() => {
                              const patientsByMonth = patients.reduce((acc: Record<string, { joined: number; paid: number }>, p) => {
                                const date = new Date(p.created_at);
                                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                                if (!acc[monthKey]) {
                                  acc[monthKey] = { joined: 0, paid: 0 };
                                }
                                acc[monthKey].joined += 1;
                                if (isPatientPaid(p)) {
                                  acc[monthKey].paid += 1;
                                }
                                return acc;
                              }, {});

                              const sortedMonths = Object.entries(patientsByMonth)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .slice(-6);

                              const maxValue = Math.max(...sortedMonths.map(([_, data]) => Math.max(data.joined, data.paid)), 1);

                              return (
                                <div className="space-y-4">
                                  {sortedMonths.length > 0 ? sortedMonths.map(([month, data]) => {
                                    const [year, monthNum] = month.split('-');
                                    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                                    
                                    return (
                                      <div key={month} className="space-y-2">
                                        <div className="text-xs font-medium text-muted-foreground">{monthName}</div>
                                        <div className="space-y-1.5">
                                          <div className="flex items-center gap-2">
                                            <div className="w-16 text-xs text-muted-foreground">Joined:</div>
                                            <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden relative">
                                              <div 
                                                className="bg-primary h-full rounded-full transition-all flex items-center justify-end pr-2" 
                                                style={{ width: `${(data.joined / maxValue) * 100}%` }}
                                              >
                                                <span className="text-xs font-medium text-primary-foreground">{data.joined}</span>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <div className="w-16 text-xs text-muted-foreground">Paid:</div>
                                            <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden relative">
                                              <div 
                                                className="bg-success h-full rounded-full transition-all flex items-center justify-end pr-2" 
                                                style={{ width: `${(data.paid / maxValue) * 100}%` }}
                                              >
                                                <span className="text-xs font-medium text-white">{data.paid}</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }) : (
                                    <div className="text-center text-muted-foreground py-8 text-sm">No patient data yet</div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Recent referrals */}
                        <div className="bg-card rounded-xl border p-6">
                          <h3 className="text-sm font-semibold mb-4">Recent Referrals</h3>
                          <div className="space-y-3">
                            {referrals.slice(0, 5).map((r) => (
                              <div key={r.id} className="flex items-center justify-between py-3 border-b last:border-0">
                                <div>
                                  <div className="font-medium text-sm">{r.patient_name || "Unknown Patient"}</div>
                                  <div className="text-xs text-muted-foreground">by {r.doctor_name || "Unknown Doctor"}</div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(r.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            ))}
                            {referrals.length === 0 && (
                              <div className="text-center text-muted-foreground py-4">No referrals yet</div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
              <br />
              <span className="text-red-600 font-medium">This action is not reversible.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ManageUserSessionsDialog userId={sessionUserId} onClose={() => setSessionUserId(null)} />
    </div>
  );
};

export default AdminDashboard;

