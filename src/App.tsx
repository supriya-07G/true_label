/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './components/Logo';
import { 
  Camera, 
  Home, 
  Heart, 
  MessageSquare, 
  User, 
  Settings, 
  Plus, 
  Search, 
  ArrowLeft,
  Share2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Package,
  Pill,
  Utensils,
  Mic,
  Languages,
  X,
  Volume2,
  VolumeX,
  Square,
  Edit2,
  Trash2,
  RotateCcw,
  Wifi,
  WifiOff
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  Language, 
  SafetyStatus, 
  UserProfile, 
  ScanResult, 
  CabinetItem, 
  ChatMessage 
} from './types';
import { analyzeProductLabel, chatWithAI, getIngredientDetails, checkCabinetInteractions, analyzeManualItem } from './services/geminiService';
import { translations } from './translations';

// --- Components ---

const Badge = ({ status }: { status: SafetyStatus }) => {
  const styles = {
    [SafetyStatus.SAFE]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    [SafetyStatus.CAUTION]: 'bg-amber-100 text-amber-700 border-amber-200',
    [SafetyStatus.UNSAFE]: 'bg-rose-100 text-rose-700 border-rose-200',
  };
  const Icons = {
    [SafetyStatus.SAFE]: CheckCircle2,
    [SafetyStatus.CAUTION]: AlertTriangle,
    [SafetyStatus.UNSAFE]: X,
  };
  const Icon = Icons[status];

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold capitalize ${styles[status]}`}>
      <Icon size={14} />
      {status}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'scan' | 'health' | 'chat'>('home');
  const [needsOnboarding, setNeedsOnboarding] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [activeIngredient, setActiveIngredient] = useState<{name: string, details?: any} | null>(null);
  const [isIngredientLoading, setIsIngredientLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : {
      name: "",
      age: 25,
      weight: 70,
      gender: "Other",
      allergies: [],
      medications: [],
      chronicIllnesses: [],
      dietaryRestrictions: [],
      healthGoals: [],
      scanSettings: {
        priorityIngredients: ["Sugar", "Sodium", "Trans Fat"],
        cautionThreshold: 70
      }
    };
  });
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [reminderThreshold, setReminderThreshold] = useState<number>(30);
  const [showReminderConfig, setShowReminderConfig] = useState(false);
  const [activeCabinetView, setActiveCabinetView] = useState<'medicine' | 'food' | null>(null);
  const [isCheckingCabinet, setIsCheckingCabinet] = useState(false);
  const [cabinetWarnings, setCabinetWarnings] = useState<string[]>([]);
  const [cabinet, setCabinet] = useState<CabinetItem[]>(() => {
    const saved = localStorage.getItem('cabinet');
    return saved ? JSON.parse(saved) : [];
  });
  const [scanHistory, setScanHistory] = useState<ScanResult[]>(() => {
    const saved = localStorage.getItem('scanHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [isScanning, setIsScanning] = useState(false);
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const [activeSafetyConcern, setActiveSafetyConcern] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('chatMessages');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editingItem, setEditingItem] = useState<CabinetItem | null>(null);
  const [interactionWarnings, setInteractionWarnings] = useState<string[]>([]);
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Validation Errors
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const [historyFilterType, setHistoryFilterType] = useState<'all' | 'medicine' | 'food'>('all');
  const [historyFilterDate, setHistoryFilterDate] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // New list item inputs
  const [newAllergy, setNewAllergy] = useState('');
  const [newMed, setNewMed] = useState('');
  const [newIllness, setNewIllness] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newDiet, setNewDiet] = useState('');
  const [newPriority, setNewPriority] = useState('');

  const t = translations[language] || translations.en;

  // --- Logic ---

  const validateProfile = (field: string, value: any, currentErrors = errors) => {
    const newErrors = { ...currentErrors };
    const numVal = parseFloat(value);
    
    if (field === 'age') {
      if (isNaN(numVal) || numVal <= 0 || numVal > 120) {
        newErrors.age = "Valid age (1-120) required.";
      } else {
        delete newErrors.age;
      }
    }
    
    if (field === 'weight') {
      if (isNaN(numVal) || numVal < 2 || numVal > 350) {
        newErrors.weight = "Valid weight (2-350kg) required.";
      } else {
        delete newErrors.weight;
      }
    }
    
    setErrors(newErrors);
    // Return whether this specific field is valid in the new state
    return !newErrors[field];
  };

  const validateAllProfile = () => {
    let isValid = true;
    let tempErrors = { ...errors };
    
    const ageVal = parseFloat(userProfile.age as any);
    if (isNaN(ageVal) || ageVal <= 0 || ageVal > 120) {
      tempErrors.age = "Valid age (1-120) required.";
      isValid = false;
    } else {
      delete tempErrors.age;
    }
    
    const weightVal = parseFloat(userProfile.weight as any);
    if (isNaN(weightVal) || weightVal < 2 || weightVal > 350) {
      tempErrors.weight = "Valid weight (2-350kg) required.";
      isValid = false;
    } else {
      delete tempErrors.weight;
    }
    
    setErrors(tempErrors);
    return isValid;
  };

  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('cabinet', JSON.stringify(cabinet));
  }, [cabinet]);

  useEffect(() => {
    localStorage.setItem('scanHistory', JSON.stringify(scanHistory));
  }, [scanHistory]);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkCabinetSafety = async () => {
    if (cabinet.length < 2) return;
    if (!isOnline) {
      setCabinetWarnings([t.cabinetOffline]);
      return;
    }
    setIsCheckingCabinet(true);
    setCabinetWarnings([]);
    try {
      const resp = await checkCabinetInteractions(
        "Current Cabinet Items",
        [],
        cabinet,
        userProfile,
        language
      );
      setCabinetWarnings(resp);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingCabinet(false);
    }
  };

  const expiringSoonItems = cabinet.filter(item => {
    if (!item.expiryDate || item.expiryDate === 'N/A') return false;
    const expiry = new Date(item.expiryDate);
    if (isNaN(expiry.getTime())) return false;
    const diffTime = expiry.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= reminderThreshold && diffDays >= 0;
  });

  const addToCabinet = (res: ScanResult) => {
    const isMedicine = res.ingredients.some(i => i.explanation.toLowerCase().includes('med') || i.explanation.toLowerCase().includes('drug')) || res.productName.toLowerCase().includes('pill') || res.productName.toLowerCase().includes('tablet');
    
    const newItem: CabinetItem = {
      id: Date.now().toString(),
      type: isMedicine ? 'medicine' : 'food',
      name: res.productName,
      expiryDate: res.expiryDate || 'N/A',
      safetyScore: res.safetyScore,
      status: res.status,
      addedAt: new Date().toISOString(),
      ingredients: res.ingredients.map(i => i.name)
    };

    setCabinet(prev => [...prev, newItem]);
    setCurrentResult(null);
    setInteractionWarnings([]);
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#ffffff'] });
  };

  const resetData = () => {
    setUserProfile({
      name: "",
      age: 25,
      weight: 70,
      gender: "Other",
      allergies: [],
      medications: [],
      chronicIllnesses: [],
      dietaryRestrictions: [],
      healthGoals: [],
      scanSettings: {
        priorityIngredients: ["Sugar", "Sodium", "Trans Fat"],
        cautionThreshold: 70
      }
    });
    setCabinet([]);
    setScanHistory([]);
    setChatMessages([]);
    localStorage.removeItem('userProfile');
    localStorage.removeItem('cabinet');
    localStorage.removeItem('scanHistory');
    localStorage.removeItem('chatMessages');
    setNeedsOnboarding(true);
    setOnboardingStep(0);
    setShowProfile(false);
    setShowResetConfirm(false);
  };

  const handleManualAdd = async (name: string) => {
    if (!name || !activeCabinetView) return;
    if (!isOnline) {
      alert("This action requires an internet connection. Please try again when online.");
      return;
    }
    setIsManualLoading(true);
    try {
      const res = await analyzeManualItem(name, activeCabinetView, userProfile, language);
      const newItem: CabinetItem = {
        id: Date.now().toString(),
        type: activeCabinetView,
        name: name,
        expiryDate: res.expiryDate,
        safetyScore: res.safetyScore,
        status: res.status,
        addedAt: new Date().toISOString(),
        ingredients: [],
        calories: res.calories
      };
      setCabinet(prev => [...prev, newItem]);
      setIsAddingManual(false);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#ffffff'] });
    } catch (err) {
      console.error(err);
      alert("Failed to analyze item. Please try again.");
    } finally {
      setIsManualLoading(false);
    }
  };

  const handleUpdateItem = (updated: CabinetItem) => {
    setCabinet(prev => prev.map(item => item.id === updated.id ? updated : item));
    setEditingItem(null);
  };

  const removeFromCabinet = (id: string) => {
    setCabinet(prev => prev.filter(item => item.id !== id));
  };
  const handleOnboardingNext = () => {
    if (onboardingStep === 0) {
      if (!validateAllProfile()) {
        return;
      }
    }
    setOnboardingStep(prev => prev + 1);
  };
  const finishOnboarding = () => setNeedsOnboarding(false);

  const onboardingSteps = [
    {
      title: t.welcome,
      subtitle: t.personalizeProfile,
      content: (
        <div className="flex flex-col gap-4">
          <input 
            type="text" 
            placeholder={t.yourName} 
            className="w-full p-4 rounded-2xl bg-brand-cream/50 border border-brand-sage focus:ring-2 focus:ring-brand-olive outline-none transition-all font-bold"
            onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
          />
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <input 
                  type="number" 
                  placeholder={t.age} 
                  className={`w-full p-4 rounded-2xl bg-brand-cream/50 border ${errors.age ? 'border-rose-500' : 'border-brand-sage'} focus:ring-2 focus:ring-brand-olive outline-none transition-all font-bold`}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUserProfile({...userProfile, age: parseInt(val) || 0});
                    validateProfile('age', val);
                  }}
                />
                {errors.age && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.age}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <input 
                  type="number" 
                  step="0.1"
                  placeholder={t.weight} 
                  className={`w-full p-4 rounded-2xl bg-brand-cream/50 border ${errors.weight ? 'border-rose-500' : 'border-brand-sage'} focus:ring-2 focus:ring-brand-olive outline-none transition-all font-bold`}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUserProfile({...userProfile, weight: parseFloat(val) || 0});
                    validateProfile('weight', val);
                  }}
                />
                {errors.weight && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.weight}</p>}
              </div>
            </div>
          </div>
          <select 
            className="w-full p-4 rounded-2xl bg-brand-cream/50 border border-brand-sage focus:ring-2 focus:ring-brand-olive outline-none transition-all font-bold"
            onChange={(e) => setUserProfile({...userProfile, gender: e.target.value})}
          >
            <option value="Male">{t.male}</option>
            <option value="Female">{t.female}</option>
            <option value="Other">{t.other}</option>
          </select>
        </div>
      )
    },
    {
      title: t.allergiesAndHealth,
      subtitle: t.onboardingSub2,
      content: (
        <div className="flex flex-col gap-6">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">{t.allergies}</label>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setUserProfile({...userProfile, allergies: ["None"]})}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${userProfile.allergies.includes("None") ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
              >
                {t.none}
              </button>
              {["Peanuts", "Dairy", "Gluten", "Soy", "Penicillin"].map(a => (
                <button 
                  key={a}
                  onClick={() => {
                    const exists = userProfile.allergies.includes(a);
                    const newAllergies = exists 
                      ? userProfile.allergies.filter(x => x !== a) 
                      : [...userProfile.allergies.filter(x => x !== "None"), a];
                    setUserProfile({...userProfile, allergies: newAllergies.length === 0 ? ["None"] : newAllergies});
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${userProfile.allergies.includes(a) ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-100' : 'bg-white border-slate-200 text-slate-500'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">{t.chronicIllnesses}</label>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setUserProfile({...userProfile, chronicIllnesses: ["None"]})}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${userProfile.chronicIllnesses.includes("None") ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
              >
                {t.none}
              </button>
              {["Diabetes", "Hypertension", "Asthma", "Heart Disease"].map(c => (
                <button 
                  key={c}
                  onClick={() => {
                    const exists = userProfile.chronicIllnesses.includes(c);
                    const newIllnesses = exists 
                      ? userProfile.chronicIllnesses.filter(x => x !== c) 
                      : [...userProfile.chronicIllnesses.filter(x => x !== "None"), c];
                    setUserProfile({...userProfile, chronicIllnesses: newIllnesses.length === 0 ? ["None"] : newIllnesses});
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${userProfile.chronicIllnesses.includes(c) ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100' : 'bg-white border-slate-200 text-slate-500'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">{t.currentMeds}</label>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setUserProfile({...userProfile, medications: ["None"]})}
                className={`w-full p-4 rounded-2xl text-sm font-bold border text-center transition-all ${userProfile.medications.includes("None") ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
              >
                {t.notTakingMed}
              </button>
              <input 
                type="text" 
                placeholder={t.addMed}
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    if (val) {
                      const newMeds = [...userProfile.medications.filter(x => x !== "None"), val];
                      setUserProfile({...userProfile, medications: newMeds});
                    }
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </div>
        </div>
      )
    },
    {
      title: t.yourGoals,
      subtitle: t.onboardingSub3,
      content: (
        <div className="grid grid-cols-1 gap-3">
          {[
            { id: "Weight Loss", icon: "⚖️", label: t.weightLoss },
            { id: "Manage Diabetes", icon: "🩸", label: t.manageDiabetes },
            { id: "Heart Healthy", icon: "🫀", label: t.heartHealthy },
            { id: "Clean Eating", icon: "🥬", label: t.cleanEating }
          ].map(goal => (
            <button 
              key={goal.id}
              onClick={() => {
                const exists = userProfile.healthGoals.includes(goal.id);
                setUserProfile({
                  ...userProfile, 
                  healthGoals: exists ? userProfile.healthGoals.filter(x => x !== goal.id) : [...userProfile.healthGoals, goal.id]
                });
              }}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${userProfile.healthGoals.includes(goal.id) ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-white border-slate-200 text-slate-700'}`}
            >
              <span className="text-2xl">{goal.icon}</span>
              <span className="font-bold">{goal.label}</span>
            </button>
          ))}
        </div>
      )
    },
    {
      title: t.scanPreferences,
      subtitle: t.onboardingSub4,
      content: (
        <div className="flex flex-col gap-6">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block">{t.priorityIngredients}</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                {id: 'Sugar', label: t.sugar}, 
                {id: 'Sodium', label: t.sodium}, 
                {id: 'Trans Fat', label: t.transFat}, 
                {id: 'Artificial Colors', label: t.artColors}, 
                {id: 'Preservatives', label: t.preservatives}, 
                {id: 'MSG', label: t.msg}
              ].map(p => {
                const isSelected = userProfile.scanSettings.priorityIngredients.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      const newPriorities = isSelected
                        ? userProfile.scanSettings.priorityIngredients.filter(x => x !== p.id)
                        : [...userProfile.scanSettings.priorityIngredients, p.id];
                      setUserProfile({...userProfile, scanSettings: {...userProfile.scanSettings, priorityIngredients: newPriorities}});
                    }}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-white border-slate-200 text-slate-500'}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <input 
              type="text"
              placeholder={t.addOtherIng}
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = e.currentTarget.value.trim();
                  if (val && !userProfile.scanSettings.priorityIngredients.includes(val)) {
                    setUserProfile({
                      ...userProfile, 
                      scanSettings: {
                        ...userProfile.scanSettings, 
                        priorityIngredients: [...userProfile.scanSettings.priorityIngredients, val]
                      }
                    });
                  }
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-black uppercase text-slate-400">{t.cautionSensitivity}</label>
              <span className="text-xs font-bold text-emerald-600">{userProfile.scanSettings.cautionThreshold}%</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">{t.onboardingSub5}</p>
            <input 
              type="range" 
              min="1" 
              max="100" 
              value={userProfile.scanSettings.cautionThreshold}
              onChange={(e) => setUserProfile({
                ...userProfile, 
                scanSettings: {
                  ...userProfile.scanSettings, 
                  cautionThreshold: parseInt(e.target.value) || 70
                }
              })}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] font-bold text-slate-400">{t.strict}</span>
              <span className="text-[10px] font-bold text-slate-400">{t.lenient}</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  // --- Voice & TTS ---
  const speakResult = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === Language.TELUGU ? 'te-IN' : language === Language.HINDI ? 'hi-IN' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const stopAudio = () => {
    window.speechSynthesis.cancel();
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = language === Language.TELUGU ? 'te-IN' : language === Language.HINDI ? 'hi-IN' : 'en-US';
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSendMessage(transcript);
      };
      recognition.start();
    }
  };

  // --- Logic ---

  const handleScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOnline) {
      alert(t.deepScanOffline);
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setInteractionWarnings([]);
    setIsScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const result = await analyzeProductLabel(base64, userProfile, language);
        
        // Interaction Check
        const isMedicine = result.ingredients.some(i => i.explanation.toLowerCase().includes('med') || i.explanation.toLowerCase().includes('drug')) || result.productName.toLowerCase().includes('pill') || result.productName.toLowerCase().includes('tablet');
        
        result.type = isMedicine ? 'medicine' : 'food';
        
        setCurrentResult(result);
        if (!result.isInvalid) {
          setScanHistory(prev => [result, ...prev]);

          if (isMedicine) {
            setIsCheckingInteractions(true);
            try {
              const warnings = await checkCabinetInteractions(
                result.productName,
                result.ingredients.map(i => i.name),
                cabinet,
                userProfile,
                language
              );
              setInteractionWarnings(warnings);
            } catch (err) {
              console.error("Interaction check failed", err);
            } finally {
              setIsCheckingInteractions(false);
            }
          }

          if (result.status === SafetyStatus.SAFE && interactionWarnings.length === 0) {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#ffffff'] });
          }
        }
      } catch (error) {
        console.error("Scan failed", error);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: new Date().toISOString() };
    setChatMessages(prev => [...prev, userMsg]);

    if (!isOnline) {
      let offlineResponse = '';
      const tLower = text.toLowerCase();
      
      if (tLower.includes('allerg') || tLower.includes('అలెర్జీ') || tLower.includes('एलर्जी')) {
        offlineResponse = t.offlineChatAllergy + (userProfile.allergies.length ? userProfile.allergies.join(", ") : language === 'en' ? 'None' : language === 'hi' ? 'कोई नहीं' : 'ఏమీ లేదు');
      } else if (tLower.includes('cabine') || tLower.includes('క్యాబినెట్') || tLower.includes('कैबिनेट')) {
        offlineResponse = t.offlineChatCabinet.replace('{count}', cabinet.length.toString()) + cabinet.map(i => i.name).join(", ");
      } else {
        offlineResponse = t.offlineChatDef;
      }
      
      const modelMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: offlineResponse, 
        timestamp: new Date().toISOString() 
      };
      setChatMessages(prev => [...prev, modelMsg]);
      return;
    }

    setIsAiLoading(true);

    try {
      const aiResponse = await chatWithAI(
        [...chatMessages, userMsg].map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        userProfile,
        language
      );
      const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: aiResponse, timestamp: new Date().toISOString() };
      setChatMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const formatWhatsAppReport = (res: ScanResult) => {
    const statusEmoji = res.status === SafetyStatus.SAFE ? '🟢' : res.status === SafetyStatus.CAUTION ? '🟡' : '🔴';
    const alternativesText = res.alternatives.map(a => `${a.name}: ${a.reason}`).join('\n');
    return `🚨 *True Label Safety Scan* 🚨\n\n*Product:* ${res.productName}\n*Result:* ${res.status.toUpperCase()} ${statusEmoji}\n\n*Summary:*\n${res.summary}\n\n*Safety Note:*\n${res.safetyNote}\n\n*Alternatives:*\n${alternativesText}\n\n*Banned/Restricted:*\n${res.restrictedCountries.length > 0 ? res.restrictedCountries.join(', ') : 'Not restricted'}\n\nScan Date: ${res.scanDate}\n--\nCheck your personalized safety profile on True Label.`;
  };

  const shareReport = (res: ScanResult) => {
    const text = formatWhatsAppReport(res);
    if (navigator.share) {
      navigator.share({ text }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert("Report copied to clipboard!");
    }
  };

  const handleIngredientClick = async (name: string) => {
    if (!isOnline) {
      alert(t.analysisOffline);
      return;
    }
    setActiveIngredient({ name });
    setIsIngredientLoading(true);
    try {
      const details = await getIngredientDetails(name, userProfile, language);
      setActiveIngredient({ name, details });
    } catch (err) {
      console.error(err);
    } finally {
      setIsIngredientLoading(false);
    }
  };

  // --- Screens ---

  const renderHome = () => (
    <div className="flex flex-col gap-6 p-4 pb-24">
          <header className="flex justify-between items-center mt-2">
        <div className="flex items-center gap-3">
          <Logo size="sm" showText={false} />
          <div>
            <h1 className="font-black text-xl text-[#415a1f] tracking-widest uppercase font-serif">TRUE LABEL</h1>
            <p className="text-[10px] text-brand-olive font-black uppercase tracking-widest leading-none">{t.wellnessDiscovery}</p>
          </div>
        </div>
        <button onClick={() => setShowProfile(true)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
          <User className="text-slate-500" size={20} />
        </button>
      </header>

      {expiringSoonItems.length > 0 && (
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-rose-50 border border-rose-100 p-4 rounded-3xl flex items-center gap-4">
          <div className="w-10 h-10 bg-rose-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-100">
            <Clock size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-900">{t.expiringSoon}</h3>
            <p className="text-[10px] text-rose-600 font-medium">{expiringSoonItems.length} {t.itemsAttention}</p>
          </div>
          <button onClick={() => setActiveCabinetView(expiringSoonItems[0].type)} className="text-[10px] font-black text-rose-700 bg-white px-3 py-1.5 rounded-full border border-rose-200 uppercase tracking-tight">{t.check}</button>
        </motion.div>
      )}

      <section className="bg-emerald-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-100 flex flex-col gap-4 relative overflow-hidden">
        <div className="z-10 relative">
          <h2 className="text-2xl font-bold font-sans">{t.readyToScan}</h2>
          <p className="text-emerald-50 opacity-90 text-sm mt-1">{t.checkSafetyProfiles}</p>
          
          <label className="mt-6 flex items-center justify-center gap-3 bg-white text-emerald-700 font-bold py-4 px-6 rounded-2xl cursor-pointer active:scale-95 transition-transform shadow-lg">
            <Camera size={24} />
            {t.scanProduct}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanUpload} />
          </label>
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
          <ShieldCheck size={200} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setActiveCabinetView('medicine')} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3 text-left hover:bg-slate-50 transition-colors">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Pill size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{t.medCabinet}</h3>
            <p className="text-xs text-slate-500">{cabinet.filter(c => c.type === 'medicine').length} {t.itemsStored}</p>
          </div>
        </button>
        <button onClick={() => setActiveCabinetView('food')} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3 text-left hover:bg-slate-50 transition-colors">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
            <Utensils size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{t.foodCabinet}</h3>
            <p className="text-xs text-slate-500">{cabinet.filter(c => c.type === 'food').length} {t.itemsStored}</p>
          </div>
        </button>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-slate-800">{t.recentScans}</h3>
          <button onClick={() => setShowHistory(true)} className="text-emerald-600 text-sm font-semibold">{t.seeAll}</button>
        </div>
        {scanHistory.length === 0 ? (
          <div className="bg-slate-50 border border-slate-100 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Package size={32} strokeWidth={1.5} />
            <p className="text-sm font-medium">{t.noHistory}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {scanHistory.slice(0, 3).map((res, i) => (
              <div key={i} onClick={() => setCurrentResult(res)} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 active:bg-slate-50 transition-colors cursor-pointer">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                   <Package size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-sm">{res.productName}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">{res.scanDate}</p>
                </div>
                <Badge status={res.status} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-slate-900 rounded-3xl p-6 text-white flex justify-between items-center shadow-lg shadow-slate-200">
        <div className="flex flex-col gap-1">
          <h3 className="font-bold">Daily Safety Quiz</h3>
          <p className="text-xs text-slate-400 mt-1">Earn badges for your health knowledge.</p>
        </div>
        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center font-black italic text-lg shadow-lg shadow-emerald-900/20">IQ</div>
      </section>
    </div>
  );

  const renderResult = (res: ScanResult) => {
    if (res.isInvalid) {
      return (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto pb-32 h-screen flex flex-col items-center justify-center p-6">
          <div className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 mb-6 drop-shadow-sm">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4 text-center">{t.invalidImage}</h2>
          <p className="text-slate-600 text-center mb-8 max-w-sm">{res.invalidReason || t.invalidReason}</p>
          <button 
            onClick={() => setCurrentResult(null)}
            className="w-full max-w-sm bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform uppercase tracking-widest text-xs"
          >
            <ArrowLeft size={16} /> {t.goBack}
          </button>
        </div>
      );
    }

    const isMedicine = res.type === 'medicine';
    const statusColor = res.status === SafetyStatus.SAFE ? 'emerald' : res.status === SafetyStatus.UNSAFE ? 'rose' : 'amber';
    
    // Check if any ingredients match allergies or profile (this is basic logic, AI already does it, but we display it)
    const allergyConflicts = userProfile.allergies.filter(a => 
      res.ingredients.some(i => i.name.toLowerCase().includes(a.toLowerCase())) || 
      res.summary.toLowerCase().includes(a.toLowerCase())
    );

    return (
      <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto pb-32 h-screen">
        {/* Modern Header Background */}
        <div className={`relative h-72 bg-${statusColor}-600 overflow-hidden`}>
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full -mr-20 -mt-20 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-10 -mb-10 blur-2xl" />
          </div>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white pb-12">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-4 border border-white/30"
            >
              {isMedicine ? <Pill size={48} className="text-white" /> : <Utensils size={48} className="text-white" />}
            </motion.div>
            <motion.h2 
              initial={{ y: 10, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-black text-center leading-tight drop-shadow-sm"
            >
              {res.productName}
            </motion.h2>
            <motion.div 
              initial={{ y: 10, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mt-2 bg-black/10 px-3 py-1 rounded-full backdrop-blur-sm"
            >
              <Package size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">{isMedicine ? t.medicineWarning : t.foodAnalysis}</span>
            </motion.div>
          </div>

          <button onClick={() => setCurrentResult(null)} className="absolute top-6 left-6 w-10 h-10 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-full flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <button onClick={() => shareReport(res)} className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-full flex items-center justify-center active:scale-90 transition-transform">
            <Share2 size={20} />
          </button>
        </div>

        <div className="px-5 -mt-10 relative z-20">
          {/* Safety Score Card */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 border border-slate-100 mb-6"
          >
            <div className="flex justify-between items-center mb-8">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t.safetyIndex}</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-5xl font-black ${res.status === SafetyStatus.SAFE ? 'text-emerald-600' : res.status === SafetyStatus.UNSAFE ? 'text-rose-600' : 'text-amber-600'}`}>
                    {res.safetyScore}
                  </span>
                  <span className="text-xl font-bold text-slate-300">/100</span>
                </div>
              </div>
              <Badge status={res.status} />
            </div>

            <div className="space-y-4">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-sm text-slate-700 leading-relaxed font-medium italic">
                  "{res.summary}"
                </p>
              </div>
              
              {interactionWarnings.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                  <h4 className="text-[10px] font-black text-rose-700 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} /> {t.criticalInteractions}
                  </h4>
                  <ul className="space-y-1">
                    {interactionWarnings.map((w, i) => (
                      <li key={i} className="text-xs text-rose-900 font-bold leading-tight">• {w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>

          <div className="space-y-8 pb-8">
            {/* Health Profile Compatibility */}
            <section>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 px-2">{t.personalCompatibility}</h3>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                      <User size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{t.healthProfileMatch}</span>
                  </div>
                  <span className="text-xs font-black text-emerald-600 uppercase">Personalized</span>
                </div>
                
                {allergyConflicts.length > 0 ? (
                  <div className="flex items-start gap-3 bg-rose-50 p-3 rounded-xl border border-rose-100">
                    <AlertTriangle size={16} className="text-rose-600 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-rose-900">{t.healthMatchFound || 'Allergy Concerns'}</p>
                      <p className="text-[11px] text-rose-600 mt-0.5">{t.contains} {allergyConflicts.join(", ")}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <p className="text-[11px] text-emerald-800 font-medium">{t.compatibleMatch}</p>
                  </div>
                )}

                <button 
                  onClick={() => {
                    handleSendMessage(`Based on my health profile (Age ${userProfile.age}, Allergies: ${userProfile.allergies.join(", ")}), tell me more about why this ${res.productName} is ${res.status}.`);
                    setActiveTab('chat');
                    setCurrentResult(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold active:scale-[0.98] transition-transform"
                >
                  <MessageSquare size={14} /> {t.askAiRisks}
                </button>
              </div>
            </section>

            {/* Smart Safety Note */}
            <section>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 px-2">{t.clinicalSafetyNote}</h3>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full flex items-center justify-center pl-4 pb-4">
                  <ShieldCheck size={24} className="text-emerald-600/30" />
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-medium mb-4">
                  {res.safetyNote}
                </p>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  <Clock size={12} />
                  {t.evaluatedOn} {res.scanDate}
                </div>
              </div>
            </section>

            {/* Detailed Ingredient Analytics */}
            <section>
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">{t.ingredientsAnalysis}</h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{res.ingredients.length} items</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {res.ingredients.map((ing, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleIngredientClick(ing.name)}
                    className="bg-white p-5 rounded-[2rem] border border-slate-100 flex flex-col gap-2 shadow-sm text-left active:bg-slate-50 transition-all hover:translate-x-1 group"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${ing.riskLevel === SafetyStatus.SAFE ? 'bg-emerald-500' : ing.riskLevel === SafetyStatus.UNSAFE ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        <span className="font-bold text-slate-800 text-sm group-hover:text-slate-900">{ing.name}</span>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md ${ing.riskLevel === SafetyStatus.SAFE ? 'bg-emerald-50 text-emerald-600' : ing.riskLevel === SafetyStatus.UNSAFE ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>{ing.riskLevel}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 pl-4">{ing.explanation}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* Comparison & Alternatives */}
            {res.alternatives.length > 0 && (
              <section>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 px-2">{t.recommendations}</h3>
                <div className="flex flex-col gap-4">
                  {res.alternatives.map((alt, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ x: -20, opacity: 0 }} 
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      className="bg-emerald-600 text-white rounded-[2rem] p-6 shadow-xl shadow-emerald-100 flex gap-4 overflow-hidden relative"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full flex items-center justify-center pl-8 pb-8 transform translate-x-4 -translate-y-4">
                        <CheckCircle2 size={32} />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">Alternative</span>
                        </div>
                        <h4 className="font-black text-lg truncate pr-12">{alt.name}</h4>
                        <p className="text-xs text-emerald-50 mt-1 leading-relaxed font-medium">{alt.reason}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Global Context */}
            <section className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t.expiryVerdict}</span>
                <p className="text-sm font-black text-slate-800">{res.expiryDate || t.unknown}</p>
                <div className={`mt-2 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block ${res.expiryConfidence === 'High' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {res.expiryConfidence} {t.confidence}
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t.globalBans}</span>
                <div className="flex flex-wrap gap-1">
                  {res.restrictedCountries.length > 0 ? res.restrictedCountries.map((c, i) => (
                    <span key={i} className="text-[8px] bg-rose-50 px-2 py-0.5 rounded-md text-rose-600 font-bold uppercase">{c}</span>
                  )) : (
                    <span className="text-[9px] font-bold text-emerald-600 uppercase">{t.globallySafe}</span>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
        
        {/* Persistent Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-50 flex items-center gap-4">
          <div className="flex-1 flex flex-col gap-2">
            <button 
              onClick={() => speakResult(`${res.productName}. Safety Score ${res.safetyScore} percent. ${res.summary}`)} 
              className="w-full bg-slate-900 text-white font-black py-3 rounded-xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 text-[10px] tracking-widest"
            >
              <Volume2 size={16} /> {t.playAudio}
            </button>
            <button 
              onClick={stopAudio} 
              className="w-full bg-slate-100 text-slate-800 font-bold py-2 rounded-xl shadow-sm border border-slate-200 active:scale-95 transition-transform flex items-center justify-center gap-2 text-[10px] tracking-widest"
            >
              <Square size={12} className="fill-slate-800" /> {t.stopAudio}
            </button>
          </div>
          <button 
            onClick={() => addToCabinet(res)}
            className="w-20 h-20 bg-emerald-600 text-white rounded-[2rem] shadow-2xl flex flex-col items-center justify-center active:scale-90 transition-transform shadow-emerald-200 border-4 border-white shrink-0"
          >
            <Plus size={32} />
            <span className="text-[8px] font-black uppercase tracking-tighter mt-1">CABINET</span>
          </button>
        </div>
      </div>
    );
  };


  const renderCabinet = () => {
    const items = cabinet.filter(c => c.type === activeCabinetView);
    const title = activeCabinetView === 'medicine' ? t.medicalCabinet : t.foodCabinet;
    const Icon = activeCabinetView === 'medicine' ? Pill : Utensils;
    const accentColor = activeCabinetView === 'medicine' ? 'text-blue-600' : 'text-orange-600';

    return (
      <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto pb-24 h-screen">
        <header className="fixed top-0 left-0 right-0 md:left-72 bg-white/80 backdrop-blur-md p-6 flex items-center justify-between z-10 border-b border-slate-100">
           <div className="flex items-center gap-3">
             <button onClick={() => { setActiveCabinetView(null); setCabinetWarnings([]); }} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 active:scale-95 transition-transform">
               <ArrowLeft size={20} />
             </button>
             <h2 className="text-xl font-black text-slate-800">{title}</h2>
           </div>
           <div className="flex items-center gap-2">
             {items.length >= 2 && (
               <button 
                 onClick={checkCabinetSafety}
                 disabled={isCheckingCabinet}
                 className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isCheckingCabinet ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-700 active:scale-95'}`}
               >
                 <ShieldCheck size={14} />
               </button>
             )}
             <button 
               onClick={() => setIsAddingManual(true)} 
               className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95"
             >
               <Plus size={20} />
             </button>
           </div>
        </header>

        <div className="px-6 pt-24 pb-8 flex flex-col gap-6">
          {cabinetWarnings.length > 0 && (
            <section className="bg-amber-50 border border-amber-200 p-4 rounded-3xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle size={14} /> {t.interactionAlerts}
                </h4>
                <button onClick={() => setCabinetWarnings([])} className="text-amber-400"><X size={14}/></button>
              </div>
              <div className="flex flex-col gap-1">
                {cabinetWarnings.map((int, i) => (
                  <p key={i} className="text-sm text-amber-900 font-medium leading-relaxed">{int}</p>
                ))}
              </div>
            </section>
          )}
          {items.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-4 text-slate-400">
               <Package size={64} strokeWidth={1} className="opacity-20" />
               <p className="font-bold">{t.cabinetEmpty}</p>
               <p className="text-sm max-w-xs">{language === 'en' ? 'Scan labels and click the \'+\' button to add them here.' : language === 'hi' ? 'लेबल स्कैन करें और उन्हें यहां जोड़ने के लिए \'+\' बटन पर क्लिक करें।' : 'లేబుల్‌లను స్కాన్ చేయండి మరియు వాటిని ఇక్కడ జోడించడానికి \'+\' బటన్‌ను క్లిక్ చేయండి.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {items.map((item) => (
                <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${activeCabinetView === 'medicine' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                    <Icon size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">{item.name}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Expires: {item.expiryDate}</span>
                      </div>
                      {item.calories && (
                        <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full uppercase">{item.calories}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge status={item.status} />
                    <div className="flex gap-1">
                      <button onClick={() => setEditingItem(item)} className="text-slate-400 p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => removeFromCabinet(item.id)} className="text-rose-400 p-1.5 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.status === SafetyStatus.SAFE ? 'bg-emerald-500' : item.status === SafetyStatus.UNSAFE ? 'bg-rose-500' : 'bg-amber-500'}`} />
                </div>
              ))}
            </div>
          )}

          <section className="bg-slate-900 rounded-3xl p-6 text-white">
            <h3 className="font-black text-lg mb-2">{t.expiryTracking}</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">{language === 'en' ? `True Label will automatically notify you ${reminderThreshold} days before any item in your cabinet expires.` : language === 'hi' ? `ट्रू लेबल आपके कैबिनेट में किसी भी आइटम की समाप्ति से ${reminderThreshold} दिन पहले आपको स्वचालित रूप से सूचित करेगा।` : `మీ క్యాబినెట్‌లోని ఏదైనా వస్తువు గడువు ముగియడానికి ${reminderThreshold} రోజుల ముందే ట్రూ లేబుల్ మీకు స్వయంచాలకంగా తెలియజేస్తుంది.`}</p>
            <button onClick={() => setShowReminderConfig(true)} className="mt-4 text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors">{t.configureAlerts}</button>
          </section>
        </div>

        <AnimatePresence>
          {isAddingManual && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-800">Add {activeCabinetView === 'medicine' ? 'Medicine' : 'Food'}</h3>
                  <button onClick={() => setIsAddingManual(false)} className="text-slate-400"><X size={20}/></button>
                </div>
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-slate-500 mb-2">Our AI will estimate safety and nutrition based on the product name.</p>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Product Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Paracetamol or Greek Yogurt"
                      className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      id="manual-item-name"
                      autoFocus
                    />
                  </div>
                  <button 
                    disabled={isManualLoading}
                    onClick={() => {
                      const input = document.getElementById('manual-item-name') as HTMLInputElement;
                      if (input.value) handleManualAdd(input.value);
                    }}
                    className={`w-full ${isManualLoading ? 'bg-slate-300' : 'bg-emerald-600 shadow-lg'} text-white font-bold py-4 rounded-2xl mt-4 active:scale-95 transition-transform flex items-center justify-center gap-2`}
                  >
                    {isManualLoading ? 'Analyzing...' : 'PROCEED'}
                    {isManualLoading && <RotateCcw size={16} className="animate-spin" />}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-0 bg-slate-50 z-[120] overflow-y-auto pb-24 h-screen">
              <header className="fixed top-0 left-0 right-0 md:left-72 bg-white/80 backdrop-blur-md p-6 flex items-center justify-between z-10 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowHistory(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 active:scale-95 transition-transform">
                    <ArrowLeft size={20} />
                  </button>
                  <h2 className="text-xl font-black text-slate-800">Scan History</h2>
                </div>
              </header>
              <div className="px-6 pt-24 pb-8 flex flex-col gap-4">
                <div className="flex flex-col gap-3 mb-2">
                  <div className="flex gap-2 relative overflow-x-auto pb-2 scrollbar-hide">
                    <button onClick={() => setHistoryFilterType('all')} className={`text-[10px] uppercase font-black px-4 py-2 rounded-full shrink-0 transition-colors ${historyFilterType === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>All Types</button>
                    <button onClick={() => setHistoryFilterType('medicine')} className={`text-[10px] uppercase font-black px-4 py-2 rounded-full shrink-0 transition-colors ${historyFilterType === 'medicine' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>Medicine</button>
                    <button onClick={() => setHistoryFilterType('food')} className={`text-[10px] uppercase font-black px-4 py-2 rounded-full shrink-0 transition-colors ${historyFilterType === 'food' ? 'bg-orange-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>Food</button>
                  </div>
                  <div className="flex gap-2 relative overflow-x-auto pb-2 scrollbar-hide">
                    <button onClick={() => setHistoryFilterDate('all')} className={`text-[10px] uppercase font-black px-4 py-2 rounded-full shrink-0 transition-colors ${historyFilterDate === 'all' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>Always</button>
                    <button onClick={() => setHistoryFilterDate('today')} className={`text-[10px] uppercase font-black px-4 py-2 rounded-full shrink-0 transition-colors ${historyFilterDate === 'today' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>Today</button>
                    <button onClick={() => setHistoryFilterDate('week')} className={`text-[10px] uppercase font-black px-4 py-2 rounded-full shrink-0 transition-colors ${historyFilterDate === 'week' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>This Week</button>
                    <button onClick={() => setHistoryFilterDate('month')} className={`text-[10px] uppercase font-black px-4 py-2 rounded-full shrink-0 transition-colors ${historyFilterDate === 'month' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>This Month</button>
                  </div>
                </div>

                {scanHistory.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center gap-4 text-slate-400">
                    <Package size={64} strokeWidth={1} className="opacity-20" />
                    <p className="font-bold">No history yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {scanHistory.filter(res => {
                      // Filter by type
                      if (historyFilterType !== 'all' && res.type !== historyFilterType) return false;
                      
                      // Filter by date
                      if (historyFilterDate !== 'all') {
                        const dateNum = new Date(res.scanDate).getTime();
                        const now = Date.now();
                        const diff = now - dateNum;
                        const dayMs = 24 * 60 * 60 * 1000;
                        if (historyFilterDate === 'today' && diff > dayMs) return false;
                        if (historyFilterDate === 'week' && diff > dayMs * 7) return false;
                        if (historyFilterDate === 'month' && diff > dayMs * 30) return false;
                      }
                      
                      return true;
                    }).map((res, i) => (
                      <div key={i} onClick={() => { setCurrentResult(res); setShowHistory(false); }} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 active:bg-slate-50 transition-colors cursor-pointer relative overflow-hidden">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                          {res.type === 'medicine' ? <Pill size={28} /> : res.type === 'food' ? <Utensils size={28} /> : <Package size={28} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800 truncate">{res.productName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(res.scanDate).toLocaleDateString()}</p>
                            {res.type && (
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${res.type === 'medicine' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                {res.type}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge status={res.status} />
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${res.status === SafetyStatus.SAFE ? 'bg-emerald-500' : res.status === SafetyStatus.UNSAFE ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {editingItem && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-800">{activeCabinetView === 'medicine' ? t.editMedicine : t.editItem}</h3>
                  <button onClick={() => setEditingItem(null)} className="text-slate-400"><X size={20}/></button>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">{t.name}</label>
                    <input 
                      type="text" 
                      defaultValue={editingItem.name} 
                      className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">{t.expiryDate}</label>
                    <input 
                      type="text" 
                      defaultValue={editingItem.expiryDate} 
                      placeholder="YYYY-MM-DD or N/A"
                      className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      onChange={(e) => setEditingItem({...editingItem, expiryDate: e.target.value})}
                    />
                  </div>
                  <button 
                    onClick={() => handleUpdateItem(editingItem)}
                    className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg mt-4 active:scale-95 transition-transform"
                  >
                    {t.saveChanges}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReminderConfig && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
                <h3 className="text-xl font-black text-slate-800 mb-2">Reminder Alerts</h3>
                <p className="text-sm text-slate-500 mb-6">How early should we notify you about expiring items?</p>
                <div className="flex flex-col gap-3">
                  {[7, 14, 30].map(days => (
                    <button 
                      key={days}
                      onClick={() => {
                        setReminderThreshold(days);
                        setShowReminderConfig(false);
                      }}
                      className={`p-4 rounded-2xl border font-bold text-left transition-all ${reminderThreshold === days ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {days} Days Before Expiry
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowReminderConfig(false)} className="w-full mt-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Cancel</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderChat = () => (
    <div className="flex flex-col h-screen bg-slate-50 pb-24">
      <header className="p-6 bg-white flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-800">{t.safetyAssistant || "Safety Assistant"}</h2>
          {!isOnline && (
            <div className="flex items-center gap-1.5 bg-rose-50 text-rose-600 px-3 py-1 rounded-full border border-rose-100">
              <WifiOff size={12} />
              <span className="text-[10px] font-black uppercase tracking-widest">Offline</span>
            </div>
          )}
        </div>
        <button onClick={() => setChatMessages([])} className="text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {!isOnline && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-3xl flex items-center gap-3 mb-2 shadow-sm">
            <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
              <WifiOff size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Offline Mode Active</h4>
              <p className="text-[11px] text-amber-700 leading-tight">AI responses are paused. You can still type and save messages locally.</p>
            </div>
          </div>
        )}
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600 shadow-inner">
              <MessageSquare size={40} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Ask Anything</h3>
              <p className="text-sm text-slate-500 mt-2">I know your allergies and medicines. Ask about food interactions or health tips!</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <button onClick={() => handleSendMessage("Is Metformin safe with grape-fruit?")} className="text-xs bg-white border border-slate-200 px-4 py-2 rounded-full text-slate-600 shadow-sm active:bg-slate-50">Grapefruit & Metformin?</button>
              <button onClick={() => handleSendMessage("Suggest sugar-free snacks.")} className="text-xs bg-white border border-slate-200 px-4 py-2 rounded-full text-slate-600 shadow-sm active:bg-slate-50">Sugar-free snacks</button>
            </div>
          </div>
        )}
        {chatMessages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-3xl shadow-sm border ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none border-emerald-500' : 'bg-white text-slate-800 rounded-tl-none border-slate-100'}`}>
              <p className="text-sm leading-relaxed">{m.text}</p>
              <span className={`text-[9px] mt-2 block opacity-50 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ))}
        {isAiLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-3xl rounded-tl-none shadow-sm border border-slate-100 flex gap-1">
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <input 
            type="text" 
            placeholder="Type a message..." 
            className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
          <button onClick={startVoiceSearch} className="w-10 h-10 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 active:bg-slate-100">
            <Mic size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 bg-slate-50 z-[200] overflow-y-auto p-6">
      <header className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">{t.profile}</h2>
        <button onClick={() => setShowProfile(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
          <X size={20} />
        </button>
      </header>

      <div className="flex flex-col gap-6">
        <section className="bg-white p-6 rounded-3xl shadow-sm flex flex-col gap-4 border border-slate-100">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-brand-forest text-brand-cream rounded-2xl flex items-center justify-center">
               <User size={32} />
             </div>
             <div className="flex-1">
               {isEditingProfile ? (
                 <input 
                   type="text" 
                   value={userProfile.name}
                   onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                   className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-bold text-slate-800"
                   placeholder="Enter Name"
                 />
               ) : (
                 <h3 className="font-bold text-lg">{userProfile.name || t.anonymousUser}</h3>
               )}
               <p className="text-xs text-slate-500">{userProfile.age} {t.yrs} • {t[userProfile.gender.toLowerCase()] || userProfile.gender} • {userProfile.weight}kg</p>
             </div>
          </div>

          {isEditingProfile && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.age}</label>
                  <input 
                    type="number" 
                    value={userProfile.age}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUserProfile({...userProfile, age: parseInt(val) || 0});
                      validateProfile('age', val);
                    }}
                    className={`w-full bg-slate-50 border ${errors.age ? 'border-rose-500' : 'border-slate-200'} p-3 rounded-xl font-bold text-slate-800`}
                  />
                  {errors.age && <span className="text-[9px] text-rose-500 font-bold">{errors.age}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.weight}</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={userProfile.weight}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUserProfile({...userProfile, weight: parseFloat(val) || 0});
                      validateProfile('weight', val);
                    }}
                    className={`w-full bg-slate-50 border ${errors.weight ? 'border-rose-500' : 'border-slate-200'} p-3 rounded-xl font-bold text-slate-800`}
                  />
                  {errors.weight && <span className="text-[9px] text-rose-500 font-bold">{errors.weight}</span>}
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.gender}</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Male', 'Female', 'Other'].map(g => (
                    <button 
                      key={g}
                      onClick={() => setUserProfile({...userProfile, gender: g})}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${userProfile.gender === g ? 'bg-slate-800 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                    >
                      {t[g.toLowerCase()] || g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showResetConfirm ? (
            <div className="flex flex-col gap-3 mt-2">
              <p className="text-xs text-rose-600 font-bold text-center bg-rose-50 p-3 rounded-lg border border-rose-100">
                {t.resetDialog}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="bg-slate-100 text-slate-600 text-[10px] font-black py-3 rounded-xl active:scale-95 transition-transform uppercase tracking-widest"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={resetData}
                  className="bg-rose-600 text-white text-[10px] font-black py-3 rounded-xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest"
                >
                  {t.confirmReset}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button 
                onClick={() => {
                  if (isEditingProfile) {
                    if (validateAllProfile()) {
                      setIsEditingProfile(false);
                    }
                  } else {
                    setIsEditingProfile(true);
                  }
                }}
                disabled={isEditingProfile && Object.keys(errors).length > 0}
                className={`${isEditingProfile ? 'bg-brand-olive' : 'bg-slate-900'} text-white text-[10px] font-black py-3 rounded-xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest disabled:opacity-50`}
              >
                {isEditingProfile ? t.saveDetails : t.editDetails}
              </button>
              <button 
                onClick={isEditingProfile ? () => setIsEditingProfile(false) : () => setShowResetConfirm(true)}
                className={`${isEditingProfile ? 'bg-slate-100 text-slate-600' : 'bg-rose-50 text-rose-600'} text-[10px] font-black py-3 rounded-xl border border-rose-100 active:scale-95 transition-transform uppercase tracking-widest flex items-center justify-center gap-2`}
              >
                {isEditingProfile ? t.cancel : <><RotateCcw size={12} /> {t.resetProfile}</>}
              </button>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800">{t.healthProfile}</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setLanguage(Language.ENGLISH)} 
                className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${language === Language.ENGLISH ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white text-slate-500 border-slate-200'}`}>ENG</button>
              <button 
                onClick={() => setLanguage(Language.HINDI)} 
                className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${language === Language.HINDI ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white text-slate-500 border-slate-200'}`}>HIN</button>
              <button 
                onClick={() => setLanguage(Language.TELUGU)} 
                className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${language === Language.TELUGU ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white text-slate-500 border-slate-200'}`}>TEL</button>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-6">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">{t.allergies}</label>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setUserProfile({...userProfile, allergies: ["None"]})}
                  className={`text-xs px-4 py-2 rounded-xl font-bold border transition-all ${userProfile.allergies.includes("None") ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
                >
                  {language === 'en' ? 'None' : language === 'hi' ? 'कोई नहीं' : 'ఏమీ లేదు'}
                </button>
                {userProfile.allergies.filter(a => a !== "None").map((a, i) => (
                  <span key={i} className="text-xs bg-rose-50 text-rose-600 px-4 py-2 rounded-xl font-bold border border-rose-100 flex items-center gap-2">
                    {a}
                    <button onClick={() => setUserProfile({...userProfile, allergies: userProfile.allergies.filter(x => x !== a)})}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input 
                  type="text" 
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-400 transition-colors"
                  placeholder={t.addAllergy}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newAllergy) {
                      setUserProfile({...userProfile, allergies: [...userProfile.allergies.filter(x => x !== "None"), newAllergy]});
                      setNewAllergy('');
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (newAllergy) {
                      setUserProfile({...userProfile, allergies: [...userProfile.allergies.filter(x => x !== "None"), newAllergy]});
                      setNewAllergy('');
                    }
                  }}
                  className="bg-emerald-600 text-white px-4 rounded-xl active:scale-95 transition-transform shadow-md flex items-center justify-center"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">{t.currentMeds}</label>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setUserProfile({...userProfile, medications: ["None"]})}
                  className={`text-xs px-4 py-2 rounded-xl font-bold border transition-all ${userProfile.medications.includes("None") ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
                >
                  {language === 'en' ? 'None' : language === 'hi' ? 'कोई नहीं' : 'ఏమీ లేదు'}
                </button>
                {userProfile.medications.filter(m => m !== "None").map((m, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold border border-blue-100 flex items-center gap-2">
                    {m}
                    <button onClick={() => setUserProfile({...userProfile, medications: userProfile.medications.filter(x => x !== m)})}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input 
                  type="text" 
                  value={newMed}
                  onChange={(e) => setNewMed(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-400 transition-colors"
                  placeholder={t.addMedication}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newMed) {
                      setUserProfile({...userProfile, medications: [...userProfile.medications.filter(x => x !== "None"), newMed]});
                      setNewMed('');
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (newMed) {
                      setUserProfile({...userProfile, medications: [...userProfile.medications.filter(x => x !== "None"), newMed]});
                      setNewMed('');
                    }
                  }}
                  className="bg-blue-600 text-white px-4 rounded-xl active:scale-95 transition-transform shadow-md flex items-center justify-center"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">{t.chronicIllnesses}</label>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setUserProfile({...userProfile, chronicIllnesses: ["None"]})}
                  className={`text-xs px-4 py-2 rounded-xl font-bold border transition-all ${userProfile.chronicIllnesses.includes("None") ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
                >
                  {language === 'en' ? 'None' : language === 'hi' ? 'कोई नहीं' : 'ఏమీ లేదు'}
                </button>
                {userProfile.chronicIllnesses.filter(c => c !== "None").map((c, i) => (
                  <span key={i} className="text-xs bg-amber-50 text-amber-600 px-4 py-2 rounded-xl font-bold border border-amber-100 flex items-center gap-2">
                    {c}
                    <button onClick={() => setUserProfile({...userProfile, chronicIllnesses: userProfile.chronicIllnesses.filter(x => x !== c)})}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input 
                  type="text" 
                  value={newIllness}
                  onChange={(e) => setNewIllness(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-400 transition-colors"
                  placeholder={t.addIllness}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newIllness) {
                      setUserProfile({...userProfile, chronicIllnesses: [...userProfile.chronicIllnesses.filter(x => x !== "None"), newIllness]});
                      setNewIllness('');
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (newIllness) {
                      setUserProfile({...userProfile, chronicIllnesses: [...userProfile.chronicIllnesses.filter(x => x !== "None"), newIllness]});
                      setNewIllness('');
                    }
                  }}
                  className="bg-amber-600 text-white px-4 rounded-xl active:scale-95 transition-transform shadow-md flex items-center justify-center"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">{t.dietaryRestrictions}</label>
              <div className="flex flex-wrap gap-2">
                {userProfile.dietaryRestrictions.map((d, i) => (
                  <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold border border-indigo-100 flex items-center gap-2">
                    {d}
                    <button onClick={() => setUserProfile({...userProfile, dietaryRestrictions: userProfile.dietaryRestrictions.filter(x => x !== d)})}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input 
                  type="text" 
                  value={newDiet}
                  onChange={(e) => setNewDiet(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-400 transition-colors"
                  placeholder={t.addDiet}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newDiet) {
                      setUserProfile({...userProfile, dietaryRestrictions: [...userProfile.dietaryRestrictions, newDiet]});
                      setNewDiet('');
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (newDiet) {
                      setUserProfile({...userProfile, dietaryRestrictions: [...userProfile.dietaryRestrictions, newDiet]});
                      setNewDiet('');
                    }
                  }}
                  className="bg-indigo-600 text-white px-4 rounded-xl active:scale-95 transition-transform shadow-md flex items-center justify-center"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">{t.healthGoals}</label>
              <div className="flex flex-wrap gap-2">
                {userProfile.healthGoals.map((g, i) => (
                  <span key={i} className="text-xs bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-bold border border-emerald-100 flex items-center gap-2">
                    {g}
                    <button onClick={() => setUserProfile({...userProfile, healthGoals: userProfile.healthGoals.filter(x => x !== g)})}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input 
                  type="text" 
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-400 transition-colors"
                  placeholder={t.addGoal}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newGoal) {
                      setUserProfile({...userProfile, healthGoals: [...userProfile.healthGoals, newGoal]});
                      setNewGoal('');
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (newGoal) {
                      setUserProfile({...userProfile, healthGoals: [...userProfile.healthGoals, newGoal]});
                      setNewGoal('');
                    }
                  }}
                  className="bg-emerald-600 text-white px-4 rounded-xl active:scale-95 transition-transform shadow-md flex items-center justify-center"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Settings size={18} className="text-slate-400" />
                {t.priorityScans}
              </h3>
              
              <div className="flex flex-col gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block">{t.priorityIngredients || 'Priority Ingredient Checks'}</label>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.scanSettings.priorityIngredients.map((p, i) => (
                      <span key={i} className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-2">
                        {p}
                        <button onClick={() => {
                          const newPriorities = userProfile.scanSettings.priorityIngredients.filter(x => x !== p);
                          setUserProfile({...userProfile, scanSettings: {...userProfile.scanSettings, priorityIngredients: newPriorities}});
                        }}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <button 
                      onClick={() => {
                        if (newPriority) {
                          setUserProfile({
                            ...userProfile, 
                            scanSettings: {
                              ...userProfile.scanSettings, 
                              priorityIngredients: [...userProfile.scanSettings.priorityIngredients, newPriority]
                            }
                          });
                          setNewPriority('');
                        }
                      }}
                      className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 bg-slate-50 active:bg-white transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="mt-3">
                    <input 
                      type="text" 
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold focus:outline-none focus:border-slate-400 transition-colors"
                      placeholder={t.addPriority}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newPriority) {
                          setUserProfile({
                            ...userProfile, 
                            scanSettings: {
                              ...userProfile.scanSettings, 
                              priorityIngredients: [...userProfile.scanSettings.priorityIngredients, newPriority]
                            }
                          });
                          setNewPriority('');
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Caution Sensitivity</label>
                    <span className="text-xs font-bold text-emerald-600">{userProfile.scanSettings.cautionThreshold}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={userProfile.scanSettings.cautionThreshold}
                    onChange={(e) => setUserProfile({
                      ...userProfile, 
                      scanSettings: {
                        ...userProfile.scanSettings, 
                        cautionThreshold: parseInt(e.target.value) || 70
                      }
                    })}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Strict</span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Relaxed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-emerald-900 rounded-3xl p-6 text-white flex flex-col gap-4">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
               <ShieldCheck size={24} />
             </div>
             <h3 className="font-bold">Smart Protection</h3>
           </div>
           <p className="text-sm opacity-80 leading-relaxed font-medium">Your profile data is encrypted and used only to power safety analysis. We never share your health info.</p>
        </section>
        
        <button onClick={() => setShowProfile(false)} className="bg-white border border-slate-200 text-slate-800 font-bold py-4 rounded-2xl shadow-sm mb-12 active:scale-95 transition-transform">SAVE CHANGES</button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-100">
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-[10px] font-bold text-center py-1 z-[200]">
          {t.offlineBanner}
        </div>
      )}
      <AnimatePresence>
        {needsOnboarding && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[100] flex flex-col md:flex-row"
          >
            <div className="hidden md:flex md:w-1/2 bg-[#f8f9f5] p-12 flex-col justify-center text-slate-800 items-center border-r border-[#e0e5d5]">
              <Logo size="xl" />
              <p className="text-xl opacity-80 leading-relaxed max-w-md mt-12 text-center text-[#527027]">Join thousands of people using AI to scan, track, and optimize their health one label at a time.</p>
            </div>
            <div className="flex-1 p-8 md:p-24 flex flex-col justify-center">
              <div className="max-w-md mx-auto w-full">
                <div className="md:hidden flex justify-center mb-8">
                  <Logo size="md" showText={true} />
                </div>
                <div className="flex gap-2 mb-12">
                   {onboardingSteps.map((_, i) => (
                     <div key={i} className={`h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden`}>
                        <div className={`h-full bg-emerald-500 transition-all duration-500 ${onboardingStep >= i ? 'w-full' : 'w-0'}`} />
                     </div>
                   ))}
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">{onboardingSteps[onboardingStep].title}</h2>
                <p className="text-slate-500 mb-10">{onboardingSteps[onboardingStep].subtitle}</p>
                
                {onboardingSteps[onboardingStep].content}

                <div className="mt-12 flex gap-4">
                  {onboardingStep > 0 && (
                    <button 
                      onClick={() => setOnboardingStep(prev => prev - 1)}
                      className="px-8 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold transition-transform active:scale-95"
                    >
                      {t.back}
                    </button>
                  )}
                  <button 
                    onClick={onboardingStep < onboardingSteps.length - 1 ? handleOnboardingNext : finishOnboarding}
                    className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-100 active:scale-95 transition-transform"
                  >
                    {onboardingStep === onboardingSteps.length - 1 ? t.startScanning : t.continue}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto min-h-screen flex flex-col md:flex-row relative">
        {/* Desktop Sidebar */}
        <nav className="hidden md:flex w-72 flex-col bg-white border-r border-slate-100 p-8 fixed h-screen z-50">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-brand-olive rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-olive/20 border border-brand-mint/30">
               <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight text-brand-forest uppercase">TRUE LABEL</h1>
              <p className="text-[8px] font-black text-brand-olive uppercase tracking-[0.2em] leading-none">Safe • Trusted • AI</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 flex-1">
             {[
               { id: 'home', icon: Home, label: t.home },
               { id: 'health', icon: Heart, label: t.healthProfile },
               { id: 'chat', icon: MessageSquare, label: t.chat },
             ].map(item => (
               <button 
                 key={item.id}
                 onClick={() => setActiveTab(item.id as any)}
                 className={`flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
               >
                 <item.icon size={22} />
                 {item.label}
               </button>
             ))}
          </div>

          <button onClick={() => setShowProfile(true)} className="flex items-center gap-4 p-4 rounded-2xl font-bold bg-brand-cream text-brand-forest border border-brand-sage shadow-sm">
             <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-brand-olive">
               <User size={20} />
             </div>
             {t.myHealth}
          </button>
        </nav>

        <div className="flex-1 md:ml-72 flex justify-center">
          <div className="w-full max-w-2xl min-h-screen relative overflow-x-hidden">
            <AnimatePresence mode="wait">
              {activeCabinetView && (
                <motion.div key="cabinet" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-0 md:left-72 z-[80]">
                  {renderCabinet()}
                </motion.div>
              )}
              {activeTab === 'home' && !activeCabinetView && (
                <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  {renderHome()}
                </motion.div>
              )}
              {activeTab === 'chat' && (
                <motion.div key="chat" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}>
                  {renderChat()}
                </motion.div>
              )}
              {activeTab === 'health' && (
                <motion.div key="health" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-6 md:p-12 pb-24">
                   <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 mb-6">
                      <div className="flex items-center gap-4 mb-8">
                         <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center shadow-inner">
                            <Heart size={32} />
                         </div>
                         <div>
                            <h2 className="text-2xl font-black text-slate-800">{t.yourHealthProfile}</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t.medicalContext}</p>
                         </div>
                      </div>

                      <div className="space-y-6">
                         <div className="flex justify-between items-center py-4 border-b border-slate-50">
                            <span className="text-xs font-black text-slate-400 uppercase">{t.age}</span>
                            <span className="font-bold text-slate-700">{userProfile.age} {language === 'en' ? 'Years' : language === 'hi' ? 'वर्ष' : 'సంవత్సరాలు'}</span>
                         </div>
                         <div className="flex justify-between items-center py-4 border-b border-slate-50">
                            <span className="text-xs font-black text-slate-400 uppercase">{t.weight}</span>
                            <span className="font-bold text-slate-700">{userProfile.weight} kg</span>
                         </div>
                         <div className="flex justify-between items-center py-4 border-b border-slate-50">
                            <span className="text-xs font-black text-slate-400 uppercase">{t.gender}</span>
                            <span className="font-bold text-slate-700">{t[userProfile.gender.toLowerCase()] || userProfile.gender}</span>
                         </div>
                         
                         <div>
                            <span className="text-xs font-black text-slate-400 uppercase block mb-3">{t.activeAllergies}</span>
                            <div className="flex flex-wrap gap-2">
                               {userProfile.allergies.map((a, i) => (
                                  <span key={i} className="text-[10px] font-black uppercase px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                                     {a}
                                  </span>
                               ))}
                            </div>
                         </div>
                      </div>

                      <button 
                        onClick={() => setShowProfile(true)}
                        className="w-full mt-10 bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 text-xs tracking-widest"
                      >
                         <Settings size={18} /> {t.manageFullProfile}
                      </button>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-lg shadow-emerald-100">
                         <ShieldCheck size={24} className="mb-4 opacity-50" />
                         <h4 className="text-sm font-black mb-1">{t.safeIngredients}</h4>
                         <p className="text-[10px] opacity-80 leading-relaxed font-bold">{language === 'en' ? 'Priority filters are active for your profile.' : language === 'hi' ? 'आपके प्रोफ़ाइल के लिए प्राथमिकता फ़िल्टर सक्रिय हैं।' : 'మీ ప్రొఫైల్ కోసం ప్రాధాన్యత ఫిల్టర్లు సక్రియంగా ఉన్నాయి.'}</p>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100">
                         <AlertTriangle size={24} className="mb-4 text-amber-500 opacity-50" />
                         <h4 className="text-sm font-black text-slate-800 mb-1">{t.warnings}</h4>
                         <p className="text-[10px] text-slate-400 leading-relaxed font-bold">{language === 'en' ? `Interactions checked with ${userProfile.medications.length} items.` : language === 'hi' ? `${userProfile.medications.length} आइटम के साथ इंटरैक्शन की जांच की गई।` : `${userProfile.medications.length} వస్తువులతో పరస్పర చర్యలు తనిఖీ చేయబడ్డాయి.`}</p>
                      </div>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {currentResult && (
            <motion.div 
              key="result" 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 md:left-72 z-[70]"
            >
              {renderResult(currentResult)}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeSafetyConcern && (
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
             >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
                >
                   <div className="absolute top-0 left-0 w-full h-2 bg-rose-500" />
                   <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                     <AlertTriangle size={36} />
                   </div>
                   <h3 className="text-2xl font-black text-slate-800 mb-4">{t.safetyConcern}</h3>
                   <p className="text-slate-600 leading-relaxed mb-8">{activeSafetyConcern}</p>
                   <button 
                    onClick={() => setActiveSafetyConcern(null)}
                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2"
                   >
                     <CheckCircle2 size={20} /> {t.iUnderstood}
                   </button>
                </motion.div>
             </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isScanning && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-white/90 backdrop-blur-md z-[150] flex flex-col items-center justify-center p-8 text-center gap-6">
              <div className="relative">
                <div className="w-32 h-32 border-4 border-emerald-100 rounded-full border-t-emerald-600 animate-spin" />
                <ShieldCheck className="absolute inset-0 m-auto text-emerald-600" size={48} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800">{t.analyzingData}</h3>
                <p className="text-slate-500 mt-2 max-w-xs mx-auto">{t.analyzingSub}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeIngredient && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-6">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
                <button onClick={() => setActiveIngredient(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
                <h3 className="text-2xl font-black text-slate-800 mb-6">{activeIngredient.name}</h3>
                
                {isIngredientLoading ? (
                  <div className="py-12 flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 animate-spin rounded-full" />
                    <p className="text-sm text-slate-500 font-medium tracking-tight">{t.deepAnalysis}</p>
                  </div>
                ) : activeIngredient.details ? (
                  <div className="flex flex-col gap-6">
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t.commonUses}</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">{activeIngredient.details.commonUses}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t.healthImplications}</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">{activeIngredient.details.healthImplications}</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                      <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-2">{t.safetyVerdict}</h4>
                      <p className="text-sm text-emerald-900 font-bold leading-relaxed">{activeIngredient.details.safetyVerdict}</p>
                    </div>
                  </div>
                ) : null}

                <button 
                  onClick={() => setActiveIngredient(null)}
                  className="w-full mt-8 bg-slate-900 text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform"
                >
                  {t.close}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-8 py-4 pb-8 flex justify-between items-center z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-emerald-600' : 'text-slate-400'}`}>
            <Home size={22} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">{t.home}</span>
          </button>
          <div className="relative -mt-12">
             <label className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 active:scale-95 transition-transform cursor-pointer border-4 border-white">
                <Camera size={28} />
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanUpload} />
             </label>
          </div>
          <button onClick={() => setActiveTab('health')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'health' ? 'text-emerald-600' : 'text-slate-400'}`}>
            <Heart size={22} strokeWidth={activeTab === 'health' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">{t.health}</span>
          </button>
          <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'chat' ? 'text-emerald-600' : 'text-slate-400'}`}>
            <MessageSquare size={22} strokeWidth={activeTab === 'chat' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">{t.chat}</span>
          </button>
        </nav>
        
        <AnimatePresence>
          {showProfile && renderProfile()}
        </AnimatePresence>
      </main>
    </div>
  );
}
