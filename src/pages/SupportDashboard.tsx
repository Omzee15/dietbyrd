import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, MessageSquare, LogOut, Plus, Search, Eye, X, Send, UserCheck, Check, ChevronsUpDown } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Doctor {
  id: number;
  name: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface Patient {
  id: number;
  name: string;
  phone: string;
  email: string;
  gender: string;
  state: string;
  is_active: boolean;
  created_at: string;
  appointment_count: number;
}

interface Dietician {
  id: number;
  name: string;
  phone: string;
  specialization: string;
  qualification: string;
  is_active: boolean;
  created_at: string;
  appointment_count: number;
}

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

const getStatusColor = (status: string) => {
  switch (status) {
    case "open": return "bg-blue-100 text-blue-800";
    case "in_progress": return "bg-yellow-100 text-yellow-800";
    case "resolved": return "bg-green-100 text-green-800";
    case "closed": return "bg-gray-100 text-gray-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent": return "bg-red-100 text-red-800";
    case "high": return "bg-orange-100 text-orange-800";
    case "medium": return "bg-yellow-100 text-yellow-800";
    case "low": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const SupportDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("tickets");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [patientPage, setPatientPage] = useState(1);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [ticketForm, setTicketForm] = useState({
    patient_id: null as number | null,
    subject: "",
    description: "",
    priority: "normal",
  });

  // Fetch list data
  const { data: doctorsData } = useQuery({
    queryKey: ["support-doctors"],
    queryFn: async () => {
      const res = await fetch("/api/support/doctors");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as Doctor[];
    },
  });

  const { data: patientsResponse, isError: patientsError, error: patientsErrorObj } = useQuery({
    queryKey: ["support-patients", patientPage],
    queryFn: async () => {
      const res = await fetch(`/api/support/patients?page=${patientPage}&page_size=50`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch patients");
      }
      return data as { data: Patient[]; pagination?: { page: number; page_size: number; total: number; total_pages: number; has_more: boolean } };
    },
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.error("[support/patients]", error);
      }
    },
  });

  const patientsData = patientsResponse?.data || [];
  const patientsPagination = patientsResponse?.pagination;

  const { data: patientSearchResponse, isFetching: patientSearchLoading } = useQuery({
    queryKey: ["support-patient-search", patientSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", page_size: "20" });
      const trimmed = patientSearch.trim();
      if (trimmed) params.set("query", trimmed);
      const res = await fetch(`/api/support/patients?${params.toString()}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to search patients");
      }
      return data as { data: Patient[] };
    },
    enabled: patientPickerOpen,
    staleTime: 30000,
  });

  const patientPickerResults = patientSearchResponse?.data || [];
  const selectedPatient =
    patientPickerResults.find((p) => p.id === ticketForm.patient_id) ||
    patientsData.find((p) => p.id === ticketForm.patient_id);

  const { data: dieticiansData } = useQuery({
    queryKey: ["support-dieticians"],
    queryFn: async () => {
      const res = await fetch("/api/support/dieticians");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as Dietician[];
    },
  });

  const { data: ticketsData } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const res = await fetch("/api/support/tickets");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as Ticket[];
    },
  });

  // Fetch selected ticket detail
  const { data: ticketDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["support-ticket-detail", selectedTicketId],
    queryFn: async () => {
      const res = await fetch(`/api/support/tickets/${selectedTicketId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as TicketDetail;
    },
    enabled: !!selectedTicketId,
  });

  // Create ticket
  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: any) => {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ticketData, created_by: user?.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setShowCreateTicket(false);
      setTicketForm({ patient_id: null, subject: "", description: "", priority: "normal" });
      const ticketNumber = data?.ticket_number ? ` (#${data.ticket_number})` : "";
      toast.success(`Ticket created${ticketNumber}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Update ticket status/assignment
  const updateTicketMutation = useMutation({
    mutationFn: async (update: { status?: string; assigned_to?: number | null; resolution_notes?: string }) => {
      const res = await fetch(`/api/support/tickets/${selectedTicketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support-ticket-detail", selectedTicketId] });
      toast.success("Ticket updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Add comment
  const addCommentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/support/tickets/${selectedTicketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user?.id, comment: newComment.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-ticket-detail", selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setNewComment("");
      toast.success("Comment added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    createTicketMutation.mutate({
      ...ticketForm,
      patient_id: ticketForm.patient_id,
    });
  };

  const openTickets = ticketsData?.filter(t => t.status === "open").length || 0;
  const inProgressTickets = ticketsData?.filter(t => t.status === "in_progress").length || 0;
  const resolvedToday = ticketsData?.filter(t =>
    t.resolved_at && new Date(t.resolved_at).toDateString() === new Date().toDateString()
  ).length || 0;

  const filteredTickets = (ticketsData || []).filter(t => {
    const matchesSearch = !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.patient_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sidebarSections = [
    {
      title: "Support",
      items: [
        { label: "Tickets", href: "/support", icon: MessageSquare },
        { label: "Patients", href: "/support", icon: Users },
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
  const commentsEnabled = false;

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        title="DietByRD"
        subtitle="Support Team"
        sections={sidebarSections}
        bottomContent={bottomContent}
      />

      <main className="flex-1 bg-background overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h1 className="text-xl font-semibold">Support Dashboard</h1>
          <div className="flex items-center gap-3">
            <Dialog open={showCreateTicket} onOpenChange={setShowCreateTicket}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  + New Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Support Ticket</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Patient</Label>
                    <Popover
                      open={patientPickerOpen}
                      onOpenChange={(open) => {
                        setPatientPickerOpen(open);
                        if (!open) {
                          setPatientSearch("");
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={patientPickerOpen}
                          className="w-full justify-between"
                        >
                          {ticketForm.patient_id
                            ? selectedPatient
                              ? `${selectedPatient.name || "—"} — ${selectedPatient.phone}`
                              : "Select patient"
                            : "Select patient"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search patients..."
                            value={patientSearch}
                            onValueChange={setPatientSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No patients found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="none"
                                onSelect={() => {
                                  setTicketForm({ ...ticketForm, patient_id: null });
                                  setPatientPickerOpen(false);
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${ticketForm.patient_id === null ? "opacity-100" : "opacity-0"}`} />
                                No patient
                              </CommandItem>
                              {patientSearchLoading && (
                                <CommandItem disabled value="searching">
                                  Searching...
                                </CommandItem>
                              )}
                              {patientPickerResults.map((patient) => (
                                <CommandItem
                                  key={patient.id}
                                  value={`${patient.name || ""} ${patient.phone}`}
                                  onSelect={() => {
                                    setTicketForm({ ...ticketForm, patient_id: patient.id });
                                    setPatientPickerOpen(false);
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${ticketForm.patient_id === patient.id ? "opacity-100" : "opacity-0"}`} />
                                  <span>{patient.name || "—"} — {patient.phone}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Input
                      placeholder="Brief description of the issue"
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value.slice(0, 120) })}
                      maxLength={120}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Textarea
                      placeholder="Detailed description"
                      value={ticketForm.description}
                      rows={4}
                      onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={ticketForm.priority} onValueChange={(v) => setTicketForm({ ...ticketForm, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateTicket(false)}>Cancel</Button>
                    <Button type="submit" disabled={createTicketMutation.isPending}>
                      {createTicketMutation.isPending ? "Creating…" : "Create Ticket"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: ticket list + tabs */}
          <div className={`flex flex-col overflow-hidden transition-all duration-200 ${selectedTicketId ? "w-[45%] border-r" : "w-full"}`}>
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedTicketId(null); }} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 pt-4 shrink-0">
                <TabsList>
                  <TabsTrigger value="tickets">Tickets</TabsTrigger>
                  <TabsTrigger value="patients">Patients</TabsTrigger>
                  <TabsTrigger value="doctors">Doctors</TabsTrigger>
                  <TabsTrigger value="dieticians">Dieticians</TabsTrigger>
                </TabsList>
              </div>

              {/* Stats row (always visible in ticket tab) */}
              {activeTab === "tickets" && (
                <div className="grid grid-cols-3 gap-3 px-6 py-3 shrink-0">
                  {[
                    { label: "Open", value: openTickets, color: "text-blue-600" },
                    { label: "In Progress", value: inProgressTickets, color: "text-yellow-600" },
                    { label: "Resolved Today", value: resolvedToday, color: "text-green-600" },
                  ].map(stat => (
                    <Card key={stat.label} className="py-3">
                      <CardContent className="px-4 py-0">
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <TabsContent value="tickets" className="flex-1 overflow-hidden flex flex-col mt-0 px-6 pb-4">
                {/* Filters */}
                <div className="flex gap-2 mb-3 shrink-0">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search tickets…" className="pl-9" value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Ticket list */}
                <div className="flex-1 overflow-y-auto space-y-2">
                  {filteredTickets.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No tickets found</p>
                    </div>
                  ) : filteredTickets.map(ticket => (
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
                            <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                            <Badge className={`text-[10px] ${getStatusColor(ticket.status)}`}>
                              {ticket.status.replace("_", " ")}
                            </Badge>
                            <Badge className={`text-[10px] ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority}
                            </Badge>
                          </div>
                          <p className="font-medium text-sm truncate">{ticket.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ticket.patient_name || "No patient"} · {new Date(ticket.created_at).toLocaleDateString()}
                            {ticket.comment_count > 0 && ` · ${ticket.comment_count} comments`}
                          </p>
                        </div>
                        <Eye className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="patients" className="flex-1 overflow-y-auto px-6 pb-4 mt-0">
                <div className="mb-3">
                  <Input placeholder="Search patients…" value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                {patientsError ? (
                  <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-sm text-red-600">
                    Failed to load patients: {patientsErrorObj instanceof Error ? patientsErrorObj.message : "Unknown error"}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {(patientsData || [])
                        .filter(p => !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.phone.includes(searchQuery))
                        .map(patient => (
                          <div key={patient.id} className="p-3 border rounded-lg flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{patient.name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{patient.phone} · {patient.state || "—"}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant={patient.is_active ? "default" : "secondary"} className="text-[10px]">
                                {patient.is_active ? "Active" : "Inactive"}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">{patient.appointment_count} appts</p>
                            </div>
                          </div>
                        ))}
                    </div>
                    {patientsPagination && patientsPagination.total_pages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPatientPage((prev) => Math.max(1, prev - 1))}
                          disabled={patientPage <= 1}
                        >
                          Previous
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Page {patientsPagination.page} of {patientsPagination.total_pages}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPatientPage((prev) => prev + 1)}
                          disabled={!patientsPagination.has_more}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="doctors" className="flex-1 overflow-y-auto px-6 pb-4 mt-0">
                <div className="mb-3">
                  <Input placeholder="Search doctors…" value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="space-y-2">
                  {(doctorsData || [])
                    .filter(d => !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.phone.includes(searchQuery))
                    .map(doctor => (
                      <div key={doctor.id} className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{doctor.name}</p>
                          <p className="text-xs text-muted-foreground">{doctor.phone}</p>
                        </div>
                        <Badge variant={doctor.is_active ? "default" : "secondary"} className="text-[10px]">
                          {doctor.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="dieticians" className="flex-1 overflow-y-auto px-6 pb-4 mt-0">
                <div className="mb-3">
                  <Input placeholder="Search dieticians…" value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="space-y-2">
                  {(dieticiansData || [])
                    .filter(d => !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.phone.includes(searchQuery))
                    .map(dietician => (
                      <div key={dietician.id} className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{dietician.name}</p>
                          <p className="text-xs text-muted-foreground">{dietician.qualification} · {dietician.appointment_count} appts</p>
                        </div>
                        <Badge variant={dietician.is_active ? "default" : "secondary"} className="text-[10px]">
                          {dietician.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: ticket detail panel */}
          {selectedTicketId && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {detailLoading ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Loading ticket…
                </div>
              ) : selectedTicket ? (
                <>
                  {/* Detail header */}
                  <div className="px-6 py-4 border-b shrink-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{selectedTicket.ticket_number}</span>
                          <Badge className={`text-[10px] ${getPriorityColor(selectedTicket.priority)}`}>
                            {selectedTicket.priority}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{selectedTicket.category}</Badge>
                        </div>
                        <h2 className="font-semibold text-base">{selectedTicket.title}</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {selectedTicket.patient_name
                            ? `Patient: ${selectedTicket.patient_name}`
                            : "No patient linked"}{" "}
                          · Opened {new Date(selectedTicket.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button onClick={() => setSelectedTicketId(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Select
                        value={selectedTicket.status}
                        onValueChange={(status) => updateTicketMutation.mutate({ status })}
                        disabled={updateTicketMutation.isPending}
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>

                    </div>
                  </div>

                  {/* Scrollable body: description + comments */}
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {/* Description */}
                    <div className="bg-muted/40 rounded-lg p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>

                    {/* Resolution notes (if resolved) */}
                    {selectedTicket.status === "resolved" && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-xs font-medium text-green-700 mb-1">Resolution Notes</p>
                        {selectedTicket.resolution_notes ? (
                          <p className="text-sm text-green-800">{selectedTicket.resolution_notes}</p>
                        ) : (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Add resolution notes…"
                              rows={2}
                              value={resolutionNotes}
                              onChange={(e) => setResolutionNotes(e.target.value)}
                              className="text-sm"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!resolutionNotes.trim() || updateTicketMutation.isPending}
                              onClick={() => {
                                updateTicketMutation.mutate({ resolution_notes: resolutionNotes });
                                setResolutionNotes("");
                              }}
                            >
                              Save Resolution
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Comments */}
                    {commentsEnabled && (
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          {ticketDetail!.comments.length} {ticketDetail!.comments.length === 1 ? "comment" : "comments"}
                        </p>
                        {ticketDetail!.comments.map(comment => (
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

                  {/* Comment input (pinned at bottom) */}
                  {commentsEnabled && (
                    <div className="px-6 py-3 border-t shrink-0">
                      <div className="flex gap-2 items-end">
                        <Textarea
                          placeholder="Add a comment…"
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
      </main>
    </div>
  );
};

export default SupportDashboard;
