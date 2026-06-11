// Diet Chart Builder Component - Based on FitArc Diet Builder
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { formatDistanceToNow } from 'date-fns';
import { Food, Meal, MealItem, DietPatient, DietPlan, NutrientSnapshot, Prototype } from '@/lib/diet-types';
import { CATEGORY_IMAGES, INITIAL_MEALS } from '@/lib/diet-constants';
import { foodService } from '@/lib/food-service';
import { dietApi } from '@/lib/diet-api';
import { 
  calculateGramsForTarget, 
  createMealItem, 
  getRDA, 
  calculateNutrientSnapshot, 
  generateId, 
  calculateModulators, 
  cn 
} from '@/lib/diet-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Search, Plus, Trash2, Minus, FileText } from 'lucide-react';

interface DietChartProps {
  patient: DietPatient;
  date?: string;
  onBack: () => void;
}

export const DietChart: React.FC<DietChartProps> = ({ 
  patient, 
  date = new Date().toISOString().split('T')[0], 
  onBack 
}) => {
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [prototypes, setPrototypes] = useState<Prototype[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableFoods, setAvailableFoods] = useState<Food[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Active prototype state
  const [activeProtoIndex, setActiveProtoIndex] = useState(0);
  const activePrototype = prototypes[activeProtoIndex];
  const [meals, setMeals] = useState<Meal[]>([]);
  const [activeMealId, setActiveMealId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMicros, setShowMicros] = useState(false);
  
  // Modals
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MealItem | null>(null);
  const [isCustomFoodModalOpen, setIsCustomFoodModalOpen] = useState(false);
  const [protoModalOpen, setProtoModalOpen] = useState(false);
  const [customFoodForm, setCustomFoodForm] = useState({
    name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', targetMealId: ''
  });
  
  // Target modal state
  const [activeTab, setActiveTab] = useState<'nutrient' | 'weight' | 'quantity'>('nutrient');
  const [targetType, setTargetType] = useState<'protein' | 'carbs' | 'fat'>('protein');
  const [targetAmount, setTargetAmount] = useState<string>('20');
  const [weightInput, setWeightInput] = useState<string>('100');
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [rawOrCooked, setRawOrCooked] = useState<'raw' | 'cooked'>('raw');
  
  // Edit modal state
  const [editWeight, setEditWeight] = useState<string>('');
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [editMode, setEditMode] = useState<'weight' | 'quantity'>('weight');
  const [editRawOrCooked, setEditRawOrCooked] = useState<'raw' | 'cooked'>('raw');
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load data
  useEffect(() => {
    const foods = foodService.getAll();
    setAvailableFoods(foods);
    
    const loadDraft = async () => {
      setIsLoading(true);
      try {
        const draft = await dietApi.getDraftPlan(patient.id, date);
        setPlan(draft);
        if (draft.prototypes && draft.prototypes.length > 0) {
          setPrototypes(draft.prototypes);
          setMeals(draft.prototypes[0].meals);
        } else {
          const defaultProto = {
            id: generateId(),
            name: 'Prototype 1',
            meals: draft.meals
          };
          setPrototypes([defaultProto]);
          setMeals(draft.meals);
        }
        if (draft.meals.length > 0) {
          setActiveMealId(draft.meals[0].id);
        }
        setLastSaved(draft.updatedAt);
        hasLoadedRef.current = true;
      } catch (err) {
        console.error("Failed to load", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDraft();
  }, [patient.id, date]);

  // Auto-save
  useEffect(() => {
    if (!hasLoadedRef.current || !plan) return;
    
    setIsSaving(true);
    const timer = setTimeout(async () => {
      try {
        // Update prototype with current meals
        const updatedPrototypes = prototypes.map((p, i) => 
          i === activeProtoIndex ? { ...p, meals } : p
        );
        
        const updatedPlan: DietPlan = {
          ...plan,
          prototypes: updatedPrototypes,
          meals: meals,
          updatedAt: new Date().toISOString()
        };
        
        const saved = await dietApi.saveDraft(updatedPlan);
        setPlan(saved);
        setLastSaved(saved.updatedAt);
      } catch (err) {
        console.error("Auto-save failed", err);
      } finally {
        setIsSaving(false);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [meals, plan?.note]);

  // Sync meals when prototype changes
  useEffect(() => {
    if (activePrototype) {
      setMeals(activePrototype.meals);
      if (activePrototype.meals.length > 0) {
        setActiveMealId(activePrototype.meals[0].id);
      }
    }
  }, [activeProtoIndex]);

  const activeMeal = meals.find(m => m.id === activeMealId);

  // Calculate totals
  const totals = useMemo(() => {
    const acc: NutrientSnapshot & { treatCalories: number } = {
      calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
      iron: 0, calcium: 0, magnesium: 0, zinc: 0, potassium: 0, sodium: 0, 
      phosphorus: 0, iodine: 0, selenium: 0, copper: 0,
      vitamin_a: 0, vitamin_b1: 0, vitamin_b2: 0, vitamin_b3: 0, vitamin_b6: 0, 
      vitamin_b9: 0, vitamin_b12: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, 
      vitamin_k: 0, treatCalories: 0
    };
    
    meals.forEach(m => m.items.forEach(i => {
      (Object.keys(i.snapshot) as Array<keyof NutrientSnapshot>).forEach(key => {
        const val = i.snapshot[key];
        if (typeof val === 'number') acc[key] += val;
      });
      if (i.food.food_type === 'TREAT') acc.treatCalories += i.snapshot.calories;
    }));
    
    return acc;
  }, [meals]);

  const modulators = useMemo(() => calculateModulators(meals), [meals]);
  const treatPercentage = totals.calories > 0 ? (totals.treatCalories / totals.calories) * 100 : 0;
  const tdee = patient.tdee || 2000;
  const goalCals = tdee + (patient.goal_value || 0);
  const proteinTarget = patient.weight_kg * (patient.protein_target_g_kg || 1.6);

  // Filtered foods for search
  const filteredFoods = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return availableFoods.filter(f => {
      const matchesSearch = f.name_en.toLowerCase().includes(q) || (f.name_hi || "").includes(q);
      return matchesSearch && f.dietitian_visibility;
    }).slice(0, 50);
  }, [searchQuery, availableFoods]);

  const getFallbackImage = (category: string) => CATEGORY_IMAGES[category] || CATEGORY_IMAGES.Prepared;

  // Add prototype handler
  const addPrototype = (mode: 'copy' | 'blank') => {
    const newName = `Prototype ${prototypes.length + 1}`;
    let newMeals: Meal[] = [];
    if (mode === 'copy') {
      const source = prototypes[0];
      newMeals = source.meals.map(m => ({ 
        ...m, 
        id: `meal-${generateId()}`, 
        items: m.items.map(i => ({ ...i, id: crypto.randomUUID() })) 
      }));
    } else {
      newMeals = INITIAL_MEALS.map((name, idx) => ({ 
        id: `meal-${idx}-${generateId()}`, 
        name, 
        items: [] 
      }));
    }
    const newProto = { id: generateId(), name: newName, meals: newMeals };
    setPrototypes(prev => [...prev, newProto]);
    setActiveProtoIndex(prototypes.length);
    setMeals(newMeals);
    if (newMeals.length > 0) {
      setActiveMealId(newMeals[0].id);
    }
    setProtoModalOpen(false);
  };

  // Handlers
  const handleAddMeal = () => {
    const newId = `meal-${generateId()}`;
    const newMeal: Meal = { id: newId, name: `Meal ${meals.length + 1}`, items: [] };
    setMeals([...meals, newMeal]);
    setActiveMealId(newId);
  };

  const handleOpenCustomFood = () => {
    setCustomFoodForm({
      name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '',
      targetMealId: activeMealId || (meals.length > 0 ? meals[0].id : '')
    });
    setIsCustomFoodModalOpen(true);
  };

  const handleSaveCustomFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFoodForm.name || !customFoodForm.calories || !customFoodForm.protein || !customFoodForm.carbs || !customFoodForm.fat) {
      alert("Please fill in all required fields.");
      return;
    }
    
    const adHocFood: Food = {
      id: `custom-${generateId()}`,
      name_en: customFoodForm.name,
      name_hi: '',
      category: 'General',
      calories: parseFloat(customFoodForm.calories),
      protein: parseFloat(customFoodForm.protein),
      carbs: parseFloat(customFoodForm.carbs),
      fat: parseFloat(customFoodForm.fat),
      fiber: parseFloat(customFoodForm.fiber || '0'),
      iron: 0,
      yield_factor: 1,
      image_url: '',
      tags: ['Custom'],
      food_type: 'CORE',
      dietitian_visibility: true,
      caution_level: 'NONE'
    };
    
    const newItem = createMealItem(adHocFood, {
      entered_mode: 'weight',
      entered_value: 100,
      raw_grams_computed: 100,
      display_quantity: '100g (custom)',
      raw_or_cooked: 'raw'
    });
    
    setMeals(prev => prev.map(m => 
      m.id === customFoodForm.targetMealId 
        ? { ...m, items: [...m.items, newItem] } 
        : m
    ));
    setIsCustomFoodModalOpen(false);
  };

  const handleAddFoodClick = (food: Food) => {
    setSelectedFood(food);
    setTargetModalOpen(true);
    setRawOrCooked(food.food_type === 'PREPARED' ? 'cooked' : 'raw');
    setWeightInput('100');
    setQuantityInput('1');
    setTargetAmount('20');
    
    if (food.unit_name) setActiveTab('quantity');
    else if (food.protein > 10) {
      setActiveTab('nutrient');
      setTargetType('protein');
    } else {
      setActiveTab('weight');
    }
  };

  const getComputedValues = () => {
    if (!selectedFood) return null;
    let rawGrams = 0, displayQty = '', enteredVal = 0;
    
    if (activeTab === 'nutrient') {
      enteredVal = Number(targetAmount);
      rawGrams = calculateGramsForTarget(enteredVal, targetType, selectedFood);
      displayQty = `${rawGrams}g (calc)`;
    } else if (activeTab === 'weight') {
      enteredVal = Number(weightInput);
      rawGrams = rawOrCooked === 'cooked' ? enteredVal / selectedFood.yield_factor : enteredVal;
      displayQty = `${enteredVal}g (${rawOrCooked})`;
    } else {
      enteredVal = Number(quantityInput);
      const baseWeight = enteredVal * (selectedFood.unit_weight_g || 100);
      rawGrams = rawOrCooked === 'cooked' ? baseWeight / selectedFood.yield_factor : baseWeight;
      displayQty = `${enteredVal} ${selectedFood.unit_name || 'units'} (${rawOrCooked})`;
    }
    
    const factor = rawGrams / 100;
    return {
      rawGrams,
      displayQty,
      enteredVal,
      calories: selectedFood.calories * factor,
      protein: selectedFood.protein * factor,
      carbs: selectedFood.carbs * factor,
      fat: selectedFood.fat * factor,
      fiber: (selectedFood.fiber || 0) * factor
    };
  };

  const confirmAddFood = () => {
    if (!selectedFood) return;
    const computed = getComputedValues();
    if (!computed || computed.rawGrams <= 0) return;
    
    const newItem = createMealItem(selectedFood, {
      entered_mode: activeTab,
      entered_value: computed.enteredVal,
      raw_grams_computed: computed.rawGrams,
      display_quantity: computed.displayQty,
      raw_or_cooked: rawOrCooked
    });
    
    setMeals(prev => prev.map(m => 
      m.id === activeMealId 
        ? { ...m, items: [...m.items, newItem] } 
        : m
    ));
    setTargetModalOpen(false);
    setSearchQuery('');
  };

  const removeMealItem = (mealId: string, itemId: string) => {
    setMeals(prev => prev.map(m => 
      m.id === mealId 
        ? { ...m, items: m.items.filter(i => i.id !== itemId) } 
        : m
    ));
  };

  const handleQuickAdjust = (item: MealItem, direction: 1 | -1) => {
    const isQty = item.entered_mode === 'quantity';
    const step = isQty ? 1 : 10;
    const min = isQty ? 1 : 10;
    let newVal = item.entered_value + (direction * step);
    if (newVal < min) return;
    
    let rawGrams = 0, displayQty = '';
    if (isQty) {
      const base = newVal * (item.food.unit_weight_g || 100);
      rawGrams = item.raw_or_cooked === 'cooked' ? base / item.food.yield_factor : base;
      displayQty = `${newVal} ${item.food.unit_name} (${item.raw_or_cooked})`;
    } else {
      rawGrams = item.raw_or_cooked === 'cooked' ? newVal / item.food.yield_factor : newVal;
      displayQty = `${newVal}g (${item.raw_or_cooked})`;
    }
    
    const newSnap = calculateNutrientSnapshot(item.food, rawGrams);
    const updated = {
      ...item,
      entered_value: newVal,
      raw_grams_computed: rawGrams,
      display_quantity: displayQty,
      snapshot: newSnap
    };
    
    setMeals(prev => prev.map(m => ({
      ...m,
      items: m.items.map(i => i.id === item.id ? updated : i)
    })));
  };

  const openEditModal = (item: MealItem) => {
    setEditingItem(item);
    setEditRawOrCooked(item.raw_or_cooked);
    const isQty = item.entered_mode === 'quantity';
    setEditMode(isQty ? 'quantity' : 'weight');
    if (isQty) {
      setEditQuantity(item.entered_value.toString());
      setEditWeight('');
    } else {
      setEditWeight(item.entered_value.toString());
      setEditQuantity('');
    }
    setEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    
    let rawGrams = 0, displayQty = '', newVal = 0;
    if (editMode === 'quantity') {
      newVal = Number(editQuantity);
      const base = newVal * (editingItem.food.unit_weight_g || 100);
      rawGrams = editRawOrCooked === 'cooked' ? base / editingItem.food.yield_factor : base;
      displayQty = `${newVal} ${editingItem.food.unit_name} (${editRawOrCooked})`;
    } else {
      newVal = Number(editWeight);
      rawGrams = editRawOrCooked === 'cooked' ? newVal / editingItem.food.yield_factor : newVal;
      displayQty = `${newVal}g (${editRawOrCooked})`;
    }
    
    const newSnap = calculateNutrientSnapshot(editingItem.food, rawGrams);
    const updated = {
      ...editingItem,
      entered_mode: editMode,
      entered_value: newVal,
      raw_or_cooked: editRawOrCooked,
      raw_grams_computed: rawGrams,
      display_quantity: displayQty,
      snapshot: newSnap
    };
    
    setMeals(prev => prev.map(m => ({
      ...m,
      items: m.items.map(i => i.id === editingItem.id ? updated : i)
    })));
    setEditModalOpen(false);
  };

  const deleteMeal = (mealId: string) => {
    if (!confirm('Delete this meal?')) return;
    const newMeals = meals.filter(m => m.id !== mealId);
    setMeals(newMeals);
    if (activeMealId === mealId && newMeals.length > 0) {
      setActiveMealId(newMeals[0].id);
    }
  };

  // PDF Generation
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 15;
    const pageBottom = 270;
    const ensureSpace = (space: number) => {
      if (y + space > pageBottom) {
        doc.addPage();
        y = 15;
      }
    };

    // Header
    doc.setFontSize(22);
    doc.setTextColor(14, 165, 233);
    doc.text("DietByrd Diet Plan", margin, y);
    y += 8;

    // Patient Info
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Patient: ${patient.name} (${patient.age}y, ${patient.sex})`, margin, y);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin + 80, y);
    y += 6;

    // Summary
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Daily Summary", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Calories: ${totals.calories.toFixed(0)} / ${goalCals.toFixed(0)} kcal`, margin, y);
    doc.text(`Protein: ${totals.protein.toFixed(1)}g`, margin + 60, y);
    doc.text(`Carbs: ${totals.carbs.toFixed(1)}g`, margin + 100, y);
    doc.text(`Fat: ${totals.fat.toFixed(1)}g`, margin + 140, y);
    y += 6;
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Meals
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(14, 165, 233);
    doc.text("Meal Plan", margin, y);
    y += 8;

    meals.forEach(meal => {
      doc.setFillColor(240, 249, 255);
      doc.roundedRect(margin, y - 6, pageWidth - (margin * 2), 9, 2, 2, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(14, 165, 233);
      doc.text(meal.name, margin + 3, y);
      
      const mealCals = meal.items.reduce((acc, i) => acc + i.snapshot.calories, 0);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`${mealCals.toFixed(0)} kcal`, pageWidth - margin - 20, y);
      y += 8;
      
      if (meal.items.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(150);
        doc.setFontSize(10);
        doc.text("No items", margin + 5, y);
        y += 8;
      }
      
      meal.items.forEach(item => {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);
        doc.setFontSize(10);
        doc.text(`• ${item.food.name_en}`, margin + 5, y);
        doc.setTextColor(100);
        doc.text(`${item.display_quantity} — P:${item.snapshot.protein.toFixed(1)} C:${item.snapshot.carbs.toFixed(1)} F:${item.snapshot.fat.toFixed(1)} (${item.snapshot.calories.toFixed(0)} kcal)`, margin + 50, y);
        y += 6;
        
        if (y > 270) {
          doc.addPage();
          y = 15;
        }
      });
      
      y += 4;
    });

    // Micronutrient Summary
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(14, 165, 233);
    doc.text("Micronutrients", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.setFontSize(8);

    const micros = [
      { label: 'Fiber', key: 'fiber', target: getRDA('fiber', patient.age, patient.sex), unit: 'g' },
      { label: 'Calcium', key: 'calcium', target: getRDA('calcium', patient.age, patient.sex), unit: 'mg' },
      { label: 'Iron', key: 'iron', target: getRDA('iron', patient.age, patient.sex), unit: 'mg' },
      { label: 'Magnesium', key: 'magnesium', target: getRDA('magnesium', patient.age, patient.sex), unit: 'mg' },
      { label: 'Zinc', key: 'zinc', target: getRDA('zinc', patient.age, patient.sex), unit: 'mg' },
      { label: 'Potassium', key: 'potassium', target: getRDA('potassium', patient.age, patient.sex), unit: 'mg' },
      { label: 'Sodium', key: 'sodium', target: getRDA('sodium', patient.age, patient.sex), unit: 'mg' },
      { label: 'Phosphorus', key: 'phosphorus', target: getRDA('phosphorus', patient.age, patient.sex), unit: 'mg' },
      { label: 'Iodine', key: 'iodine', target: getRDA('iodine', patient.age, patient.sex), unit: 'ug' },
      { label: 'Selenium', key: 'selenium', target: getRDA('selenium', patient.age, patient.sex), unit: 'ug' },
      { label: 'Vitamin A', key: 'vitamin_a', target: getRDA('vitamin_a', patient.age, patient.sex), unit: 'ug' },
      { label: 'Vitamin C', key: 'vitamin_c', target: getRDA('vitamin_c', patient.age, patient.sex), unit: 'mg' },
      { label: 'Vitamin D', key: 'vitamin_d', target: getRDA('vitamin_d', patient.age, patient.sex), unit: 'ug' },
      { label: 'Vitamin E', key: 'vitamin_e', target: getRDA('vitamin_e', patient.age, patient.sex), unit: 'mg' },
      { label: 'Vitamin K', key: 'vitamin_k', target: getRDA('vitamin_k', patient.age, patient.sex), unit: 'ug' },
      { label: 'B1', key: 'vitamin_b1', target: getRDA('vitamin_b1', patient.age, patient.sex), unit: 'mg' },
      { label: 'B2', key: 'vitamin_b2', target: getRDA('vitamin_b2', patient.age, patient.sex), unit: 'mg' },
      { label: 'B3', key: 'vitamin_b3', target: getRDA('vitamin_b3', patient.age, patient.sex), unit: 'mg' },
      { label: 'B6', key: 'vitamin_b6', target: getRDA('vitamin_b6', patient.age, patient.sex), unit: 'mg' },
      { label: 'B9', key: 'vitamin_b9', target: getRDA('vitamin_b9', patient.age, patient.sex), unit: 'ug' },
      { label: 'B12', key: 'vitamin_b12', target: getRDA('vitamin_b12', patient.age, patient.sex), unit: 'ug' },
    ];

    const colWidth = (pageWidth - (margin * 2)) / 2;
    const maxRows = 11;
    let col = 0;
    let row = 0;
    const microStartY = y;

    micros.forEach((m, index) => {
      if (index > 0 && index % maxRows === 0) {
        col += 1;
        row = 0;
      }
      if (col > 1) {
        doc.addPage();
        y = 15;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(14, 165, 233);
        doc.text("Micronutrients (cont.)", margin, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(60);
        col = 0;
        row = 0;
      }
      const currentY = (col > 0 ? y : microStartY) + (row * 6);
      const x = margin + (col * colWidth);
      // @ts-ignore
      const val = totals[m.key] || 0;
      const pct = m.target > 0 ? (val / m.target) * 100 : 0;
      doc.text(`${m.label}: ${val.toFixed(1)} / ${m.target} ${m.unit}`, x, currentY);
      doc.setTextColor(120);
      doc.text(`${pct.toFixed(0)}%`, x + colWidth - 6, currentY, { align: 'right' });
      doc.setTextColor(60);
      row += 1;
    });

    y = Math.max(y, microStartY + (Math.min(maxRows, micros.length) * 6) + 6);

    // Micronutrient Modulators Index
    ensureSpace(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(14, 165, 233);
    doc.text("Micronutrient Modulators Index", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);

    const modItems = [
      { label: 'Oxalate Index', result: modulators.oxalate, type: 'oxalate' as const },
      { label: 'Phytate Index', result: modulators.phytate, type: 'phytate' as const }
    ];

    modItems.forEach((m, i) => {
      const x = margin + (i * 80);
      let zone = '';
      let color: [number, number, number] = [34, 197, 94];
      if (m.type === 'oxalate') {
        if (m.result.percentage < 60) {
          zone = 'Healthy';
          color = [34, 197, 94];
        } else {
          zone = 'Caution';
          color = [234, 179, 8];
        }
      } else {
        if (m.result.percentage < 10) {
          zone = 'Not enough';
          color = [59, 130, 246];
        } else if (m.result.percentage < 70) {
          zone = 'Healthy';
          color = [34, 197, 94];
        } else {
          zone = 'Caution';
          color = [234, 179, 8];
        }
      }
      doc.setFont("helvetica", "bold");
      doc.text(`${m.label}: ${m.result.percentage.toFixed(0)}%`, x, y);
      doc.setFont("helvetica", "normal");
      doc.text(zone, x + 65, y, { align: 'right' });
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(x, y + 2, 65, 2.5, 0.75, 0.75, 'F');
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(x, y + 2, 65 * Math.min(m.result.percentage / 100, 1), 2.5, 0.75, 0.75, 'F');
      if (m.result.contributors.length > 0) {
        doc.setFontSize(7);
        doc.setTextColor(120);
        doc.setFont("helvetica", "italic");
        doc.text(`Top: ${m.result.contributors.map(c => c.name).join(', ')}`, x, y + 6);
        doc.setFontSize(9);
        doc.setTextColor(60);
        doc.setFont("helvetica", "normal");
      }
    });

    doc.save(`diet-plan-${patient.name.replace(/\s+/g, '-')}-${date}.pdf`);
  };

  const preview = getComputedValues();

  const macroData = [
    { name: 'Protein', value: totals.protein, target: proteinTarget, fill: '#0ea5e9' },
    { name: 'Carbs', value: totals.carbs, target: goalCals * 0.45 / 4, fill: '#14b8a6' },
    { name: 'Fat', value: totals.fat, target: goalCals * 0.25 / 9, fill: '#f59e0b' },
  ];

  const MicroProgress = ({ label, value, rda, unit, reverse = false }: { label: string; value: number; rda: number; unit: string; reverse?: boolean }) => {
    const pct = rda > 0 ? (value / rda) * 100 : 0;
    let color = 'bg-red-500';
    if (reverse) {
      if (pct > 120) color = 'bg-red-500';
      else if (pct > 100) color = 'bg-orange-500';
      else color = 'bg-green-500';
    } else {
      if (pct >= 80 && pct <= 120) color = 'bg-green-500';
      else if (pct > 150) color = 'bg-orange-500';
      else if (pct >= 50) color = 'bg-yellow-500';
      else color = 'bg-red-500';
    }
    return (
      <div className="mb-3 group relative">
        <div className="flex justify-between text-[10px] mb-1 text-slate-600">
          <span className="font-medium">{label}</span>
          <span className="font-mono">{value.toFixed(1)} / {rda} {unit}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${Math.min(pct, 100)}%` }}></div>
        </div>
      </div>
    );
  };

  const ModulatorBar = ({ label, percentage, contributors, type }: { label: string; percentage: number; contributors: { name: string; amount: number }[]; type: 'oxalate' | 'phytate' }) => {
    let zone = '';
    let color = '';
    let emoji = '';
    if (type === 'oxalate') {
      if (percentage < 60) {
        zone = 'Healthy';
        color = 'bg-green-500';
        emoji = '🟢';
      } else {
        zone = 'Caution';
        color = 'bg-yellow-500';
        emoji = '🟡';
      }
    } else {
      if (percentage < 10) {
        zone = 'Not enough';
        color = 'bg-blue-500';
        emoji = '🔵';
      } else if (percentage < 70) {
        zone = 'Healthy';
        color = 'bg-green-500';
        emoji = '🟢';
      } else {
        zone = 'Caution';
        color = 'bg-yellow-500';
        emoji = '🟡';
      }
    }
    return (
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1 font-semibold">
          <span className="text-slate-700">{label}: {percentage.toFixed(0)}%</span>
          <span className="text-slate-500">{emoji} {zone}</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-1.5">
          <div className={cn("h-full transition-all duration-500", color)} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
        </div>
        {contributors.length > 0 && (
          <p className="text-[10px] text-slate-500 leading-tight italic">Top contributors: {contributors.map(c => c.name).join(', ')}</p>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 relative">
      {/* Current Prototype Indicator - Top Center */}
      {prototypes.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-800 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg opacity-90 pointer-events-none">
          {activePrototype?.name || 'Prototype 1'} {activeProtoIndex === 0 && '(Primary)'}
        </div>
      )}

      {/* Left Sidebar - Meals */}
      <div className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" onClick={onBack} className="-ml-2 px-2 text-xs text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            {isSaving ? (
              <span className="text-[10px] text-slate-400 ml-auto animate-pulse">Saving...</span>
            ) : lastSaved ? (
              <span className="text-[10px] text-slate-400 ml-auto" title={new Date(lastSaved).toLocaleString()}>
                Saved {formatDistanceToNow(new Date(lastSaved))} ago
              </span>
            ) : null}
          </div>
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-slate-800 text-lg">Daily Meals</h2>
            <Badge className="bg-amber-100 text-amber-700 text-[10px]">DRAFT</Badge>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {meals.map(meal => (
            <div 
              key={meal.id} 
              onClick={() => setActiveMealId(meal.id)} 
              className={cn(
                "group p-3 rounded-xl cursor-pointer transition-all border flex flex-col relative",
                activeMealId === meal.id 
                  ? "bg-primary-50 border-primary-200 shadow-sm ring-1 ring-primary-100" 
                  : "bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200"
              )}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={cn(
                  "font-semibold text-sm",
                  activeMealId === meal.id ? "text-primary-800" : "text-slate-700"
                )}>
                  {meal.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 bg-white px-1.5 py-0.5 rounded-md border border-slate-100">
                    {meal.items.reduce((sum, i) => sum + i.snapshot.calories, 0).toFixed(0)}
                  </span>
                  <button 
                    className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    onClick={(e) => { e.stopPropagation(); deleteMeal(meal.id); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-500 truncate">
                {meal.items.map(i => i.food.name_en).join(', ') || 'Empty'}
              </div>
            </div>
          ))}
          
          <Button 
            variant="outline" 
            className="w-full mt-2 border-dashed border-slate-300 text-slate-500 hover:border-primary-300 hover:text-primary-600"
            onClick={handleAddMeal}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Meal
          </Button>
          <Button 
            variant="ghost" 
            className="w-full mt-1 text-slate-400 hover:text-primary-600 text-xs font-semibold"
            onClick={handleOpenCustomFood}
          >
            + Add Custom Food
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full space-y-6">
            {/* Search Box */}
            <div className="relative z-20">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 transition-all focus-within:ring-2 ring-primary-100">
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={activeMeal ? `Add foods to ${activeMeal.name}...` : "Select a meal to start adding foods..."}
                    className="flex-1 outline-none text-lg placeholder:text-slate-300 bg-transparent"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    disabled={!activeMeal}
                  />
                </div>
              </div>
              
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 max-h-96 overflow-y-auto">
                  {filteredFoods.map(food => (
                    <div 
                      key={food.id} 
                      onClick={() => handleAddFoodClick(food)} 
                      className="p-3 hover:bg-slate-50 flex items-center gap-4 cursor-pointer group border-b border-slate-50 last:border-0"
                    >
                      <img 
                        src={food.image_url || getFallbackImage(food.category)} 
                        onError={(e) => { e.currentTarget.src = getFallbackImage(food.category); }}
                        className="w-12 h-12 rounded-lg object-cover bg-slate-100"
                        alt={food.name_en}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-800">{food.name_en}</h4>
                          <span className="text-xs font-mono text-slate-400 ml-auto">{food.calories}kcal</span>
                        </div>
                        <div className="text-xs text-slate-500 flex gap-2">
                          <span className="text-primary-600">P: {food.protein}g</span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {filteredFoods.length === 0 && (
                    <div className="p-4 text-center text-slate-400">No foods found</div>
                  )}
                </div>
              )}
            </div>

            {/* Active Meal Items */}
            <div>
              <div className="flex justify-between items-end mb-4">
                <h3 className="text-2xl font-bold text-slate-800">{activeMeal?.name || 'Select a meal'}</h3>
                <span className="text-sm font-medium text-slate-500">{activeMeal?.items.length || 0} items</span>
              </div>
              
              <div className="space-y-3">
                {activeMeal?.items.map(item => (
                  <Card 
                    key={item.id} 
                    className="flex items-stretch group hover:border-primary-200 hover:shadow-md transition-all cursor-pointer overflow-hidden p-0"
                    onClick={() => openEditModal(item)}
                  >
                    <div className="flex-1 flex items-center p-3 gap-4 min-w-0">
                      <img 
                        src={item.food.image_url || getFallbackImage(item.food.category)} 
                        onError={(e) => { e.currentTarget.src = getFallbackImage(item.food.category); }}
                        className="w-16 h-16 rounded-xl object-cover bg-slate-100"
                        alt={item.food.name_en}
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 truncate">{item.food.name_en}</h4>
                            {item.food.name_hi && <p className="text-xs text-slate-500 truncate">{item.food.name_hi}</p>}
                            <p className="text-[10px] font-semibold text-slate-500 mt-1 flex gap-2 flex-wrap">
                              <span className="text-primary-600">● P {item.snapshot.protein.toFixed(1)}</span>
                              <span className="text-secondary-600">● C {item.snapshot.carbs.toFixed(1)}</span>
                              <span className="text-amber-600">● F {item.snapshot.fat.toFixed(1)}</span>
                              <span className="text-slate-400 font-bold">({item.snapshot.calories.toFixed(0)} kcal)</span>
                            </p>
                          </div>
                          <div 
                            className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-100 shadow-sm flex-shrink-0"
                            onClick={e => e.stopPropagation()}
                          >
                            <button 
                              className="w-6 h-6 flex items-center justify-center bg-white text-slate-500 hover:bg-slate-100 rounded text-xs font-bold"
                              onClick={() => handleQuickAdjust(item, -1)}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <div className="text-right min-w-[3rem] px-1">
                              <p className="font-bold text-slate-900 text-xs">{item.entered_value}</p>
                              <p className="text-[9px] text-slate-500">{item.entered_mode === 'quantity' ? item.food.unit_name : 'g'}</p>
                            </div>
                            <button 
                              className="w-6 h-6 flex items-center justify-center bg-white text-primary-600 hover:bg-primary-50 rounded text-xs font-bold"
                              onClick={() => handleQuickAdjust(item, 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div 
                      className="w-10 flex items-center justify-center border-l border-slate-100 bg-slate-50 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); removeMealItem(activeMealId, item.id); }}
                    >
                      <Trash2 className="w-5 h-5" />
                    </div>
                  </Card>
                ))}
                
                {activeMeal?.items.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <p>No items in this meal</p>
                    <p className="text-sm">Search for foods above to add them</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Summary */}
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-y-auto">
        <div className="p-6 pb-40 space-y-8">
          {/* Calorie Circle */}
          <div className="text-center">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Total Calories</h3>
            <div className="relative w-40 h-40 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" className="text-slate-100" strokeWidth="12" fill="none" stroke="currentColor" />
                <circle 
                  cx="80" cy="80" r="70" 
                  className={totals.calories > goalCals ? "text-red-500" : "text-primary-500"}
                  strokeWidth="12" fill="none" stroke="currentColor"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (Math.min(totals.calories, goalCals * 1.5) / goalCals) * 440}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-800">{totals.calories.toFixed(0)}</span>
                <span className="text-xs text-slate-400">/ {goalCals.toFixed(0)}</span>
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-500">{(goalCals - totals.calories).toFixed(0)} remaining</div>
          </div>

          {/* Treat Warning */}
          {treatPercentage > 10 && (
            <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex gap-3">
              <h4 className="text-sm font-semibold text-orange-800">High Treat Volume ({treatPercentage.toFixed(0)}%)</h4>
            </div>
          )}

          {/* Macro Bars */}
          <div className="space-y-4">
            {macroData.map(m => (
              <div key={m.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">{m.name}</span>
                  <span className="text-slate-500">{m.value.toFixed(0)} / {m.target.toFixed(0)}g</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full"
                    style={{ width: `${Math.min((m.value / m.target) * 100, 100)}%`, backgroundColor: m.fill }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button variant="outline" className="w-full text-xs" onClick={() => setShowMicros(!showMicros)}>
              {showMicros ? 'Hide Micros' : 'Show Full Micronutrient Panel'}
            </Button>
          </div>

          {/* Micronutrients Panel */}
          {showMicros && (
            <div className="bg-slate-50 p-4 rounded-xl space-y-5">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Fiber</h4>
                <MicroProgress label="Dietary Fiber" value={totals.fiber} rda={getRDA('fiber', patient.age, patient.sex)} unit="g" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Minerals</h4>
                <MicroProgress label="Calcium" value={totals.calcium} rda={getRDA('calcium', patient.age, patient.sex)} unit="mg" />
                <MicroProgress label="Iron" value={totals.iron} rda={getRDA('iron', patient.age, patient.sex)} unit="mg" />
                <MicroProgress label="Magnesium" value={totals.magnesium} rda={getRDA('magnesium', patient.age, patient.sex)} unit="mg" />
                <MicroProgress label="Zinc" value={totals.zinc} rda={getRDA('zinc', patient.age, patient.sex)} unit="mg" />
                <MicroProgress label="Potassium" value={totals.potassium} rda={getRDA('potassium', patient.age, patient.sex)} unit="mg" />
                <MicroProgress label="Sodium" value={totals.sodium} rda={getRDA('sodium', patient.age, patient.sex)} unit="mg" reverse />
                <MicroProgress label="Phosphorus" value={totals.phosphorus} rda={getRDA('phosphorus', patient.age, patient.sex)} unit="mg" />
                <MicroProgress label="Iodine" value={totals.iodine} rda={getRDA('iodine', patient.age, patient.sex)} unit="ug" />
                <MicroProgress label="Selenium" value={totals.selenium} rda={getRDA('selenium', patient.age, patient.sex)} unit="ug" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Vitamins</h4>
                <MicroProgress label="Vitamin A" value={totals.vitamin_a} rda={getRDA('vitamin_a', patient.age, patient.sex)} unit="ug" />
                <MicroProgress label="Vitamin C" value={totals.vitamin_c} rda={getRDA('vitamin_c', patient.age, patient.sex)} unit="mg" />
                <MicroProgress label="Vitamin D" value={totals.vitamin_d} rda={getRDA('vitamin_d', patient.age, patient.sex)} unit="ug" />
                <MicroProgress label="Vitamin E" value={totals.vitamin_e} rda={getRDA('vitamin_e', patient.age, patient.sex)} unit="mg" />
                <MicroProgress label="Vitamin K" value={totals.vitamin_k} rda={getRDA('vitamin_k', patient.age, patient.sex)} unit="ug" />
                <MicroProgress label="Thiamine (B1)" value={totals.vitamin_b1} rda={getRDA('vitamin_b1', patient.age, patient.sex)} unit="mg" />
                <MicroProgress label="Riboflavin (B2)" value={totals.vitamin_b2} rda={getRDA('vitamin_b2', patient.age, patient.sex)} unit="mg" />
                <MicroProgress label="Niacin (B3)" value={totals.vitamin_b3} rda={getRDA('vitamin_b3', patient.age, patient.sex)} unit="mg" />
                <MicroProgress label="B6" value={totals.vitamin_b6} rda={getRDA('vitamin_b6', patient.age, patient.sex)} unit="mg" />
                <MicroProgress label="Folate (B9)" value={totals.vitamin_b9} rda={getRDA('vitamin_b9', patient.age, patient.sex)} unit="ug" />
                <MicroProgress label="B12" value={totals.vitamin_b12} rda={getRDA('vitamin_b12', patient.age, patient.sex)} unit="ug" />
              </div>
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Micronutrient Modulators Index</h4>
                <ModulatorBar label="Oxalates" percentage={modulators.oxalate.percentage} contributors={modulators.oxalate.contributors} type="oxalate" />
                <ModulatorBar label="Phytates" percentage={modulators.phytate.percentage} contributors={modulators.phytate.contributors} type="phytate" />
              </div>
              <div className="text-[10px] text-slate-400 italic text-center pt-2">* Values calculated from available food data; missing nutrients are not counted.</div>
            </div>
          )}
        </div>
      </div>

      {/* Prototype Navigation - Fixed Bottom Right */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
        {/* Prototype selector */}
        {prototypes.length > 1 && (
          <div className="bg-white rounded-full shadow-xl border border-slate-200 p-1 flex gap-1">
            {prototypes.map((proto, idx) => (
              <button
                key={proto.id}
                onClick={() => setActiveProtoIndex(idx)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  activeProtoIndex === idx 
                    ? "bg-primary-600 text-white shadow-sm" 
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {proto.name} {idx === 0 && '(Primary)'}
              </button>
            ))}
          </div>
        )}
        {/* Action buttons */}
        <Button 
          onClick={generatePDF} 
          className="shadow-xl bg-primary-600 hover:bg-primary-700 px-6 py-4 rounded-full"
        >
          Generate PDF (All)
        </Button>
        <Button 
          className="shadow-xl bg-slate-800 text-white hover:bg-slate-900 px-6 py-4 rounded-full"
          onClick={() => setProtoModalOpen(true)}
        >
          + Prototype
        </Button>
      </div>

      {/* Add Prototype Modal */}
      <Dialog open={protoModalOpen} onOpenChange={setProtoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Prototype</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Button 
              className="w-full justify-start h-auto py-4 px-4 border-2 border-primary-100 hover:border-primary-300 bg-white text-slate-800"
              variant="outline"
              onClick={() => addPrototype('copy')}
            >
              <div className="text-left">
                <div className="font-bold">Use Prototype 1 as Template</div>
                <div className="text-xs text-slate-500 font-normal">Creates an exact editable copy.</div>
              </div>
            </Button>
            <Button 
              className="w-full justify-start h-auto py-4 px-4 border-2 border-slate-100 hover:border-slate-300 bg-white text-slate-800"
              variant="outline"
              onClick={() => addPrototype('blank')}
            >
              <div className="text-left">
                <div className="font-bold">Blank Template</div>
                <div className="text-xs text-slate-500 font-normal">Empty meal structure.</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Food Modal */}
      <Dialog open={targetModalOpen} onOpenChange={setTargetModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedFood?.name_en || 'Add Food'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); confirmAddFood(); }}>
            <div className="flex gap-4">
              <img 
                src={selectedFood?.image_url || getFallbackImage(selectedFood?.category || '')}
                className="w-20 h-20 rounded-xl bg-slate-100 object-cover"
                alt=""
              />
              <div>
                <h4 className="font-bold text-slate-800">{selectedFood?.name_en}</h4>
                <p className="text-sm text-slate-500">{selectedFood?.name_hi}</p>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {(['nutrient', 'weight', 'quantity'] as const).map(tab => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  disabled={tab === 'quantity' && !selectedFood?.unit_name}
                  className={cn(
                    "flex-1 py-1.5 text-sm font-medium rounded-lg capitalize transition-all",
                    activeTab === tab ? "bg-white shadow-sm" : "text-slate-500"
                  )}
                >
                  {tab === 'nutrient' ? 'Target' : tab}
                </button>
              ))}
            </div>
            
            {/* Input based on tab */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              {activeTab === 'nutrient' && (
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    value={targetAmount} 
                    onChange={e => setTargetAmount(e.target.value)}
                    className="text-right font-bold text-lg"
                    autoFocus
                  />
                  <div className="flex-1 flex gap-1 bg-white p-1 rounded-xl border border-slate-200">
                    {(['protein', 'carbs', 'fat'] as const).map(t => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setTargetType(t)}
                        className={cn(
                          "flex-1 rounded-lg text-sm capitalize py-1",
                          targetType === t ? "bg-slate-900 text-white" : "text-slate-500"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {activeTab === 'weight' && (
                <Input 
                  type="number" 
                  value={weightInput} 
                  onChange={e => setWeightInput(e.target.value)}
                  className="text-right font-bold text-lg"
                  autoFocus
                  placeholder="Grams"
                />
              )}
              
              {activeTab === 'quantity' && (
                <Input 
                  type="number" 
                  value={quantityInput} 
                  onChange={e => setQuantityInput(e.target.value)}
                  className="text-right font-bold text-lg"
                  autoFocus
                  placeholder={`Number of ${selectedFood?.unit_name || 'units'}`}
                />
              )}
              
              {preview && (
                <div className="mt-2 space-y-2 bg-white p-3 rounded-lg border border-slate-100">
                  <div className="font-semibold text-slate-700 text-xs">Calculated: {preview.displayQty}</div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-50">
                    <div className="text-[10px] font-semibold text-slate-500 flex gap-2 flex-wrap">
                      <span className="text-primary-600">● P {preview.protein.toFixed(1)}</span>
                      <span className="text-secondary-600">● C {preview.carbs.toFixed(1)}</span>
                      <span className="text-amber-600">● F {preview.fat.toFixed(1)}</span>
                    </div>
                    <div className="text-lg font-bold text-primary-600 flex-shrink-0 ml-2">
                      ({preview.calories.toFixed(0)} kcal)
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setTargetModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-primary-600 hover:bg-primary-700">Add to Meal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Item Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {(['weight', 'quantity'] as const).map(tab => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setEditMode(tab)}
                  disabled={tab === 'quantity' && !editingItem?.food.unit_name}
                  className={cn(
                    "flex-1 py-1.5 text-sm font-medium rounded-lg capitalize",
                    editMode === tab ? "bg-white shadow-sm" : "text-slate-500"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              {editMode === 'weight' ? (
                <Input 
                  type="number" 
                  value={editWeight} 
                  onChange={e => setEditWeight(e.target.value)}
                  className="text-right font-bold text-lg"
                  autoFocus
                  placeholder="Grams"
                />
              ) : (
                <Input 
                  type="number" 
                  value={editQuantity} 
                  onChange={e => setEditQuantity(e.target.value)}
                  className="text-right font-bold text-lg"
                  autoFocus
                />
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setEditModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-primary-600 hover:bg-primary-700">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Custom Food Modal */}
      <Dialog open={isCustomFoodModalOpen} onOpenChange={setIsCustomFoodModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Food Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCustomFood} className="space-y-4">
            <div>
              <Label>Food Name</Label>
              <Input 
                required 
                placeholder="e.g. Dal" 
                value={customFoodForm.name} 
                onChange={e => setCustomFoodForm({...customFoodForm, name: e.target.value})} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Calories</Label>
                <Input 
                  required 
                  type="number" 
                  step="0.1" 
                  value={customFoodForm.calories} 
                  onChange={e => setCustomFoodForm({...customFoodForm, calories: e.target.value})} 
                />
              </div>
              <div>
                <Label>Protein</Label>
                <Input 
                  required 
                  type="number" 
                  step="0.1" 
                  value={customFoodForm.protein} 
                  onChange={e => setCustomFoodForm({...customFoodForm, protein: e.target.value})} 
                />
              </div>
              <div>
                <Label>Carbs</Label>
                <Input 
                  required 
                  type="number" 
                  step="0.1" 
                  value={customFoodForm.carbs} 
                  onChange={e => setCustomFoodForm({...customFoodForm, carbs: e.target.value})} 
                />
              </div>
              <div>
                <Label>Fat</Label>
                <Input 
                  required 
                  type="number" 
                  step="0.1" 
                  value={customFoodForm.fat} 
                  onChange={e => setCustomFoodForm({...customFoodForm, fat: e.target.value})} 
                />
              </div>
              <div>
                <Label>Fiber</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  value={customFoodForm.fiber} 
                  onChange={e => setCustomFoodForm({...customFoodForm, fiber: e.target.value})} 
                />
              </div>
              <div>
                <Label>Add to Meal</Label>
                <select 
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-sm"
                  value={customFoodForm.targetMealId}
                  onChange={e => setCustomFoodForm({...customFoodForm, targetMealId: e.target.value})}
                >
                  {meals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsCustomFoodModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-primary-600 hover:bg-primary-700">Add to Plan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DietChart;
