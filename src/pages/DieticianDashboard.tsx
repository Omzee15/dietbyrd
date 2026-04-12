import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { CalendarDays, Minus, Plus, Search, Settings, Trash2, Users, UtensilsCrossed, Loader2, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import AppSidebar from "@/components/AppSidebar";
import { getDietician, getDieticianPatients, getConsultations, type Patient, type Dietician, type Consultation } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FoodItem {
  name: string;
  nameHindi?: string;
  caloriesPer100: number;
  protein: number;
  carbs: number;
  fat: number;
  treat?: boolean;
}

interface MealItem extends FoodItem {
  id: string;
  quantity: number;
  unit: string;
  calories: number;
}

interface MealSlot {
  name: string;
  items: MealItem[];
}

type TabType = "patients" | "schedule" | "diet";
type ScheduleFilter = "today" | "tomorrow" | "this_week" | "all";

// ─── Food Database (local for now) ────────────────────────────────────────────
const foodDatabase: FoodItem[] = [
  { name: "Brown Rice", nameHindi: "भूरे चावल", caloriesPer100: 111, protein: 2.6, carbs: 23, fat: 0.9 },
  { name: "Chicken Breast", nameHindi: "चिकन ब्रेस्ट", caloriesPer100: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Egg (Whole)", nameHindi: "अंडा", caloriesPer100: 155, protein: 13, carbs: 1.1, fat: 11 },
  { name: "Oats", nameHindi: "जई", caloriesPer100: 389, protein: 16.9, carbs: 66, fat: 6.9 },
  { name: "Banana", nameHindi: "केला", caloriesPer100: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { name: "Paneer (Cottage Cheese)", nameHindi: "पनीर", caloriesPer100: 265, protein: 18, carbs: 1.2, fat: 21 },
  { name: "Moong Dal", nameHindi: "मूंग दाल", caloriesPer100: 105, protein: 7.5, carbs: 18, fat: 0.4 },
  { name: "Roti (Wheat)", nameHindi: "रोटी", caloriesPer100: 264, protein: 8.7, carbs: 50, fat: 3.7 },
  { name: "Greek Yogurt", nameHindi: "ग्रीक दही", caloriesPer100: 59, protein: 10, carbs: 3.6, fat: 0.7 },
  { name: "Almonds", nameHindi: "बादाम", caloriesPer100: 579, protein: 21, carbs: 22, fat: 50 },
  { name: "Gulab Jamun", nameHindi: "गुलाब जामुन", caloriesPer100: 299, protein: 2.2, carbs: 40, fat: 14, treat: true },
  { name: "Dark Chocolate", nameHindi: "डार्क चॉकलेट", caloriesPer100: 546, protein: 5, carbs: 60, fat: 31, treat: true },
];

// ─── Transform patient for UI display ─────────────────────────────────────────
interface DisplayPatient {
  id: number;
  name: string;
  age: number;
  diagnosis: string;
  doctor: string;
  status: "review" | "on-track";
  nextSession: string;
}

function transformPatient(patient: Patient, consultations: Consultation[]): DisplayPatient {
  // Find next consultation for this patient
  const patientConsultations = consultations.filter(c => c.patient_id === patient.id);
  const upcomingConsultation = patientConsultations.find(c => 
    c.status === "scheduled" && new Date(c.scheduled_at) > new Date()
  );
  
  let nextSession = "Not scheduled";
  if (upcomingConsultation) {
    const date = new Date(upcomingConsultation.scheduled_at);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      nextSession = "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      nextSession = "Tomorrow";
    } else {
      nextSession = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  }

  return {
    id: patient.id,
    name: patient.name || "Unknown",
    age: patient.age || 0,
    diagnosis: patient.diagnosis || "General consultation",
    doctor: "Referred Doctor", // Would need a join to get actual doctor name
    status: Math.random() > 0.3 ? "on-track" : "review", // Placeholder - would come from actual tracking
    nextSession,
  };
}

// ─── Transform consultation for UI display ────────────────────────────────────
interface DisplayConsultation {
  id: number;
  patient: string;
  type: string;
  date: string;
  time: string;
  status: "today" | "tomorrow" | "this_week";
}

function transformConsultation(consultation: Consultation): DisplayConsultation {
  const date = new Date(consultation.scheduled_at);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  let displayDate = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  let status: "today" | "tomorrow" | "this_week" = "this_week";
  
  if (date.toDateString() === today.toDateString()) {
    displayDate = "Today";
    status = "today";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    displayDate = "Tomorrow";
    status = "tomorrow";
  }
  
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  
  return {
    id: consultation.id,
    patient: consultation.patient_name || "Unknown Patient",
    type: consultation.type || "Follow-up",
    date: displayDate,
    time,
    status,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
const DieticianDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Get current dietician from auth
  const { data: currentDietician, isLoading: dieticianLoading } = useQuery({
    queryKey: ["dietician", user?.profileId],
    queryFn: () => getDietician(user!.profileId!),
    enabled: !!user?.profileId,
  });

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["dietician-patients", currentDietician?.id],
    queryFn: () => getDieticianPatients(currentDietician!.id),
    enabled: !!currentDietician?.id,
  });

  const { data: consultations, isLoading: consultationsLoading } = useQuery({
    queryKey: ["consultations", currentDietician?.id],
    queryFn: () => getConsultations({ rd_id: currentDietician?.id }),
    enabled: !!currentDietician?.id,
  });

  // Transform API data for UI
  const displayPatients = useMemo(() => {
    if (!patients || !consultations) return [];
    return patients.map(p => transformPatient(p, consultations));
  }, [patients, consultations]);

  const displayConsultations = useMemo(() => {
    if (!consultations) return [];
    return consultations
      .filter(c => c.status === "scheduled" && new Date(c.scheduled_at) >= new Date())
      .map(transformConsultation)
      .sort((a, b) => {
        const order = { today: 0, tomorrow: 1, this_week: 2 };
        return order[a.status] - order[b.status];
      });
  }, [consultations]);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>("patients");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [patientSearch, setPatientSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<DisplayPatient | null>(null);
  const [activeMeal, setActiveMeal] = useState("Breakfast");

  // Sync activeTab with URL
  useEffect(() => {
    if (location.pathname === "/dietician/schedule") {
      setActiveTab("schedule");
    } else if (location.pathname === "/dietician/diet") {
      setActiveTab("diet");
    } else if (location.pathname === "/dietician") {
      setActiveTab("patients");
    }
  }, [location.pathname]);

  const handleTabChange = (tab: TabType) => {
    const paths: Record<TabType, string> = {
      patients: "/dietician",
      schedule: "/dietician/schedule",
      diet: "/dietician/diet",
    };
    navigate(paths[tab]);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };
  
  const [meals, setMeals] = useState<MealSlot[]>([
    { name: "Breakfast", items: [] },
    { name: "Mid-Morning", items: [] },
    { name: "Lunch", items: [] },
    { name: "Evening Snack", items: [] },
    { name: "Dinner", items: [] },
  ]);

  const dailyTarget = { calories: 1800, protein: 90, carbs: 200, fat: 60 };

  // Filtered data
  const filteredPatients = displayPatients.filter((p) =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const filteredConsultations = displayConsultations.filter((c) => {
    if (scheduleFilter === "all") return true;
    return c.status === scheduleFilter;
  });

  const searchResults = searchTerm.length >= 2
    ? foodDatabase.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  // Handlers
  const addFoodToMeal = (food: FoodItem) => {
    const newItem: MealItem = {
      ...food,
      id: crypto.randomUUID(),
      quantity: 100,
      unit: "g",
      calories: food.caloriesPer100,
    };
    setMeals((prev) =>
      prev.map((m) => (m.name === activeMeal ? { ...m, items: [...m.items, newItem] } : m))
    );
    setSearchTerm("");
  };

  const updateQuantity = (mealName: string, itemId: string, delta: number) => {
    setMeals((prev) =>
      prev.map((meal) =>
        meal.name === mealName
          ? {
              ...meal,
              items: meal.items.map((item) =>
                item.id === itemId
                  ? { ...item, quantity: Math.max(10, item.quantity + delta) }
                  : item
              ),
            }
          : meal
      )
    );
  };

  const removeItem = (mealName: string, itemId: string) => {
    setMeals((prev) =>
      prev.map((meal) =>
        meal.name === mealName ? { ...meal, items: meal.items.filter((i) => i.id !== itemId) } : meal
      )
    );
  };

  const totalNutrients = meals.reduce(
    (acc, meal) => {
      meal.items.forEach((item) => {
        const factor = item.quantity / 100;
        acc.calories += item.calories * factor;
        acc.protein += item.protein * factor;
        acc.carbs += item.carbs * factor;
        acc.fat += item.fat * factor;
      });
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const getMealCalories = (meal: MealSlot) =>
    meal.items.reduce((sum, item) => sum + (item.calories * item.quantity) / 100, 0);

  const sidebarSections = [
    {
      title: "Dashboard",
      items: [
        { label: "My Patients", href: "/dietician", icon: Users, badge: displayPatients.length },
        { label: "My Schedule", href: "/dietician/schedule", icon: CalendarDays },
        { label: "Diet Plans", href: "/dietician/diet", icon: UtensilsCrossed },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "Preferences", href: "/dietician/settings", icon: Settings },
      ],
    },
  ];

  const caloriePercent = Math.min((totalNutrients.calories / dailyTarget.calories) * 100, 100);
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (caloriePercent / 100) * circumference;

  // Loading state
  const isLoading = dieticianLoading || patientsLoading || consultationsLoading;

  // Get initials for display
  const getInitials = (name: string) => 
    name.split(" ").map((n) => n[0]).join("").toUpperCase();

  // Bottom content with logout
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
      <AppSidebar title="DietByRD" subtitle="Dietician Portal" sections={sidebarSections} bottomContent={bottomContent} />

      <main className="flex-1 bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h1 className="text-xl font-semibold">
            {activeTab === "patients" ? "My Patients" : activeTab === "schedule" ? "My Schedule" : "Diet Plan"}
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:bg-muted rounded-lg px-2 py-1.5 transition-colors">
                {currentDietician ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      {getInitials(currentDietician.name)}
                    </div>
                    <span className="text-sm font-medium">{currentDietician.name}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Loading...</span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/dietician/settings")} className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation tabs */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
            {([
              { key: "patients", label: "My Patients" },
              { key: "schedule", label: "My Schedule" },
              { key: "diet", label: "Diet Chart" },
            ] as const).map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "ghost"}
                size="sm"
                onClick={() => handleTabChange(tab.key)}
                className="text-xs"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading data...</span>
          </div>
        )}

        {/* Patients tab */}
        {!isLoading && activeTab === "patients" && (
          <div className="p-6 space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatients.map((p) => {
                // Create URL-friendly slug from patient name
                const nameSlug = (p.name || "patient")
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "");
                return (
                <div
                  key={p.id}
                  className={`bg-card border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
                    selectedPatient?.id === p.id ? "border-primary ring-2 ring-primary/20" : ""
                  }`}
                  onClick={() => navigate(`/dietician/patient/${nameSlug}-${p.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {getInitials(p.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.diagnosis} · Age {p.age}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Ref: {p.doctor}</div>
                    </div>
                    <Badge variant="outline" className={p.status === "review" ? "text-warning border-warning/30" : "text-success border-success/30"}>
                      {p.status}
                    </Badge>
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Next: {p.nextSession}</div>
                    <Button size="sm" variant="ghost" className="text-xs h-7">View Details →</Button>
                  </div>
                </div>
              );
              })}
              {filteredPatients.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No patients found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule tab */}
        {!isLoading && activeTab === "schedule" && (
          <div className="p-6 space-y-4">
            <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
              {([
                { key: "today", label: "Today" },
                { key: "tomorrow", label: "Tomorrow" },
                { key: "this_week", label: "This Week" },
                { key: "all", label: "All" },
              ] as const).map((f) => (
                <Button
                  key={f.key}
                  variant={scheduleFilter === f.key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setScheduleFilter(f.key)}
                  className="text-xs"
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <div className="grid gap-3">
              {filteredConsultations.map((c) => (
                <div key={c.id} className="bg-card border rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {getInitials(c.patient)}
                    </div>
                    <div>
                      <div className="font-medium">{c.patient}</div>
                      <div className="text-sm text-muted-foreground">{c.type} · {c.date}</div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="text-sm font-medium">{c.time}</div>
                      <Badge variant="outline" className={
                        c.status === "today" ? "text-primary border-primary/30" :
                        c.status === "tomorrow" ? "text-info border-info/30" :
                        "text-muted-foreground border-border"
                      }>
                        {c.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <Button size="sm" variant="outline">Join</Button>
                  </div>
                </div>
              ))}
              {filteredConsultations.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No consultations scheduled</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Diet chart tab */}
        {!isLoading && activeTab === "diet" && (
          <div className="flex flex-1">
            <div className="flex-1 flex">
              <div className="w-48 border-r p-4 space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Daily Meals
                  {selectedPatient && (
                    <span className="block text-[10px] font-normal normal-case mt-0.5">for {selectedPatient.name}</span>
                  )}
                </div>
                {meals.map((meal) => {
                  const cal = Math.round(getMealCalories(meal));
                  return (
                    <button
                      key={meal.name}
                      onClick={() => setActiveMeal(meal.name)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        activeMeal === meal.name
                          ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{meal.name}</span>
                        <span className="text-xs text-muted-foreground">{cal} kcal</span>
                      </div>
                    </button>
                  );
                })}
                <button className="w-full mt-3 border-2 border-dashed border-muted-foreground/30 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  + Add Meal
                </button>
              </div>

              <div className="flex-1 p-6">
                {!selectedPatient && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Select a patient first</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => handleTabChange("patients")}
                    >
                      Go to Patients
                    </Button>
                  </div>
                )}

                {selectedPatient && (
                  <>
                    <div className="relative mb-6">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        placeholder="Search food..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 h-12 text-base rounded-xl border-2"
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-card border-2 border-t-0 rounded-b-xl shadow-lg z-10 max-h-64 overflow-y-auto">
                          {searchResults.map((food, i) => (
                            <button
                              key={i}
                              onClick={() => addFoodToMeal(food)}
                              className="w-full flex items-center justify-between p-3 hover:bg-muted transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-lg">🍽️</div>
                                <div>
                                  <div className="font-medium text-sm flex items-center gap-2">
                                    {food.name}
                                    {food.treat && (
                                      <Badge variant="outline" className="text-warning border-warning/30 text-[10px]">⚠ Treat</Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground flex gap-2">
                                    <span className="text-info">P: {food.protein}g</span>
                                    <span className="text-primary">C: {food.carbs}g</span>
                                    <span className="text-warning">F: {food.fat}g</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{food.caloriesPer100}kcal</span>
                                <Plus className="w-4 h-4 text-primary" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {meals.find((m) => m.name === activeMeal)?.items.map((item) => {
                        const factor = item.quantity / 100;
                        return (
                          <div key={item.id} className="bg-card border rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-xl">🍽️</div>
                              <div>
                                <div className="font-medium">{item.name}</div>
                                {item.nameHindi && <div className="text-xs text-muted-foreground">{item.nameHindi}</div>}
                                <div className="text-xs flex gap-3 mt-0.5">
                                  <span className="text-info">● {(item.protein * factor).toFixed(1)}g P</span>
                                  <span className="text-primary">● {(item.carbs * factor).toFixed(1)}g C</span>
                                  <span className="text-warning">● {(item.fat * factor).toFixed(1)}g F</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <button onClick={() => updateQuantity(activeMeal, item.id, -10)} className="w-7 h-7 rounded-md border flex items-center justify-center hover:bg-muted transition-colors">
                                  <Minus className="w-3 h-3" />
                                </button>
                                <div className="text-center min-w-[50px]">
                                  <div className="font-semibold text-sm">{item.quantity}</div>
                                  <div className="text-[10px] text-muted-foreground uppercase">{item.unit}</div>
                                </div>
                                <button onClick={() => updateQuantity(activeMeal, item.id, 10)} className="w-7 h-7 rounded-md border flex items-center justify-center hover:bg-muted transition-colors">
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="text-sm font-semibold min-w-[60px] text-right">
                                {Math.round(item.calories * factor)} kcal
                              </span>
                              <button onClick={() => removeItem(activeMeal, item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {(meals.find((m) => m.name === activeMeal)?.items.length ?? 0) === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">No items in {activeMeal}</p>
                          <p className="text-xs">Search and add food items above</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="w-72 border-l p-6 space-y-6">
              <div className="text-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Calories</div>
                <div className="relative w-32 h-32 mx-auto mt-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{Math.round(totalNutrients.calories)}</span>
                    <span className="text-xs text-muted-foreground">/ {dailyTarget.calories}</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {Math.max(0, Math.round(dailyTarget.calories - totalNutrients.calories))} remaining
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Protein", value: totalNutrients.protein, target: dailyTarget.protein, color: "bg-info" },
                  { label: "Carbs", value: totalNutrients.carbs, target: dailyTarget.carbs, color: "bg-primary" },
                  { label: "Fat", value: totalNutrients.fat, target: dailyTarget.fat, color: "bg-warning" },
                ].map((macro) => (
                  <div key={macro.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{macro.label}</span>
                      <span className="text-muted-foreground">{Math.round(macro.value)} / {macro.target}g</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${macro.color} transition-all`} style={{ width: `${Math.min((macro.value / macro.target) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Protein / kg</span>
                <span className="font-semibold text-primary">{(totalNutrients.protein / 70).toFixed(1)} g</span>
              </div>

              <Button variant="outline" className="w-full">Show Full Micronutrient Panel</Button>
              <Button className="w-full">Generate PDF</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DieticianDashboard;
