import React, { useState } from 'react';

interface FileUploadZoneProps {
  onFileUpload: (file: File) => void;
  supportText: string;
  accept: string[];
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({ onFileUpload, supportText, accept }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div
      className={`border-2 border-dashed p-8 rounded-lg text-center ${
        dragActive ? 'border-blue-600' : 'border-gray-300'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleFileDrop}
    >
      <input
        type="file"
        onChange={handleFileInput}
        accept={accept.join(',')}
        className="hidden"
        id="file-upload-zone"
      />
      <label htmlFor="file-upload-zone" className="cursor-pointer text-blue-600 hover:text-blue-800">
        Click to upload or drag and drop
      </label>
      <p className="text-sm text-gray-500 mt-2">{supportText}</p>
    </div>
  );
};

export default FileUploadZone;
