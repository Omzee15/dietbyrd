import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORY_IMAGES } from '@/lib/diet-constants';
import { Food, FoodType } from '@/lib/diet-types';
import { foodService } from '@/lib/food-service';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

interface FoodLibraryAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void> | void;
  initialFood?: Food | null;
  showCsvOption?: boolean;
}

const buildEmptyFood = (): Food => ({
  id: '',
  name_en: '',
  name_hi: '',
  category: 'General',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  iron: 0,
  calcium: 0,
  yield_factor: 1,
  image_url: '',
  tags: [],
  food_type: 'CORE',
  dietitian_visibility: true,
  caution_level: 'NONE',
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

export const FoodLibraryAddDialog = ({
  open,
  onOpenChange,
  onSuccess,
  initialFood = null,
  showCsvOption = true,
}: FoodLibraryAddDialogProps) => {
  const [mode, setMode] = useState<'manual' | 'csv'>('manual');
  const [foodForm, setFoodForm] = useState<Food>(buildEmptyFood());
  const [csvText, setCsvText] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const csvTemplate = useMemo(() => foodService.getDbStructuredCsvTemplate(), []);
  const isEditMode = !!initialFood;

  useEffect(() => {
    if (!open) return;

    if (initialFood) {
      setFoodForm({ ...buildEmptyFood(), ...initialFood });
      setMode('manual');
      return;
    }

    setFoodForm(buildEmptyFood());
    setCsvText('');
    setCsvFileName('');
    setMode('manual');
  }, [initialFood, open]);

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload: Food = {
        ...foodForm,
        id: foodForm.id || slugify(foodForm.name_en),
      };

      if (!payload.id || !payload.name_en || !payload.category) {
        toast.error('ID, English name, and category are required');
        return;
      }

      await foodService.save(payload);
      toast.success(isEditMode ? 'Food item updated successfully' : 'Food item added successfully');
      await onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save food item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !foodForm.id) return;
    if (!confirm(`Permanently delete ${foodForm.name_en || 'this food'}? This cannot be undone.`)) return;

    try {
      await foodService.delete(foodForm.id);
      toast.success('Food item deleted');
      await onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete food item');
    }
  };

  const handleCsvImport = async () => {
    if (!csvText.trim()) {
      toast.error('Upload a CSV file first');
      return;
    }

    setIsImporting(true);
    try {
      const result = await foodService.importCSV(csvText);
      const summary = `Imported ${result.inserts} new and updated ${result.updates} items`;

      if (result.errors.length > 0) {
        toast.warning(`${summary}. ${result.errors.length} rows failed.`);
      } else {
        toast.success(summary);
      }

      await onSuccess();
      onOpenChange(false);
      setCsvText('');
      setCsvFileName('');
    } catch (error: any) {
      toast.error(error?.message || 'CSV import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setCsvText(text);
    setCsvFileName(file.name);
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'food_library_db_structure_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          } else if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
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
    if (!file) return;

    try {
      const compressedBase64 = await compressImage(file);
      setFoodForm((prev) => ({ ...prev, image_url: compressedBase64 }));
    } catch {
      toast.error('Failed to process image. Please try another file.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const categoryOptions = [...new Set([...Object.keys(CATEGORY_IMAGES), 'General'])];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[740px] max-h-[92vh] overflow-y-auto bg-slate-100 border-slate-200 rounded-3xl p-8">
        <div className="mb-5">
          <h2 className="text-4 text-slate-900 font-bold">{isEditMode ? 'Edit Food' : 'Add New Food'}</h2>
        </div>

        {!isEditMode && showCsvOption && (
          <div className="flex gap-2 mb-5">
            <Button
              type="button"
              variant={mode === 'manual' ? 'default' : 'outline'}
              onClick={() => setMode('manual')}
              className={mode === 'manual' ? 'bg-primary-600 hover:bg-primary-700' : ''}
            >
              Manual Entry
            </Button>
            <Button
              type="button"
              variant={mode === 'csv' ? 'default' : 'outline'}
              onClick={() => setMode('csv')}
              className={mode === 'csv' ? 'bg-primary-600 hover:bg-primary-700' : ''}
            >
              Add by CSV
            </Button>
          </div>
        )}

        {mode === 'manual' ? (
          <form onSubmit={handleManualSave} className="space-y-6">
            <div className="flex gap-6 items-start">
              <div className="w-44 h-44 bg-slate-200 rounded-2xl overflow-hidden border border-slate-200 relative group flex-shrink-0">
                <img
                  src={foodForm.image_url || CATEGORY_IMAGES[foodForm.category] || CATEGORY_IMAGES.Prepared}
                  onError={(e) => {
                    e.currentTarget.src = CATEGORY_IMAGES.Prepared;
                  }}
                  className="w-full h-full object-cover"
                  alt="Food preview"
                />
                <div
                  className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="text-white text-xs font-medium">Change</span>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <Label>English Name</Label>
                  <Input
                    required
                    value={foodForm.name_en}
                    onChange={(e) =>
                      setFoodForm((prev) => ({
                        ...prev,
                        name_en: e.target.value,
                        id: prev.id ? prev.id : slugify(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Hindi Name</Label>
                  <Input value={foodForm.name_hi} onChange={(e) => setFoodForm((prev) => ({ ...prev, name_hi: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <select
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-sm"
                  value={foodForm.category}
                  onChange={(e) => setFoodForm((prev) => ({ ...prev, category: e.target.value }))}
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Type</Label>
                <select
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-sm"
                  value={foodForm.food_type}
                  onChange={(e) => setFoodForm((prev) => ({ ...prev, food_type: e.target.value as FoodType }))}
                >
                  <option value="CORE">Core</option>
                  <option value="PREPARED">Prepared</option>
                  <option value="TREAT">Treat</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200">
              <Label className="mb-3 text-slate-700">Macros (per 100g)</Label>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Calories</Label>
                  <Input type="number" step="0.1" value={foodForm.calories} onChange={(e) => setFoodForm((prev) => ({ ...prev, calories: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label className="text-xs">Protein</Label>
                  <Input type="number" step="0.1" value={foodForm.protein} onChange={(e) => setFoodForm((prev) => ({ ...prev, protein: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label className="text-xs">Carbs</Label>
                  <Input type="number" step="0.1" value={foodForm.carbs} onChange={(e) => setFoodForm((prev) => ({ ...prev, carbs: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label className="text-xs">Fat</Label>
                  <Input type="number" step="0.1" value={foodForm.fat} onChange={(e) => setFoodForm((prev) => ({ ...prev, fat: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
            </div>

            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200">
              <Label className="mb-3 text-slate-700">Micronutrients (Optional)</Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Fiber (g)</Label>
                  <Input type="number" step="0.1" value={foodForm.fiber || ''} onChange={(e) => setFoodForm((prev) => ({ ...prev, fiber: parseFloat(e.target.value) || 0 }))} placeholder="--" />
                </div>
                <div>
                  <Label className="text-xs">Iron (mg)</Label>
                  <Input type="number" step="0.1" value={foodForm.iron || ''} onChange={(e) => setFoodForm((prev) => ({ ...prev, iron: parseFloat(e.target.value) || 0 }))} placeholder="--" />
                </div>
                <div>
                  <Label className="text-xs">Calcium (mg)</Label>
                  <Input type="number" step="0.1" value={foodForm.calcium || ''} onChange={(e) => setFoodForm((prev) => ({ ...prev, calcium: parseFloat(e.target.value) || 0 }))} placeholder="--" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unit Name (optional)</Label>
                <Input
                  placeholder="e.g. piece, slice"
                  value={foodForm.unit_name || ''}
                  onChange={(e) => setFoodForm((prev) => ({ ...prev, unit_name: e.target.value || undefined }))}
                />
              </div>
              <div>
                <Label>Unit Weight (g)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 50"
                  value={foodForm.unit_weight_g || ''}
                  onChange={(e) => setFoodForm((prev) => ({ ...prev, unit_weight_g: parseFloat(e.target.value) || undefined }))}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              {isEditMode ? (
                <Button type="button" variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex-1" />
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary-600 hover:bg-primary-700" disabled={isSaving}>
                {isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Food'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-slate-500">
              CSV headers should match DB structure. Required columns are: id, name_en, category.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={handleDownloadTemplate} className="rounded-xl">
                Download CSV Template
              </Button>

              <label className="inline-flex items-center">
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvUpload} />
                <span className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium hover:bg-slate-50 cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload CSV File
                </span>
              </label>
            </div>

            {csvFileName && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Selected file: <span className="font-medium">{csvFileName}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                type="button"
                onClick={handleCsvImport}
                disabled={isImporting || !csvText.trim()}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {isImporting ? 'Importing...' : 'Process Import'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
