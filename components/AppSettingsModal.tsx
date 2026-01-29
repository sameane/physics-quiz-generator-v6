
import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const arabicFonts = [
  "Tajawal", "Cairo", "Amiri", "Almarai", "Aref Ruqaa", 
  "Changa", "El Messiri", "Harmattan", "IBM Plex Sans Arabic", 
  "Katibeh", "Lalezar", "Lateef", "Lemonada", "Mada", 
  "Markazi Text", "Mirza", "Noto Kufi Arabic", "Noto Naskh Arabic", 
  "Rakkas", "Reem Kufi", "Rubik", "Scheherazade New", "Sans-Serif"
];

const AppSettingsModal: React.FC<AppSettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  useEffect(() => {
    if (isOpen) setLocalSettings(settings);
  }, [isOpen, settings]);

  const handleChange = (key: keyof AppSettings, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-print">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up border-t-8 border-gray-700 flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span>⚙️</span> إعدادات التطبيق
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition text-2xl">×</button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Fonts & Colors Section */}
          <div className="space-y-4">
            <h4 className="font-bold text-gray-700 border-b pb-2">الخطوط والألوان</h4>
            
            {/* Title */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">خط العنوان (Title)</label>
                <select 
                  value={localSettings.titleFont} 
                  onChange={(e) => handleChange('titleFont', e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-gray-900"
                  style={{ fontFamily: localSettings.titleFont }}
                >
                  {arabicFonts.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">لون العنوان</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={localSettings.titleColor} onChange={(e) => handleChange('titleColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border bg-white" />
                  <span className="text-xs font-mono text-gray-600">{localSettings.titleColor}</span>
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">خط الأسئلة (Questions)</label>
                <select 
                  value={localSettings.questionFont} 
                  onChange={(e) => handleChange('questionFont', e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-gray-900"
                  style={{ fontFamily: localSettings.questionFont }}
                >
                  {arabicFonts.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">لون الأسئلة</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={localSettings.questionColor} onChange={(e) => handleChange('questionColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border bg-white" />
                  <span className="text-xs font-mono text-gray-600">{localSettings.questionColor}</span>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">خط الاختيارات (Options)</label>
                <select 
                  value={localSettings.optionFont} 
                  onChange={(e) => handleChange('optionFont', e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-gray-900"
                  style={{ fontFamily: localSettings.optionFont }}
                >
                  {arabicFonts.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">لون الاختيارات</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={localSettings.optionColor} onChange={(e) => handleChange('optionColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border bg-white" />
                  <span className="text-xs font-mono text-gray-600">{localSettings.optionColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* API Key Section */}
          <div className="pt-4 border-t">
            <h4 className="font-bold text-gray-700 mb-3">إعدادات الذكاء الاصطناعي</h4>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Gemini API Key (مفتاحك الخاص)</label>
              <input 
                type="text" 
                value={localSettings.apiKey || ''} 
                onChange={(e) => handleChange('apiKey', e.target.value)}
                placeholder="AIzaSy..."
                className="w-full p-2 border border-gray-300 rounded text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                اترك هذا الحقل فارغاً لاستخدام المفتاح الافتراضي (إن وجد). استخدام مفتاحك الخاص يضمن سرعة واستقرار أعلى.
              </p>
            </div>
          </div>

        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-white transition"
          >
            إلغاء
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-black transition shadow-lg"
          >
            حفظ التطبيق
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppSettingsModal;
