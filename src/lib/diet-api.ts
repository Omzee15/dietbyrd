// Diet API Service - localStorage management for diet plans
import { DietPlan, Meal } from './diet-types';
import { INITIAL_MEALS } from './diet-constants';
import { generateId } from './diet-utils';

const STORAGE_KEY = 'dietbyrd_diet_plans';

// Initialize default meals
const createDefaultMeals = (): Meal[] => {
  return INITIAL_MEALS.map((name, idx) => ({
    id: `meal-${idx}-${generateId()}`,
    name,
    items: []
  }));
};

export const dietApi = {
  // Get or create a draft plan for a patient
  getDraftPlan: async (patientId: string, date: string): Promise<DietPlan> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const plans: DietPlan[] = stored ? JSON.parse(stored) : [];
      
      // Find existing draft for this patient and date
      const existing = plans.find(p => 
        p.patientId === patientId && 
        p.date === date && 
        p.status === 'draft'
      );
      
      if (existing) return existing;
      
      // Create new draft
      const newPlan: DietPlan = {
        id: generateId(),
        patientId,
        date,
        meals: createDefaultMeals(),
        prototypes: [{
          id: generateId(),
          name: 'Prototype 1',
          meals: createDefaultMeals()
        }],
        note: '',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      plans.push(newPlan);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
      
      return newPlan;
    } catch (e) {
      console.error("Failed to get draft plan", e);
      return {
        id: generateId(),
        patientId,
        date,
        meals: createDefaultMeals(),
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  },

  // Save a draft plan
  saveDraft: async (plan: DietPlan): Promise<DietPlan> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const plans: DietPlan[] = stored ? JSON.parse(stored) : [];
      
      const index = plans.findIndex(p => p.id === plan.id);
      const updatedPlan = {
        ...plan,
        updatedAt: new Date().toISOString()
      };
      
      if (index >= 0) {
        plans[index] = updatedPlan;
      } else {
        plans.push(updatedPlan);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
      return updatedPlan;
    } catch (e) {
      console.error("Failed to save draft", e);
      throw e;
    }
  },

  // Get all plans for a patient
  getPatientPlans: async (patientId: string): Promise<DietPlan[]> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const plans: DietPlan[] = stored ? JSON.parse(stored) : [];
      return plans.filter(p => p.patientId === patientId);
    } catch (e) {
      console.error("Failed to get patient plans", e);
      return [];
    }
  },

  // Finalize a draft plan
  finalizePlan: async (planId: string): Promise<DietPlan | null> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const plans: DietPlan[] = stored ? JSON.parse(stored) : [];
      
      const index = plans.findIndex(p => p.id === planId);
      if (index === -1) return null;
      
      plans[index] = {
        ...plans[index],
        status: 'final',
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
      return plans[index];
    } catch (e) {
      console.error("Failed to finalize plan", e);
      return null;
    }
  },

  // Delete a plan
  deletePlan: async (planId: string): Promise<void> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const plans: DietPlan[] = stored ? JSON.parse(stored) : [];
      const filtered = plans.filter(p => p.id !== planId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error("Failed to delete plan", e);
    }
  }
};
