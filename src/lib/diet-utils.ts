// Diet Builder Utilities - Based on FitArc Diet Builder
import { Food, MealItem, NutrientSnapshot, Meal } from './diet-types';

// Calculate BMR using Mifflin-St Jeor Equation
export const calculateBMR = (weight: number, height: number, age: number, sex: 'M' | 'F' | 'Other'): number => {
  const s = sex === 'F' ? -161 : 5;
  return 10 * weight + 6.25 * height - 5 * age + s;
};

// Calculate TDEE using Mifflin-St Jeor Equation with activity factor
export const calculateTDEE = (bmr: number, activityLevel: number): number => {
  return Math.round(bmr * activityLevel);
};

// Robust helper to calculate TDEE directly from patient attributes
export const calculatePatientTDEE = (
  weight: number | null | undefined,
  height: number | string | null | undefined,
  age: number | null | undefined,
  gender: string | null | undefined,
  workoutFrequency: number | null | undefined
): number => {
  if (!weight || !height || !age) return 1800;
  
  // Parse height to cm using the existing robust parser
  let heightCm = typeof height === "string" ? parseHeightToCm(height) : parseHeightToCm(String(height));
  if (!heightCm) heightCm = 170; // Fallback to 170cm if parsing fails

  // Calculate BMR
  let bmr = (gender === "male" || gender === "M")
    ? 10 * weight + 6.25 * heightCm - 5 * age + 5
    : 10 * weight + 6.25 * heightCm - 5 * age - 161;

  // Calculate Activity Factor
  let act = 1.2;
  const f = workoutFrequency ?? 0;
  if (f > 0 && f <= 2) act = 1.375;
  else if (f > 2 && f <= 4) act = 1.55;
  else if (f > 4 && f <= 6) act = 1.725;
  else if (f > 6) act = 1.9;

  return Math.round(bmr * act);
};

// Estimate Body Fat percentage
export const estimateBodyFat = (age: number, sex: 'M' | 'F' | 'Other', weight: number, heightM: number): number => {
  const bmi = weight / (heightM * heightM);
  if (sex === 'F') {
    return 1.20 * bmi + 0.23 * age - 5.4;
  } else {
    return 1.20 * bmi + 0.23 * age - 16.2;
  }
};

// Calculate BMI
export const calculateBMI = (weightKg: number, heightCm: number): number => {
  if (!weightKg || !heightCm) return 0;
  const heightM = heightCm / 100;
  return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
};

// Get BMI Category with color
export const getBMICategory = (bmi: number): { label: string; color: string } => {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600 bg-blue-50' };
  if (bmi < 25) return { label: 'Normal', color: 'text-green-600 bg-green-50' };
  if (bmi < 30) return { label: 'Overweight', color: 'text-orange-600 bg-orange-50' };
  return { label: 'Obese', color: 'text-red-600 bg-red-50' };
};

