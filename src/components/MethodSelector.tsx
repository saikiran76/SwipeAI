import React from 'react';

interface MethodSelectorProps {
  onSelect: (method: 'gemini' | 'ocr') => void;
  isVisible: boolean;
}

const MethodSelector: React.FC<MethodSelectorProps> = ({ onSelect, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl">
        <h2 className="text-xl font-bold mb-4">Select Processing Method</h2>
        <p className="mb-4">Choose how you would like to process your document:</p>
        <div className="flex gap-4">
          <button
            onClick={() => onSelect('gemini')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Gemini AI
          </button>
          <button
            onClick={() => onSelect('ocr')}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            OCR
          </button>
        </div>
      </div>
    </div>
  );
};

export default MethodSelector; 