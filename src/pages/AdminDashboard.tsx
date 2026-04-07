import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import { Users, UserCheck, Stethoscope, UtensilsCrossed, BarChart3, Search, ArrowLeft, X, TrendingUp, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const mockPatients = [
  { id: 1, name: "Ananya Rao", phone: "9876543210", diagnosis: "MDD", referredBy: "Dr. Sneha Pillai", date: "2026-03-20", status: "registered", dietician: "Priya Sharma", age: 28, gender: "Female", sessions: 8, phq: "16 → 6 pts", notes: "Steady improvement observed." },
  { id: 2, name: "Vikash Tandon", phone: "9123456789", diagnosis: "GAD", referredBy: "Dr. Sneha Pillai", date: "2026-03-08", status: "registered", dietician: "Priya Sharma", age: 34, gender: "Male", sessions: 10, phq: "17 → 10 pts", notes: "Responding well to therapy." },
  { id: 3, name: "Preethi Menon", phone: "9988776655", diagnosis: "Panic Disorder", referredBy: "Dr. Arjun Nair", date: "2026-03-30", status: "registered", dietician: "Ravi Kumar", age: 25, gender: "Female", sessions: 2, phq: "Too early", notes: "Baseline established." },
  { id: 4, name: "Aman Kumar", phone: "9012345678", diagnosis: "PTSD", referredBy: "Dr. Sneha Pillai", date: "2026-04-02", status: "pending", dietician: null, age: 29, gender: "Male", sessions: 0, phq: "—", notes: "Awaiting registration." },
  { id: 5, name: "Rohan Sinha", phone: "9876501234", diagnosis: "Adjustment", referredBy: "Dr. Meera Joshi", date: "2026-04-05", status: "pending", dietician: null, age: 40, gender: "Male", sessions: 0, phq: "—", notes: "Recently referred." },
  { id: 6, name: "Divya Nair", phone: "9111222333", diagnosis: "OCD", referredBy: "Dr. Arjun Nair", date: "2026-02-10", status: "registered", dietician: "Priya Sharma", age: 31, gender: "Female", sessions: 12, phq: "18 → 4 pts", notes: "Completed program." },
  { id: 7, name: "Sanjay Patel", phone: "9444555666", diagnosis: "MDD", referredBy: "Dr. Meera Joshi", date: "2026-02-03", status: "registered", dietician: "Ravi Kumar", age: 45, gender: "Male", sessions: 11, phq: "20 → 9 pts", notes: "Good progress." },
  { id: 8, name: "Kavya Reddy", phone: "9777888999", diagnosis: "Social Anxiety", referredBy: "Dr. Sneha Pillai", date: "2026-01-28", status: "registered", dietician: "Ravi Kumar", age: 22, gender: "Female", sessions: 6, phq: "No change", notes: "Needs reassessment." },
  { id: 9, name: "Neha Gupta", phone: "9333444555", diagnosis: "Bipolar Disorder", referredBy: "Dr. Arjun Nair", date: "2026-04-06", status: "pending", dietician: null, age: 27, gender: "Female", sessions: 0, phq: "—", notes: "Pending registration." },
  { id: 10, name: "Arjun Singh", phone: "9666777888", diagnosis: "GAD", referredBy: "Dr. Meera Joshi", date: "2026-04-07", status: "pending", dietician: null, age: 33, gender: "Male", sessions: 0, phq: "—", notes: "Just referred today." },
];

const mockDoctors = [
  { id: 1, name: "Dr. Sneha Pillai", specialty: "Psychiatrist", patients: 4, phone: "9800000001", status: "active" },
  { id: 2, name: "Dr. Arjun Nair", specialty: "Psychiatrist", patients: 3, phone: "9800000002", status: "active" },
  { id: 3, name: "Dr. Meera Joshi", specialty: "Psychiatrist", patients: 3, phone: "9800000003", status: "active" },
];

const mockDieticians = [
  { id: 1, name: "Priya Sharma", patients: 4, phone: "9700000001", status: "active", specialization: "Clinical Nutrition" },
  { id: 2, name: "Ravi Kumar", patients: 4, phone: "9700000002", status: "active", specialization: "Sports Nutrition" },
];

type ActiveTab = "patients" | "doctors" | "dieticians" | "analytics";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("patients");
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<typeof mockPatients[0] | null>(null);

  const filteredPatients = mockPatients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.diagnosis.toLowerCase().includes(search.toLowerCase()) ||
    p.referredBy.toLowerCase().includes(search.toLowerCase())
  );

  const sidebarSections = [
    {
      title: "Management",
      items: [
        { label: "Patients", href: "/admin", icon: Users, badge: mockPatients.length },
        { label: "Doctors", href: "/admin/doctors", icon: Stethoscope, badge: mockDoctors.length },
        { label: "Dieticians", href: "/admin/dieticians", icon: UtensilsCrossed, badge: mockDieticians.length },
        { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen">
      <AppSidebar title="DietByRD" subtitle="Admin Panel" sections={sidebarSections} />

      <main className="flex-1 bg-background">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["patients", "doctors", "dieticians", "analytics"] as ActiveTab[]).map((tab) => (
              <Button key={tab} variant={activeTab === tab ? "default" : "ghost"} size="sm" onClick={() => { setActiveTab(tab); setSelectedPatient(null); }} className="capitalize text-xs">
                {tab}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sidebar text-sidebar-primary-foreground flex items-center justify-center text-xs font-semibold">AD</div>
            <span className="text-sm font-medium">Admin</span>
          </div>
        </div>

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
                    {selectedPatient.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedPatient.name}</h2>
                    <div className="text-sm text-muted-foreground">{selectedPatient.age} yrs · {selectedPatient.gender} · {selectedPatient.phone}</div>
                    <Badge variant="outline" className={`mt-1 ${selectedPatient.status === "registered" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}`}>
                      {selectedPatient.status === "registered" ? "✓ Registered" : "⏳ Pending"}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Diagnosis", value: selectedPatient.diagnosis },
                  { label: "Referred By", value: selectedPatient.referredBy },
                  { label: "Referral Date", value: selectedPatient.date },
                  { label: "Dietician", value: selectedPatient.dietician || "Not assigned" },
                ].map((item) => (
                  <div key={item.label} className="bg-muted/50 rounded-xl p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</div>
                    <div className="font-semibold mt-1">{item.value}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">Session Progress</div>
                <div className="flex gap-1">
                  {Array.from({ length: 12 }).map((_, j) => (
                    <div key={j} className={`flex-1 h-3 rounded-full ${j < selectedPatient.sessions ? "bg-primary" : "bg-muted"}`} />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Sessions: {selectedPatient.sessions}/12</span>
                  <span>PHQ-9: {selectedPatient.phq}</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">Notes</div>
                <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">{selectedPatient.notes}</div>
              </div>
              {selectedPatient.status === "pending" && <Button>Assign Dietician</Button>}
            </div>
          </div>
        ) : (
          <>
            {/* Patients Tab */}
            {activeTab === "patients" && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Total Patients", value: mockPatients.length, icon: Users, color: "text-primary" },
                    { label: "Registered", value: mockPatients.filter(p => p.status === "registered").length, icon: UserCheck, color: "text-success" },
                    { label: "Pending", value: mockPatients.filter(p => p.status === "pending").length, icon: Users, color: "text-warning" },
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
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <div className="bg-card rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="text-left p-4 font-semibold">Patient</th>
                        <th className="text-left p-4 font-semibold">Diagnosis</th>
                        <th className="text-left p-4 font-semibold">Referred By</th>
                        <th className="text-left p-4 font-semibold">Status</th>
                        <th className="text-left p-4 font-semibold">Dietician</th>
                        <th className="text-right p-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((p) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedPatient(p)}>
                          <td className="p-4 font-medium">{p.name}</td>
                          <td className="p-4">{p.diagnosis}</td>
                          <td className="p-4 text-muted-foreground">{p.referredBy}</td>
                          <td className="p-4">
                            <Badge variant="outline" className={p.status === "registered" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}>
                              {p.status === "registered" ? "✓ Registered" : "⏳ Pending"}
                            </Badge>
                          </td>
                          <td className="p-4 text-muted-foreground">{p.dietician || "—"}</td>
                          <td className="p-4 text-right">
                            <Button variant="outline" size="sm" className="text-xs">{p.status === "pending" ? "Assign" : "View"}</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Doctors Tab */}
            {activeTab === "doctors" && (
              <div className="p-6 space-y-6">
                <h2 className="text-lg font-semibold">Doctors</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mockDoctors.map((d) => (
                    <div key={d.id} className="bg-card border rounded-2xl p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {d.name.split(" ").slice(1).map((n) => n[0]).join("")}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">{d.name}</div>
                          <div className="text-xs text-muted-foreground">{d.specialty}</div>
                          <div className="text-xs text-muted-foreground">{d.phone}</div>
                        </div>
                        <Badge variant="outline" className="text-success border-success/30">{d.status}</Badge>
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-between text-xs text-muted-foreground">
                        <span>{d.patients} patients referred</span>
                        <Button size="sm" variant="ghost" className="text-xs h-7">View Details →</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dieticians Tab */}
            {activeTab === "dieticians" && (
              <div className="p-6 space-y-6">
                <h2 className="text-lg font-semibold">Dieticians</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mockDieticians.map((d) => (
                    <div key={d.id} className="bg-card border rounded-2xl p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {d.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">{d.name}</div>
                          <div className="text-xs text-muted-foreground">{d.specialization}</div>
                          <div className="text-xs text-muted-foreground">{d.phone}</div>
                        </div>
                        <Badge variant="outline" className="text-success border-success/30">{d.status}</Badge>
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-between text-xs text-muted-foreground">
                        <span>{d.patients} active patients</span>
                        <Button size="sm" variant="ghost" className="text-xs h-7">View Details →</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
              <div className="p-6 space-y-6">
                <h2 className="text-lg font-semibold">Platform Analytics</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Patients", value: "10", icon: Users, color: "text-primary" },
                    { label: "Conversion Rate", value: "60%", icon: TrendingUp, color: "text-success", sub: "6 of 10 registered" },
                    { label: "Monthly Consultations", value: "32", icon: CalendarDays, color: "text-info", sub: "April 2026" },
                    { label: "Active Doctors", value: "3", icon: Stethoscope, color: "text-warning" },
                  ].map((s) => (
                    <div key={s.label} className="bg-card rounded-xl border p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${s.color}`}><s.icon className="w-5 h-5" /></div>
                        <div className="text-sm text-muted-foreground">{s.label}</div>
                      </div>
                      <div className="text-2xl font-bold">{s.value}</div>
                      {s.sub && <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>}
                    </div>
                  ))}
                </div>

                {/* Referral funnel */}
                <div className="bg-card rounded-xl border p-6">
                  <h3 className="text-sm font-semibold mb-4">Referral Funnel</h3>
                  <div className="space-y-3">
                    {[
                      { stage: "Total Referrals", count: 10, percent: 100 },
                      { stage: "Registered", count: 6, percent: 60 },
                      { stage: "Completed 6+ Sessions", count: 4, percent: 40 },
                      { stage: "Completed Program", count: 1, percent: 10 },
                    ].map((s) => (
                      <div key={s.stage} className="flex items-center gap-4">
                        <div className="w-48 text-sm">{s.stage}</div>
                        <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                          <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${s.percent}%` }} />
                        </div>
                        <div className="w-16 text-right text-sm font-medium">{s.count} ({s.percent}%)</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monthly consultations */}
                <div className="bg-card rounded-xl border p-6">
                  <h3 className="text-sm font-semibold mb-4">Monthly Consultations Booked</h3>
                  <div className="space-y-3">
                    {[
                      { month: "April 2026", booked: 32, completed: 12 },
                      { month: "March 2026", booked: 28, completed: 25 },
                      { month: "February 2026", booked: 22, completed: 20 },
                      { month: "January 2026", booked: 15, completed: 14 },
                    ].map((m) => (
                      <div key={m.month} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div className="font-medium text-sm">{m.month}</div>
                        <div className="flex gap-6 text-sm">
                          <span className="text-muted-foreground">Booked: <span className="font-semibold text-foreground">{m.booked}</span></span>
                          <span className="text-muted-foreground">Completed: <span className="font-semibold text-success">{m.completed}</span></span>
                        </div>
                      </div>
                    ))}
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

export default AdminDashboard;
