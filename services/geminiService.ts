
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ExamData, GenerationParams, Question } from "../types";

// Dynamic API Key Handling
let dynamicApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

export const setApiKey = (key: string) => {
  dynamicApiKey = key;
};

const getAI = () => {
  if (!dynamicApiKey) {
    throw new Error("API Key is missing. Please set it in App Settings.");
  }
  return new GoogleGenAI({ apiKey: dynamicApiKey });
};

// Define question schema using Type from @google/genai
const questionSchema = {
  type: Type.OBJECT,
  properties: {
    text: {
      type: Type.STRING,
      description: "The physics problem text using LaTeX for math between \\( and \\).",
    },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "An array of exactly 4 options. Math should be in LaTeX.",
    },
    correctAnswerIndex: {
      type: Type.INTEGER,
      description: "The index (0-3) of the correct answer.",
    },
    explanation: {
      type: Type.STRING,
      description: "A brief explanation of the solution.",
    },
    svgCode: {
      type: Type.STRING,
      description: "Optional: Minimalist SVG XML code for a diagram representing the physics problem if requested. Do not include markdown code blocks.",
    },
    visualDescription: {
      type: Type.STRING,
      description: "A concise description of the visual diagram if svgCode is provided.",
    }
  },
  required: ["text", "options", "correctAnswerIndex", "explanation"],
};

// Schema for SVG only updates
const svgSchema = {
  type: Type.OBJECT,
  properties: {
    svgCode: {
      type: Type.STRING,
      description: "The complete, valid SVG XML code representing the physics diagram.",
    }
  },
  required: ["svgCode"],
};

// Define exam schema
const examSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: questionSchema,
    },
  },
  required: ["questions"],
};

// Schema for regenerating answers only
const answerKeySchema = {
  type: Type.OBJECT,
  properties: {
    answers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          correctAnswerIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
        },
        required: ["id", "correctAnswerIndex", "explanation"],
      },
    },
  },
  required: ["answers"],
};

// Using gemini-3-pro-preview for complex STEM/Math tasks as per guidelines
const modelId = "gemini-3-pro-preview";

