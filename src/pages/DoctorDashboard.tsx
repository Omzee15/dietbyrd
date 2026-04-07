import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import { UserPlus, Users, BarChart3, MessageCircle, FileText, Send, Search, ArrowLeft, X, IndianRupee, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const diagnosisOptions = [
  "Major Depressive Disorder", "Generalized Anxiety", "PTSD", "OCD",
  "Panic Disorder", "Social Anxiety", "Adjustment Disorder", "Bipolar Disorder",
];

const mockReferrals = [
  { id: 1, name: "Ananya R.", fullName: "Ananya Rao", diagnosis: "MDD", days: 18, status: "improving", percent: 68, sessions: 8, phq: "16 → 6 pts", phone: "9876543210", age: 28, gender: "Female", dietician: "Priya Sharma", notes: "Patient showing steady improvement. Medication adjusted last week." },
  { id: 2, name: "Vikash T.", fullName: "Vikash Tandon", diagnosis: "GAD", days: 30, status: "improving", percent: 41, sessions: 10, phq: "17 → 10 pts", phone: "9123456789", age: 34, gender: "Male", dietician: "Priya Sharma", notes: "Responding well to therapy. Sleep patterns improving." },
  { id: 3, name: "Preethi M.", fullName: "Preethi Menon", diagnosis: "Panic Disorder", days: 8, status: "in therapy", percent: null, sessions: 2, phq: "Too early", phone: "9988776655", age: 25, gender: "Female", dietician: "Ravi Kumar", notes: "Initial sessions completed. Baseline established." },
  { id: 4, name: "Aman K.", fullName: "Aman Kumar", diagnosis: "PTSD", days: 5, status: "session 1 booked", percent: null, sessions: 0, phq: "—", phone: "9012345678", age: 29, gender: "Male", dietician: null, notes: "Awaiting first session." },
  { id: 5, name: "Rohan S.", fullName: "Rohan Sinha", diagnosis: "Adjustment", days: 2, status: "awaiting booking", percent: null, sessions: 0, phq: "—", phone: "9876501234", age: 40, gender: "Male", dietician: null, notes: "Recently referred." },
  { id: 6, name: "Divya N.", fullName: "Divya Nair", diagnosis: "OCD", days: 55, status: "completed", percent: 88, sessions: 12, phq: "18 → 4 pts", phone: "9111222333", age: 31, gender: "Female", dietician: "Priya Sharma", notes: "Successfully completed 12-session program." },
  { id: 7, name: "Sanjay P.", fullName: "Sanjay Patel", diagnosis: "MDD", days: 62, status: "improving", percent: 55, sessions: 11, phq: "20 → 9 pts", phone: "9444555666", age: 45, gender: "Male", dietician: "Ravi Kumar", notes: "Good progress. One more session recommended." },
  { id: 8, name: "Kavya R.", fullName: "Kavya Reddy", diagnosis: "Social Anxiety", days: 70, status: "needs attention", percent: null, sessions: 6, phq: "No change", phone: "9777888999", age: 22, gender: "Female", dietician: "Ravi Kumar", notes: "Needs plan reassessment. No visible improvement." },
];

const statusColors: Record<string, string> = {
  improving: "bg-success/10 text-success",
  "in therapy": "bg-info/10 text-info",
  "session 1 booked": "bg-muted text-muted-foreground",
  "awaiting booking": "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
  "needs attention": "bg-destructive/10 text-destructive",
};

type ActiveView = "refer" | "patients" | "analytics";

const DoctorDashboard = () => {
  const [diagnosis, setDiagnosis] = useState(diagnosisOptions[0]);
  const [activeView, setActiveView] = useState<ActiveView>("refer");
  const [selectedPatient, setSelectedPatient] = useState<typeof mockReferrals[0] | null>(null);
  const [patientSearch, setPatientSearch] = useState("");

  const filteredPatients = mockReferrals.filter((p) =>
    p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.diagnosis.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const recentReferrals = mockReferrals.slice(0, 10);

  const sidebarSections = [
    {
      title: "Workspace",
      items: [
        { label: "Refer Patient", href: "/doctor", icon: UserPlus },
        { label: "My Patients", href: "/doctor/patients", icon: Users, badge: 8 },
        { label: "Analytics", href: "/doctor/analytics", icon: BarChart3 },
      ],
    },
  ];

  const bottomContent = (
    <div className="space-y-1">
      <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-primary-foreground transition-all duration-150">
        <MessageCircle className="w-[18px] h-[18px] shrink-0" />
        <span>WhatsApp Us</span>
      </a>
      <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-primary-foreground transition-all duration-150">
        <FileText className="w-[18px] h-[18px] shrink-0" />
        <span>MOU / Agreement</span>
      </a>
    </div>
  );

  const handleNavClick = (view: ActiveView) => {
    setActiveView(view);
    setSelectedPatient(null);
  };

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        title="DietByRD"
        subtitle="Doctor Portal"
        sections={sidebarSections}
        bottomContent={bottomContent}
      />

      <main className="flex-1 bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button variant={activeView === "refer" ? "default" : "ghost"} size="sm" onClick={() => handleNavClick("refer")} className="text-xs">
              Refer Patient
            </Button>
            <Button variant={activeView === "patients" ? "default" : "ghost"} size="sm" onClick={() => handleNavClick("patients")} className="text-xs">
              My Patients
            </Button>
            <Button variant={activeView === "analytics" ? "default" : "ghost"} size="sm" onClick={() => handleNavClick("analytics")} className="text-xs">
              Analytics
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">SP</div>
            <span className="text-sm font-medium">Dr. Sneha Pillai</span>
          </div>
        </div>

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
                    {selectedPatient.fullName.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedPatient.fullName}</h2>
                    <div className="text-sm text-muted-foreground">{selectedPatient.age} yrs · {selectedPatient.gender} · {selectedPatient.phone}</div>
                    <Badge variant="outline" className={`mt-1 ${statusColors[selectedPatient.status] || ""}`}>
                      {selectedPatient.status}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Diagnosis", value: selectedPatient.diagnosis },
                  { label: "Sessions", value: `${selectedPatient.sessions} / 12` },
                  { label: "PHQ-9", value: selectedPatient.phq },
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
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">Clinical Notes</div>
                <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">{selectedPatient.notes}</div>
              </div>
            </div>
          </div>
        )}

        {/* Refer Patient view - referral form + last 10 referrals only */}
        {!selectedPatient && activeView === "refer" && (
          <div className="p-6 space-y-6">
            <div className="bg-card rounded-xl p-6 border">
              <h2 className="text-lg font-semibold">Refer a Patient</h2>
              <p className="text-sm text-muted-foreground mt-1">You've already assessed them. Just tell us who they are — we handle the rest.</p>
              <div className="grid grid-cols-3 gap-4 mt-5">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient Name</label>
                  <Input placeholder="e.g. Ananya Rao" className="mt-1.5" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mobile Number</label>
                  <Input placeholder="9876543210" className="mt-1.5" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Diagnosis</label>
                  <select value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    {diagnosisOptions.map((d) => (<option key={d} value={d}>{d}</option>))}
                  </select>
                </div>
              </div>
              <div className="flex gap-4 mt-4 items-end">
                <div className="flex-1">
                  <Input placeholder="Optional: clinical notes for the therapist..." />
                </div>
                <Button className="gap-2 px-6">Send Referral <Send className="w-4 h-4" /></Button>
              </div>
            </div>

            {/* Recent referrals - last 10 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Recent Referrals</h2>
                <span className="text-sm text-muted-foreground">Last 10 referrals</span>
              </div>
              <div className="bg-card rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="text-left p-4 font-semibold">Patient</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Sessions</th>
                      <th className="text-left p-4 font-semibold">PHQ-9</th>
                      <th className="text-right p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReferrals.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedPatient(r)}>
                        <td className="p-4">
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-muted-foreground">{r.diagnosis} · {r.days} days ago</div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[r.status] || ""}`}>
                            {r.percent !== null && `↑`} {r.status} {r.percent !== null && `${r.percent}%`}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 12 }).map((_, j) => (
                              <div key={j} className={`w-2 h-2 rounded-full ${j < r.sessions ? "bg-primary" : "bg-muted"}`} />
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-sm">{r.phq}</td>
                        <td className="p-4 text-right">
                          <Button variant="outline" size="sm" className="text-xs">View</Button>
                        </td>
                      </tr>
                    ))}
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
              <span className="text-sm text-muted-foreground">{mockReferrals.length} patients</span>
            </div>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search patients..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatients.map((p) => (
                <div key={p.id} className="bg-card border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md hover:border-primary/50" onClick={() => setSelectedPatient(p)}>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {p.fullName.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{p.fullName}</div>
                      <div className="text-xs text-muted-foreground">{p.diagnosis} · {p.age} yrs · {p.gender}</div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${statusColors[p.status] || ""}`}>
                      {p.status}
                    </Badge>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Sessions: {p.sessions}/12</span>
                      <span>PHQ-9: {p.phq}</span>
                    </div>
                    <div className="flex gap-0.5 mt-2">
                      {Array.from({ length: 12 }).map((_, j) => (
                        <div key={j} className={`flex-1 h-1.5 rounded-full ${j < p.sessions ? "bg-primary" : "bg-muted"}`} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics view - pricing & income */}
        {!selectedPatient && activeView === "analytics" && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold">Analytics & Earnings</h2>

            {/* Income banner */}
            <div className="bg-sidebar text-sidebar-foreground rounded-xl p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-sidebar-foreground/60">Clinical collaboration income — per patient you refer</p>
                <p className="text-3xl font-bold mt-1 text-primary">up to ₹1,490</p>
                <p className="text-xs text-sidebar-foreground/50 mt-1">₹500 when they book + ₹90 per session · up to 12 sessions</p>
              </div>
              <div className="flex gap-8 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">87%</div>
                  <div className="text-xs text-sidebar-foreground/50">booking rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">9.1</div>
                  <div className="text-xs text-sidebar-foreground/50">avg sessions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">73%</div>
                  <div className="text-xs text-sidebar-foreground/50">avg improve</div>
                </div>
              </div>
            </div>

            {/* Earnings breakdown */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Earned", value: "₹11,920", icon: IndianRupee, color: "text-primary" },
                { label: "Total Referrals", value: "8", icon: Users, color: "text-success" },
                { label: "Conversion Rate", value: "87%", icon: TrendingUp, color: "text-info" },
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

            {/* Monthly breakdown */}
            <div className="bg-card rounded-xl border p-6">
              <h3 className="text-sm font-semibold mb-4">Monthly Breakdown</h3>
              <div className="space-y-3">
                {[
                  { month: "April 2026", referrals: 3, earned: "₹1,500", pending: "₹4,470" },
                  { month: "March 2026", referrals: 3, earned: "₹4,320", pending: "₹0" },
                  { month: "February 2026", referrals: 2, earned: "₹6,100", pending: "₹0" },
                ].map((m) => (
                  <div key={m.month} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <div className="font-medium text-sm">{m.month}</div>
                      <div className="text-xs text-muted-foreground">{m.referrals} referrals</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{m.earned}</div>
                      {m.pending !== "₹0" && <div className="text-xs text-warning">Pending: {m.pending}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorDashboard;
