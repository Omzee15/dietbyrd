// Food Service - API-based food library management
import { Food } from './diet-types';

const API_BASE = '/api';

export const FOOD_LIBRARY_DB_COLUMNS = [
  'id',
  'name_en',
  'name_hi',
  'category',
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'iron',
  'calcium',
  'magnesium',
  'zinc',
  'potassium',
  'sodium',
  'phosphorus',
  'iodine',
  'selenium',
  'copper',
  'vitamin_a',
  'vitamin_b1',
  'vitamin_b2',
  'vitamin_b3',
  'vitamin_b6',
  'vitamin_b9',
  'vitamin_b12',
  'vitamin_c',
  'vitamin_d',
  'vitamin_e',
  'vitamin_k',
  'yield_factor',
  'image_url',
  'tags',
  'food_type',
  'dietitian_visibility',
  'caution_level',
  'notes',
] as const;

const FOOD_LIBRARY_REQUIRED_COLUMNS = ['id', 'name_en', 'category'] as const;

const FOOD_LIBRARY_NUMERIC_FIELDS = new Set([
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'iron',
  'calcium',
  'magnesium',
  'zinc',
  'potassium',
  'sodium',
  'phosphorus',
  'iodine',
  'selenium',
  'copper',
  'vitamin_a',
  'vitamin_b1',
  'vitamin_b2',
  'vitamin_b3',
  'vitamin_b6',
  'vitamin_b9',
  'vitamin_b12',
  'vitamin_c',
  'vitamin_d',
  'vitamin_e',
  'vitamin_k',
  'yield_factor',
]);

