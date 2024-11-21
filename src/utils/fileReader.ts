import * as XLSX from 'xlsx';

export const readFileContent = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      const content = e.target?.result as string;

      try {
        switch (file.type) {
          case 'application/pdf':
          case 'image/jpeg':
          case 'image/png':
          case 'image/webp':
            resolve(content); // Return base64 content
            break;
          case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          case 'application/vnd.ms-excel':
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            resolve(JSON.stringify(jsonData, null, 2));
            break;
          default:
            reject(new Error('Unsupported file type'));
        }
      } catch (error) {
        reject(new Error('Failed to parse file content'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));

    if (['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      reader.readAsDataURL(file);
    } else if (
      [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ].includes(file.type)
    ) {
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('Unsupported file type'));
    }
  });
};
