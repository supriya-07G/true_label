/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Language {
  ENGLISH = 'en',
  TELUGU = 'te',
  HINDI = 'hi',
}

export enum SafetyStatus {
  SAFE = 'safe',
  CAUTION = 'caution',
  UNSAFE = 'unsafe',
}

export interface Alternative {
  name: string;
  reason: string;
}

export interface UserProfile {
  name: string;
  age: number;
  weight: number;
  gender: string;
  allergies: string[];
  medications: string[];
  chronicIllnesses: string[];
  dietaryRestrictions: string[];
  healthGoals: string[];
  scanSettings: {
    priorityIngredients: string[];
    cautionThreshold: number; // 0-100
  };
}

export interface IngredientRisk {
  name: string;
  riskLevel: SafetyStatus;
  explanation: string;
}

export interface ScanResult {
  productName: string;
  type?: 'medicine' | 'food';
  safetyScore: number;
  status: SafetyStatus;
  summary: string;
  safetyNote: string;
  ingredients: IngredientRisk[];
  alternatives: Alternative[];
  restrictedCountries: string[];
  expiryDate?: string;
  expiryConfidence: 'Low' | 'Medium' | 'High';
  scanDate: string;
  isInvalid?: boolean;
  invalidReason?: string;
}

export interface CabinetItem {
  id: string;
  type: 'medicine' | 'food';
  name: string;
  expiryDate: string;
  safetyScore: number;
  status: SafetyStatus;
  addedAt: string;
  ingredients: string[]; // For interaction checks
  calories?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}
