// Diet Builder Constants - Based on FitArc Diet Builder
import { Food, FoodType, CautionLevel } from './diet-types';

export const ACTIVITY_LEVELS = [
  { label: 'Sedentary', value: 1.2, desc: 'Little to no exercise' },
  { label: 'Light', value: 1.375, desc: 'Light exercise 1-3 days/wk' },
  { label: 'Moderate', value: 1.55, desc: 'Moderate exercise 3-5 days/wk' },
  { label: 'Very Active', value: 1.725, desc: 'Hard exercise 6-7 days/wk' },
];

export const INITIAL_MEALS = [
  'Breakfast',
  'Snack 1',
  'Lunch',
  'Snack 2',
  'Dinner',
  'Bedtime',
];

// Helper to generate IDs
const id = (i: number) => i.toString();

// Realistic Category Images
export const CATEGORY_IMAGES: Record<string, string> = {
  Cereals: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=150&q=80',
  Pulses: 'https://images.unsplash.com/photo-1515543904379-3d757afe726e?auto=format&fit=crop&w=150&q=80',
  Dairy: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=150&q=80',
  Vegetables: 'https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=150&q=80',
  Fruits: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=150&q=80',
  Nuts: 'https://images.unsplash.com/photo-1536591375315-1960089f68fc?auto=format&fit=crop&w=150&q=80',
  Seeds: 'https://images.unsplash.com/photo-1615485925694-a031e341f71d?auto=format&fit=crop&w=150&q=80',
  Fats: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=150&q=80',
  Sugars: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=150&q=80',
  Meat: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=150&q=80',
  Eggs: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=150&q=80',
  Prepared: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80',
  Snacks: 'https://images.unsplash.com/photo-1605436376843-2fd16a5d894c?auto=format&fit=crop&w=150&q=80',
  Sweets: 'https://images.unsplash.com/photo-1563729768-6af784d6df1a?auto=format&fit=crop&w=150&q=80',
  Beverages: 'https://images.unsplash.com/photo-1544787210-2827255cb39e?auto=format&fit=crop&w=150&q=80',
};

const getFoodImage = (category: string, name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('egg')) return CATEGORY_IMAGES.Eggs;
  if (n.includes('chicken') || n.includes('fish') || n.includes('mutton') || n.includes('prawn') || n.includes('meat') || n.includes('beef') || n.includes('pork')) return CATEGORY_IMAGES.Meat;
  if (n.includes('chocolate') || n.includes('jam') || n.includes('sweet')) return CATEGORY_IMAGES.Sweets;
  if (n.includes('oil') || n.includes('ghee') || n.includes('butter')) return CATEGORY_IMAGES.Fats;
  if (n.includes('tea') || n.includes('coffee') || n.includes('beverage')) return CATEGORY_IMAGES.Beverages;
  
  return CATEGORY_IMAGES[category] || CATEGORY_IMAGES.Prepared;
};