// Helper function to handle retries for Rate Limiting (429)
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 8000): Promise<T> => {
  try {
    return await fn();
  } catch (error: unknown) {
    const e: any = error;
    
    // Check for rate limit in multiple ways
    let isRateLimit = false;
    if (e?.status === 429 || e?.code === 429) {
      isRateLimit = true;
    } else if (typeof e?.message === 'string') {
      isRateLimit = e.message.includes('429') || 
                    e.message.includes('RESOURCE_EXHAUSTED') ||
                    e.message.includes('Rate Limit') ||
                    e.message.includes('rate limit');
    }
    // Also check error object properties
    if (!isRateLimit && typeof e === 'object') {
      const errorStr = JSON.stringify(e).toLowerCase();
      isRateLimit = errorStr.includes('429') || 
                   errorStr.includes('resource_exhausted') ||
                   errorStr.includes('rate');
    }
    
    if (isRateLimit && retries > 0) {
      console.warn(`Gemini API Rate Limit hit (429). Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 1.2); // Lighter exponential backoff
    }
    throw error;
  }
};

// -----------------------
// AI response runtime types
// -----------------------

type AIQuestion = {
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  svgCode?: string;
  visualDescription?: string;
};

type AIExam = {
  questions: AIQuestion[];
};

type AIAnswer = {
  id: number;
  correctAnswerIndex: number;
  explanation: string;
};

type AISvg = {
  svgCode: string;
};

const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number';
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(i => typeof i === 'string');

const validateAIQuestion = (obj: unknown): AIQuestion => {
  if (typeof obj !== 'object' || obj === null) throw new Error('Invalid question object');
  const o: any = obj;
  if (!isString(o.text)) throw new Error('Question.text missing or not a string');
  if (!isStringArray(o.options)) throw new Error('Question.options missing or not string[]');
  if (!isNumber(o.correctAnswerIndex)) throw new Error('Question.correctAnswerIndex missing or not a number');
  return {
    text: o.text,
    options: o.options.slice(0, 4),
    correctAnswerIndex: o.correctAnswerIndex,
    explanation: isString(o.explanation) ? o.explanation : '',
    svgCode: isString(o.svgCode) ? o.svgCode : undefined,
    visualDescription: isString(o.visualDescription) ? o.visualDescription : undefined,
  };
};

const validateAIExam = (obj: unknown): AIExam => {
  if (typeof obj !== 'object' || obj === null) throw new Error('Invalid exam payload');
  const o: any = obj;
  if (!Array.isArray(o.questions)) throw new Error('Exam.questions missing or not an array');
  return { questions: o.questions.map((q: unknown, idx: number) => {
    try { return validateAIQuestion(q); } catch (e) { throw new Error(`Invalid question at index ${idx}: ${(e as Error).message}`); }
  }) };
};

const validateAIAnswerKey = (obj: unknown): AIAnswer[] => {
  if (typeof obj !== 'object' || obj === null) throw new Error('Invalid answer key payload');
  const o: any = obj;
  if (!Array.isArray(o.answers)) throw new Error('answers missing or not an array');
  return o.answers.map((a: any, idx: number) => {
    if (!isNumber(a.id)) throw new Error(`Answer[${idx}].id missing or not a number`);
    if (!isNumber(a.correctAnswerIndex)) throw new Error(`Answer[${idx}].correctAnswerIndex missing or not a number`);
    if (!isString(a.explanation)) throw new Error(`Answer[${idx}].explanation missing or not a string`);
    return { id: a.id, correctAnswerIndex: a.correctAnswerIndex, explanation: a.explanation } as AIAnswer;
  });
};

const validateAISvg = (obj: unknown): AISvg => {
  if (typeof obj !== 'object' || obj === null) throw new Error('Invalid svg payload');
  const o: any = obj;
  if (!isString(o.svgCode)) throw new Error('svgCode missing or not a string');
  return { svgCode: o.svgCode };
};


const handleGeminiError = (error: unknown, defaultMessage: string): never => {
  console.error("Gemini API Full Error:", error);
  
  let detailedMsg = "";

  const safeString = (val: unknown): string => {
    try {
      if (typeof val === 'string') return val;
      if (val instanceof Error) return val.message;
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  };

  if (error instanceof Error) {
    if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
      detailedMsg = "تم تجاوز حد الطلبات (Rate Limit). يرجى الانتظار 30-60 ثانية ثم المحاولة مرة أخرى. إذا استمرت المشكلة، تحقق من حساب Google Cloud الخاص بك.";
    } else if (error.message.includes("403") || error.message.includes("API key")) {
      detailedMsg = "خطأ في مفتاح API. تأكد من صحته في الإعدادات وأنه يحتوي على صلاحيات Google Generative AI.";
    } else if (error.message.includes("503") || error.message.includes("SERVICE_UNAVAILABLE")) {
      detailedMsg = "الخدمة مشغولة حالياً. يرجى المحاولة مرة أخرى في دقيقة.";
    } else if (error.message.includes("INVALID_ARGUMENT")) {
      detailedMsg = "خطأ في بيانات الطلب. تأكد من صحة المدخلات.";
    } else {
      detailedMsg = error.message;
    }
  } else if (typeof error === 'object' && error !== null) {
    const e: any = error;
    if (safeString(e).toLowerCase().includes('rate') || safeString(e).toLowerCase().includes('429')) {
      detailedMsg = "تم تجاوز حد الطلبات (Rate Limit). يرجى الانتظار 30-60 ثانية ثم المحاولة مرة أخرى.";
    } else {
      detailedMsg = e.message || e.error?.message || safeString(error);
    }
  } else {
    detailedMsg = String(error);
  }

  throw new Error(`${defaultMessage}: ${detailedMsg}`);
};

const extractBase64Data = (base64String: string) => {
    let base64Data = base64String;
    let mimeType = "image/jpeg"; 

    if (base64String.includes("data:image/png;base64,")) {
      mimeType = "image/png";
      base64Data = base64String.replace("data:image/png;base64,", "");
    } else if (base64String.includes("data:image/jpeg;base64,")) {
      mimeType = "image/jpeg";
      base64Data = base64String.replace("data:image/jpeg;base64,", "");
    } else if (base64String.includes("data:image/webp;base64,")) {
      mimeType = "image/webp";
      base64Data = base64String.replace("data:image/webp;base64,", "");
    } else if (base64String.includes(",")) {
       const split = base64String.split(',');
       const mimeMatch = split[0].match(/:(.*?);/);
       if (mimeMatch) mimeType = mimeMatch[1];
       base64Data = split[1];
    }
    return { mimeType, data: base64Data };
};

export const generateExam = async (params: GenerationParams): Promise<ExamData> => {
  const ai = getAI();
  const promptText = `
    أنت خبير في الفيزياء ومطور مناهج للمرحلة الثانوية المصرية.
    المطلوب إنشاء أسئلة فيزياء للموضوع: "${params.lessonTitle}".
    
    المعايير:
    1. عدد الأسئلة: ${params.questionCount}.
    2. مستوى الصعوبة: ${params.difficulty} من 10.
    3. التعليمات الإضافية: ${params.instructions || "لا يوجد"}.
    4. الصيغة الرياضية: استخدم LaTeX للمعادلات والأرقام محصورة بين علامتي \\( و \\).
    5. اللغة: اللغة العربية الفصحى العلمية.
  `;

  const parts: any[] = [{ text: promptText }];

  if (params.image) {
    parts.push({
      inlineData: extractBase64Data(params.image)
    });
  }

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: [{
        role: "user",
        parts: parts
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: examSchema,
        temperature: 0.7,
      },
    }));

    let text: string;
    if (typeof response.text === 'function') {
      text = response.text() || "{}";
    } else {
      text = response.text || "{}";
    }
    const parsed = JSON.parse(text);
    const data = validateAIExam(parsed);
    const processedQuestions: Question[] = data.questions.map((q, index) => ({
      id: index + 1,
      text: q.text || "سؤال بدون نص",
      options: q.options.length ? q.options.slice(0, 4) : ["", "", "", ""],
      correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
      explanation: q.explanation || "",
      svgCode: q.svgCode,
      visualDescription: q.visualDescription
    }));

    return {
      lessonTitle: params.lessonTitle,
      questions: processedQuestions
    };
  } catch (error) {
    throw handleGeminiError(error, "فشل في توليد الاختبار");
  }
};

export const editQuestionWithAI = async (
  currentQuestion: Question, 
  instructions: string, 
  imageBase64?: string,
  difficulty?: number,
  withShape?: boolean
): Promise<Omit<Question, 'id'>> => {
  const ai = getAI();
  let userInstructions = instructions;
  if (imageBase64 && !instructions.trim()) {
    userInstructions = "قم بتحليل الصورة المرفقة وقم بإنشاء سؤال فيزياء دقيق بناءً عليها.";
  }

  const promptText = `
    أنت خبير فيزياء. قم بتعديل أو استبدال السؤال التالي.
    السؤال الحالي: "${currentQuestion.text}"
    تعليمات التعديل: "${userInstructions}"
    ${difficulty ? `مستوى الصعوبة المطلوب: ${difficulty}/10.` : ''}
    ${withShape ? 'هام جداً: يجب توليد شكل هندسي أو مخطط فيزيائي يوضح السؤال بصيغة SVG ووضعه في حقل svgCode. كما يجب عليك ملء حقل visualDescription بوصف دقيق لهذا الشكل.' : ''}
    استخدم LaTeX للمعادلات.
  `;

  const parts: any[] = [{ text: promptText }];
  if (imageBase64) parts.push({ inlineData: extractBase64Data(imageBase64) });

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: [{
        role: "user",
        parts: parts
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        temperature: 0.7,
      },
    }));

    let text: string;
    if (typeof response.text === 'function') {
      text = response.text() || "{}";
    } else {
      text = response.text || "{}";
    }
    const parsed = JSON.parse(text);
    const q = validateAIQuestion(parsed);
    return {
      text: q.text,
      options: q.options.length ? q.options.slice(0, 4) : ["", "", "", ""],
      correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
      explanation: q.explanation || "",
      svgCode: q.svgCode,
      visualDescription: q.visualDescription,
    };
  } catch (error) {
    throw handleGeminiError(error, "فشل في تعديل السؤال");
  }
};

export const modifySvgWithAI = async (currentSvg: string, instruction: string): Promise<string> => {
  const ai = getAI();
  const promptText = `
    بصفتك خبير في الرسوميات المتجهة (SVG) والفيزياء.
    لديك كود SVG الحالي لمسألة فيزياء.
    المطلوب: تعديل الـ SVG بناءً على التعليمات التالية: "${instruction}".
    
    القواعد:
    1. حافظ على نظافة الكود وبساطته.
    2. تأكد أن الـ SVG صالح ويعمل في المتصفح.
    3. لا تقم بتغيير أبعاد الـ viewBox بشكل جذري إلا إذا طُلب ذلك.
    4. ارجع فقط كود SVG الجديد.

    الكود الحالي:
    ${currentSvg}
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: [{
        role: "user",
        parts: [{ text: promptText }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: svgSchema,
        temperature: 0.5,
      },
    }));

    let text: string;
    if (typeof response.text === 'function') {
      text = response.text() || "{}";
    } else {
      text = response.text || "{}";
    }
    const parsed = JSON.parse(text);
    const data = validateAISvg(parsed);
    return data.svgCode;
  } catch (error) {
    throw handleGeminiError(error, "فشل في تعديل الشكل");
  }
};

export const describeVisualWithAI = async (content: string, isSvg: boolean): Promise<string> => {
  const ai = getAI();
  const promptText = `
    أنت خبير فيزياء محترف. قم بتحليل هذا الشكل (صورة أو مخطط SVG) المرفق بسؤال فيزيائي.
    قدم وصفاً "علمياً" و "مختصراً جداً" (Professional and Concise) لمحتويات الشكل باللغة العربية.
    
    القواعد:
    1. اذكر المكونات الفيزيائية الأساسية فقط (مثل: مقاومة 5 أوم، بطارية 12 فولت).
    2. اذكر العلاقات الهندسية المهمة باختصار (مثل: متصلة على التوالي، زاوية 30 درجة).
    3. تجنب الكلمات الحشو مثل "نلاحظ في الصورة" أو "يوجد لدينا". ابدأ بالوصف مباشرة.
    4. الهدف هو حفظ هذا الوصف كبيانات مرجعية للشكل.
  `;

  const parts: any[] = [{ text: promptText }];
  
  if (isSvg) {
    parts.push({ text: `كود SVG:\n${content}` });
  } else {
    parts.push({ inlineData: extractBase64Data(content) });
  }

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId, // gemini-3-pro-preview is multimodal
      contents: [{
        role: "user",
        parts: parts
      }],
      config: {
        responseMimeType: "text/plain",
        temperature: 0.3, // Lower temperature for more deterministic/concise output
      },
    }));

    let responseText: string;
    if (typeof response.text === 'function') {
      responseText = response.text()?.trim() || "لم يتم استخراج أي وصف.";
    } else {
      responseText = response.text?.trim() || "لم يتم استخراج أي وصف.";
    }
    return responseText;
  } catch (error) {
    throw handleGeminiError(error, "فشل في تحليل الشكل");
  }
};

