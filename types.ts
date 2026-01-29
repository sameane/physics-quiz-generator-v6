
export interface Question {
  id: number;
  type?: 'multiple_choice' | 'text_only'; // New field to distinguish items
  text: string;
  options: string[]; // Should have exactly 4 options (ignored for text_only)
  correctAnswerIndex: number; // 0-3 (ignored for text_only)
  explanation: string;
  imageUrl?: string;
  imageWidth?: number; // New field for storing custom image width
  imageHeight?: number; // New field for storing custom image height
  svgCode?: string; // New field for AI generated diagrams
  visualDescription?: string; // New field for storing AI generated image description
  validationError?: string;
}

export interface WatermarkSettings {
  opacity: number;
  rotation: number;
  scale: number;
  // Replaced simple isRepeated with placement mode
  placement: 'center' | 'grid' | 'question'; 
  gridSize?: string; // '3x4', etc. (For Global Grid)
  questionWmarkCount?: number; // Count per question box (For Question mode)
  isOverlay: boolean;
}

// Unified Border Style for all sections
export type CommonBorderStyle = 'none' | 'simple' | 'double' | 'dashed' | 'frame' | 'modern_right' | 'modern_bottom';

export interface DesignSettings {
  // Page Settings
  pageBorder: CommonBorderStyle;
  pageBorderColor: string; 
  pageBorderWidth: number; 
  pagePadding: number; // Space between Border and Content
  pageMargin: number; // Space between Paper Edge and Border
  pageBgColor: string; 
  pageBgImage?: string; 

  // Header Settings
  headerBorder: CommonBorderStyle;
  headerBgColor: string;
  headerBorderColor: string;
  headerBorderWidth: number;
  headerPadding: number;
  headerMargin: number; // Bottom margin usually
  headerImageRight?: string;
  headerImageLeft?: string;
  headerImageRightWidth?: number;
  headerImageLeftWidth?: number;

  // Question Box Settings
  questionBorder: CommonBorderStyle;
  questionBgColor: string;
  questionBorderColor: string;
  questionBorderWidth: number;
  questionPadding: number;
  questionMargin: number; // Space between questions
  questionBorderRadius: number; 
}

export interface AppSettings {
  apiKey?: string;
  titleFont: string;
  titleColor: string;
  questionFont: string;
  questionColor: string;
  optionFont: string;
  optionColor: string;
}

export interface ExamData {
  lessonTitle: string;
  questions: Question[];
  watermark?: string;
  watermarkSettings?: WatermarkSettings;
  designSettings?: DesignSettings;
}

export interface GenerationParams {
  lessonTitle: string;
  questionCount: number;
  difficulty: number; // 1-10
  instructions?: string;
  image?: string; // Base64 string for exam context
}

// Augment window for MathJax
declare global {
  interface Window {
    MathJax: any;
    ImageKit: any;
  }
}
