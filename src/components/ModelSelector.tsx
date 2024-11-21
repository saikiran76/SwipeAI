import { useState } from 'react';

interface ModelSelectorProps {
  onModelSelect: (model: 'gemini' | 'ocr') => void;
  isRetry?: boolean;
}

const ModelSelector = ({ onModelSelect, isRetry = false }: ModelSelectorProps) => {
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'ocr'>('gemini');

  return (
    <div className="mb-4">
      <h3 className="text-lg font-medium mb-2">
        {isRetry ? 'Try processing again with:' : 'Select processing method:'}
      </h3>
      <div className="flex gap-4 justify-center">
        <button
          className={`px-4 py-2 rounded ${
            selectedModel === 'gemini' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
          onClick={() => {
            setSelectedModel('gemini');
            onModelSelect('gemini');
          }}
        >
          Gemini AI
        </button>
        <button
          className={`px-4 py-2 rounded ${
            selectedModel === 'ocr' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
          onClick={() => {
            setSelectedModel('ocr');
            onModelSelect('ocr');
          }}
        >
          OCR Processing
        </button>
      </div>
    </div>
  );
};

export default ModelSelector;