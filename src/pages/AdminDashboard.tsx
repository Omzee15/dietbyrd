import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import { LayoutDashboard, Users, UserCheck, UserX, Settings, Search, ArrowLeft, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const mockPatients = [
  { id: 1, name: "Ananya Rao", phone: "9876543210", diagnosis: "MDD", referredBy: "Dr. Sneha Pillai", date: "2026-03-20", status: "registered", dietician: "Priya Sharma", age: 28, gender: "Female", sessions: 8, phq: "16 → 6 pts", notes: "Steady improvement observed. Medication adjusted." },
  { id: 2, name: "Vikash Tandon", phone: "9123456789", diagnosis: "GAD", referredBy: "Dr. Sneha Pillai", date: "2026-03-08", status: "registered", dietician: "Priya Sharma", age: 34, gender: "Male", sessions: 10, phq: "17 → 10 pts", notes: "Responding well to therapy." },
  { id: 3, name: "Preethi Menon", phone: "9988776655", diagnosis: "Panic Disorder", referredBy: "Dr. Arjun Nair", date: "2026-03-30", status: "registered", dietician: "Ravi Kumar", age: 25, gender: "Female", sessions: 2, phq: "Too early", notes: "Baseline established." },
  { id: 4, name: "Aman Kumar", phone: "9012345678", diagnosis: "PTSD", referredBy: "Dr. Sneha Pillai", date: "2026-04-02", status: "pending", dietician: null, age: 29, gender: "Male", sessions: 0, phq: "—", notes: "Awaiting registration." },
  { id: 5, name: "Rohan Sinha", phone: "9876501234", diagnosis: "Adjustment", referredBy: "Dr. Meera Joshi", date: "2026-04-05", status: "pending", dietician: null, age: 40, gender: "Male", sessions: 0, phq: "—", notes: "Recently referred." },
  { id: 6, name: "Divya Nair", phone: "9111222333", diagnosis: "OCD", referredBy: "Dr. Arjun Nair", date: "2026-02-10", status: "registered", dietician: "Priya Sharma", age: 31, gender: "Female", sessions: 12, phq: "18 → 4 pts", notes: "Completed program successfully." },
  { id: 7, name: "Sanjay Patel", phone: "9444555666", diagnosis: "MDD", referredBy: "Dr. Meera Joshi", date: "2026-02-03", status: "registered", dietician: "Ravi Kumar", age: 45, gender: "Male", sessions: 11, phq: "20 → 9 pts", notes: "Good progress." },
  { id: 8, name: "Kavya Reddy", phone: "9777888999", diagnosis: "Social Anxiety", referredBy: "Dr. Sneha Pillai", date: "2026-01-28", status: "registered", dietician: "Ravi Kumar", age: 22, gender: "Female", sessions: 6, phq: "No change", notes: "Needs reassessment." },
  { id: 9, name: "Neha Gupta", phone: "9333444555", diagnosis: "Bipolar Disorder", referredBy: "Dr. Arjun Nair", date: "2026-04-06", status: "pending", dietician: null, age: 27, gender: "Female", sessions: 0, phq: "—", notes: "Pending registration." },
  { id: 10, name: "Arjun Singh", phone: "9666777888", diagnosis: "GAD", referredBy: "Dr. Meera Joshi", date: "2026-04-07", status: "pending", dietician: null, age: 33, gender: "Male", sessions: 0, phq: "—", notes: "Just referred today." },
];

type FilterType = "all" | "registered" | "pending";

const AdminDashboard = () => {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<typeof mockPatients[0] | null>(null);

  const filtered = mockPatients.filter((p) => {
    const matchesFilter = filter === "all" || p.status === filter;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.diagnosis.toLowerCase().includes(search.toLowerCase()) ||
      p.referredBy.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: mockPatients.length,
    registered: mockPatients.filter((p) => p.status === "registered").length,
    pending: mockPatients.filter((p) => p.status === "pending").length,
  };

  const sidebarSections = [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "All Patients", href: "/admin", icon: Users },
      ],
    },
    {
      title: "Management",
      items: [
        { label: "Registered", href: "/admin/registered", icon: UserCheck },
        { label: "Pending", href: "/admin/pending", icon: UserX },
        { label: "Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen">
      <AppSidebar title="FitArc" subtitle="Admin Panel" sections={sidebarSections} />

      <main className="flex-1 bg-background">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h1 className="text-xl font-semibold">Patient Management</h1>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sidebar text-sidebar-primary-foreground flex items-center justify-center text-xs font-semibold">AD</div>
            <span className="text-sm font-medium">Admin</span>
          </div>
        </div>

        {/* Patient detail view */}
        {selectedPatient ? (
          <div className="p-6">
            <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)} className="mb-4 gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to Patients
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
                    <Badge
                      variant="outline"
                      className={`mt-1 ${selectedPatient.status === "registered" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}`}
                    >
                      {selectedPatient.status === "registered" ? "✓ Registered" : "⏳ Pending"}
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

              {selectedPatient.status === "pending" && (
                <Button>Assign Dietician</Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Patients", value: stats.total, icon: Users, color: "text-primary" },
                { label: "Registered", value: stats.registered, icon: UserCheck, color: "text-success" },
                { label: "Pending Registration", value: stats.pending, icon: UserX, color: "text-warning" },
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

            {/* Filter bar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search patients, diagnosis, doctor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {(["all", "registered", "pending"] as FilterType[]).map((f) => (
                  <Button key={f} variant={filter === f ? "default" : "ghost"} size="sm" onClick={() => setFilter(f)} className="capitalize text-xs">
                    {f} {f === "all" ? `(${stats.total})` : f === "registered" ? `(${stats.registered})` : `(${stats.pending})`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left p-4 font-semibold">Patient</th>
                    <th className="text-left p-4 font-semibold">Phone</th>
                    <th className="text-left p-4 font-semibold">Diagnosis</th>
                    <th className="text-left p-4 font-semibold">Referred By</th>
                    <th className="text-left p-4 font-semibold">Date</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Dietician</th>
                    <th className="text-right p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedPatient(p)}>
                      <td className="p-4 font-medium">{p.name}</td>
                      <td className="p-4 text-muted-foreground">{p.phone}</td>
                      <td className="p-4">{p.diagnosis}</td>
                      <td className="p-4 text-muted-foreground">{p.referredBy}</td>
                      <td className="p-4 text-muted-foreground">{p.date}</td>
                      <td className="p-4">
                        <Badge variant="outline" className={p.status === "registered" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}>
                          {p.status === "registered" ? "✓ Registered" : "⏳ Pending"}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{p.dietician || "—"}</td>
                      <td className="p-4 text-right">
                        <Button variant="outline" size="sm" className="text-xs">
                          {p.status === "pending" ? "Assign" : "View"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
