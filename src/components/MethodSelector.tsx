import React from 'react';

interface MethodSelectorProps {
  onSelect: (method: 'gemini' | 'ocr') => void;
  isVisible: boolean;
}

const MethodSelector: React.FC<MethodSelectorProps> = ({ onSelect, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur flex items-center justify-center z-50">
      <div className="bg-gradient-to-tr from-orange-500/80 to-green-500/80 border border-gray-400/80 p-6 rounded-lg shadow-xl">
        <h2 className="text-xl font-bold mb-4">Select Processing Method</h2>
        <p className="mb-4">Choose how you would like to process your document:</p>
        <p className="text-sm font-medium my-2 mb-3 max-w-md"><span className='font-bold'>Note:</span> OCR method is not much accurate for processing files currently.</p>
        <div className="flex gap-4">
          <button
            onClick={() => onSelect('gemini')}
            className="bg-gradient-to-br from-purple-700/80 to-blue-800/40  text-white px-4 py-2 rounded-full hover:bg-blue-600"
          >
            Gemini AI
          </button>
          <button
            onClick={() => onSelect('ocr')}
            className="bg-gradient-to-br from-blue-800/40 to-lime-500/70 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            OCR
          </button>
        </div>
      </div>
    </div>
  );
};

export default MethodSelector; 