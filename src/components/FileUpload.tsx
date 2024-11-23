import React from 'react';

interface FileUploadZoneProps {
  onFileUpload: (file: File) => void;
  supportText: string;
  accept: string[];
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({ onFileUpload, supportText, accept }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="border-2 border-dashed p-4 rounded-lg text-center">
      <input
        type="file"
        accept={accept.join(',')}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer text-blue-600">
        Click to upload or drag and drop
      </label>
      <p className="text-sm text-gray-500 mt-2">{supportText}</p>
    </div>
  );
};

export default FileUploadZone;
