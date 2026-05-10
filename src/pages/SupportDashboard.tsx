import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Phone, MessageSquare, LogOut, Plus, Search, Filter, Eye, ChevronDown } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  date_of_birth: string;
  gender: string;
  address: string;
  state: string;
  pincode: string;
  is_active: boolean;
  created_at: string;
  appointment_count: number;
}

interface Dietician {
  id: number;
  name: string;
  phone: string;
  email: string;
  specialization: string;
  qualification: string;
  experience_years: number;
  consultation_fee: number;
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

const SupportDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    patient_id: "",
    title: "",
    description: "",
    category: "general",
    priority: "medium",
  });

  // Fetch doctors
  const { data: doctorsData } = useQuery({
    queryKey: ["support-doctors"],
    queryFn: async () => {
      const res = await fetch("/api/support/doctors");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as Doctor[];
    },
  });

  // Fetch patients
  const { data: patientsData } = useQuery({
    queryKey: ["support-patients"],
    queryFn: async () => {
      const res = await fetch("/api/support/patients");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as Patient[];
    },
  });

  // Fetch dieticians
  const { data: dieticiansData } = useQuery({
    queryKey: ["support-dieticians"],
    queryFn: async () => {
      const res = await fetch("/api/support/dieticians");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as Dietician[];
    },
  });

  // Fetch tickets
  const { data: ticketsData } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const res = await fetch("/api/support/tickets");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as Ticket[];
    },
  });

  // Create ticket mutation
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setShowCreateTicket(false);
      setTicketForm({
        patient_id: "",
        title: "",
        description: "",
        category: "general",
        priority: "medium",
      });
      toast.success("Ticket created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    createTicketMutation.mutate({
      ...ticketForm,
      patient_id: ticketForm.patient_id ? parseInt(ticketForm.patient_id) : null,
    });
  };

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

  const sidebarSections = [
    {
      title: "Support",
      items: [
        { label: "Overview", href: "/support", icon: Users },
        { label: "Tickets", href: "/support", icon: MessageSquare },
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

  const openTickets = ticketsData?.filter(t => t.status === "open").length || 0;
  const inProgressTickets = ticketsData?.filter(t => t.status === "in_progress").length || 0;

  return (
    <div className="flex min-h-screen">
      <AppSidebar 
        title="DietByRD" 
        subtitle="Support Team" 
        sections={sidebarSections} 
        bottomContent={bottomContent} 
      />

      <main className="flex-1 bg-background">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h1 className="text-2xl font-bold">Support Dashboard</h1>
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
                  <DialogTitle>Create New Ticket</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Patient (Optional)</label>
                    <Select
                      value={ticketForm.patient_id}
                      onValueChange={(value) => setTicketForm({ ...ticketForm, patient_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {patientsData?.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            {patient.name} - {patient.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title *</label>
                    <Input
                      type="text"
                      placeholder="Brief description of the issue"
                      value={ticketForm.title}
                      onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description *</label>
                    <Textarea
                      placeholder="Detailed description of the issue"
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <Select
                        value={ticketForm.category}
                        onValueChange={(value) => setTicketForm({ ...ticketForm, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="appointment">Appointment</SelectItem>
                          <SelectItem value="diet_plan">Diet Plan</SelectItem>
                          <SelectItem value="complaint">Complaint</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <Select
                        value={ticketForm.priority}
                        onValueChange={(value) => setTicketForm({ ...ticketForm, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateTicket(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTicketMutation.isPending}>
                      {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <div className="w-8 h-8 rounded-full bg-sidebar text-sidebar-primary-foreground flex items-center justify-center text-xs font-semibold">
              {user?.name?.split(" ").map(n => n[0]).join("") || "SP"}
            </div>
          </div>
        </div>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="doctors">Doctors</TabsTrigger>
              <TabsTrigger value="patients">Patients</TabsTrigger>
              <TabsTrigger value="dieticians">Dieticians</TabsTrigger>
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Open Tickets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{openTickets}</p>
                    <p className="text-sm text-gray-500 mt-2">Awaiting attention</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">In Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{inProgressTickets}</p>
                    <p className="text-sm text-gray-500 mt-2">Being handled</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Total Patients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{patientsData?.length || 0}</p>
                    <p className="text-sm text-gray-500 mt-2">Registered patients</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Active Doctors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {doctorsData?.filter(d => d.is_active).length || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">Available doctors</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Recent Tickets</CardTitle>
                  <CardDescription>Latest support tickets</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ticketsData?.slice(0, 5).map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{ticket.ticket_number}</span>
                            <Badge className={getStatusColor(ticket.status)}>
                              {ticket.status.replace("_", " ")}
                            </Badge>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{ticket.title}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {ticket.patient_name} • {new Date(ticket.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("tickets")}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="doctors">
              <Card>
                <CardHeader>
                  <CardTitle>All Doctors</CardTitle>
                  <CardDescription>List of all registered doctors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Input
                      placeholder="Search doctors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-md"
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Name</th>
                          <th className="text-left p-2 font-medium">Phone</th>
                          <th className="text-left p-2 font-medium">Email</th>
                          <th className="text-left p-2 font-medium">Status</th>
                          <th className="text-left p-2 font-medium">Registered</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doctorsData
                          ?.filter((d) =>
                            searchQuery
                              ? d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                d.phone.includes(searchQuery)
                              : true
                          )
                          .map((doctor) => (
                            <tr key={doctor.id} className="border-b hover:bg-gray-50">
                              <td className="p-2">{doctor.name}</td>
                              <td className="p-2">{doctor.phone}</td>
                              <td className="p-2">{doctor.email || "-"}</td>
                              <td className="p-2">
                                <Badge variant={doctor.is_active ? "default" : "secondary"}>
                                  {doctor.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </td>
                              <td className="p-2">
                                {new Date(doctor.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="patients">
              <Card>
                <CardHeader>
                  <CardTitle>All Patients</CardTitle>
                  <CardDescription>List of all registered patients</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Input
                      placeholder="Search patients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-md"
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Name</th>
                          <th className="text-left p-2 font-medium">Phone</th>
                          <th className="text-left p-2 font-medium">Email</th>
                          <th className="text-left p-2 font-medium">Gender</th>
                          <th className="text-left p-2 font-medium">Location</th>
                          <th className="text-left p-2 font-medium">Appointments</th>
                          <th className="text-left p-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientsData
                          ?.filter((p) =>
                            searchQuery
                              ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                p.phone.includes(searchQuery)
                              : true
                          )
                          .map((patient) => (
                            <tr key={patient.id} className="border-b hover:bg-gray-50">
                              <td className="p-2">{patient.name}</td>
                              <td className="p-2">{patient.phone}</td>
                              <td className="p-2">{patient.email || "-"}</td>
                              <td className="p-2">{patient.gender}</td>
                              <td className="p-2">{patient.state}</td>
                              <td className="p-2">{patient.appointment_count}</td>
                              <td className="p-2">
                                <Badge variant={patient.is_active ? "default" : "secondary"}>
                                  {patient.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dieticians">
              <Card>
                <CardHeader>
                  <CardTitle>All Dieticians</CardTitle>
                  <CardDescription>List of all registered dieticians</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Input
                      placeholder="Search dieticians..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-md"
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Name</th>
                          <th className="text-left p-2 font-medium">Phone</th>
                          <th className="text-left p-2 font-medium">Specialization</th>
                          <th className="text-left p-2 font-medium">Experience</th>
                          <th className="text-left p-2 font-medium">Fee</th>
                          <th className="text-left p-2 font-medium">Appointments</th>
                          <th className="text-left p-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dieticiansData
                          ?.filter((d) =>
                            searchQuery
                              ? d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                d.phone.includes(searchQuery)
                              : true
                          )
                          .map((dietician) => (
                            <tr key={dietician.id} className="border-b hover:bg-gray-50">
                              <td className="p-2">{dietician.name}</td>
                              <td className="p-2">{dietician.phone}</td>
                              <td className="p-2">{dietician.specialization || "-"}</td>
                              <td className="p-2">{dietician.experience_years} years</td>
                              <td className="p-2">₹{dietician.consultation_fee}</td>
                              <td className="p-2">{dietician.appointment_count}</td>
                              <td className="p-2">
                                <Badge variant={dietician.is_active ? "default" : "secondary"}>
                                  {dietician.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tickets">
              <Card>
                <CardHeader>
                  <CardTitle>All Tickets</CardTitle>
                  <CardDescription>Support tickets and their status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Input
                      placeholder="Search tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-md"
                    />
                  </div>
                  <div className="space-y-3">
                    {ticketsData
                      ?.filter((t) =>
                        searchQuery
                          ? t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.patient_name?.toLowerCase().includes(searchQuery.toLowerCase())
                          : true
                      )
                      .map((ticket) => (
                        <div
                          key={ticket.id}
                          className="p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold">{ticket.ticket_number}</span>
                                <Badge className={getStatusColor(ticket.status)}>
                                  {ticket.status.replace("_", " ")}
                                </Badge>
                                <Badge className={getPriorityColor(ticket.priority)}>
                                  {ticket.priority}
                                </Badge>
                                <Badge variant="outline">{ticket.category}</Badge>
                              </div>
                              <h3 className="font-medium text-lg mb-1">{ticket.title}</h3>
                              <p className="text-sm text-gray-600 mb-2">{ticket.description}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>Patient: {ticket.patient_name || "General"}</span>
                                <span>Created by: {ticket.created_by_name}</span>
                                <span>
                                  {new Date(ticket.created_at).toLocaleString()}
                                </span>
                                <span>{ticket.comment_count} comments</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default SupportDashboard;