const slugifyFoodId = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const normalizeHeader = (header: string) =>
  header.trim().toLowerCase().replace(/['"]+/g, '').replace(/\s+/g, '_');

export const foodService = {
  // Get all foods from API
  getAll: async (): Promise<Food[]> => {
    try {
      const response = await fetch(`${API_BASE}/food-library`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch food library');
      }
      
      return data.data || [];
    } catch (e) {
      console.error("Failed to load food library", e);
      return [];
    }
  },

  // Get single food item
  get: async (id: string): Promise<Food | null> => {
    try {
      const response = await fetch(`${API_BASE}/food-library/${id}`);
      const data = await response.json();
      
      if (!data.success) {
        return null;
      }
      
      return data.data;
    } catch (e) {
      console.error(`Failed to load food item ${id}`, e);
      return null;
    }
  },

  // Save a single food (Create or Update)
  save: async (food: Food): Promise<Food> => {
    try {
      const isUpdate = food.id && await foodService.get(food.id);
      const method = isUpdate ? 'PUT' : 'POST';
      const url = isUpdate 
        ? `${API_BASE}/food-library/${food.id}` 
        : `${API_BASE}/food-library`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(food)
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save food');
      }
      
      return data.data;
    } catch (e) {
      console.error("Failed to save food", e);
      throw e;
    }
  },

  // Delete a food
  delete: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/food-library/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete food');
      }
    } catch (e) {
      console.error(`Failed to delete food ${id}`, e);
      throw e;
    }
  },

  // Search foods
  search: async (query: string, category?: string, foodType?: string): Promise<Food[]> => {
    try {
      const params = new URLSearchParams();
      if (query) params.append('search', query);
      if (category && category !== 'all') params.append('category', category);
      if (foodType && foodType !== 'all') params.append('food_type', foodType);
      
      const response = await fetch(`${API_BASE}/food-library?${params.toString()}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to search foods');
      }
      
      return data.data || [];
    } catch (e) {
      console.error("Failed to search foods", e);
      return [];
    }
  },

  getDbStructuredCsvTemplate: (): string => {
    const sampleRow = [
      'paneer-low-fat',
      'Paneer (Low Fat)',
      'पनीर (लो फैट)',
      'Dairy',
      '145',
      '18.3',
      '3.2',
      '6.8',
      '0',
      '0.3',
      '180',
      '16',
      '2.1',
      '90',
      '22',
      '210',
      '0',
      '0',
      '0.02',
      '120',
      '0.05',
      '0.22',
      '0.5',
      '0.1',
      '12',
      '0.8',
      '0',
      '0.1',
      '0.2',
      '0',
      '1',
      '',
      'high-protein|dairy',
      'CORE',
      'true',
      'NONE',
      'Per 100g values',
    ];

    return `${FOOD_LIBRARY_DB_COLUMNS.join(',')}\n${sampleRow.join(',')}`;
  },

  // Bulk Import logic - parses CSV and creates foods via API
  importCSV: async (csvText: string): Promise<{ updates: number, inserts: number, errors: string[] }> => {
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      return { updates: 0, inserts: 0, errors: ['CSV must include a header row and at least one data row.'] };
    }

    const headers = parseCsvLine(lines[0]).map(normalizeHeader);
    
    let updates = 0;
    let inserts = 0;
    const errors: string[] = [];

    // Map common CSV headers to Food properties
    const fieldMap: Record<string, keyof Food | 'notes'> = {
      'id': 'id',
      'name_en': 'name_en',
      'name_hi': 'name_hi',
      'category': 'category',
      'calories': 'calories',
      'protein': 'protein',
      'carbs': 'carbs',
      'fat': 'fat',
      'fiber': 'fiber',
      'iron': 'iron',
      'calcium': 'calcium',
      'magnesium': 'magnesium',
      'zinc': 'zinc',
      'potassium': 'potassium',
      'sodium': 'sodium',
      'phosphorus': 'phosphorus',
      'iodine': 'iodine',
      'selenium': 'selenium',
      'copper': 'copper',
      'vitamin_a': 'vitamin_a',
      'vitamin_b1': 'vitamin_b1',
      'vitamin_b2': 'vitamin_b2',
      'vitamin_b3': 'vitamin_b3',
      'vitamin_b6': 'vitamin_b6',
      'vitamin_b9': 'vitamin_b9',
      'vitamin_b12': 'vitamin_b12',
      'vitamin_c': 'vitamin_c',
      'vitamin_d': 'vitamin_d',
      'vitamin_e': 'vitamin_e',
      'vitamin_k': 'vitamin_k',
      'dietitian_visibility': 'dietitian_visibility',
      'food_type': 'food_type',
      'caution_level': 'caution_level',
      'yield_factor': 'yield_factor',
      'image_url': 'image_url',
      'tags': 'tags',
      'notes': 'notes',
      'name': 'name_en',
      'english_name': 'name_en',
      'hindi_name': 'name_hi',
      'kcal': 'calories',
      'carbohydrates': 'carbs',
      'fats': 'fat',
      'fibre': 'fiber',
      'vitamin_a_rae': 'vitamin_a',
      'folate': 'vitamin_b9',
    };

    const nameIndex = headers.findIndex(h => h === 'name' || h === 'english_name' || h === 'name_en');
    const idIndex = headers.indexOf('id');
    
    if (nameIndex === -1) {
      errors.push("CSV must have a 'name', 'english name', or 'name_en' column.");
      return { updates: 0, inserts: 0, errors };
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = parseCsvLine(line);
        
        const name = values[nameIndex];
        const explicitId = idIndex >= 0 ? values[idIndex] : '';

        if (!name && !explicitId) {
          errors.push(`Row ${i + 1}: Missing id/name_en`);
          continue;
        }

        const id = explicitId || slugifyFoodId(name || '');

        // Build food object
        const food: Partial<Food> & { notes?: string } = {
          id,
          name_en: name || '',
          category: 'General'
        };

        // Map CSV values to food properties
        headers.forEach((header, index) => {
          const field = fieldMap[header];
          if (field && values[index]) {
            const value = values[index];

            if (FOOD_LIBRARY_NUMERIC_FIELDS.has(field)) {
              const num = parseFloat(value);
              if (!isNaN(num)) {
                (food as any)[field] = num;
              }
            } else if (field === 'dietitian_visibility') {
              (food as any)[field] = ['true', '1', 'yes'].includes(value.toLowerCase());
            } else if (field === 'tags') {
              (food as any)[field] = value
                .split('|')
                .map((tag) => tag.trim())
                .filter(Boolean);
            } else {
              (food as any)[field] = value;
            }
          }
        });

        if (!food.id || !food.name_en || !food.category) {
          errors.push(`Row ${i + 1}: Missing required fields (${FOOD_LIBRARY_REQUIRED_COLUMNS.join(', ')})`);
          continue;
        }

        // Check if food exists
        const existing = await foodService.get(food.id);
        
        try {
          await foodService.save(food as Food);
          if (existing) {
            updates++;
          } else {
            inserts++;
          }
        } catch (err: any) {
          errors.push(`Row ${i + 1}: ${err.message || 'Failed to save'}`);
        }

      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message || 'Parse error'}`);
      }
    }

    return { updates, inserts, errors };
  }
};
