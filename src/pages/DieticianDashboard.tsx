import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import { Users, CalendarDays, UtensilsCrossed, Settings, Search, Plus, Minus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FoodItem {
  id: number;
  name: string;
  nameHindi?: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  quantity: number;
  unit: string;
}

interface MealSlot {
  name: string;
  items: FoodItem[];
}

const foodDatabase = [
  { name: "Poha (raw)", nameHindi: "पोहा", protein: 1.3, carbs: 23, fat: 0.3, caloriesPer100: 110 },
  { name: "Paneer (whole milk)", nameHindi: "पनीर", protein: 18.3, carbs: 1.2, fat: 20.8, caloriesPer100: 265 },
  { name: "Makhana (Fox nuts, roasted)", nameHindi: "मखाना", protein: 9.7, carbs: 76.9, fat: 0.1, caloriesPer100: 347 },
  { name: "Bread (white)", nameHindi: "", protein: 9, carbs: 49, fat: 3.2, caloriesPer100: 265, treat: true },
  { name: "Bread (whole wheat)", nameHindi: "", protein: 10, carbs: 45, fat: 3.5, caloriesPer100: 250, treat: true },
  { name: "Oats", nameHindi: "ओट्स", protein: 13, carbs: 66, fat: 7, caloriesPer100: 389 },
  { name: "Brown Rice", nameHindi: "ब्राउन चावल", protein: 2.6, carbs: 23, fat: 0.9, caloriesPer100: 112 },
  { name: "Chicken Breast", nameHindi: "चिकन", protein: 31, carbs: 0, fat: 3.6, caloriesPer100: 165 },
  { name: "Egg (boiled)", nameHindi: "अंडा", protein: 13, carbs: 1.1, fat: 11, caloriesPer100: 155 },
  { name: "Banana", nameHindi: "केला", protein: 1.1, carbs: 23, fat: 0.3, caloriesPer100: 89 },
  { name: "Curd (low fat)", nameHindi: "दही", protein: 10, carbs: 3.6, fat: 0.7, caloriesPer100: 63 },
  { name: "Dal (moong)", nameHindi: "मूंग दाल", protein: 24, carbs: 63, fat: 1.2, caloriesPer100: 347 },
];

const mockPatients = [
  { id: 1, name: "Ananya Rao", diagnosis: "MDD", nextSession: "Today, 3:00 PM", status: "active", age: 28, doctor: "Dr. Sneha Pillai" },
  { id: 2, name: "Vikash Tandon", diagnosis: "GAD", nextSession: "Tomorrow, 11:00 AM", status: "active", age: 34, doctor: "Dr. Sneha Pillai" },
  { id: 3, name: "Preethi Menon", diagnosis: "Panic Disorder", nextSession: "Apr 10, 2:00 PM", status: "active", age: 25, doctor: "Dr. Arjun Nair" },
  { id: 4, name: "Divya Nair", diagnosis: "OCD", nextSession: "Apr 11, 10:00 AM", status: "active", age: 31, doctor: "Dr. Arjun Nair" },
  { id: 5, name: "Kavya Reddy", diagnosis: "Social Anxiety", nextSession: "Apr 12, 4:00 PM", status: "review", age: 22, doctor: "Dr. Meera Joshi" },
];

const mockConsultations = [
  { patient: "Ananya Rao", time: "3:00 PM", type: "Follow-up", status: "today", date: "2026-04-07" },
  { patient: "Vikash Tandon", time: "11:00 AM", type: "Diet Review", status: "tomorrow", date: "2026-04-08" },
  { patient: "Preethi Menon", time: "2:00 PM", type: "Initial", status: "upcoming", date: "2026-04-10" },
  { patient: "Divya Nair", time: "10:00 AM", type: "Follow-up", status: "upcoming", date: "2026-04-11" },
  { patient: "Kavya Reddy", time: "4:00 PM", type: "Diet Review", status: "upcoming", date: "2026-04-12" },
];

type ScheduleFilter = "today" | "tomorrow" | "this_week" | "all";

const initialMeals: MealSlot[] = [
  { name: "Breakfast", items: [] },
  { name: "Snack 1", items: [] },
  { name: "Lunch", items: [] },
  { name: "Snack 2", items: [] },
  { name: "Dinner", items: [] },
  { name: "Bedtime", items: [] },
];

const DieticianDashboard = () => {
  const [activeTab, setActiveTab] = useState<"patients" | "schedule" | "diet">("patients");
  const [selectedPatient, setSelectedPatient] = useState(mockPatients[0]);
  const [meals, setMeals] = useState<MealSlot[]>(initialMeals);
  const [activeMeal, setActiveMeal] = useState("Breakfast");
  const [searchTerm, setSearchTerm] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("today");
  const [dailyTarget] = useState({ calories: 1800, protein: 125, carbs: 203, fat: 50 });

  const searchResults = searchTerm.length > 0
    ? foodDatabase.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  const filteredPatients = mockPatients.filter((p) =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.diagnosis.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const filteredConsultations = mockConsultations.filter((c) => {
    if (scheduleFilter === "all") return true;
    if (scheduleFilter === "today") return c.status === "today";
    if (scheduleFilter === "tomorrow") return c.status === "tomorrow";
    if (scheduleFilter === "this_week") return true;
    return true;
  });

  const addFoodToMeal = (food: typeof foodDatabase[0]) => {
    setMeals((prev) =>
      prev.map((meal) =>
        meal.name === activeMeal
          ? {
              ...meal,
              items: [
                ...meal.items,
                {
                  id: Date.now(),
                  name: food.name,
                  nameHindi: food.nameHindi,
                  protein: food.protein,
                  carbs: food.carbs,
                  fat: food.fat,
                  calories: food.caloriesPer100,
                  quantity: 100,
                  unit: "g",
                },
              ],
            }
          : meal
      )
    );
    setSearchTerm("");
  };

  const updateQuantity = (mealName: string, itemId: number, delta: number) => {
    setMeals((prev) =>
      prev.map((meal) =>
        meal.name === mealName
          ? {
              ...meal,
              items: meal.items.map((item) =>
                item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
              ),
            }
          : meal
      )
    );
  };

  const removeItem = (mealName: string, itemId: number) => {
    setMeals((prev) =>
      prev.map((meal) =>
        meal.name === mealName
          ? { ...meal, items: meal.items.filter((item) => item.id !== itemId) }
          : meal
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
        { label: "My Patients", href: "/dietician", icon: Users, badge: mockPatients.length },
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

  return (
    <div className="flex min-h-screen">
      <AppSidebar title="DietByRD" subtitle="Dietician Portal" sections={sidebarSections} />

      <main className="flex-1 bg-background">
        {/* Top bar - no tabs, just user info */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h1 className="text-xl font-semibold">
            {activeTab === "patients" ? "My Patients" : activeTab === "schedule" ? "My Schedule" : "Diet Plan"}
          </h1>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">PS</div>
            <span className="text-sm font-medium">Priya Sharma</span>
          </div>
        </div>

        {/* Navigation tabs inline below header */}
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
                onClick={() => setActiveTab(tab.key as any)}
                className="text-xs"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Patients tab - card grid with search */}
        {activeTab === "patients" && (
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
              {filteredPatients.map((p) => (
                <div
                  key={p.id}
                  className={`bg-card border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
                    selectedPatient.id === p.id ? "border-primary ring-2 ring-primary/20" : ""
                  }`}
                  onClick={() => { setSelectedPatient(p); setActiveTab("diet"); }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {p.name.split(" ").map((n) => n[0]).join("")}
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
                    <Button size="sm" variant="ghost" className="text-xs h-7">View Diet →</Button>
                  </div>
                </div>
              ))}
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
        {activeTab === "schedule" && (
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
                  onClick={() => setScheduleFilter(f.key as ScheduleFilter)}
                  className="text-xs"
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <div className="grid gap-3">
              {filteredConsultations.map((c, i) => (
                <div key={i} className="bg-card border rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {c.patient.split(" ").map((n) => n[0]).join("")}
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
                        {c.status}
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
        {activeTab === "diet" && (
          <div className="flex flex-1">
            <div className="flex-1 flex">
              <div className="w-48 border-r p-4 space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Daily Meals
                  <span className="block text-[10px] font-normal normal-case mt-0.5">for {selectedPatient.name}</span>
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
                                {(food as any).treat && (
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
