import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Search, UserPlus, Stethoscope, UtensilsCrossed,
  Check, X, Loader2, Clock, CheckCircle, XCircle, Filter, LogOut, Eye,
  MapPin, Award, Building2, Phone, Calendar, FileText, MessageSquare, Mail
} from "lucide-react";
import { getAdminSidebarSections } from "@/lib/admin-sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import AppSidebar from "@/components/AppSidebar";
import { getJoinRequests, approveJoinRequest, rejectJoinRequest, scheduleInterview, getPatients, getDoctors, getDieticians, JoinRequest } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type JoinRequestWithUserId = JoinRequest & { user_id?: number };

const JoinRequests = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [detailsRequest, setDetailsRequest] = useState<JoinRequest | null>(null);
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [interviewRequest, setInterviewRequest] = useState<JoinRequest | null>(null);
  const [interviewMessage, setInterviewMessage] = useState("");
  const [interviewDelivery, setInterviewDelivery] = useState<"email_first" | "email_only" | "whatsapp_only" | "both">("email_first");
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageRequest, setMessageRequest] = useState<JoinRequest | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Fetch join requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["join-requests", statusFilter],
    queryFn: () => getJoinRequests(statusFilter === "all" ? undefined : statusFilter),
  });

  // Fetch counts for sidebar badges
  const { data: patients = [] } = useQuery({ queryKey: ["patients"], queryFn: getPatients });
  const { data: doctors = [] } = useQuery({ queryKey: ["doctors"], queryFn: getDoctors });
  const { data: dieticians = [] } = useQuery({ queryKey: ["dieticians"], queryFn: getDieticians });
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["join-requests", "pending"],
    queryFn: () => getJoinRequests("pending"),
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, message, commissionRate }: { id: number; message?: string; commissionRate?: number }) =>
      approveJoinRequest(id, user?.id, message, commissionRate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join-requests"] });
      toast.success("Request approved! Account created successfully.");
      setShowApproveDialog(false);
      setSelectedRequest(null);
      setAdminMessage("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to approve request");
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason, message }: { id: number; reason?: string; message?: string }) =>
      rejectJoinRequest(id, user?.id, reason, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join-requests"] });
      toast.success("Request rejected");
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
      setAdminMessage("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reject request");
    },
  });

  // Schedule interview mutation
  const interviewMutation = useMutation({
    mutationFn: ({ id, message, delivery }: { id: number; message?: string; delivery: "email_first" | "email_only" | "whatsapp_only" | "both" }) =>
      scheduleInterview(id, message, delivery),
    onSuccess: (data, variables) => {
      const emailSent = data?.email?.sent;
      const whatsappSent = data?.whatsapp?.sent;
      const status = data?.status || "interview_sent";

      queryClient.setQueriesData({ queryKey: ["join-requests"] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((req: JoinRequest) =>
          req.id === variables.id ? { ...req, status } : req
        );
      });

      if (emailSent && whatsappSent) {
        toast.success("Interview invitation sent via email and WhatsApp.");
      } else if (emailSent) {
        toast.success("Interview invitation emailed.");
      } else if (whatsappSent) {
        toast.success("Interview invitation sent via WhatsApp.");
      } else {
        toast.success("Interview invitation sent.");
      }

      setShowInterviewDialog(false);
      setInterviewRequest(null);
      setInterviewMessage("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send interview invitation");
    },
  });

  const handleApprove = () => {
    if (selectedRequest) {
      const rate = commissionRate ? parseFloat(commissionRate) : undefined;
      approveMutation.mutate({ id: selectedRequest.id, message: adminMessage || undefined, commissionRate: rate });
    }
  };

  const handleReject = () => {
    if (selectedRequest) {
      rejectMutation.mutate({ id: selectedRequest.id, reason: rejectionReason || undefined, message: adminMessage || undefined });
    }
  };

  const openApproveDialog = (request: JoinRequest) => {
    setSelectedRequest(request);
    setAdminMessage("");
    setCommissionRate("");
    setShowApproveDialog(true);
  };

  const openRejectDialog = (request: JoinRequest) => {
    setSelectedRequest(request);
    setAdminMessage("");
    setShowRejectDialog(true);
  };

  const openDetailsDialog = (request: JoinRequest) => {
    setDetailsRequest(request);
    setShowDetailsDialog(true);
  };

  const openInterviewDialog = (request: JoinRequest) => {
    setInterviewRequest(request);
    setInterviewMessage("");
    const hasEmail = Boolean(request.applicant_email);
    setInterviewDelivery(hasEmail ? "email_first" : "whatsapp_only");
    setShowInterviewDialog(true);
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

  const handleScheduleInterview = () => {
    if (interviewRequest) {
      interviewMutation.mutate({
        id: interviewRequest.id,
        message: interviewMessage || undefined,
        delivery: interviewDelivery,
      });
    }
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

  const uniqueLocations = Array.from(new Set(requests.map(r => r.clinic_address).filter(Boolean))) as string[];

  const filteredRequests = requests.filter(r => {
    const matchesSearch = !search || (() => {
      const s = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(s) ||
        r.phone.includes(search) ||
        r.qualification.toLowerCase().includes(s) ||
        (r.clinic_address || "").toLowerCase().includes(s) ||
        (r.clinic_name || "").toLowerCase().includes(s)
      );
    })();
    const matchesLocation = locationFilter === "all" || r.clinic_address === locationFilter;
    return matchesSearch && matchesLocation;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "interview_sent":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><MessageSquare className="w-3 h-3 mr-1" /> Interview Sent</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleIcon = (role: string) => {
    return role === "doctor" ? (
      <Stethoscope className="w-4 h-4 text-blue-600" />
    ) : (
      <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
    );
  };

  const canSendMessage = user?.role === "ops_manager" || user?.role === "mlt_intern";

  const sidebarSections = getAdminSidebarSections({
    patients: patients.length,
    doctors: doctors.length,
    dieticians: dieticians.length,
    joinRequests: pendingRequests.length || undefined
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

  return (
    <div className="flex min-h-screen">
      <AppSidebar title="DietByRD" subtitle="Admin Panel" sections={sidebarSections} bottomContent={bottomContent} />

      <main className="flex-1 bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Join Requests</h1>
              <p className="text-sm text-muted-foreground">Review and approve professional requests</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sidebar text-sidebar-primary-foreground flex items-center justify-center text-xs font-semibold">
              {user?.name?.split(" ").map(n => n[0]).join("") || "AD"}
            </div>
            <span className="text-sm font-medium">{user?.name || "Admin"}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, qualification, or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {uniqueLocations.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Requests</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="interview_sent">Interview Sent</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: "Pending", count: requests.filter(r => r.status === "pending").length, bgColor: "bg-amber-50", borderColor: "border-amber-100", textColor: "text-amber-700", labelColor: "text-amber-600" },
              { label: "Interview Sent", count: requests.filter(r => r.status === "interview_sent").length, bgColor: "bg-blue-50", borderColor: "border-blue-100", textColor: "text-blue-700", labelColor: "text-blue-600" },
              { label: "Approved", count: requests.filter(r => r.status === "approved").length, bgColor: "bg-emerald-50", borderColor: "border-emerald-100", textColor: "text-emerald-700", labelColor: "text-emerald-600" },
              { label: "Rejected", count: requests.filter(r => r.status === "rejected").length, bgColor: "bg-red-50", borderColor: "border-red-100", textColor: "text-red-700", labelColor: "text-red-600" },
            ].map((stat) => (
              <div key={stat.label} className={`${stat.bgColor} border ${stat.borderColor} rounded-xl p-4`}>
                <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.count}</p>
                <p className={`text-sm ${stat.labelColor}`}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Requests List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border">
              <UserPlus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-medium">No requests found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {statusFilter === "pending" 
                  ? "No pending requests at the moment" 
                  : "No requests match your criteria"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-card rounded-xl border p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        request.requested_role === "doctor" ? "bg-blue-50" : "bg-emerald-50"
                      }`}>
                        {getRoleIcon(request.requested_role)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{request.name}</h3>
                          <Badge variant="outline" className={
                            request.requested_role === "doctor" 
                              ? "bg-blue-50 text-blue-700 border-blue-200" 
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }>
                            {request.requested_role === "doctor" ? "Doctor" : "Dietician"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{request.phone}</p>
                        <div className="flex flex-wrap gap-2 text-sm">
                          <span className="px-2 py-1 bg-muted rounded text-muted-foreground flex items-center gap-1">
                            <Award className="w-3 h-3" />{request.qualification}
                          </span>
                          {request.clinic_name && (
                            <span className="px-2 py-1 bg-muted rounded text-muted-foreground flex items-center gap-1">
                              <Building2 className="w-3 h-3" />{request.clinic_name}
                            </span>
                          )}
                          {request.clinic_address && (
                            <span className="px-2 py-1 bg-muted rounded text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{request.clinic_address}
                            </span>
                          )}
                          {request.specializations && request.specializations.length > 0 && (
                            <span className="px-2 py-1 bg-muted rounded text-muted-foreground">
                              {request.specializations.join(", ")}
                            </span>
                          )}
                          {request.experience_years != null && (
                            <span className="px-2 py-1 bg-muted rounded text-muted-foreground">
                              {request.experience_years} yr{request.experience_years !== 1 ? "s" : ""} exp.
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Submitted {new Date(request.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {request.rejection_reason && (
                          <p className="text-sm text-destructive mt-2 bg-destructive/10 px-3 py-1.5 rounded-lg">
                            Rejection reason: {request.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetailsDialog(request)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                        {canSendMessage && (
                          <Button
                            size="sm"
                            variant="outline"
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
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => openInterviewDialog(request)}
                              disabled={interviewMutation.isPending}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Interview
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => openRejectDialog(request)}
                              disabled={rejectMutation.isPending}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90"
                              onClick={() => openApproveDialog(request)}
                              disabled={approveMutation.isPending}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailsRequest && getRoleIcon(detailsRequest.requested_role)}
              {detailsRequest?.name}
            </DialogTitle>
            <DialogDescription>
              {detailsRequest?.requested_role === "doctor" ? "Doctor" : "Registered Dietician"} · {detailsRequest && getStatusBadge(detailsRequest.status)}
            </DialogDescription>
          </DialogHeader>
          {detailsRequest && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{detailsRequest.phone}</p>
                  </div>
                </div>
                {detailsRequest.applicant_email && (
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{detailsRequest.applicant_email}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Award className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Qualification</p>
                    <p className="font-medium">{detailsRequest.qualification}</p>
                  </div>
                </div>
                {detailsRequest.experience_years != null && (
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Experience</p>
                      <p className="font-medium">{detailsRequest.experience_years} year{detailsRequest.experience_years !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                )}
                {detailsRequest.medical_license_number && (
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">License No.</p>
                      <p className="font-medium">{detailsRequest.medical_license_number}</p>
                    </div>
                  </div>
                )}
                {detailsRequest.clinic_name && (
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Clinic / Hospital</p>
                      <p className="font-medium">{detailsRequest.clinic_name}</p>
                    </div>
                  </div>
                )}
                {detailsRequest.clinic_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="font-medium">{detailsRequest.clinic_address}</p>
                    </div>
                  </div>
                )}
              </div>
              {detailsRequest.specializations && detailsRequest.specializations.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Specializations</p>
                  <div className="flex flex-wrap gap-2">
                    {detailsRequest.specializations.map((s) => (
                      <span key={s} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {detailsRequest.about_yourself && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">About</p>
                  <p className="text-sm bg-muted rounded-lg p-3 leading-relaxed">{detailsRequest.about_yourself}</p>
                </div>
              )}
              {detailsRequest.rejection_reason && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Rejection Reason</p>
                  <p className="text-sm bg-destructive/10 text-destructive rounded-lg p-3">{detailsRequest.rejection_reason}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Submitted {new Date(detailsRequest.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          )}
          <DialogFooter className="flex flex-wrap gap-2">
            {detailsRequest?.status === "pending" && (
              <>
                <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => { setShowDetailsDialog(false); openInterviewDialog(detailsRequest!); }}>
                  <MessageSquare className="w-4 h-4 mr-1" /> Interview
                </Button>
                <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setShowDetailsDialog(false); openRejectDialog(detailsRequest!); }}>
                  <X className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button onClick={() => { setShowDetailsDialog(false); openApproveDialog(detailsRequest!); }}>
                  <Check className="w-4 h-4 mr-1" /> Approve
                </Button>
              </>
            )}
            {detailsRequest?.status !== "pending" && (
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      <Dialog open={showInterviewDialog} onOpenChange={setShowInterviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Send an interview invitation to {interviewRequest?.name} ({interviewRequest?.phone}).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 space-y-2">
              <label className="text-sm font-medium text-slate-700">Delivery method</label>
              <Select value={interviewDelivery} onValueChange={(value) => setInterviewDelivery(value as typeof interviewDelivery)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email_first">Email first (fallback WhatsApp)</SelectItem>
                  <SelectItem value="email_only">Email only</SelectItem>
                  <SelectItem value="whatsapp_only">WhatsApp only</SelectItem>
                  <SelectItem value="both">Email + WhatsApp</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {interviewRequest?.applicant_email
                  ? `Email will be sent to ${interviewRequest.applicant_email}.`
                  : "No registered email found — WhatsApp delivery is recommended."}
              </p>
            </div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Message (optional)
            </label>
            <Textarea
              placeholder="e.g. We'd love to interview you on Thursday at 3 PM IST. Please confirm your availability."
              value={interviewMessage}
              onChange={(e) => setInterviewMessage(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-2">
              A greeting and DietByRD sign-off are added automatically. Leave blank to send a generic invitation.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInterviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleInterview} disabled={interviewMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {interviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageSquare className="w-4 h-4 mr-2" />}
              Send Invitation
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

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Approve {selectedRequest?.name}'s request to join as a{" "}
              {selectedRequest?.requested_role === "doctor" ? "doctor" : "dietician"}. Their account will be activated.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {selectedRequest?.requested_role === "doctor" && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Commission Rate (%) <span className="text-muted-foreground font-normal">— optional</span>
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 10"
                  min="0"
                  max="100"
                  step="0.5"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground mt-1">Percentage of revenue shared with this doctor. Defaults to 0 if not set.</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Message to applicant (optional)
              </label>
              <Textarea
                placeholder="e.g. Welcome! Please complete your profile after logging in..."
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">This message will be shown to the applicant when they log in.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Approve Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {selectedRequest?.name}'s request to join as a{" "}
              {selectedRequest?.requested_role === "doctor" ? "doctor" : "dietician"}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Reason for rejection (optional)
              </label>
              <Textarea
                placeholder="Enter reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Message to applicant (optional)
              </label>
              <Textarea
                placeholder="e.g. Your application is missing required documents. Please reapply with..."
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">This message will be shown to the applicant when they try to log in.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JoinRequests;
