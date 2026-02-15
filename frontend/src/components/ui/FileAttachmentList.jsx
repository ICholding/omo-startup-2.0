import React from 'react';
import { X, FileText } from 'lucide-react';
import { formatFileSize } from '../../utils/fileHelpers';

const FileAttachmentList = ({ attachedFiles, onRemoveFile }) => {
  if (!attachedFiles || attachedFiles?.length === 0) return null;

  const MAX_FILES = 5;
  const remainingSlots = MAX_FILES - attachedFiles?.length;

  return (
    <div>
      {/* File count indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: '#A0A0A0' }}>
          {attachedFiles?.length} / {MAX_FILES} files
        </span>
        {remainingSlots > 0 && (
          <span className="text-xs" style={{ color: '#A0A0A0' }}>
            {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining
          </span>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {attachedFiles?.map((file) => (
          <div
            key={file?.id}
            className="relative group flex items-center gap-2 rounded-lg px-3 py-2 max-w-xs"
            style={{ backgroundColor: '#3A3A3A' }}
          >
            {/* File icon or image preview */}
            {file?.preview ? (
              <img
                src={file?.preview}
                alt={file?.name}
                className="w-8 h-8 rounded object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
            )}

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: '#FFFFFF' }}>
                {file?.name}
              </p>
              <p className="text-xs" style={{ color: '#A0A0A0' }}>
                {formatFileSize(file?.size)}
              </p>
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={() => onRemoveFile(file?.id)}
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors hover:bg-red-500/20"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
              aria-label="Remove file"
            >
              <X className="w-3 h-3" style={{ color: '#EF4444' }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileAttachmentList;
