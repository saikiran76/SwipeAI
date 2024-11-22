declare module 'pdf-parse' {
    function pdfParse(dataBuffer: Buffer, options?: any): Promise<{ text: string }>;
    export = pdfParse;
  }