// Internal helper to define base food data before classification
const RAW_SEED_FOODS: Omit<Food, 'food_type' | 'dietitian_visibility' | 'caution_level' | 'usage_note'>[] = [
  // --- CEREALS & GRAINS ---
  { id: id(1), category: 'Cereals', name_en: 'Rice (white, raw)', name_hi: 'चावल कच्चा', calories: 365, protein: 7.1, carbs: 80, fat: 0.7, fiber: 1.3, iron: 1.5, calcium: 28, magnesium: 25, zinc: 1.2, potassium: 115, sodium: 5, phosphorus: 115, vitamin_b1: 0.06, vitamin_b2: 0.04, vitamin_b3: 1.9, vitamin_b6: 0.1, vitamin_b9: 8, vitamin_e: 0.1, selenium: 15.1, vitamin_d: 0, copper: 0.2, yield_factor: 3.0, tags: ['Cereals', 'Staple'], image_url: '' },
  { id: id(2), category: 'Cereals', name_en: 'Rice (white, cooked)', name_hi: 'चावल पकाया हुआ', calories: 130, protein: 2.4, carbs: 28, fat: 0.3, fiber: 0.4, iron: 0.4, calcium: 10, magnesium: 9, zinc: 0.4, potassium: 35, sodium: 1, phosphorus: 37, vitamin_b1: 0.02, vitamin_b2: 0.01, vitamin_b3: 0.6, vitamin_b6: 0.05, vitamin_b9: 4, selenium: 5.0, vitamin_d: 0, copper: 0.06, yield_factor: 1.0, tags: ['Cereals', 'Staple'], unit_name: 'katori', unit_weight_g: 150, image_url: '' },
  { id: id(3), category: 'Cereals', name_en: 'Rice (brown, raw)', name_hi: 'ब्राउन राइस', calories: 360, protein: 7.5, carbs: 76, fat: 2.0, fiber: 3.5, iron: 2.0, calcium: 33, magnesium: 143, zinc: 2.0, potassium: 223, sodium: 7, phosphorus: 264, vitamin_b1: 0.4, vitamin_b2: 0.09, vitamin_b3: 4.3, vitamin_b6: 0.5, vitamin_b9: 20, vitamin_e: 1.2, selenium: 10, vitamin_d: 0, copper: 0.3, yield_factor: 2.8, tags: ['Cereals'], image_url: '' },
  { id: id(4), category: 'Cereals', name_en: 'Wheat flour (whole)', name_hi: 'गेहूं का आटा', calories: 340, protein: 13.2, carbs: 72, fat: 2.5, fiber: 10.7, iron: 3.6, calcium: 34, magnesium: 138, zinc: 2.6, potassium: 405, sodium: 5, phosphorus: 357, vitamin_b1: 0.45, vitamin_b2: 0.17, vitamin_b3: 4.3, vitamin_b6: 0.4, vitamin_b9: 44, vitamin_e: 1.0, selenium: 60, vitamin_d: 0, copper: 0.4, yield_factor: 1.0, tags: ['Cereals', 'Staple'], unit_name: 'roti', unit_weight_g: 40, image_url: '' },
  { id: id(5), category: 'Cereals', name_en: 'Roti (plain, cooked)', name_hi: 'रोटी', calories: 250, protein: 9, carbs: 50, fat: 4, fiber: 8, iron: 3.5, calcium: 30, magnesium: 80, zinc: 1.8, potassium: 300, sodium: 5, phosphorus: 200, vitamin_b1: 0.3, vitamin_b2: 0.1, vitamin_b3: 3.0, vitamin_b6: 0.2, vitamin_b9: 30, selenium: 40, vitamin_d: 0, copper: 0.3, yield_factor: 1.0, estimated: true, tags: ['Cereals', 'Staple'], unit_name: 'roti', unit_weight_g: 45, image_url: '' },
  { id: id(6), category: 'Cereals', name_en: 'Oats (rolled, raw)', name_hi: 'ओट्स', calories: 389, protein: 16.9, carbs: 66, fat: 6.9, fiber: 10.6, iron: 4.7, calcium: 54, magnesium: 177, zinc: 4.0, potassium: 429, sodium: 2, phosphorus: 523, vitamin_b1: 0.76, vitamin_b2: 0.14, vitamin_b3: 0.9, vitamin_b6: 0.12, vitamin_b9: 56, vitamin_e: 0.5, selenium: 28, vitamin_d: 0, copper: 0.6, yield_factor: 3.0, tags: ['Cereals'], unit_name: 'cup', unit_weight_g: 40, image_url: '' },
  { id: id(7), category: 'Cereals', name_en: 'Quinoa (raw)', name_hi: 'क्विनोआ', calories: 368, protein: 14, carbs: 64, fat: 6, fiber: 7, iron: 4.6, calcium: 47, magnesium: 197, zinc: 3.1, potassium: 563, sodium: 5, phosphorus: 457, vitamin_b1: 0.36, vitamin_b2: 0.32, vitamin_b3: 1.5, vitamin_b6: 0.5, vitamin_b9: 184, vitamin_e: 2.4, selenium: 8.5, vitamin_d: 0, copper: 0.6, yield_factor: 3.0, tags: ['Cereals'], image_url: '' },
  
  // --- PULSES ---
  { id: id(20), category: 'Pulses', name_en: 'Toor dal (raw)', name_hi: 'अरहर दाल', calories: 343, protein: 23.6, carbs: 63, fat: 1.7, fiber: 9, iron: 3.5, calcium: 73, magnesium: 90, zinc: 1.9, potassium: 1100, sodium: 28, phosphorus: 280, vitamin_b1: 0.45, vitamin_b2: 0.15, vitamin_b3: 2.5, vitamin_b6: 0.3, vitamin_b9: 100, selenium: 8, iodine: 2, vitamin_d: 0, copper: 0.7, yield_factor: 2.5, tags: ['Pulses'], image_url: '' },
  { id: id(22), category: 'Pulses', name_en: 'Moong dal (raw)', name_hi: 'मूंग दाल', calories: 348, protein: 24.5, carbs: 60, fat: 1.2, fiber: 8, iron: 4, calcium: 75, magnesium: 127, zinc: 2.7, potassium: 1150, sodium: 28, phosphorus: 326, vitamin_b1: 0.47, vitamin_b2: 0.21, vitamin_b3: 2.3, vitamin_b6: 0.4, vitamin_b9: 140, selenium: 9, iodine: 2, vitamin_d: 0, copper: 0.8, yield_factor: 2.5, tags: ['Pulses'], image_url: '' },
  { id: id(24), category: 'Pulses', name_en: 'Chana dal (raw)', name_hi: 'चना दाल', calories: 372, protein: 20.8, carbs: 59, fat: 5.6, fiber: 15, iron: 5.3, calcium: 56, magnesium: 130, zinc: 2.3, potassium: 800, sodium: 40, phosphorus: 250, vitamin_b1: 0.48, vitamin_b2: 0.18, vitamin_b3: 1.8, vitamin_b6: 0.5, vitamin_b9: 130, selenium: 8, vitamin_d: 0, copper: 0.8, yield_factor: 2.2, tags: ['Pulses'], image_url: '' },
  { id: id(26), category: 'Pulses', name_en: 'Rajma (raw)', name_hi: 'राजमा', calories: 299, protein: 22.9, carbs: 60, fat: 1.3, fiber: 15, iron: 5.1, calcium: 260, magnesium: 175, zinc: 3.9, potassium: 1359, sodium: 16, phosphorus: 410, vitamin_b1: 0.5, vitamin_b2: 0.15, vitamin_b3: 2.0, vitamin_b6: 0.4, vitamin_b9: 130, selenium: 10, vitamin_d: 0, copper: 0.9, yield_factor: 2.5, tags: ['Pulses'], image_url: '' },
  { id: id(501), category: 'Pulses', name_en: 'Tofu (Soy paneer)', name_hi: 'टोफू', calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3, iron: 5.4, calcium: 350, magnesium: 30, zinc: 0.8, potassium: 121, sodium: 7, phosphorus: 97, vitamin_b1: 0.08, vitamin_b2: 0.05, vitamin_b3: 0.2, vitamin_b6: 0.05, vitamin_b9: 15, copper: 0.2, yield_factor: 1.0, tags: ['Pulses', 'Vegan'], image_url: '' },
  { id: id(545), category: 'Pulses', name_en: 'Soya chunks', name_hi: 'सोया चंक्स', calories: 345, protein: 52.0, carbs: 33.0, fat: 0.5, fiber: 6.0, iron: 15.7, calcium: 350, magnesium: 120, zinc: 4.9, potassium: 1200, sodium: 15, phosphorus: 650, vitamin_b1: 0.43, vitamin_b2: 0.20, vitamin_b3: 2.1, vitamin_b6: 0.45, vitamin_b9: 240, yield_factor: 3.0, tags: ['Pulses', 'Vegan', 'High Protein'], image_url: '' },

  // --- DAIRY ---
  { id: id(40), category: 'Dairy', name_en: 'Milk (cow, full fat)', name_hi: 'दूध (गाय)', calories: 60, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0, iron: 0, calcium: 120, magnesium: 11, zinc: 0.4, potassium: 150, sodium: 44, phosphorus: 93, vitamin_a: 46, vitamin_b1: 0.04, vitamin_b2: 0.18, vitamin_b3: 0.1, vitamin_b6: 0.04, vitamin_b12: 0.45, vitamin_c: 1, vitamin_b9: 5, vitamin_d: 0.1, vitamin_e: 0.07, selenium: 3.7, iodine: 20, vitamin_k: 0.3, copper: 0.01, yield_factor: 1.0, tags: ['Dairy'], unit_name: 'glass', unit_weight_g: 250, image_url: '' },
  { id: id(43), category: 'Dairy', name_en: 'Curd (plain)', name_hi: 'दही', calories: 60, protein: 3.5, carbs: 4.7, fat: 3, fiber: 0, iron: 0, calcium: 149, magnesium: 12, zinc: 0.5, potassium: 155, sodium: 45, phosphorus: 93, vitamin_a: 30, vitamin_b1: 0.03, vitamin_b2: 0.18, vitamin_b3: 0.1, vitamin_b6: 0.04, vitamin_b12: 0.2, vitamin_d: 0, selenium: 3.5, iodine: 18, copper: 0.01, yield_factor: 1.0, tags: ['Dairy'], unit_name: 'katori', unit_weight_g: 150, image_url: '' },
  { id: id(44), category: 'Dairy', name_en: 'Paneer (whole milk)', name_hi: 'पनीर', calories: 265, protein: 18.3, carbs: 1.2, fat: 20.8, fiber: 0, iron: 0.7, calcium: 208, magnesium: 25, zinc: 2.5, potassium: 120, sodium: 20, phosphorus: 360, vitamin_a: 150, vitamin_b1: 0.02, vitamin_b2: 0.3, vitamin_b3: 0.1, vitamin_b6: 0.05, vitamin_b12: 0.8, vitamin_d: 0, selenium: 12, vitamin_e: 0.3, copper: 0.05, yield_factor: 1.0, tags: ['Dairy'], unit_name: 'cube', unit_weight_g: 20, image_url: '' },
  { id: id(503), category: 'Dairy', name_en: 'Greek yogurt (plain)', name_hi: 'ग्रीक योगर्ट', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, iron: 0.1, calcium: 110, magnesium: 11, zinc: 0.5, potassium: 141, sodium: 36, phosphorus: 135, vitamin_b12: 0.7, vitamin_a: 2, selenium: 9.7, copper: 0.01, yield_factor: 1.0, tags: ['Dairy'], image_url: '' },
  { id: id(504), category: 'Dairy', name_en: 'Whey protein concentrate', name_hi: 'व्हे प्रोटीन', calories: 370, protein: 80, carbs: 8, fat: 4, fiber: 0, iron: 1.2, calcium: 500, magnesium: 170, zinc: 2, potassium: 450, sodium: 160, phosphorus: 300, copper: 0.05, yield_factor: 1.0, tags: ['Dairy', 'Supplement'], image_url: '' },

  // --- VEGETABLES ---
  { id: id(50), category: 'Vegetables', name_en: 'Potato (boiled)', name_hi: 'आलू', calories: 87, protein: 1.9, carbs: 20, fat: 0.1, fiber: 1.8, iron: 0.8, calcium: 12, magnesium: 23, zinc: 0.3, potassium: 379, sodium: 10, phosphorus: 57, vitamin_c: 19, vitamin_b1: 0.11, vitamin_b2: 0.02, vitamin_b3: 1.4, vitamin_b6: 0.3, vitamin_b9: 10, vitamin_e: 0.01, vitamin_k: 2.0, vitamin_d: 0, copper: 0.1, yield_factor: 1.0, tags: ['Vegetables'], unit_name: 'medium', unit_weight_g: 100, image_url: '' },
  { id: id(52), category: 'Vegetables', name_en: 'Onion', name_hi: 'प्याज़', calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, iron: 0.2, calcium: 23, magnesium: 10, zinc: 0.2, potassium: 146, sodium: 4, phosphorus: 29, vitamin_c: 7, vitamin_b1: 0.05, vitamin_b2: 0.03, vitamin_b3: 0.1, vitamin_b6: 0.12, vitamin_b9: 19, vitamin_e: 0.02, vitamin_k: 0.4, vitamin_d: 0, copper: 0.04, yield_factor: 0.9, tags: ['Vegetables'], unit_name: 'medium', unit_weight_g: 50, image_url: '' },
  { id: id(53), category: 'Vegetables', name_en: 'Tomato', name_hi: 'टमाटर', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, iron: 0.3, calcium: 10, magnesium: 11, zinc: 0.2, potassium: 237, sodium: 5, phosphorus: 24, vitamin_a: 42, vitamin_c: 13, vitamin_b1: 0.04, vitamin_b2: 0.02, vitamin_b3: 0.6, vitamin_b6: 0.08, vitamin_b9: 15, vitamin_e: 0.54, vitamin_k: 7.9, vitamin_d: 0, copper: 0.06, yield_factor: 1.0, tags: ['Vegetables'], unit_name: 'medium', unit_weight_g: 80, image_url: '' },
  { id: id(54), category: 'Vegetables', name_en: 'Spinach (cooked)', name_hi: 'पालक (पका हुआ)', calories: 23, protein: 2.9, carbs: 3.7, fat: 0.4, fiber: 2.3, iron: 2.7, calcium: 99, magnesium: 79, zinc: 0.5, potassium: 558, sodium: 79, phosphorus: 49, vitamin_a: 469, vitamin_c: 10, vitamin_b1: 0.05, vitamin_b2: 0.15, vitamin_b3: 0.5, vitamin_b6: 0.24, vitamin_b9: 146, vitamin_e: 2.08, vitamin_k: 480, selenium: 1.0, iodine: 3.0, vitamin_d: 0, copper: 0.13, yield_factor: 1.0, tags: ['Vegetables', 'Leafy'], image_url: '' },
  { id: id(64), category: 'Vegetables', name_en: 'Peas (green)', name_hi: 'मटर', calories: 81, protein: 5.4, carbs: 14, fat: 0.4, fiber: 5.7, iron: 1.5, calcium: 25, magnesium: 33, zinc: 1.2, potassium: 244, sodium: 5, phosphorus: 108, vitamin_a: 38, vitamin_c: 40, vitamin_b1: 0.26, vitamin_b2: 0.13, vitamin_b3: 2.0, vitamin_b6: 0.17, vitamin_b9: 65, vitamin_e: 0.13, vitamin_k: 25, vitamin_d: 0, copper: 0.1, yield_factor: 1.0, tags: ['Vegetables'], image_url: '' },
  { id: id(506), category: 'Vegetables', name_en: 'Broccoli', name_hi: 'ब्रोकोली', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, iron: 0.7, calcium: 47, magnesium: 21, zinc: 0.4, potassium: 316, sodium: 33, phosphorus: 66, vitamin_c: 89, vitamin_a: 31, vitamin_k: 101, vitamin_b9: 63, copper: 0.05, yield_factor: 1.0, tags: ['Vegetables'], image_url: '' },
  { id: id(549), category: 'Vegetables', name_en: 'Sweet potato (boiled)', name_hi: 'शकरकंद', calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1, fiber: 3.0, iron: 0.6, calcium: 30, magnesium: 25, potassium: 337, vitamin_a: 709, vitamin_c: 2.4, vitamin_b6: 0.2, vitamin_b9: 11, yield_factor: 1.0, tags: ['Vegetables'], image_url: '' },
  { id: id(550), category: 'Vegetables', name_en: 'Carrot (raw)', name_hi: 'गाजर', calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8, iron: 0.3, calcium: 33, magnesium: 12, potassium: 320, vitamin_a: 835, vitamin_c: 5.9, vitamin_k: 13.2, vitamin_b9: 19, yield_factor: 1.0, tags: ['Vegetables'], image_url: '' },
  { id: id(551), category: 'Vegetables', name_en: 'Mushroom (button)', name_hi: 'मशरूम', calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1.0, iron: 0.5, calcium: 3, magnesium: 9, potassium: 318, selenium: 9.3, vitamin_b2: 0.4, vitamin_b3: 3.6, vitamin_d: 0.2, yield_factor: 1.0, tags: ['Vegetables'], image_url: '' },

  // --- FRUITS ---
  { id: id(80), category: 'Fruits', name_en: 'Banana', name_hi: 'केला', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6, iron: 0.3, calcium: 5, magnesium: 27, zinc: 0.15, potassium: 358, sodium: 1, phosphorus: 22, vitamin_c: 8.7, vitamin_a: 3, vitamin_b1: 0.03, vitamin_b2: 0.07, vitamin_b3: 0.67, vitamin_b6: 0.37, vitamin_b9: 20, vitamin_e: 0.1, selenium: 1.0, vitamin_d: 0, copper: 0.08, yield_factor: 1.0, tags: ['Fruits'], unit_name: 'piece', unit_weight_g: 100, image_url: '' },
  { id: id(81), category: 'Fruits', name_en: 'Apple', name_hi: 'सेब', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, iron: 0.1, calcium: 6, magnesium: 5, zinc: 0.04, potassium: 107, sodium: 1, phosphorus: 11, vitamin_c: 4.6, vitamin_a: 3, vitamin_b1: 0.02, vitamin_b2: 0.03, vitamin_b3: 0.09, vitamin_b6: 0.04, vitamin_b9: 3, vitamin_e: 0.18, vitamin_k: 2.2, vitamin_d: 0, copper: 0.03, yield_factor: 1.0, tags: ['Fruits'], unit_name: 'medium', unit_weight_g: 150, image_url: '' },
  { id: id(82), category: 'Fruits', name_en: 'Mango', name_hi: 'आम', calories: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6, iron: 0.2, calcium: 11, magnesium: 10, zinc: 0.09, potassium: 168, sodium: 1, phosphorus: 14, vitamin_a: 54, vitamin_c: 36, vitamin_b1: 0.03, vitamin_b2: 0.04, vitamin_b3: 0.67, vitamin_b6: 0.12, vitamin_b9: 43, vitamin_e: 0.9, vitamin_k: 4.2, vitamin_d: 0, copper: 0.11, yield_factor: 1.0, tags: ['Fruits'], unit_name: 'slice', unit_weight_g: 30, image_url: '' },
  { id: id(516), category: 'Fruits', name_en: 'Guava', name_hi: 'अमरूद', calories: 68, protein: 2.6, carbs: 14, fat: 1, fiber: 5.4, iron: 0.3, calcium: 18, magnesium: 22, zinc: 0.2, potassium: 417, sodium: 2, phosphorus: 40, vitamin_c: 228, vitamin_a: 31, vitamin_b9: 49, copper: 0.2, yield_factor: 1.0, tags: ['Fruits'], image_url: '' },
  { id: id(528), category: 'Fruits', name_en: 'Orange', name_hi: 'संतरा', calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1, fiber: 2.4, iron: 0.1, calcium: 40, magnesium: 10, zinc: 0.07, potassium: 181, sodium: 0, phosphorus: 14, vitamin_c: 53, vitamin_a: 11, vitamin_b9: 30, copper: 0.04, yield_factor: 1.0, tags: ['Fruits'], image_url: '' },
  { id: id(548), category: 'Fruits', name_en: 'Papaya (ripe)', name_hi: 'पपीता', calories: 43, protein: 0.5, carbs: 10.8, fat: 0.3, fiber: 1.7, iron: 0.3, calcium: 20, magnesium: 21, potassium: 182, vitamin_c: 60.9, vitamin_a: 47, vitamin_b9: 37, yield_factor: 1.0, tags: ['Fruits'], image_url: '' },
  { id: id(512), category: 'Fruits', name_en: 'Dates (dried)', name_hi: 'खजूर', calories: 282, protein: 2.5, carbs: 75, fat: 0.4, fiber: 8, iron: 1.0, calcium: 39, magnesium: 43, zinc: 0.3, potassium: 656, sodium: 2, phosphorus: 62, vitamin_b3: 1.3, vitamin_b6: 0.1, copper: 0.2, yield_factor: 1.0, tags: ['Fruits'], image_url: '' },

  // --- NUTS & SEEDS ---
  { id: id(100), category: 'Nuts', name_en: 'Almonds', name_hi: 'बादाम', calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5, iron: 3.7, calcium: 269, magnesium: 270, zinc: 3.1, potassium: 733, sodium: 1, phosphorus: 481, vitamin_e: 25.6, vitamin_b1: 0.2, vitamin_b2: 1.1, vitamin_b3: 3.6, vitamin_b6: 0.13, vitamin_b9: 44, selenium: 4.1, vitamin_d: 0, copper: 1.0, yield_factor: 1.0, tags: ['Nuts'], unit_name: 'piece', unit_weight_g: 1.2, image_url: '' },
  { id: id(103), category: 'Nuts', name_en: 'Peanuts', name_hi: 'मूंगफली', calories: 567, protein: 26, carbs: 16, fat: 49, fiber: 8.5, iron: 4.6, calcium: 92, magnesium: 168, zinc: 3.3, potassium: 705, sodium: 18, phosphorus: 376, vitamin_b1: 0.6, vitamin_b2: 0.13, vitamin_b3: 12, vitamin_b6: 0.3, vitamin_b9: 240, vitamin_e: 8.3, selenium: 7.2, vitamin_d: 0, copper: 1.1, yield_factor: 1.0, tags: ['Nuts'], image_url: '' },
  { id: id(534), category: 'Nuts', name_en: 'Chia seeds', name_hi: 'चिया सीड्स', calories: 486, protein: 16.5, carbs: 42, fat: 30.7, fiber: 34.4, iron: 7.7, calcium: 631, magnesium: 335, zinc: 4.6, potassium: 407, sodium: 16, phosphorus: 860, vitamin_b1: 0.6, vitamin_b3: 8.8, selenium: 55, copper: 0.9, yield_factor: 1.0, tags: ['Seeds'], image_url: '' },
  { id: id(537), category: 'Nuts', name_en: 'Walnut', name_hi: 'अखरोट', calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7, iron: 2.9, calcium: 98, magnesium: 158, zinc: 3.1, potassium: 441, sodium: 2, phosphorus: 346, vitamin_b6: 0.5, vitamin_b9: 98, copper: 1.6, yield_factor: 1.0, tags: ['Nuts'], image_url: '' },
  { id: id(539), category: 'Nuts', name_en: 'Cashew', name_hi: 'काजू', calories: 553, protein: 18, carbs: 30, fat: 44, fiber: 3.3, iron: 6.7, calcium: 37, magnesium: 292, zinc: 5.8, potassium: 660, sodium: 12, phosphorus: 593, vitamin_b1: 0.4, vitamin_k: 34, copper: 2.2, yield_factor: 1.0, tags: ['Nuts'], image_url: '' },
  { id: id(603), category: 'Nuts', name_en: 'Peanut Butter (unsweetened)', name_hi: 'पीनट बटर', calories: 640, protein: 21.9, carbs: 21.9, fat: 53.1, fiber: 6.3, sodium: 140, magnesium: 196, phosphorus: 359, potassium: 625, zinc: 3.1, iron: 1.9, vitamin_e: 7.5, vitamin_b3: 13.1, yield_factor: 1.0, tags: ['Nuts', 'Fats'], unit_name: 'tbsp', unit_weight_g: 32, image_url: '' },

  // --- MEAT & EGGS ---
  { id: id(120), category: 'Meat', name_en: 'Egg (whole)', name_hi: 'अंडा', calories: 140, protein: 12, carbs: 1, fat: 10, fiber: 0, iron: 2.2, calcium: 50, phosphorus: 190, zinc: 1.2, selenium: 30, iodine: 48, potassium: 130, sodium: 140, magnesium: 12, vitamin_a: 160, vitamin_d: 2.0, vitamin_b1: 0.04, vitamin_b3: 0.07, vitamin_b6: 0.17, vitamin_b12: 1.0, vitamin_b2: 0.5, vitamin_b9: 44, vitamin_e: 1.0, vitamin_k: 0.6, copper: 0.1, yield_factor: 1.0, tags: ['Non-Veg'], unit_name: 'egg', unit_weight_g: 50, image_url: '' },
  { id: id(121), category: 'Meat', name_en: 'Egg whites', name_hi: 'अंडे की सफेदी', calories: 52, protein: 11, carbs: 0.7, fat: 0.2, fiber: 0, iron: 0.1, calcium: 7, magnesium: 11, zinc: 0.03, potassium: 163, sodium: 166, phosphorus: 15, vitamin_b2: 0.4, vitamin_b3: 0.1, vitamin_b6: 0.01, vitamin_b9: 1, vitamin_b12: 0.1, selenium: 20, vitamin_d: 0, copper: 0.02, yield_factor: 1.0, tags: ['Non-Veg'], unit_name: 'egg', unit_weight_g: 33, image_url: '' },
  { id: id(122), category: 'Meat', name_en: 'Chicken breast (raw)', name_hi: 'चिकन ब्रेस्ट', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, iron: 1, calcium: 15, magnesium: 32, zinc: 1.0, potassium: 256, sodium: 74, phosphorus: 228, vitamin_b1: 0.07, vitamin_b2: 0.12, vitamin_b3: 13.7, vitamin_b6: 0.6, vitamin_b9: 4, vitamin_b12: 0.3, selenium: 24, vitamin_d: 0, copper: 0.05, yield_factor: 0.7, tags: ['Non-Veg'], image_url: '' },
  { id: id(600), category: 'Meat', name_en: 'Fish (generic, raw)', name_hi: 'मछली (कच्ची)', calories: 97, protein: 19.0, carbs: 0.0, fat: 2.0, fiber: 0.0, iron: 1.0, calcium: 20, magnesium: 28, phosphorus: 200, potassium: 300, sodium: 60, zinc: 0.6, vitamin_a: 40, vitamin_d: 5.0, vitamin_b12: 2.4, yield_factor: 0.7, tags: ['Non-Veg', 'Seafood'], image_url: '' },

  // --- FATS ---
  { id: id(555), category: 'Fats', name_en: 'Mustard Oil', name_hi: 'सरसों का तेल', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, iron: 0, vitamin_e: 17, yield_factor: 1.0, tags: ['Fats', 'Oils'], unit_name: 'tsp', unit_weight_g: 4.5, image_url: '' },
  { id: id(556), category: 'Fats', name_en: 'Olive Oil', name_hi: 'जैतून का तेल', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, iron: 0, vitamin_e: 14.4, yield_factor: 1.0, tags: ['Fats', 'Oils'], unit_name: 'tsp', unit_weight_g: 4.5, image_url: '' },
  { id: id(557), category: 'Fats', name_en: 'Ghee', name_hi: 'घी', calories: 900, protein: 0, carbs: 0, fat: 100, fiber: 0, iron: 0, vitamin_a: 684, vitamin_e: 2.8, vitamin_k: 8.6, yield_factor: 1.0, tags: ['Fats'], unit_name: 'tsp', unit_weight_g: 4.3, image_url: '' },
  { id: id(558), category: 'Fats', name_en: 'Coconut Oil', name_hi: 'नारियल तेल', calories: 892, protein: 0, carbs: 0, fat: 100, fiber: 0, iron: 0, yield_factor: 1.0, tags: ['Fats', 'Oils'], unit_name: 'tsp', unit_weight_g: 4.5, image_url: '' },

  // --- SWEETS & TREATS ---
  { id: id(552), category: 'Sweets', name_en: 'Dark Chocolate (70%)', name_hi: 'डार्क चॉकलेट 70%', calories: 598, protein: 7.8, carbs: 46, fat: 43, fiber: 10.9, iron: 11.9, calcium: 73, magnesium: 228, potassium: 715, zinc: 3.3, yield_factor: 1.0, tags: ['Sweets', 'Snacks'], image_url: '' },
  
  // --- BEVERAGES ---
  { id: id(802), category: 'Beverages', name_en: 'Tea / Black Coffee (Plain)', name_hi: 'चाय / ब्लैक कॉफी (सादा)', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, iron: 0, yield_factor: 1, tags: ['Beverage'], unit_name: 'cup', unit_weight_g: 200, image_url: '' },
  { id: id(803), category: 'Beverages', name_en: 'Tea / Coffee with Milk & Sugar', name_hi: 'चाय / कॉफी (दूध और चीनी के साथ)', calories: 120, protein: 4.0, carbs: 16.0, fat: 4.0, fiber: 0, iron: 0, calcium: 120, potassium: 150, vitamin_b12: 0.4, yield_factor: 1, tags: ['Beverage'], unit_name: 'cup', unit_weight_g: 200, image_url: '' },

  // --- SNACKS ---
  { id: id(500), category: 'Cereals', name_en: 'Makhana (Fox nuts)', name_hi: 'मखाना', calories: 347, protein: 9.7, carbs: 76.9, fat: 0.1, fiber: 14.5, iron: 1.4, calcium: 60, magnesium: 67, zinc: 0.5, potassium: 500, sodium: 1, phosphorus: 198, vitamin_b1: 0.1, vitamin_b3: 0.5, yield_factor: 1.0, tags: ['Cereals', 'Snacks'], image_url: '' },
  { id: id(804), category: 'Pulses', name_en: 'Roasted Chana', name_hi: 'भुना चना', calories: 370, protein: 22.0, carbs: 60.0, fat: 6.0, fiber: 17.0, iron: 6.0, calcium: 57, magnesium: 168, potassium: 718, zinc: 3.4, vitamin_b9: 280, yield_factor: 1, tags: ['Pulses', 'Snacks'], image_url: '' },
];

