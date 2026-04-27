/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { Language, ScanResult, UserProfile, SafetyStatus, CabinetItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const analyzeProductLabel = async (
  imageBase64: string,
  userProfile: UserProfile,
  language: Language
): Promise<ScanResult> => {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are TRUE LABEL AI, a specialist in medical and food safety.
    Analyze the provided label image and user profile to determine product safety with clinical precision.
    
    User Profile:
    - Name: ${userProfile.name}
    - Age: ${userProfile.age}
    - Allergies: ${userProfile.allergies.join(", ")}
    - Medications: ${userProfile.medications.join(", ")}
    - Chronic Illnesses: ${userProfile.chronicIllnesses.join(", ")}
    - Dietary Restrictions: ${userProfile.dietaryRestrictions.join(", ")}
    - Health Goals: ${userProfile.healthGoals.join(", ")}
    - Scanning Priorities: ${userProfile.scanSettings.priorityIngredients.join(", ")}
    - Caution Threshold: ${userProfile.scanSettings.cautionThreshold}%
    
    Output must be a strictly valid JSON object matching the ScanResult interface.
    
    MISSION: Provide a "Refined Report" that empowers the user to make data-driven safety decisions.
    
    Safety Grading:
    - GREEN (Safe): 90-100 score. No identifiable risks for THIS user profile.
    - YELLOW (Caution): 60-89 score. Potential sensitivities, high sugar/sodium, or minor therapeutic duplication.
    - RED (Unsafe): 0-59 score. Direct allergen matches, severe drug interactions, or globally banned substances.
    
    Recommendation Engine:
    - Provide 2-3 safer alternatives that explicitly support the user's specific health goals.
    - Be extremely specific: If goal is "Manage Diabetes", the "reason" must mention blood sugar impact or glycemic index.
    - If it's a medicine, suggest consulting a doctor about specific generic alternatives if there is a conflict.
    
    Validation:
    - EXTREMELY IMPORTANT: Check if the provided image is actually a recognized food product, medicine product, product label, or ingredients list.
    - If the image is something else entirely (e.g., a car, landscape, random objects, blank image), you MUST set "isInvalid" to true and provide an "invalidReason" in ${language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English'}.
    - When "isInvalid" is true, the other fields can be filled with placeholder data (like "N/A" or 0) as they will be ignored by the UI.

    Analysis:
    - summary: A highly personalized 2-sentence safety verdict. The first sentence MUST provide the general safety status (safe, caution, or unsafe). The second sentence MUST explicitly compare the product's properties with the user's documented health profile—specifically mentioning how it interacts with their allergies (${userProfile.allergies.join(", ")}) and chronic illnesses (${userProfile.chronicIllnesses.join(", ")})—to highlight unique risks or benefits for THIS specific individual.
    - safetyNote: A 2-3 sentence personalized advisory. Mention specific user medications or allergies in the context of this product.
    - ingredients: For each, explain the "Health Impact" for this specific user (e.g. "Safe but high sodium which impacts your Hypertension").
    - expiryDate: If not clearly visible, estimate based on product type (Medicines: 2-3yrs, Dairy: 1-2wks, Dry Food: 1yr).
    
    Translation:
    - The output summary, safetyNote, ingredient explanations, and alternative reasons must be in ${language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English'}.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
          { text: "Analyze this label for the user profile provided in system instructions and provide personalized alternatives." }
        ]
      }
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productName: { type: Type.STRING },
          safetyScore: { type: Type.NUMBER },
          status: { type: Type.STRING, enum: ["safe", "caution", "unsafe"] },
          summary: { type: Type.STRING },
          safetyNote: { type: Type.STRING },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                riskLevel: { type: Type.STRING, enum: ["safe", "caution", "unsafe"] },
                explanation: { type: Type.STRING }
              },
              required: ["name", "riskLevel", "explanation"]
            }
          },
          alternatives: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                reason: { type: Type.STRING }
              },
              required: ["name", "reason"]
            } 
          },
          restrictedCountries: { type: Type.ARRAY, items: { type: Type.STRING } },
          expiryDate: { type: Type.STRING },
          expiryConfidence: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          scanDate: { type: Type.STRING },
          isInvalid: { type: Type.BOOLEAN },
          invalidReason: { type: Type.STRING }
        },
        required: ["productName", "safetyScore", "status", "summary", "safetyNote", "ingredients", "alternatives", "restrictedCountries", "expiryConfidence", "scanDate"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const chatWithAI = async (
  messages: { role: 'user' | 'model'; parts: { text: string }[] }[],
  userProfile: UserProfile,
  language: Language
): Promise<string> => {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are the TRUE LABEL Assistant. Use the user's health profile to provide personalized advice.
    User: Age ${userProfile.age}, Allergies: ${userProfile.allergies.join(", ")}, Medications: ${userProfile.medications.join(", ")}.
    Always prioritize safety. If unsure, suggest consulting a doctor.
    Respond in ${language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English'}.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: messages,
    config: { systemInstruction }
  });

  return response.text;
};

