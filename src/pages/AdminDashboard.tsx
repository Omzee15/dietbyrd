import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { Users, UserCheck, UserPlus, Stethoscope, UtensilsCrossed, BarChart3, Search, ArrowLeft, X, TrendingUp, Loader2, LogOut, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getPatients, getDoctors, getDieticians, getAnalytics, getReferrals, assignDietician, getJoinRequests, Patient, Doctor, Dietician, Referral } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type ActiveTab = "patients" | "doctors" | "dieticians" | "analytics";

interface PatientWithReferral extends Patient {
  referredBy?: string;
  dietician?: string;
  dieticianId?: number | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState<ActiveTab>("patients");
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientWithReferral | null>(null);
  
  // Patient list filter state
  const [referredByFilter, setReferredByFilter] = useState<string>("all");
  const [dieticianFilter, setDieticianFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
    
    // Status filter
    let matchesStatus = true;
    if (statusFilter === "registered") {
      matchesStatus = !!p.dietary_preference;
    } else if (statusFilter === "pending") {
      matchesStatus = !p.dietary_preference;
    }
    
    return matchesSearch && matchesReferredBy && matchesDietician && matchesStatus;
  });

  const registeredCount = patients.filter((p) => p.dietary_preference).length;
  const pendingCount = patients.length - registeredCount;

  // Fetch pending join requests count
  const { data: joinRequests = [] } = useQuery({
    queryKey: ["join-requests", "pending"],
    queryFn: () => getJoinRequests("pending"),
  });

  const sidebarSections = [
    {
      title: "Management",
      items: [
        { label: "Patients", href: "/admin", icon: Users, badge: patients.length },
        { label: "Doctors", href: "/admin/doctors", icon: Stethoscope, badge: doctors.length },
        { label: "Dieticians", href: "/admin/dieticians", icon: UtensilsCrossed, badge: dieticians.length },
        { label: "Join Requests", href: "/admin/join-requests", icon: UserPlus, badge: joinRequests.length || undefined },
        { label: "Analytics", href: "/admin/referrals", icon: BarChart3 },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "Settings", href: "/admin/settings", icon: Settings },
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

  const isLoading = patientsLoading || doctorsLoading || dieticiansLoading;

  return (
    <div className="flex min-h-screen">
      <AppSidebar title="DietByRD" subtitle="Admin Panel" sections={sidebarSections} bottomContent={bottomContent} />

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
                        <Badge variant="outline" className={`mt-1 ${selectedPatient.dietary_preference ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}`}>
                          {selectedPatient.dietary_preference ? "✓ Registered" : "⏳ Pending"}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}><X className="w-4 h-4" /></Button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Diagnosis", value: selectedPatient.diagnosis || "Not specified" },
                      { label: "Referred By", value: selectedPatient.referredBy || "Direct" },
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
                        { label: "Registered", value: registeredCount, icon: UserCheck, color: "text-success" },
                        { label: "Pending", value: pendingCount, icon: Users, color: "text-warning" },
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
                          <SelectValue placeholder="Referred By" />
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
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="registered">Registered</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="bg-card rounded-xl border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                            <th className="text-left p-4 font-semibold">Patient</th>
                            <th className="text-left p-4 font-semibold">Diagnosis</th>
                            <th className="text-left p-4 font-semibold">Referred By</th>
                            <th className="text-left p-4 font-semibold">Dietician</th>
                            <th className="text-left p-4 font-semibold">Status</th>
                            <th className="text-right p-4 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPatients.map((p) => (
                            <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedPatient(p)}>
                              <td className="p-4 font-medium">{p.name || "Unknown"}</td>
                              <td className="p-4 capitalize">{p.diagnosis || "—"}</td>
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
                              <td className="p-4">
                                <Badge variant="outline" className={p.dietary_preference ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}>
                                  {p.dietary_preference ? "✓ Registered" : "⏳ Pending"}
                                </Badge>
                              </td>
                              <td className="p-4 text-right">
                                <Button variant="outline" size="sm" className="text-xs">{p.dietary_preference ? "View" : "Assign"}</Button>
                              </td>
                            </tr>
                          ))}
                          {filteredPatients.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-muted-foreground">No patients found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Doctors Tab */}
                {activeTab === "doctors" && (
                  <div className="p-6 space-y-6">
                    <h2 className="text-lg font-semibold">Doctors ({doctors.length})</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {doctors.map((d) => (
                        <div key={d.id} className="bg-card border rounded-2xl p-5">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {d.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold">{d.name}</div>
                              <div className="text-xs text-muted-foreground">{d.qualification}</div>
                              <div className="text-xs text-muted-foreground">{d.clinic_name || "Independent"}</div>
                            </div>
                            <Badge variant="outline" className={d.is_verified ? "text-success border-success/30" : "text-warning border-warning/30"}>
                              {d.is_verified ? "Verified" : "Pending"}
                            </Badge>
                          </div>
                          <div className="mt-3 pt-3 border-t flex justify-between text-xs text-muted-foreground">
                            <span>{d.total_referrals || 0} patients referred</span>
                            <Button size="sm" variant="ghost" className="text-xs h-7">View Details →</Button>
                          </div>
                        </div>
                      ))}
                      {doctors.length === 0 && (
                        <div className="col-span-3 text-center text-muted-foreground py-8">No doctors found</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dieticians Tab */}
                {activeTab === "dieticians" && (
                  <div className="p-6 space-y-6">
                    <h2 className="text-lg font-semibold">Dieticians ({dieticians.length})</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dieticians.map((d) => (
                        <div key={d.id} className="bg-card border rounded-2xl p-5">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {d.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold">{d.name}</div>
                              <div className="text-xs text-muted-foreground">{d.qualification}</div>
                              <div className="text-xs text-muted-foreground">{d.phone || "—"}</div>
                            </div>
                            <Badge variant="outline" className={d.is_active ? "text-success border-success/30" : "text-muted-foreground"}>
                              {d.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="mt-3 pt-3 border-t flex justify-between text-xs text-muted-foreground">
                            <span>{d.active_patients || 0} active patients</span>
                            <Button size="sm" variant="ghost" className="text-xs h-7">View Details →</Button>
                          </div>
                        </div>
                      ))}
                      {dieticians.length === 0 && (
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

                        {/* Referral funnel */}
                        <div className="bg-card rounded-xl border p-6">
                          <h3 className="text-sm font-semibold mb-4">Registration Status</h3>
                          <div className="space-y-3">
                            {[
                              { stage: "Total Patients", count: patients.length, percent: 100 },
                              { stage: "Registered (with preferences)", count: registeredCount, percent: patients.length > 0 ? Math.round((registeredCount / patients.length) * 100) : 0 },
                              { stage: "Pending Registration", count: pendingCount, percent: patients.length > 0 ? Math.round((pendingCount / patients.length) * 100) : 0 },
                            ].map((s) => (
                              <div key={s.stage} className="flex items-center gap-4">
                                <div className="w-48 text-sm">{s.stage}</div>
                                <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                                  <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${s.percent}%` }} />
                                </div>
                                <div className="w-20 text-right text-sm font-medium">{s.count} ({s.percent}%)</div>
                              </div>
                            ))}
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
    </div>
  );
};

export default AdminDashboard;