// Parse height input to centimeters (supports: 175, 5'6, 5.6, etc.)
export const parseHeightToCm = (input: string): number | null => {
  if (!input) return null;
  const clean = input.trim().toLowerCase();
  
  // 1. Explicit CM
  if (clean.endsWith('cm')) {
    return parseFloat(clean);
  }

  // 2. Format: 5'6, 5ft 6, 5' 6"
  const ftInMatch = clean.match(/^(\d+)(?:'|ft| ft)\s*(\d+)?(?:|"\s*|in| in)?$/);
  if (ftInMatch) {
    const ft = parseFloat(ftInMatch[1]);
    const inch = parseFloat(ftInMatch[2] || '0');
    return Math.round((ft * 30.48) + (inch * 2.54));
  }

  // 3. Format: 5.6 (interpreted as 5ft 6in), 5.11
  const dotMatch = clean.match(/^(\d+)\.(\d+)$/);
  if (dotMatch) {
    const main = parseFloat(dotMatch[1]);
    if (main > 8) {
      return parseFloat(clean);
    }
    const ft = main;
    const inch = parseFloat(dotMatch[2]);
    return Math.round((ft * 30.48) + (inch * 2.54));
  }

  // 4. Plain number
  const num = parseFloat(clean);
  if (isNaN(num)) return null;

  if (num > 30) return num; 
  if (num <= 8) return Math.round(num * 30.48);

  return num;
};

// Calculate grams for target nutrient
export const calculateGramsForTarget = (
  targetValue: number,
  targetNutrient: 'protein' | 'carbs' | 'fat',
  food: Food
): number => {
  const nutrientPer100 = food[targetNutrient] || 0.1;
  const rawGrams = (targetValue / nutrientPer100) * 100;
  return Math.round(rawGrams / 5) * 5;
};

// Calculate full nutrient snapshot from food and grams
export const calculateNutrientSnapshot = (food: Food, rawGrams: number): NutrientSnapshot => {
  const factor = rawGrams / 100;
  return {
    calories: (food.calories || 0) * factor,
    protein: (food.protein || 0) * factor,
    carbs: (food.carbs || 0) * factor,
    fat: (food.fat || 0) * factor,
    fiber: (food.fiber || 0) * factor,
    
    // Minerals
    iron: (food.iron || 0) * factor,
    calcium: (food.calcium || 0) * factor,
    magnesium: (food.magnesium || 0) * factor,
    zinc: (food.zinc || 0) * factor,
    potassium: (food.potassium || 0) * factor,
    sodium: (food.sodium || 0) * factor,
    phosphorus: (food.phosphorus || 0) * factor,
    iodine: (food.iodine || 0) * factor,
    selenium: (food.selenium || 0) * factor,
    copper: (food.copper || 0) * factor,

    // Vitamins
    vitamin_a: (food.vitamin_a || 0) * factor,
    vitamin_b1: (food.vitamin_b1 || 0) * factor,
    vitamin_b2: (food.vitamin_b2 || 0) * factor,
    vitamin_b3: (food.vitamin_b3 || 0) * factor,
    vitamin_b6: (food.vitamin_b6 || 0) * factor,
    vitamin_b9: (food.vitamin_b9 || 0) * factor,
    vitamin_b12: (food.vitamin_b12 || 0) * factor,
    vitamin_c: (food.vitamin_c || 0) * factor,
    vitamin_d: (food.vitamin_d || 0) * factor,
    vitamin_e: (food.vitamin_e || 0) * factor,
    vitamin_k: (food.vitamin_k || 0) * factor,
  };
};

// Create a meal item
export const createMealItem = (
  food: Food, 
  data: {
    entered_mode: 'nutrient' | 'weight' | 'quantity';
    entered_value: number;
    raw_grams_computed: number;
    display_quantity: string;
    raw_or_cooked: 'raw' | 'cooked';
  }
): MealItem => {
  const snapshot = calculateNutrientSnapshot(food, data.raw_grams_computed);

  return {
    id: crypto.randomUUID(),
    foodId: food.id,
    food,
    entered_mode: data.entered_mode,
    entered_value: data.entered_value,
    raw_grams_computed: data.raw_grams_computed,
    display_quantity: data.display_quantity,
    raw_or_cooked: data.raw_or_cooked,
    snapshot
  };
};

// Generate unique ID
export const generateId = () => Math.random().toString(36).substr(2, 9);

// ICMR-NIN 2020 RDA Standards (Simplified for Adults)
export const getRDA = (nutrient: keyof NutrientSnapshot, age: number, sex: 'M' | 'F' | 'Other') => {
  const isMale = sex === 'M';
  
  const standards: Record<string, number> = {
    // Macros
    fiber: 30, // g

    // Minerals
    calcium: 1000, // mg
    magnesium: isMale ? 440 : 370, // mg
    iron: isMale ? 19 : 29, // mg
    zinc: isMale ? 17 : 13, // mg
    potassium: 3500, // mg
    sodium: 2000, // mg (Limit)
    phosphorus: 1000, // mg
    iodine: 150, // ug
    selenium: 40, // ug
    copper: 1.7, // mg

    // Vitamins
    vitamin_a: isMale ? 1000 : 840, // ug RE
    vitamin_b1: isMale ? 1.8 : 1.4, // mg
    vitamin_b2: isMale ? 2.5 : 1.9, // mg
    vitamin_b3: isMale ? 18 : 14, // mg
    vitamin_b6: isMale ? 2.4 : 1.9, // mg
    vitamin_b9: 220, // ug (Folate)
    vitamin_b12: 2.5, // ug
    vitamin_c: isMale ? 80 : 65, // mg
    vitamin_d: 15, // ug (600 IU)
    vitamin_e: 10, // mg
    vitamin_k: 55, // ug
  };

  return standards[nutrient] || 0;
};

// --- MICRONUTRIENT MODULATORS INDEX (EEE Values) ---

const OXALATE_EEE_MAP: Record<string, number> = {
  'Almonds': 230,
  'Cashew': 120,
  'Pistachio': 65,
  'Walnut': 45,
  'Peanuts': 70,
  'Peanut Butter (standard, unsweetened)': 55,
  'Chia seeds': 95,
  'Flaxseeds': 55,
  'Sesame Seeds': 200,
  'Beetroot': 85,
  'Sweet potato (boiled)': 40,
  'Dark Chocolate (60%)': 150,
  'Dark Chocolate (70%)': 150,
  'Dark Chocolate (80%)': 150,
  'Raisins': 35,
  'Dates (dried)': 25,
  'Fig (dried)': 65,
  'Bhindi (Lady finger)': 30,
  'Baingan (Brinjal)': 20,
  'Makhana (Fox nuts, roasted)': 15,
  'Spinach (cooked wt.)': 260,
  'Spinach (raw wt.)': 130
};

const PHYTATE_EEE_MAP: Record<string, number> = {
  'Wheat flour (whole)': 350,
  'Bread (whole wheat)': 280,
  'Bread (white)': 120,
  'Bajra flour': 420,
  'Jowar flour': 390,
  'Ragi flour': 360,
  'Maize flour (Makki)': 320,
  'Barley (raw)': 300,
  'Oats (rolled, raw)': 280,
  'Oats (cooked)': 280,
  'Alpino High Protein Oats': 280,
  'Pintola High Protein Oats / Muesli': 280,
  'Semolina (Rava)': 180,
  'Vermicelli (wheat)': 160,
  'Poha (raw)': 140,
  'Quinoa (raw)': 350,
  'Chana dal (raw)': 420,
  'Chickpeas (Kabuli / Chole)': 390,
  'Toor dal (raw)': 360,
  'Moong dal (raw)': 360,
  'Lentils (Generic)': 360,
  'Moong Dal (Raw)': 360,
  'Masoor Dal (Raw)': 360,
  'Toor Dal (Raw)': 360,
  'Urad Dal (Raw)': 360,
  'Rajma (raw)': 420,
  'Rajma (Kidney Beans, Raw)': 420,
  'Roasted Chana': 310,
  'Almonds': 520,
  'Cashew': 360,
  'Pistachio': 280,
  'Walnut': 260,
  'Peanuts': 390,
  'Peanut Butter (standard, unsweetened)': 300,
  'Chia seeds': 750,
  'Flaxseeds': 650,
  'Pumpkin seeds': 820,
  'Sesame Seeds': 900,
  'Soy protein isolate': 180,
  'Soya chunks': 420,
  'Tofu (Soy paneer)': 180,
  'Seitan (wheat gluten)': 40
};

export const getModulatorEEE = (foodName: string, type: 'oxalate' | 'phytate', dbValue?: number): number => {
  if (dbValue && dbValue > 0) return dbValue;
  if (type === 'oxalate') return OXALATE_EEE_MAP[foodName] || 0;
  return PHYTATE_EEE_MAP[foodName] || 0;
};

export const OXALATE_LIMIT = 450;
export const PHYTATE_LIMIT = 1100;

export interface ModulatorResult {
  total: number;
  percentage: number;
  contributors: { name: string; amount: number }[];
}

export const calculateModulators = (meals: Meal[]): { oxalate: ModulatorResult; phytate: ModulatorResult } => {
  const oxContributions: Record<string, number> = {};
  const phContributions: Record<string, number> = {};
  let totalOx = 0;
  let totalPh = 0;

  meals.forEach(meal => {
    meal.items.forEach(item => {
      const name = item.food.name_en;
      const grams = item.raw_grams_computed;
      
      const oxEEE = getModulatorEEE(name, 'oxalate', item.food.oxalate_eee);
      const phEEE = getModulatorEEE(name, 'phytate', item.food.phytate_eee);
      
      const oxVal = (grams * oxEEE) / 100;
      const phVal = (grams * phEEE) / 100;

      if (oxVal > 0) {
        oxContributions[name] = (oxContributions[name] || 0) + oxVal;
        totalOx += oxVal;
      }
      if (phVal > 0) {
        phContributions[name] = (phContributions[name] || 0) + phVal;
        totalPh += phVal;
      }
    });
  });

  const getTopContributors = (map: Record<string, number>) => {
    return Object.entries(map)
      .map(([name, amount]) => ({ name: name.toLowerCase(), amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  };

  return {
    oxalate: {
      total: totalOx,
      percentage: (totalOx / OXALATE_LIMIT) * 100,
      contributors: getTopContributors(oxContributions)
    },
    phytate: {
      total: totalPh,
      percentage: (totalPh / PHYTATE_LIMIT) * 100,
      contributors: getTopContributors(phContributions)
    }
  };
};

// Utility to merge class names
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}
