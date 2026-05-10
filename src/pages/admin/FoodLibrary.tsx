import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { Users, Stethoscope, UtensilsCrossed, BarChart3, UserPlus, Settings, LogOut, Search, Plus, Edit, Trash2, Download, Upload, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminSidebarSections } from "@/lib/admin-sidebar";

interface Food {
  id: string;
  name_en: string;
  name_hi: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  food_type: 'CORE' | 'PREPARED' | 'TREAT';
  dietitian_visibility: boolean;
  caution_level: 'NONE' | 'MODERATE' | 'HIGH';
  created_at: string;
}

const AdminFoodLibrary = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Fetch food library
  const { data: foods = [], isLoading } = useQuery({
    queryKey: ["food-library"],
    queryFn: async () => {
      const res = await fetch("/api/food-library");
      if (!res.ok) throw new Error("Failed to fetch food library");
      const data = await res.json();
      return data.data || [];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/food-library/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete food");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-library"] });
      toast.success("Food deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete food");
    },
  });

  // Save mutation (create/update)
  const saveMutation = useMutation({
    mutationFn: async (food: Partial<Food>) => {
      const url = food.id ? `/api/food-library/${food.id}` : "/api/food-library";
      const method = food.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(food),
      });
      if (!res.ok) throw new Error("Failed to save food");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-library"] });
      toast.success("Food saved successfully");
      setIsModalOpen(false);
      setEditingFood(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save food");
    },
  });

  // Filter foods
  const filteredFoods = useMemo(() => {
    return foods.filter((food: Food) => {
      const matchesSearch = 
        food.name_en.toLowerCase().includes(search.toLowerCase()) ||
        food.name_hi.includes(search) ||
        food.category.toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || food.category === categoryFilter;
      const matchesType = typeFilter === "all" || food.food_type === typeFilter;
      
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [foods, search, categoryFilter, typeFilter]);

  // Get unique categories
  const categories = useMemo<string[]>(() => {
    const uniqueCategories = [...new Set(foods.map((f: Food) => f.category))];
    return uniqueCategories.filter((cat): cat is string => typeof cat === 'string').sort();
  }, [foods]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleAddNew = () => {
    setEditingFood({
      id: "",
      name_en: "",
      name_hi: "",
      category: "General",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      food_type: "CORE",
      dietitian_visibility: true,
      caution_level: "NONE",
      created_at: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  const handleEdit = (food: Food) => {
    setEditingFood(food);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingFood) return;
    saveMutation.mutate(editingFood);
  };

  const handleExport = () => {
    // Convert to CSV and download
    const csv = [
      ["Name (EN)", "Name (HI)", "Category", "Calories", "Protein", "Carbs", "Fat", "Fiber", "Type"].join(","),
      ...filteredFoods.map((f: Food) => 
        [f.name_en, f.name_hi, f.category, f.calories, f.protein, f.carbs, f.fat, f.fiber, f.food_type].join(",")
      )
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `food-library-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sidebarSections = getAdminSidebarSections();

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
      <AppSidebar title="DietByRD" subtitle="Admin Panel" sections={sidebarSections} bottomContent={bottomContent} />
      
      <main className="flex-1 p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Food Library</h1>
              <p className="text-gray-500 mt-1">Manage nutrition database for diet plans</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
              <Button onClick={handleAddNew}>
                <Plus className="w-4 h-4 mr-2" />
                Add Food
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="grid grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search foods..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="CORE">Core</SelectItem>
                  <SelectItem value="PREPARED">Prepared</SelectItem>
                  <SelectItem value="TREAT">Treat</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-gray-500 flex items-center">
                Showing {filteredFoods.length} of {foods.length} items
              </div>
            </div>
          </div>

          {/* Food List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Food Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calories</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Protein</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Loading food library...
                      </td>
                    </tr>
                  ) : filteredFoods.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No foods found
                      </td>
                    </tr>
                  ) : (
                    filteredFoods.map((food: Food) => (
                      <tr key={food.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{food.name_en}</div>
                            {food.name_hi && (
                              <div className="text-sm text-gray-500">{food.name_hi}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{food.category}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{food.calories}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{food.protein}g</td>
                        <td className="px-6 py-4">
                          <Badge variant={food.food_type === 'CORE' ? 'default' : food.food_type === 'PREPARED' ? 'secondary' : 'destructive'}>
                            {food.food_type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(food)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(food.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Edit/Add Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFood?.id ? "Edit Food" : "Add New Food"}</DialogTitle>
          </DialogHeader>
          {editingFood && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name (English)</Label>
                  <Input
                    value={editingFood.name_en}
                    onChange={(e) => setEditingFood({ ...editingFood, name_en: e.target.value })}
                    placeholder="e.g., Rice (white, raw)"
                  />
                </div>
                <div>
                  <Label>Name (Hindi)</Label>
                  <Input
                    value={editingFood.name_hi}
                    onChange={(e) => setEditingFood({ ...editingFood, name_hi: e.target.value })}
                    placeholder="e.g., चावल कच्चा"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Category</Label>
                  <Input
                    value={editingFood.category}
                    onChange={(e) => setEditingFood({ ...editingFood, category: e.target.value })}
                    placeholder="e.g., Cereals"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={editingFood.food_type}
                    onValueChange={(value) => setEditingFood({ ...editingFood, food_type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CORE">Core</SelectItem>
                      <SelectItem value="PREPARED">Prepared</SelectItem>
                      <SelectItem value="TREAT">Treat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Caution Level</Label>
                  <Select
                    value={editingFood.caution_level}
                    onValueChange={(value) => setEditingFood({ ...editingFood, caution_level: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="MODERATE">Moderate</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Calories (per 100g)</Label>
                  <Input
                    type="number"
                    value={editingFood.calories}
                    onChange={(e) => setEditingFood({ ...editingFood, calories: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Protein (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingFood.protein}
                    onChange={(e) => setEditingFood({ ...editingFood, protein: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Carbs (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingFood.carbs}
                    onChange={(e) => setEditingFood({ ...editingFood, carbs: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fat (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingFood.fat}
                    onChange={(e) => setEditingFood({ ...editingFood, fat: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Fiber (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingFood.fiber}
                    onChange={(e) => setEditingFood({ ...editingFood, fiber: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save Food"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFoodLibrary;
