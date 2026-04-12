import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Search, UserPlus, Stethoscope, UtensilsCrossed, 
  Check, X, Loader2, Clock, CheckCircle, XCircle, Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getJoinRequests, approveJoinRequest, rejectJoinRequest, JoinRequest } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const JoinRequests = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch join requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["join-requests", statusFilter],
    queryFn: () => getJoinRequests(statusFilter === "all" ? undefined : statusFilter),
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: number) => approveJoinRequest(id, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join-requests"] });
      toast.success("Request approved! Account created successfully.");
      setSelectedRequest(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to approve request");
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => 
      rejectJoinRequest(id, user?.id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join-requests"] });
      toast.success("Request rejected");
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reject request");
    },
  });

  const handleApprove = (request: JoinRequest) => {
    approveMutation.mutate(request.id);
  };

  const handleReject = () => {
    if (selectedRequest) {
      rejectMutation.mutate({ id: selectedRequest.id, reason: rejectionReason || undefined });
    }
  };

  const openRejectDialog = (request: JoinRequest) => {
    setSelectedRequest(request);
    setShowRejectDialog(true);
  };

  const filteredRequests = requests.filter(r => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(searchLower) ||
      r.phone.includes(search) ||
      r.qualification.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/admin")}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Join Requests</h1>
                  <p className="text-sm text-slate-500">Review and approve professional requests</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, phone, or qualification..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Pending", count: requests.filter(r => r.status === "pending").length, color: "amber" },
            { label: "Approved", count: requests.filter(r => r.status === "approved").length, color: "emerald" },
            { label: "Rejected", count: requests.filter(r => r.status === "rejected").length, color: "red" },
          ].map((stat) => (
            <div key={stat.label} className={`bg-${stat.color}-50 border border-${stat.color}-100 rounded-xl p-4`}>
              <p className={`text-2xl font-bold text-${stat.color}-700`}>{stat.count}</p>
              <p className={`text-sm text-${stat.color}-600`}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-700">No requests found</h3>
            <p className="text-slate-500 text-sm mt-1">
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
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
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
                        <h3 className="font-semibold text-slate-900">{request.name}</h3>
                        <Badge variant="outline" className={
                          request.requested_role === "doctor" 
                            ? "bg-blue-50 text-blue-700 border-blue-200" 
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }>
                          {request.requested_role === "doctor" ? "Doctor" : "Dietician"}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{request.phone}</p>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">
                          {request.qualification}
                        </span>
                        {request.clinic_name && (
                          <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">
                            {request.clinic_name}
                          </span>
                        )}
                        {request.specializations && request.specializations.length > 0 && (
                          <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">
                            {request.specializations.join(", ")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        Submitted {new Date(request.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {request.rejection_reason && (
                        <p className="text-sm text-red-600 mt-2 bg-red-50 px-3 py-1.5 rounded-lg">
                          Rejection reason: {request.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    {request.status === "pending" && (
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => openRejectDialog(request)}
                          disabled={rejectMutation.isPending}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleApprove(request)}
                          disabled={approveMutation.isPending}
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

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
          <div className="py-4">
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Reason for rejection (optional)
            </label>
            <Textarea
              placeholder="Enter reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JoinRequests;
