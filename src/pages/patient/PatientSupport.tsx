import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Plus, LogOut, ChevronDown, Eye, X, Send } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { getPatient } from "@/lib/api";
import { toast } from "sonner";
import { User, Heart, UtensilsCrossed, CalendarDays } from "lucide-react";

interface Ticket {
  id: number;
  ticket_number: string;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  assigned_to: number;
  assigned_to_name: string;
  created_by: number;
  created_by_name: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  resolution_notes: string;
  resolved_at: string;
  created_at: string;
  updated_at: string;
  comment_count: number;
}

interface TicketComment {
  id: number;
  ticket_id: number;
  user_id: number;
  user_name: string;
  user_role: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
}

interface TicketDetail {
  ticket: Ticket;
  comments: TicketComment[];
}

const PatientSupport = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");
  const [ticketForm, setTicketForm] = useState({
    title: "",
    description: "",
    category: "general",
    priority: "medium",
  });

  // Fetch patient data
  const { data: patient } = useQuery({
    queryKey: ["patient", user?.profileId],
    queryFn: () => (user?.profileId ? getPatient(user.profileId) : Promise.reject()),
    enabled: !!user?.profileId,
  });

  // Fetch patient's tickets
  const { data: ticketsData, refetch } = useQuery({
    queryKey: ["patient-tickets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch("/api/patient/me/tickets", {
        headers: {
          "x-user-id": String(user.id),
          "x-user-role": String(user.role),
          ...(user.profileId ? { "x-patient-id": String(user.profileId) } : {}),
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as Ticket[];
    },
    enabled: !!user?.id,
  });

  const { data: ticketDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["patient-ticket-detail", selectedTicketId, user?.id],
    queryFn: async () => {
      if (!selectedTicketId || !user?.id) return null;
      const res = await fetch(`/api/patient/me/tickets/${selectedTicketId}`, {
        headers: {
          "x-user-id": String(user.id),
          "x-user-role": String(user.role),
          ...(user.profileId ? { "x-patient-id": String(user.profileId) } : {}),
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as TicketDetail;
    },
    enabled: !!selectedTicketId && !!user?.id,
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: any) => {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ticketData,
          patient_id: patient?.id,
          created_by: user?.id,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      refetch();
      setShowCreateTicket(false);
      setTicketForm({
        title: "",
        description: "",
        category: "general",
        priority: "medium",
      });
      toast.success("Support ticket created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTicketId || !user?.id) {
        throw new Error("Missing ticket or user");
      }
      const res = await fetch(`/api/support/tickets/${selectedTicketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, comment: newComment.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-ticket-detail", selectedTicketId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["patient-tickets", user?.id] });
      setNewComment("");
      toast.success("Comment added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reopenTicketMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTicketId) {
        throw new Error("Missing ticket");
      }
      const res = await fetch(`/api/support/tickets/${selectedTicketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "open" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-ticket-detail", selectedTicketId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["patient-tickets", user?.id] });
      toast.success("Ticket re-opened");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();

    if (!ticketForm.title.trim() || !ticketForm.description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    createTicketMutation.mutate(ticketForm);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const sidebarSections = [
    {
      title: "Dashboard",
      items: [
        { label: "Overview", href: "/patient", icon: User },
        { label: "My Profile", href: "/patient/profile", icon: Heart },
        { label: "Diet Plans", href: "/patient/diet-plans", icon: UtensilsCrossed },
        { label: "Appointments", href: "/patient/appointments", icon: CalendarDays },
        { label: "Support", href: "/patient/support", icon: MessageSquare },
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

  const selectedTicket = ticketDetail?.ticket;
  const visibleComments = (ticketDetail?.comments || []).filter((comment) => !comment.is_internal);
  const sortedTickets = [...(ticketsData || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
          <h1 className="text-xl font-semibold">Customer Support</h1>
          <div className="flex items-center gap-3">
            <Dialog open={showCreateTicket} onOpenChange={setShowCreateTicket}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Support Ticket</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title *</label>
                    <Input
                      type="text"
                      placeholder="Brief description of your issue"
                      value={ticketForm.title}
                      onChange={(e) =>
                        setTicketForm({ ...ticketForm, title: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description *</label>
                    <Textarea
                      placeholder="Please provide detailed information about your issue"
                      value={ticketForm.description}
                      onChange={(e) =>
                        setTicketForm({ ...ticketForm, description: e.target.value })
                      }
                      rows={5}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={ticketForm.category}
                      onValueChange={(value) =>
                        setTicketForm({ ...ticketForm, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="technical">Technical Issue</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="appointment">Appointment</SelectItem>
                        <SelectItem value="diet_plan">Diet Plan</SelectItem>
                        <SelectItem value="complaint">Complaint</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateTicket(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createTicketMutation.isPending}
                    >
                      {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {patient && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-muted rounded-lg px-2 py-1.5 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      {getInitials(patient.name || "?")}
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="p-6">
          <div className="flex overflow-hidden rounded-lg border bg-card">
            {/* Left: ticket list */}
            <div className={`flex flex-col transition-all duration-200 ${selectedTicketId ? "w-[45%] border-r" : "w-full"}`}>
              <div className="px-6 py-4 border-b">
                <CardTitle>My Support Tickets</CardTitle>
                <CardDescription>View and manage your support requests</CardDescription>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {!sortedTickets || sortedTickets.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 mb-4">
                      You haven't created any support tickets yet
                    </p>
                    <Button onClick={() => setShowCreateTicket(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Ticket
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id === selectedTicketId ? null : ticket.id)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTicketId === ticket.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-mono text-muted-foreground">
                                {ticket.ticket_number}
                              </span>
                              <Badge className={`text-[10px] ${getStatusColor(ticket.status)}`}>
                                {ticket.status.replace("_", " ")}
                              </Badge>
                              <Badge className={`text-[10px] ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                              </Badge>
                            </div>
                            <p className="font-medium text-sm truncate">{ticket.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Last update {new Date(ticket.updated_at || ticket.created_at).toLocaleString()}
                            </p>
                          </div>
                          <Eye className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: ticket detail */}
            {selectedTicketId && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {detailLoading ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    Loading ticket...
                  </div>
                ) : selectedTicket ? (
                  <>
                    <div className="px-6 py-4 border-b shrink-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-mono text-muted-foreground">
                              {selectedTicket.ticket_number}
                            </span>
                            <Badge className={`text-[10px] ${getStatusColor(selectedTicket.status)}`}>
                              {selectedTicket.status.replace("_", " ")}
                            </Badge>
                            <Badge className={`text-[10px] ${getPriorityColor(selectedTicket.priority)}`}>
                              {selectedTicket.priority}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {selectedTicket.category}
                            </Badge>
                          </div>
                          <h2 className="font-semibold text-base">{selectedTicket.title}</h2>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Opened {new Date(selectedTicket.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedTicketId(null)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {selectedTicket.status === "closed" && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reopenTicketMutation.isPending}
                            onClick={() => reopenTicketMutation.mutate()}
                          >
                            Re-open
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                      <div className="bg-muted/40 rounded-lg p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                        <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                      </div>

                      {selectedTicket.resolution_notes && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-xs font-medium text-green-700 mb-1">Resolution Notes</p>
                          <p className="text-sm text-green-800">{selectedTicket.resolution_notes}</p>
                        </div>
                      )}

                      {visibleComments.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            {visibleComments.length} {visibleComments.length === 1 ? "comment" : "comments"}
                          </p>
                          {visibleComments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                                {comment.user_name?.[0]?.toUpperCase() || "?"}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-medium">{comment.user_name}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(comment.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedTicket.status !== "closed" && (
                      <div className="px-6 py-3 border-t shrink-0">
                        <div className="flex gap-2 items-end">
                          <Textarea
                            placeholder="Add a comment..."
                            rows={2}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="flex-1 resize-none text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && newComment.trim()) {
                                e.preventDefault();
                                addCommentMutation.mutate();
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            disabled={!newComment.trim() || addCommentMutation.isPending}
                            onClick={() => addCommentMutation.mutate()}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Cmd+Enter to send</p>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientSupport;
