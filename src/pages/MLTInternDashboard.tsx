import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { Users, Stethoscope, UtensilsCrossed, LogOut, Search, Apple, UserPlus, Plus, UserX, AlertTriangle, RefreshCw, Check, X, Loader2, Info, CalendarOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { assignDietician, assignDoctor, getPatients, getDoctors, getDieticians, getReferrals, getUnregisteredReferrals, getJoinRequests, getUnassignedAppointments, triggerAutoAssign, approveJoinRequest, rejectJoinRequest, verifyDoctor, getAllDieticianBlockedSlots, Patient, Doctor, Dietician, Referral, UnregisteredReferral, JoinRequest, AutoAssignResult } from "@/lib/api";
import { foodService } from "@/lib/food-service";
import { useAuth } from "@/contexts/AuthContext";
import type { Food } from "@/lib/diet-types";
import { Button } from "@/components/ui/button";
import { FoodLibraryAddDialog } from "@/components/diet";

type JoinRequestWithUserId = JoinRequest & { user_id?: number };

type TimeRangeFilter = "all" | "last_week" | "last_month" | "last_6_months" | "last_year" | "custom";

interface PatientWithReferral extends Patient {
  referredBy?: string;
  referredByDoctorId?: number | null;
  dietician?: string;
  dieticianId?: number | null;
}

const PATIENT_PROGRESS_STEPS = [
  "Registration",
  "Payment",
  "Appointment",
  "Consultation",
] as const;

const getPatientCompletionSteps = (patient: PatientWithReferral) => {
  const hasRegistration = Boolean(patient.name && patient.phone);
  const hasPayment =
    patient.payment_status === "paid" ||
    !!patient.dietary_preference ||
    (patient.payment_history?.some((payment) => payment.status === "success") ?? false);
  const hasAppointment = Boolean(patient.assigned_rd_id);
  const hasConsultation = false; // TODO: Check if patient has completed consultation

  return [hasRegistration, hasPayment, hasAppointment, hasConsultation];
};

const MLTInternDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  
  const [activeSection, setActiveSection] = useState<'patients' | 'doctors' | 'dieticians' | 'food-library' | 'join-requests' | 'unregistered-referrals'>('patients');
  const [search, setSearch] = useState("");
  const [referredByFilter, setReferredByFilter] = useState<string>("all");
  const [dieticianFilter, setDieticianFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRangeFilter>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [patientPage, setPatientPage] = useState(1);
  const [patientPageSize, setPatientPageSize] = useState(10);
  const [isFoodAddDialogOpen, setIsFoodAddDialogOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [selectedJoinRequest, setSelectedJoinRequest] = useState<JoinRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageRequest, setMessageRequest] = useState<JoinRequest | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [autoAssignResult, setAutoAssignResult] = useState<AutoAssignResult | null>(null);
  const { user } = useAuth();

  const handleClearFilters = () => {
    setReferredByFilter("all");
    setDieticianFilter("all");
    setStatusFilter("all");
    setTimeRangeFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  useEffect(() => {
    if (location.pathname === "/mlt-intern" || location.pathname === "/mlt-intern/patients") {
      setActiveSection("patients");
    } else if (location.pathname === "/mlt-intern/doctors") {
      setActiveSection("doctors");
    } else if (location.pathname === "/mlt-intern/dieticians") {
      setActiveSection("dieticians");
    } else if (location.pathname === "/mlt-intern/food-library") {
      setActiveSection("food-library");
    } else if (location.pathname === "/mlt-intern/join-requests") {
      setActiveSection("join-requests");
    } else if (location.pathname === "/mlt-intern/unregistered-referrals") {
      setActiveSection("unregistered-referrals");
    } else if (location.pathname === "/mlt-intern/leaves") {
      setActiveSection("leaves");
    }
  }, [location.pathname]);

  useEffect(() => {
    setSearch("");
  }, [activeSection]);

  // Approve join request mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message?: string }) =>
      approveJoinRequest(id, user?.id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join-requests"] });
      toast.success("Request approved! Account activated.");
      setShowApproveDialog(false);
      setSelectedJoinRequest(null);
      setAdminMessage("");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to approve request"),
  });

  // Reject join request mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason, message }: { id: number; reason?: string; message?: string }) =>
      rejectJoinRequest(id, user?.id, reason, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join-requests"] });
      toast.success("Request rejected.");
      setShowRejectDialog(false);
      setSelectedJoinRequest(null);
      setRejectionReason("");
      setAdminMessage("");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to reject request"),
  });

  // Fetch data
  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: getPatients,
  });

  const { data: doctors = [], isLoading: doctorsLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: getDoctors,
  });

  const { data: dieticians = [], isLoading: dieticiansLoading } = useQuery({
    queryKey: ["dieticians"],
    queryFn: getDieticians,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["referrals"],
    queryFn: getReferrals,
  });

  const { data: foods = [], isLoading: foodsLoading, refetch: refetchFoods } = useQuery({
    queryKey: ["food-library"],
    queryFn: foodService.getAll,
  });

  const { data: leaves = [], isLoading: leavesLoading } = useQuery({
    queryKey: ["all-dietician-blocked-slots"],
    queryFn: () => getAllDieticianBlockedSlots(),
  });

  const { data: joinRequests = [], isLoading: joinRequestsLoading } = useQuery({
    queryKey: ["join-requests", "pending"],
    queryFn: () => getJoinRequests("pending"),
  });

  const { data: unregisteredReferrals = [], isLoading: unregisteredReferralsLoading } = useQuery({
    queryKey: ["unregistered-referrals"],
    queryFn: getUnregisteredReferrals,
  });

  const { data: unassignedAppointments = [], refetch: refetchUnassigned } = useQuery({
    queryKey: ["unassigned-appointments"],
    queryFn: getUnassignedAppointments,
    refetchInterval: 60_000,
  });

  const autoAssignMutation = useMutation({
    mutationFn: triggerAutoAssign,
    onSuccess: (data) => {
      refetchUnassigned();
      setAutoAssignResult(data);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Auto-assign failed");
    },
  });

  const verifyDoctorMutation = useMutation({
    mutationFn: (doctorId: number) => verifyDoctor(doctorId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast.success(`${data.name} marked as verified`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to verify doctor");
    },
  });

  const assignDieticianMutation = useMutation({
    mutationFn: ({ patientId, dieticianId }: { patientId: number; dieticianId: number }) =>
      assignDietician(patientId, dieticianId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      const dieticianName = dieticians.find((dietician) => dietician.id === variables.dieticianId)?.name;
      toast.success(`Patient assigned to ${dieticianName || "dietician"}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign dietician");
    },
  });

  const assignDoctorMutation = useMutation({
    mutationFn: ({ patientId, doctorId }: { patientId: number; doctorId: number }) =>
      assignDoctor(patientId, doctorId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      const doctorName = doctors.find((doc) => doc.id === variables.doctorId)?.name;
      if (variables.doctorId) {
        toast.success(`Patient assigned to Dr. ${doctorName || "doctor"}`);
      } else {
        toast.success("Patient reset to Direct (No Doctor)");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign doctor");
    },
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const openMessageDialog = (request: JoinRequest) => {
    const recipientUserId = (request as JoinRequestWithUserId).user_id;
    if (!recipientUserId) {
      toast.error("No user linked to this join request yet.");
      return;
    }
    setMessageRequest(request);
    setMessageBody("");
    setShowMessageDialog(true);
  };

  const handleSendMessage = async () => {
    if (!messageRequest || !user) return;
    const recipientUserId = (messageRequest as JoinRequestWithUserId).user_id;
    if (!recipientUserId) {
      toast.error("No user linked to this join request yet.");
      return;
    }

    const trimmedMessage = messageBody.trim();
    if (trimmedMessage.length === 0) {
      toast.error("Message cannot be empty.");
      return;
    }

    setIsSendingMessage(true);
    try {
      const response = await fetch(`/api/join-requests/${messageRequest.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user.id),
          "x-user-role": String(user.role),
        },
        body: JSON.stringify({
          message: trimmedMessage,
          recipient_user_id: recipientUserId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to send message");
      }

      toast.success(`Message sent to ${messageRequest.name}`);
      setShowMessageDialog(false);
      setMessageBody("");
      setMessageRequest(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const enrichedPatients: PatientWithReferral[] = patients.map((patient) => {
    const referral = referrals.find((item: Referral) => item.patient_id === patient.id);
    return {
      ...patient,
      referredBy: referral?.doctor_name || "Direct",
      referredByDoctorId: referral?.doctor_id || null,
      dietician: patient.assigned_dietician_name || undefined,
      dieticianId: patient.assigned_rd_id,
    };
  });

  const referringDoctors = [...new Set(
    enrichedPatients
      .map((patient) => patient.referredBy)
      .filter((value): value is string => Boolean(value) && value !== "Direct")
  )] as string[];

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

  const filteredPatients = enrichedPatients.filter((patient) => {
    const matchesSearch =
      (patient.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (patient.diagnosis?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (patient.referredBy?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (patient.dietician?.toLowerCase() || "").includes(search.toLowerCase());

    let matchesReferredBy = true;
    if (referredByFilter === "any-doctor") {
      matchesReferredBy = patient.referredBy !== "Direct";
    } else if (referredByFilter !== "all") {
      matchesReferredBy = patient.referredBy === referredByFilter;
    }

    let matchesDietician = true;
    if (dieticianFilter === "not-assigned") {
      matchesDietician = !patient.dieticianId;
    } else if (dieticianFilter !== "all") {
      matchesDietician = patient.dieticianId?.toString() === dieticianFilter;
    }

    let matchesStatus = true;
    if (statusFilter === "paid") {
      matchesStatus = 
        patient.payment_status === "paid" ||
        patient.payment_history?.some((payment) => payment.status === "success") ||
        !!patient.dietary_preference;
    } else if (statusFilter === "unpaid") {
      matchesStatus = 
        patient.payment_status !== "paid" &&
        !patient.payment_history?.some((payment) => payment.status === "success") &&
        !patient.dietary_preference;
    }

    const matchesTime = matchesTimeRange(patient.created_at);

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

  const filteredDoctors = doctors.filter((d: Doctor) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.clinic_name?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const filteredDieticians = dieticians.filter((d: Dietician) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFoods = foods.filter((food: Food) =>
    food.name_en.toLowerCase().includes(search.toLowerCase()) ||
    food.category.toLowerCase().includes(search.toLowerCase())
  );

  const sidebarSections = [
    {
      title: "View",
      items: [
        { label: "Patients", href: "/mlt-intern/patients", icon: Users, badge: patients.length },
        { label: "Doctors", href: "/mlt-intern/doctors", icon: Stethoscope, badge: doctors.length },
        { label: "Dieticians", href: "/mlt-intern/dieticians", icon: UtensilsCrossed, badge: dieticians.length },
        { label: "Dietician Leaves", href: "/mlt-intern/leaves", icon: CalendarOff, badge: leaves.length || undefined },
        { label: "Join Requests", href: "/mlt-intern/join-requests", icon: UserPlus, badge: joinRequests.length || undefined },
        { label: "Unregistered Recommendations", href: "/mlt-intern/unregistered-referrals", icon: UserX, badge: unregisteredReferrals.length || undefined },
        { label: "Food Library", href: "/mlt-intern/food-library", icon: Apple, badge: foods.length },
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

  const isLoading = patientsLoading || doctorsLoading || dieticiansLoading || foodsLoading || joinRequestsLoading || unregisteredReferralsLoading;

  return (
    <div className="flex min-h-screen">
      <AppSidebar title="DietByRD" subtitle={user?.name || "MLT Intern"} sections={sidebarSections} bottomContent={bottomContent} />
      
      <main className="flex-1 p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{user?.name ? `${user.name}'s Dashboard` : "MLT Intern Dashboard"}</h1>
            <p className="text-gray-500 mt-1">Manage patient-to-dietician assignments and view system data</p>
          </div>

          {/* Dietitian allotment required banner */}
          {unassignedAppointments.length > 0 && (
            <div className="flex items-center justify-between gap-4 px-5 py-4 bg-amber-50 border border-amber-300 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">
                    Dietitian allotment required — {unassignedAppointments.length} appointment{unassignedAppointments.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    {unassignedAppointments.slice(0, 3).map((a) => {
                      const dt = new Date(a.scheduled_at);
                      return `${a.patient_name} (${dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} at ${dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })})`;
                    }).join(" · ")}
                    {unassignedAppointments.length > 3 && ` +${unassignedAppointments.length - 3} more`}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                onClick={() => autoAssignMutation.mutate()}
                disabled={autoAssignMutation.isPending}
              >
                {autoAssignMutation.isPending ? (
                  <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> Assigning…</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-1.5" /> Auto-Assign Now</>
                )}
              </Button>
            </div>
          )}

          {/* Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={`Search ${activeSection}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 max-w-md"
              />
            </div>
            {activeSection === "food-library" && (
              <Button onClick={() => setIsFoodAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add New Item
              </Button>
            )}
          </div>

          {activeSection === "patients" && (
            <div className="flex flex-wrap items-center gap-3">
              <Select value={referredByFilter} onValueChange={setReferredByFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Recommended By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="any-doctor">Any Doctor</SelectItem>
                  <SelectItem value="Direct">Direct</SelectItem>
                  {referringDoctors.map((doctorName) => (
                    <SelectItem key={doctorName} value={doctorName}>{doctorName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dieticianFilter} onValueChange={setDieticianFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Dietician" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dieticians</SelectItem>
                  <SelectItem value="not-assigned">Not Assigned</SelectItem>
                  {dieticians.map((dietician) => (
                    <SelectItem key={dietician.id} value={dietician.id.toString()}>{dietician.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
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

              <button
                type="button"
                onClick={handleClearFilters}
                className="h-10 px-4 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Clear Filters
              </button>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-gray-500">Rows</span>
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
          )}

          {/* Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {isLoading ? (
              <div className="p-12 text-center text-gray-500">Loading...</div>
            ) : activeSection === 'patients' ? (
              <div className="overflow-x-auto" key="patients">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sr. No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center gap-1">
                          Progress
                          <div className="relative group">
                            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case tracking-normal font-normal">
                              <p className="font-semibold mb-2 text-gray-100">Patient Progress Bars</p>
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-2 rounded-full bg-primary shrink-0" />
                                  <span className="text-gray-300"><span className="text-white font-medium">1st bar</span> — Registration (name &amp; phone on file)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-2 rounded-full bg-primary shrink-0" />
                                  <span className="text-gray-300"><span className="text-white font-medium">2nd bar</span> — Payment received</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-2 rounded-full bg-primary shrink-0" />
                                  <span className="text-gray-300"><span className="text-white font-medium">3rd bar</span> — Dietician assigned</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-2 rounded-full bg-primary shrink-0" />
                                  <span className="text-gray-300"><span className="text-white font-medium">4th bar</span> — Consultation completed</span>
                                </div>
                              </div>
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                            </div>
                          </div>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recommended By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assign Dietician</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPatients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <div className="text-4xl mb-3">🔍</div>
                          <p className="font-medium text-gray-700">No patients found</p>
                          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search query.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedPatients.map((patient: PatientWithReferral, index: number) => (
                        <tr
                          key={patient.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/mlt-intern/patient/${patient.id}`)}
                        >
                          <td className="px-6 py-4 text-sm text-gray-900">{(patientPage - 1) * patientPageSize + index + 1}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">{patient.name || 'N/A'}</td>
                          <td className="px-6 py-4">
                            {(() => {
                              const hasPaid = 
                                patient.payment_status === "paid" ||
                                patient.payment_history?.some((payment) => payment.status === "success") ||
                                !!patient.dietary_preference;
                              const paymentCount = patient.payment_history?.filter(p => p.status === "success").length || 0;
                              
                              return (
                                <div className="flex flex-col gap-1">
                                  <Badge variant={hasPaid ? "default" : "secondary"} className="w-fit">
                                    {hasPaid ? "Paid" : "Unpaid"}
                                  </Badge>
                                  {paymentCount > 0 && (
                                    <span className="text-xs text-gray-500">
                                      {paymentCount} payment{paymentCount !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 min-w-[320px]">
                            {(() => {
                              const completionSteps = getPatientCompletionSteps(patient);
                              const completedCount = completionSteps.filter(Boolean).length;
                              return (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-4 gap-1.5">
                                    {completionSteps.map((isComplete, stepIndex) => (
                                      <div
                                        key={PATIENT_PROGRESS_STEPS[stepIndex]}
                                        title={PATIENT_PROGRESS_STEPS[stepIndex]}
                                        className={`h-2.5 rounded-full ${isComplete ? "bg-primary" : "bg-gray-200"}`}
                                      />
                                    ))}
                                  </div>
                                  <p className="text-[11px] text-gray-500">
                                    {completedCount}/4 completed
                                  </p>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900" onClick={(event) => event.stopPropagation()}>
                            {patient.referredByDoctorId && doctors.find((d: Doctor) => d.id === patient.referredByDoctorId)
                              ? doctors.find((d: Doctor) => d.id === patient.referredByDoctorId)?.name
                              : "Direct (No Doctor)"}
                          </td>
                          <td className="px-6 py-4" onClick={(event) => event.stopPropagation()}>
                            {(() => {
                              const hasPaid =
                                patient.payment_status === "paid" ||
                                patient.payment_history?.some((p) => p.status === "success") ||
                                !!patient.dietary_preference;
                              return (
                            <div title={!hasPaid ? "Patient must pay before a dietician can be assigned" : undefined}>
                            <Select
                              value={hasPaid ? (patient.assigned_rd_id?.toString() || "unassigned") : undefined}
                              disabled={!hasPaid}
                              onValueChange={(value) => {
                                assignDieticianMutation.mutate({
                                  patientId: patient.id,
                                  dieticianId: value === "unassigned" ? 0 : parseInt(value, 10),
                                });
                              }}
                            >
                              <SelectTrigger className={`w-56 ${!hasPaid ? "opacity-50 cursor-not-allowed" : ""}`}>
                                <SelectValue placeholder={hasPaid ? "Select a dietician" : "Unpaid — cannot assign"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Not assigned</SelectItem>
                                {dieticians.map((dietician) => (
                                  <SelectItem key={dietician.id} value={dietician.id.toString()}>
                                    {dietician.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            </div>
                              );
                            })()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {filteredPatients.length > 0 && (
                  <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 text-xs text-gray-500">
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
            ) : activeSection === 'doctors' ? (
              <div className="overflow-x-auto" key="doctors">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qualification</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clinic</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredDoctors.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          No doctors found
                        </td>
                      </tr>
                    ) : (
                      filteredDoctors.map((doctor: Doctor) => (
                        <tr key={doctor.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/mlt-intern/doctor/${doctor.id}`)}>
                          <td className="px-6 py-4 font-medium text-gray-900">{doctor.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{doctor.qualification}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{doctor.clinic_name || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-900">{doctor.phone || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <Badge variant={doctor.is_verified ? 'default' : 'secondary'}>
                              {doctor.is_verified ? 'Verified' : 'Pending'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4" onClick={(event) => event.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              {!doctor.is_verified && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-green-700 border-green-300 hover:bg-green-50"
                                  onClick={() => verifyDoctorMutation.mutate(doctor.id)}
                                  disabled={verifyDoctorMutation.isPending}
                                >
                                  <Check className="w-3 h-3 mr-1" />Mark Verified
                                </Button>
                              )}
                              <button
                                type="button"
                                onClick={() => navigate(`/mlt-intern/doctor/${doctor.id}`)}
                                className="text-sm font-medium text-primary hover:underline"
                              >
                                View Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : activeSection === 'join-requests' ? (
              <div className="overflow-x-auto" key="join-requests">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qualification</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied On</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {joinRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          No join requests found
                        </td>
                      </tr>
                    ) : (
                      joinRequests
                        .filter((request: JoinRequest) =>
                          request.name.toLowerCase().includes(search.toLowerCase()) ||
                          request.phone.toLowerCase().includes(search.toLowerCase()) ||
                          request.requested_role.toLowerCase().includes(search.toLowerCase()) ||
                          request.qualification.toLowerCase().includes(search.toLowerCase())
                        )
                        .map((request: JoinRequest) => (
                          <tr key={request.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/mlt-intern/join-request/${request.id}`)}>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{request.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-mono">{request.phone}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 capitalize">{request.requested_role}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{request.qualification}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{new Date(request.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              <Badge variant="secondary" className="capitalize">
                                {request.status === "interview_sent" ? "Interview Sent" : request.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4" onClick={(event) => event.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                {user?.role === "mlt_intern" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2"
                                    onClick={() => openMessageDialog(request)}
                                  >
                                    💬 Send message
                                  </Button>
                                )}
                                {request.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-destructive border-destructive/30 hover:bg-destructive/10 h-7 px-2"
                                      onClick={() => { setSelectedJoinRequest(request); setAdminMessage(""); setShowRejectDialog(true); }}
                                    >
                                      <X className="w-3 h-3 mr-1" />Reject
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-7 px-2"
                                      onClick={() => { setSelectedJoinRequest(request); setAdminMessage(""); setShowApproveDialog(true); }}
                                    >
                                      <Check className="w-3 h-3 mr-1" />Approve
                                    </Button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => navigate(`/mlt-intern/join-request/${request.id}`)}
                                  className="text-sm font-medium text-primary hover:underline"
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : activeSection === 'unregistered-referrals' ? (
              <div className="overflow-x-auto" key="unregistered-referrals">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diagnosis</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recommended By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recommended On</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {unregisteredReferrals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          No unregistered recommendations found. All recommended patients have completed registration!
                        </td>
                      </tr>
                    ) : (
                      unregisteredReferrals
                        .filter((referral: UnregisteredReferral) =>
                          (referral.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
                          referral.phone.toLowerCase().includes(search.toLowerCase()) ||
                          (referral.diagnosis?.toLowerCase() || "").includes(search.toLowerCase()) ||
                          (referral.doctor_name?.toLowerCase() || "").includes(search.toLowerCase())
                        )
                        .map((referral: UnregisteredReferral) => (
                          <tr key={referral.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/mlt-intern/patient/${referral.id}`)}>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{referral.name || "—"}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-mono">{referral.phone}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{referral.diagnosis || "—"}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {referral.doctor_name ? (
                                <div>
                                  <div className="font-medium">Dr. {referral.doctor_name}</div>
                                  {referral.doctor_clinic && (
                                    <div className="text-xs text-gray-500">{referral.doctor_clinic}</div>
                                  )}
                                </div>
                              ) : "—"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {new Date(referral.referred_at).toLocaleDateString()}
                              <div className="text-xs text-gray-500">
                                {Math.floor((Date.now() - new Date(referral.referred_at).getTime()) / (1000 * 60 * 60 * 24))} days ago
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {referral.message_sent ? (
                                <Badge variant={referral.last_message_status === "sent" ? "default" : "destructive"}>
                                  {referral.last_message_status || "Sent"}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Not Sent</Badge>
                              )}
                            </td>
                            <td className="px-6 py-4" onClick={(event) => event.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => navigate(`/mlt-intern/patient/${referral.id}`)}
                                className="text-sm font-medium text-primary hover:underline"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : activeSection === 'leaves' ? (
              <div className="overflow-x-auto" key="leaves">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dietician</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leaves.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                          No dietician leaves found
                        </td>
                      </tr>
                    ) : (
                      leaves.map((leave: any) => (
                          <tr key={leave.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{leave.dietician_name || "Unknown"}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{leave.blocked_date_str}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {leave.start_time && leave.end_time
                                ? `${leave.start_time.slice(0, 5)} - ${leave.end_time.slice(0, 5)}`
                                : "Full Day"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{leave.reason || "N/A"}</td>
                          </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : activeSection === 'food-library' ? (
              <div className="overflow-x-auto" key="food-library">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calories</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Protein</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Carbs</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredFoods.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          No food library items found
                        </td>
                      </tr>
                    ) : (
                      filteredFoods.map((food: Food) => (
                          <tr key={food.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedFood(food)}>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{food.name_en}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{food.category}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{food.calories}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{food.protein} g</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{food.carbs} g</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{food.fat} g</td>
                            <td className="px-6 py-4">
                              <Badge variant="secondary">{food.food_type}</Badge>
                            </td>
                          </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto" key="dieticians">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qualification</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specializations</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredDieticians.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          No dieticians found
                        </td>
                      </tr>
                    ) : (
                      filteredDieticians.map((dietician: Dietician) => (
                        <tr key={dietician.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/mlt-intern/dietician/${dietician.id}`)}>
                          <td className="px-6 py-4 font-medium text-gray-900">{dietician.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{dietician.qualification}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {dietician.specializations && Array.isArray(dietician.specializations) 
                              ? dietician.specializations.join(', ') 
                              : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={dietician.is_active ? 'default' : 'secondary'}>
                              {dietician.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4" onClick={(event) => event.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => navigate(`/mlt-intern/dietician/${dietician.id}`)}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <FoodLibraryAddDialog
        open={isFoodAddDialogOpen}
        onOpenChange={setIsFoodAddDialogOpen}
        onSuccess={async () => {
          await refetchFoods();
          queryClient.invalidateQueries({ queryKey: ["food-library"] });
        }}
      />

      <FoodLibraryAddDialog
        open={!!selectedFood}
        onOpenChange={(open) => {
          if (!open) setSelectedFood(null);
        }}
        initialFood={selectedFood}
        showCsvOption={false}
        onSuccess={async () => {
          await refetchFoods();
          queryClient.invalidateQueries({ queryKey: ["food-library"] });
        }}
      />

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Join Request</DialogTitle>
            <DialogDescription>
              Approve {selectedJoinRequest?.name}'s request to join as a{" "}
              {selectedJoinRequest?.requested_role === "doctor" ? "doctor" : "dietician"}. Their account will be activated.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Message to applicant (optional)</label>
            <Textarea
              placeholder="e.g. Welcome! Please complete your profile after logging in..."
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">This message will be shown when they log in.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
            <Button
              onClick={() => selectedJoinRequest && approveMutation.mutate({ id: selectedJoinRequest.id, message: adminMessage || undefined })}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Join Request</DialogTitle>
            <DialogDescription>
              Reject {selectedJoinRequest?.name}'s request to join as a{" "}
              {selectedJoinRequest?.requested_role === "doctor" ? "doctor" : "dietician"}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Reason for rejection (optional)</label>
              <Textarea
                placeholder="Enter reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Message to applicant (optional)</label>
              <Textarea
                placeholder="e.g. Please reapply with your license number..."
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">This message will be shown when they try to log in.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedJoinRequest && rejectMutation.mutate({ id: selectedJoinRequest.id, reason: rejectionReason || undefined, message: adminMessage || undefined })}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send message to {messageRequest?.name}</DialogTitle>
            <DialogDescription>
              This message will be delivered to the applicant via email.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSendMessage();
            }}
            className="space-y-4"
          >
            <Textarea
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value.slice(0, 1000))}
              rows={6}
              maxLength={1000}
              placeholder="Write your message..."
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowMessageDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSendingMessage}>
                {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Auto-assign result dialog */}
      <Dialog open={!!autoAssignResult} onOpenChange={(open) => !open && setAutoAssignResult(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Auto-Assign Results</DialogTitle>
            <DialogDescription>
              {autoAssignResult && autoAssignResult.total_pending === 0
                ? "No unassigned appointments due within 48 hours."
                : autoAssignResult
                ? `Assigned ${autoAssignResult.assigned} of ${autoAssignResult.total_pending} pending appointment${autoAssignResult.total_pending !== 1 ? "s" : ""}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {autoAssignResult && autoAssignResult.details.length > 0 && (
            <div className="max-h-72 overflow-y-auto space-y-2">
              {autoAssignResult.details.map((d) => {
                const dt = new Date(d.scheduled_at);
                const timeStr = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + " at " + dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                return (
                  <div key={d.consultation_id} className={`flex items-start gap-2 p-2 rounded-md text-sm ${d.assigned ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                    {d.assigned
                      ? <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      : <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-medium leading-tight">{d.patient_name || `Consultation #${d.consultation_id}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {timeStr} {d.assigned ? `→ ${d.rd_name}` : `— ${d.reason}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setAutoAssignResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MLTInternDashboard;