export const SEED_FOODS: Food[] = RAW_SEED_FOODS.map(food => {
  let food_type: FoodType = 'CORE';
  let dietitian_visibility = true;
  let caution_level: CautionLevel = 'NONE';
  let usage_note = '';

  const tags = food.tags || [];
  const cat = food.category;
  const name = food.name_en.toLowerCase();

  const isSweet = cat === 'Sweets' || tags.includes('Dessert') || tags.includes('Sugars');
  const isFried = tags.includes('Fried');
  const isProcessed = tags.includes('Processed') || tags.includes('Fast Food') || tags.includes('Street Food');
  const isPrepared = cat === 'Prepared' || tags.includes('Prepared') || name.includes('cooked') || name.includes('curry') || name.includes('fry') || name.includes('sandwich');

  if (isSweet || isFried || isProcessed || ['mayonnaise', 'chocolate', 'jam', 'pickle', 'biscuit', 'cookie', 'cake', 'pizza', 'burger', 'ice gola', 'spread'].some(k => name.includes(k))) {
    food_type = 'TREAT';
    dietitian_visibility = true;
    caution_level = 'HIGH';
    usage_note = 'Occasional / cheat meal only';
    
    if (name.includes('pickle') || name.includes('sodium') || name.includes('sauce')) {
       usage_note = 'High sodium - limit portion';
    }
  } else if (isPrepared || name.includes('poha') || name.includes('upma') || name.includes('idli') || name.includes('dosa') || name.includes('roti') || name.includes('paratha')) {
    food_type = 'PREPARED';
    caution_level = 'MODERATE';
    usage_note = 'Oil and salt vary by preparation';
  } else {
    food_type = 'CORE';
    caution_level = 'NONE';
  }
  
  if (name === 'sugar' || name === 'jaggery' || name === 'honey' || name === 'dates syrup') {
      caution_level = 'MODERATE';
      usage_note = 'Added sugar';
  }

  return { 
    iron: 0,
    ...food, 
    image_url: food.image_url || getFoodImage(food.category, food.name_en),
    food_type, 
    dietitian_visibility, 
    caution_level, 
    usage_note 
  };
});