export const getIngredientDetails = async (
  ingredientName: string,
  userProfile: UserProfile,
  language: Language
): Promise<{ commonUses: string; healthImplications: string; safetyVerdict: string }> => {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are an expert toxicologist and clinical nutritionist.
    Provide detailed information about the specific ingredient: ${ingredientName}.
    Tailor the health implications specifically to this user profile:
    - Age: ${userProfile.age}
    - Allergies: ${userProfile.allergies.join(", ")}
    - Medications: ${userProfile.medications.join(", ")}
    - Chronic Illnesses: ${userProfile.chronicIllnesses.join(", ")}
    
    Respond in ${language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English'}.
    Output MUST be valid JSON.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: `Tell me about ${ingredientName} for the provided user profile.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          commonUses: { type: Type.STRING },
          healthImplications: { type: Type.STRING },
          safetyVerdict: { type: Type.STRING }
        },
        required: ["commonUses", "healthImplications", "safetyVerdict"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const analyzeManualItem = async (
  itemName: string,
  itemType: 'medicine' | 'food',
  userProfile: UserProfile,
  language: Language
): Promise<{ safetyScore: number; status: SafetyStatus; expiryDate: string; calories?: string; safetyNote: string }> => {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are a product safety expert. Analyze a manually entered ${itemType} item: "${itemName}".
    User Profile:
    - Age: ${userProfile.age}
    - Allergies: ${userProfile.allergies.join(", ")}
    - Medications: ${userProfile.medications.join(", ")}
    
    Tasks:
    1. Determine safety Status (safe/caution/unsafe) based on known typical ingredients/components of this item for this user.
    2. Estimate a reasonable typical Expiry Date (YYYY-MM-DD or reasonable timeframe) from today (${new Date().toISOString().split('T')[0]}) for this product type.
    3. If it's FOOD, estimate average Calories per typical serving.
    4. Provide a brief safetyNote in ${language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English'}.
    
    Output must be valid JSON.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: `Analyze manual item: ${itemName}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          safetyScore: { type: Type.NUMBER },
          status: { type: Type.STRING, enum: ["safe", "caution", "unsafe"] },
          expiryDate: { type: Type.STRING },
          calories: { type: Type.STRING },
          safetyNote: { type: Type.STRING }
        },
        required: ["safetyScore", "status", "expiryDate", "safetyNote"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const checkCabinetInteractions = async (
  newProductName: string,
  newProductIngredients: string[],
  cabinetItems: CabinetItem[],
  userProfile: UserProfile,
  language: Language
): Promise<string[]> => {
  const model = "gemini-3-flash-preview";
  
  const medicineCabinet = cabinetItems.filter(i => i.type === 'medicine');
  const medicineNames = medicineCabinet.map(i => i.name).join(", ");
  
  const systemInstruction = `
    You are a clinical pharmacist specializing in drug-drug and drug-food interactions.
    Check for potential interactions between a new product and the user's current medications/cabinet items.
    
    New Product: ${newProductName}
    New Product Ingredients: ${newProductIngredients.join(", ")}
    
    Items already in Cabinet: ${medicineNames}
    User Medications (Chronic): ${userProfile.medications.join(", ")}
    User Allergies: ${userProfile.allergies.join(", ")}
    User Chronic Illnesses: ${userProfile.chronicIllnesses.join(", ")}
    
    Output must be a JSON array of strings. Each string should be a clear, concise interaction warning.
    Each warning MUST:
    - Identify the specific ingredient or product causing the conflict.
    - Explicitly mention which of the user's current items (from Cabinet or Medications) it interacts with.
    - Conclude with a suggestion to consult a pharmacist.
    
    If no interactions found, return an empty array [].
    Warnings should be in ${language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English'}.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: "Check for interactions.",
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  return JSON.parse(response.text);
};
