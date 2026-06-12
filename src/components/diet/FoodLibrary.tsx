// Food Library Component - Based on FitArc Diet Builder
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Food, FoodType, CautionLevel } from '@/lib/diet-types';
import { CATEGORY_IMAGES } from '@/lib/diet-constants';
import { foodService } from '@/lib/food-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Search, Plus, Upload, X } from 'lucide-react';

interface FoodLibraryProps {
  onBack: () => void;
}

export const FoodLibrary: React.FC<FoodLibraryProps> = ({ onBack }) => {
  const [foods, setFoods] = useState<Food[]>([]);
  const [search, setSearch] = useState('');
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importStats, setImportStats] = useState<{updates: number, inserts: number, errors: string[]} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFoods();
  }, []);

  const loadFoods = async () => {
    const data = await foodService.getAll();
    setFoods(data);
  };

  const filteredFoods = useMemo(() => {
    const q = search.toLowerCase();
    
    if (q) {
      return foods.filter(f => f.name_en.toLowerCase().includes(q) || (f.name_hi || "").includes(q));
    }

    // Default ordering when search is empty
    return [...foods].sort((a, b) => {
      const getRank = (f: Food) => {
        const cat = f.category;
        // 1. High Protein
        if (['Meat', 'Eggs', 'Pulses', 'Dairy'].includes(cat) || f.protein >= 10) return 0;
        // 2. Complex Carbs & Fiber
        if (['Cereals', 'Vegetables', 'Fruits'].includes(cat) || f.fiber >= 3) return 1;
        // 3. Healthy Fats
        if (['Nuts', 'Seeds', 'Fats'].includes(cat) || f.fat >= 10) return 2;
        // 4. Others
        return 3;
      };

      const rankA = getRank(a);
      const rankB = getRank(b);
      
      if (rankA !== rankB) return rankA - rankB;
      return a.name_en.localeCompare(b.name_en);
    });
  }, [foods, search]);

  const handleEdit = (food: Food) => {
    setEditingFood({ ...food });
    setIsEditModalOpen(true);
  };

  const handleAddNew = () => {
    const newFood: Food = {
      id: Math.random().toString(36).substr(2, 9),
      name_en: '',
      name_hi: '',
      category: 'General',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      iron: 0,
      yield_factor: 1,
      image_url: '',
      tags: [],
      food_type: 'CORE',
      dietitian_visibility: true,
      caution_level: 'NONE'
    };
    setEditingFood(newFood);
    setIsEditModalOpen(true);
  };

  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFood) return;
    
    try {
      await foodService.save(editingFood);
      await loadFoods();
      setIsEditModalOpen(false);
    } catch (error: any) {
      alert(`Error saving food: ${error.message || 'Unknown error'}`);
      console.error("Save Failed:", error);
    }
  };

  const handleDeleteFood = async () => {
    if (!editingFood || !confirm(`Permanently delete ${editingFood.name_en}? This cannot be undone.`)) return;
    await foodService.delete(editingFood.id);
    await loadFoods();
    setIsEditModalOpen(false);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingFood) {
      try {
        const compressedBase64 = await compressImage(file);
        setEditingFood(prev => prev ? { ...prev, image_url: compressedBase64 } : null);
      } catch (err) {
        console.error("Image processing failed", err);
        alert("Failed to process image. Please try a different file.");
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingFood(prev => prev ? { ...prev, image_url: '' } : null);
  };

  const handleCsvImport = async () => {
    const stats = await foodService.importCSV(csvText);
    setImportStats(stats);
    await loadFoods();
    setCsvText('');
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center flex-none z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} className="-ml-2 px-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="font-bold text-xl text-slate-900">Food Library</h1>
          <Badge variant="secondary" className="ml-2">{foods.length} items</Badge>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIsCsvModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={handleAddNew} className="bg-primary-600 hover:bg-primary-700">
            <Plus className="w-4 h-4 mr-2" />
            Add New Food
          </Button>
        </div>
      </div>

      {/* Main Content - Scrollable Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full p-8 pb-20">
          {/* Search */}
          <div className="mb-6 relative sticky top-0 z-10">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
            <Input 
              placeholder="Search foods by name..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-10 text-lg py-3 shadow-sm h-12 rounded-xl"
            />
          </div>

          <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calories</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Protein</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Carbs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFoods.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No food library items found
                    </td>
                  </tr>
                ) : (
                  filteredFoods.map((food) => (
                    <tr
                      key={food.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleEdit(food)}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{food.name_en}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{food.category}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{food.calories}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{food.protein} g</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{food.carbs} g</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{food.fat} g</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{food.food_type}</Badge>
                          {!food.dietitian_visibility && <Badge variant="destructive">Hidden</Badge>}
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

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFood?.id ? 'Edit Food' : 'Add New Food'}</DialogTitle>
            <DialogDescription className="hidden">Details for editing or adding a food item.</DialogDescription>
          </DialogHeader>
          {editingFood && (
            <form onSubmit={handleSaveFood} className="space-y-6">
              
              {/* Image Section */}
              <div className="flex gap-6 items-start">
                <div className="w-32 h-32 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative group flex-shrink-0">
                  <img 
                    src={editingFood.image_url || CATEGORY_IMAGES[editingFood.category] || CATEGORY_IMAGES.Prepared} 
                    onError={(e) => { e.currentTarget.src = CATEGORY_IMAGES.Prepared; }}
                    className="w-full h-full object-cover"
                    alt="Food preview"
                  />
                  
                  <div 
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="text-white text-xs font-medium">Change</span>
                  </div>

                  {editingFood.image_url && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-1 right-1 bg-white/90 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      title="Remove Image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <Label>English Name</Label>
                    <Input required value={editingFood.name_en} onChange={e => setEditingFood({...editingFood, name_en: e.target.value})} />
                  </div>
                  <div>
                    <Label>Hindi Name</Label>
                    <Input value={editingFood.name_hi} onChange={e => setEditingFood({...editingFood, name_hi: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <select 
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-sm"
                    value={editingFood.category}
                    onChange={e => setEditingFood({...editingFood, category: e.target.value})}
                  >
                    {Object.keys(CATEGORY_IMAGES).map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <Label>Type</Label>
                  <select 
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-sm"
                    value={editingFood.food_type}
                    onChange={e => setEditingFood({...editingFood, food_type: e.target.value as FoodType})}
                  >
                    <option value="CORE">Core</option>
                    <option value="PREPARED">Prepared</option>
                    <option value="TREAT">Treat</option>
                  </select>
                </div>
              </div>

              {/* Macros */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <Label className="mb-3 text-slate-700">Macros (per 100g)</Label>
                <div className="grid grid-cols-4 gap-3">
                  <div><Label className="text-xs">Calories</Label><Input type="number" step="0.1" value={editingFood.calories} onChange={e => setEditingFood({...editingFood, calories: parseFloat(e.target.value) || 0})} /></div>
                  <div><Label className="text-xs">Protein</Label><Input type="number" step="0.1" value={editingFood.protein} onChange={e => setEditingFood({...editingFood, protein: parseFloat(e.target.value) || 0})} /></div>
                  <div><Label className="text-xs">Carbs</Label><Input type="number" step="0.1" value={editingFood.carbs} onChange={e => setEditingFood({...editingFood, carbs: parseFloat(e.target.value) || 0})} /></div>
                  <div><Label className="text-xs">Fat</Label><Input type="number" step="0.1" value={editingFood.fat} onChange={e => setEditingFood({...editingFood, fat: parseFloat(e.target.value) || 0})} /></div>
                </div>
              </div>

              {/* Micros */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <Label className="mb-3 text-slate-700">Micronutrients (Optional)</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">Fiber (g)</Label><Input type="number" step="0.1" value={editingFood.fiber || ''} onChange={e => setEditingFood({...editingFood, fiber: parseFloat(e.target.value) || 0})} placeholder="--" /></div>
                  <div><Label className="text-xs">Iron (mg)</Label><Input type="number" step="0.1" value={editingFood.iron || ''} onChange={e => setEditingFood({...editingFood, iron: parseFloat(e.target.value) || 0})} placeholder="--" /></div>
                  <div><Label className="text-xs">Calcium (mg)</Label><Input type="number" step="0.1" value={editingFood.calcium || ''} onChange={e => setEditingFood({...editingFood, calcium: parseFloat(e.target.value) || 0})} placeholder="--" /></div>
                </div>
              </div>

              {/* Units */}
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <Label>Unit Name (optional)</Label>
                   <Input placeholder="e.g. piece, slice" value={editingFood.unit_name || ''} onChange={e => setEditingFood({...editingFood, unit_name: e.target.value || undefined})} />
                 </div>
                 <div>
                   <Label>Unit Weight (g)</Label>
                   <Input type="number" placeholder="e.g. 50" value={editingFood.unit_weight_g || ''} onChange={e => setEditingFood({...editingFood, unit_weight_g: parseFloat(e.target.value) || undefined})} />
                 </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="destructive" onClick={handleDeleteFood}>Delete</Button>
                <div className="flex-1"></div>
                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary-600 hover:bg-primary-700">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* CSV Import Modal */}
      <Dialog open={isCsvModalOpen} onOpenChange={setIsCsvModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Foods from CSV</DialogTitle>
            <DialogDescription className="hidden">Paste CSV content to import food items.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Paste CSV content below. Required columns: <code className="bg-slate-100 px-1 rounded">name</code>. Optional: <code className="bg-slate-100 px-1 rounded">calories, protein, carbs, fat, fiber, category, unit, unit_weight</code>.
            </p>
            <textarea 
              className="w-full h-64 p-3 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="name,calories,protein,carbs,fat&#10;Apple,52,0.3,14,0.2"
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
            ></textarea>
            
            {importStats && (
              <div className="bg-primary-50 p-4 rounded-xl text-sm space-y-1">
                <p className="font-bold text-primary-800">Import Result:</p>
                <p className="text-primary-700">Updated: {importStats.updates}</p>
                <p className="text-primary-700">Inserted: {importStats.inserts}</p>
                {importStats.errors.length > 0 && (
                  <div className="mt-2 text-red-600">
                    <p className="font-bold">Errors:</p>
                    <ul className="list-disc pl-4 text-xs">
                      {importStats.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                      {importStats.errors.length > 5 && <li>...and {importStats.errors.length - 5} more</li>}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsCsvModalOpen(false)}>Close</Button>
              <Button onClick={handleCsvImport} disabled={!csvText.trim()} className="bg-primary-600 hover:bg-primary-700">Process Import</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FoodLibrary;
