// Diet Builder Types - Based on FitArc Diet Builder

export type FoodType = 'CORE' | 'PREPARED' | 'TREAT';
export type CautionLevel = 'NONE' | 'MODERATE' | 'HIGH';

export interface Food {
  id: string;
  name_en: string;
  name_hi: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  
  // Micronutrients (per 100g)
  // Minerals
  iron: number; // mg
  calcium?: number; // mg
  magnesium?: number; // mg
  zinc?: number; // mg
  potassium?: number; // mg
  sodium?: number; // mg
  phosphorus?: number; // mg
  iodine?: number; // ug
  selenium?: number; // ug
  copper?: number; // mg

  // Vitamins
  vitamin_a?: number; // ug RE
  vitamin_b1?: number; // mg (Thiamine)
  vitamin_b2?: number; // mg (Riboflavin)
  vitamin_b3?: number; // mg (Niacin)
  vitamin_b6?: number; // mg
  vitamin_b9?: number; // ug (Folate)
  vitamin_b12?: number; // ug
  vitamin_c?: number; // mg
  vitamin_d?: number; // ug
  vitamin_e?: number; // mg
  vitamin_k?: number; // ug
  
  yield_factor: number;
  image_url: string;
  tags: string[]; 
  unit_name?: string;
  unit_weight_g?: number;
  estimated?: boolean;

  // Internal Classification
  food_type: FoodType;
  dietitian_visibility: boolean;
  caution_level: CautionLevel;
  usage_note?: string;
}

export interface DietPatient {
  id: string;
  name: string;
  age: number;
  dob?: string;
  sex: 'M' | 'F' | 'Other';
  weight_kg: number;
  height_cm: number;
  body_fat_pct?: number;
  activity_level: number; 
  allergies: string[];
  email?: string;
  phone?: string;
  bmr?: number;
  tdee?: number;
  goal_type?: 'deficit' | 'maintenance' | 'surplus';
  goal_value?: number;
  protein_target_g_kg?: number;
}

export interface NutrientSnapshot {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  
  // Minerals
  iron: number;
  calcium: number;
  magnesium: number;
  zinc: number;
  potassium: number;
  sodium: number;
  phosphorus: number;
  iodine: number;
  selenium: number;
  copper: number;

  // Vitamins
  vitamin_a: number;
  vitamin_b1: number;
  vitamin_b2: number;
  vitamin_b3: number;
  vitamin_b6: number;
  vitamin_b9: number;
  vitamin_b12: number;
  vitamin_c: number;
  vitamin_d: number;
  vitamin_e: number;
  vitamin_k: number;
}

export interface MealItem {
  id: string;
  foodId: string;
  food: Food;
  entered_mode: 'nutrient' | 'weight' | 'quantity';
  entered_value: number;
  raw_grams_computed: number;
  display_quantity: string;
  raw_or_cooked: 'raw' | 'cooked';
  snapshot: NutrientSnapshot;
}

export interface Meal {
  id: string;
  name: string;
  items: MealItem[];
}

export interface Prototype {
  id: string;
  name: string;
  meals: Meal[];
}

export interface DietPlan {
  id: string;
  patientId: string;
  date: string;
  meals: Meal[];
  prototypes?: Prototype[];
  note?: string;
  status: 'draft' | 'final';
  createdAt: string;
  updatedAt: string;
}

export interface DietUser {
  id: string;
  name: string;
  email: string;
  role: 'dietitian' | 'psychologist';
}
