
import React, { useState, useEffect } from 'react';
import { ExamData } from '../types';

interface JsonEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ExamData;
  onSave: (newData: ExamData) => void;
}

const JsonEditorModal: React.FC<JsonEditorModalProps> = ({ isOpen, onClose, data, onSave }) => {
  const [jsonContent, setJsonContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && data) {
      setJsonContent(JSON.stringify(data, null, 2));
      setError(null);
    }
  }, [isOpen, data]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      
      // Basic Validation
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error("يجب أن يحتوي الملف على مصفوفة 'questions'");
      }
      if (!parsed.lessonTitle) {
        throw new Error("يجب أن يحتوي الملف على 'lessonTitle'");
      }

      onSave(parsed as ExamData);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "كود JSON غير صالح");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border-t-8 border-gray-800 animate-scale-up">
        
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="font-mono text-blue-600 bg-blue-100 px-2 rounded">{`{ }`}</span> 
            محرر الكود المصدري (JSON)
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition text-2xl">×</button>
        </div>

        <div className="p-4 bg-yellow-50 text-yellow-800 text-sm border-b border-yellow-100 flex items-center gap-2">
          <span>⚠️</span>
          <span>تحذير: التعديل اليدوي هنا قد يسبب مشاكل إذا لم تلتزم بالبنية الصحيحة للملف. تأكد من سلامة الأقواس والفواصل.</span>
        </div>

        <div className="flex-grow relative">
          <textarea
            value={jsonContent}
            onChange={(e) => setJsonContent(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm text-gray-800 bg-gray-50 focus:bg-white resize-none outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            spellCheck={false}
            dir="ltr"
          />
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 text-sm font-bold border-t border-red-200" dir="ltr">
            Error: {error}
          </div>
        )}

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-white transition"
          >
            إلغاء
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-black transition flex items-center gap-2 shadow-lg"
          >
            <span>💾</span> حفظ التعديلات
          </button>
        </div>
      </div>
    </div>
  );
};

export default JsonEditorModal;
