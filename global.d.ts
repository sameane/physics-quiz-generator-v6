declare function html2canvas(element: HTMLElement, options?: any): Promise<HTMLCanvasElement>;

declare namespace jspdf {
  class jsPDF {
    constructor(options?: any);
    addImage(data: string, format: string, x: number, y: number, w: number, h: number): void;
    addPage(): void;
    save(filename?: string): void;
    internal: any;
    getImageProperties(data: string): { width: number; height: number; };
  }
}

declare var jspdf: typeof jspdf;