export const extractQuestionFromImage = async (imageBase64: string): Promise<Omit<Question, 'id'>> => {
  const ai = getAI();
  const promptText = `
    قم بتحليل هذه الصورة واستخرج سؤال الفيزياء الموجود بها.
    المطلوب استخراج:
    1. نص رأس السؤال.
    2. الخيارات الأربعة (يجب أن تكون 4).
    3. مؤشر الإجابة الصحيحة (0-3).
    4. تفسير علمي دقيق للحل.
    
    مهم جداً: استخدم LaTeX لكافة المعادلات والأرقام العلمية.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: [{
        role: "user",
        parts: [
          { text: promptText },
          { inlineData: extractBase64Data(imageBase64) }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        temperature: 0.2, // Higher precision
      },
    }));

    let text: string;
    if (typeof response.text === 'function') {
      text = response.text() || "{}";
    } else {
      text = response.text || "{}";
    }
    const parsed = JSON.parse(text);
    const q = validateAIQuestion(parsed);
    return {
      text: q.text,
      options: q.options.length ? q.options.slice(0, 4) : ["", "", "", ""],
      correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
      explanation: q.explanation || "",
      svgCode: q.svgCode,
      visualDescription: q.visualDescription
    };
  } catch (error) {
    throw handleGeminiError(error, "فشل في استخراج البيانات من الصورة");
  }
};

export const regenerateAnswerKey = async (questions: Question[]): Promise<{ id: number, correctAnswerIndex: number, explanation: string }[]> => {
  const ai = getAI();
  const promptText = `
    بصفتك خبير فيزياء، قم بمراجعة قائمة الأسئلة التالية (وبعضها يحتوي على صور مرفقة).
    لكل سؤال، حدد مؤشر الإجابة الصحيحة (0-3) واكتب تفسيراً علمياً دقيقاً باللغة العربية باستخدام LaTeX.
    
    الأسئلة للمراجعة:
    ${questions.map(q => `سؤال ${q.id}: ${q.text}\nالخيارات: ${q.options.join(' | ')}`).join('\n\n')}
  `;

  const parts: any[] = [{ text: promptText }];

  questions.forEach(q => {
    if (q.imageUrl && q.imageUrl.startsWith('data:')) {
      parts.push({
        text: `صورة السؤال رقم ${q.id}:`
      });
      parts.push({
        inlineData: extractBase64Data(q.imageUrl)
      });
    }
  });

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: [{
        role: "user",
        parts: parts
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: answerKeySchema,
        temperature: 0.3,
      },
    }));;

    let text: string;
    if (typeof response.text === 'function') {
      text = response.text() || "{}";
    } else {
      text = response.text || "{}";
    }
    const parsed = JSON.parse(text);
    const answers = validateAIAnswerKey(parsed);
    return answers;
  } catch (error) {
    throw handleGeminiError(error, "فشل في إعادة توليد نموذج الإجابة");
  }
};
