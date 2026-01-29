
import React, { useState, useEffect } from 'react';
import { GenerationParams } from '../types';
import { useNotification } from './NotificationSystem';

interface ExamFormProps {
  onSubmit: (params: GenerationParams) => void;
  isLoading: boolean;
  onClose: () => void;
}

const ExamForm: React.FC<ExamFormProps> = ({ onSubmit, isLoading, onClose }) => {
  const [lessonTitle, setLessonTitle] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState(5);
  const [instructions, setInstructions] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const { confirm } = useNotification();

  // Paste Handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                setImage(event.target.result as string);
              }
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImage(ev.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      lessonTitle,
      questionCount,
      difficulty,
      instructions,
      image
    });
  };

  const handleClose = async () => {
    if (lessonTitle || instructions || image) {
      const ok = await confirm({
        title: 'إلغاء الإعدادات',
        message: 'هل أنت متأكد من الإلغاء؟ ستفقد كافة البيانات التي قمت بإدخالها.',
        confirmText: 'نعم، إغلاق',
        cancelText: 'تراجع',
        type: 'danger'
      });
      if (!ok) return;
    }
    onClose();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl border-t-4 border-primary relative max-h-[90vh] overflow-y-auto">
      {/* Close Button */}
      <button 
        onClick={handleClose}
        type="button"
        className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="إغلاق"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        <span>⚙️</span> إعدادات الاختبار
      </h2>

      {/* Rate Limit Warning */}
      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
        <p className="text-sm text-blue-800">
          💡 <strong>نصيحة:</strong> إذا واجهت مشكلة "تجاوز حد الطلبات"، جرّب تقليل عدد الأسئلة إلى <strong>5-8 أسئلة</strong> وانتظر دقيقة قبل المحاولة
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Lesson Title */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            عنوان الدرس / الفصل
          </label>
          <input
            type="text"
            required
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            placeholder="مثال: قانون أوم، الحث الكهرومغناطيسي"
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
          />
        </div>

        {/* Question Count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            عدد الأسئلة (توصية: 5-8 لتجنب مشاكل Rate Limit)
          </label>
          <input
            type="number"
            min={1}
            max={15}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
          />
          <p className="text-xs text-gray-500 mt-1">الحد الأقصى: 15 سؤال (الخطة المجانية)</p>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            مستوى الصعوبة (1 - 10)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={10}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="font-bold text-primary w-8 text-center">{difficulty}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">10 = مستوى أولمبياد</p>
        </div>

        {/* Image Upload/Paste */}
        <div className="col-span-1 md:col-span-2">
           <label className="block text-sm font-medium text-gray-700 mb-1">
            إرفاق صورة (اختياري)
            <span className="text-xs text-gray-500 mr-2 font-normal">- يمكنك لصق الصورة هنا مباشرة (Ctrl+V)</span>
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 text-center relative hover:bg-gray-100 transition-colors">
            {!image ? (
              <label className="cursor-pointer block w-full h-full">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <div className="flex flex-col items-center justify-center text-gray-500 gap-2">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>اضغط لرفع صورة أو قم بلصقها (Ctrl+V)</span>
                </div>
              </label>
            ) : (
              <div className="relative inline-block">
                <img src={image} alt="Preview" className="max-h-48 rounded border border-gray-200 shadow-sm" />
                <button
                  type="button"
                  onClick={() => setImage(undefined)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition"
                  title="حذف الصورة"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            تعليمات إضافية (اختياري)
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="مثال: ركز على المسائل البيانية، تجنب المسائل النظرية البحتة..."
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none h-20 resize-none bg-white"
          />
        </div>

        {/* Submit Button */}
        <div className="col-span-1 md:col-span-2">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg text-white font-bold transition-all shadow-md flex justify-center items-center gap-2
              ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-blue-900 active:transform active:scale-95'}
            `}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري توليد الأسئلة...
              </>
            ) : (
              'إنشاء الاختبار 📄'
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default ExamForm;
