import React from 'react';
import { Upload } from 'lucide-react';

const DragDropOverlay = ({ isDragActive }) => {
  if (!isDragActive) return null;

  return (
    <div className="absolute inset-0 bg-accent/10 border-2 border-accent border-dashed rounded-3xl flex items-center justify-center z-10 pointer-events-none">
      <div className="text-center">
        <Upload className="w-12 h-12 text-accent mx-auto mb-2" />
        <p className="text-sm font-medium text-accent">Drop files here</p>
      </div>
    </div>
  );
};

export default DragDropOverlay;
