import React, { useState, useRef, useEffect } from 'react';
import { Plus, ArrowUp, Pause, Image, Paperclip } from 'lucide-react';

import FileAttachmentList from './FileAttachmentList';

const MessageInput = ({ onSendMessage, disabled = false, isPaused = false, onTogglePause, isAgentWorking = false }) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const menuRef = useRef(null);

  const MAX_FILES = 5;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef?.current && !menuRef?.current?.contains(event?.target)) {
        setShowAttachmentMenu(false);
      }
    };

    if (showAttachmentMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAttachmentMenu]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef?.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const scrollHeight = textarea?.scrollHeight;
    const minHeight = 20;
    const maxHeight = 96;

    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (message?.trim() && !disabled && onSendMessage) {
      onSendMessage(message?.trim(), attachedFiles);
      setMessage('');
      setAttachedFiles([]);
      if (textareaRef?.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e?.key === 'Enter' && !e?.shiftKey) {
      e?.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e?.target?.files || []);
    const remainingSlots = MAX_FILES - attachedFiles?.length;
    if (remainingSlots <= 0) {
      alert(`Maximum ${MAX_FILES} files allowed. Please remove some files before adding more.`);
      return;
    }

    const filesToAdd = files?.slice(0, remainingSlots);

    if (files?.length > remainingSlots) {
      alert(`Only ${remainingSlots} file(s) can be added. Maximum ${MAX_FILES} files allowed.`);
    }

    const newFiles = filesToAdd?.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file?.name,
      size: file?.size,
      type: file?.type,
      file,
      preview: file?.type?.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));

    setAttachedFiles((prev) => [...prev, ...newFiles]);
    setShowAttachmentMenu(false);

    if (fileInputRef?.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e?.target?.files || []);
    const remainingSlots = MAX_FILES - attachedFiles?.length;

    if (remainingSlots <= 0) {
      alert(`Maximum ${MAX_FILES} images allowed. Please remove some files before adding more.`);
      return;
    }

    const filesToAdd = files?.slice(0, remainingSlots);

    if (files?.length > remainingSlots) {
      alert(`Only ${remainingSlots} image(s) can be added. Maximum ${MAX_FILES} files allowed.`);
    }

    const newFiles = filesToAdd?.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file?.name,
      size: file?.size,
      type: file?.type,
      file,
      preview: URL.createObjectURL(file),
    }));

    setAttachedFiles((prev) => [...prev, ...newFiles]);
    setShowAttachmentMenu(false);

    if (imageInputRef?.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (fileId) => {
    setAttachedFiles((prev) => {
      const fileToRemove = prev?.find((f) => f?.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove?.preview);
      }
      return prev?.filter((f) => f?.id !== fileId);
    });
  };

  const handleRightButtonClick = (e) => {
    e?.preventDefault();
    if (isAgentWorking && onTogglePause) {
      onTogglePause();
    } else {
      handleSubmit(e);
    }
  };

  const isButtonActive = isAgentWorking || message?.trim();
  const buttonBgColor = isButtonActive ? '#FFFFFF' : '#3A3A3A';
  const iconColor = isButtonActive ? '#000000' : '#FFFFFF';

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-transparent z-[60]">
      <div className="mx-auto max-w-5xl px-2 sm:px-4 py-1.5 sm:py-2">
        <form onSubmit={handleSubmit} className="relative">
          {showAttachmentMenu && (
            <div
              ref={menuRef}
              className="absolute bottom-full left-2 mb-2 bg-[#2C2C2C] rounded-2xl shadow-lg border border-gray-700 overflow-hidden z-20"
              style={{ minWidth: '200px' }}
            >
              <button
                type="button"
                onClick={() => imageInputRef?.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#3A3A3A] transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#3A3A3A] flex items-center justify-center">
                  <Image className="w-5 h-5 text-white" />
                </div>
                <span className="text-white text-sm font-medium">Upload Image</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef?.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#3A3A3A] transition-colors text-left border-t border-gray-700"
              >
                <div className="w-8 h-8 rounded-full bg-[#3A3A3A] flex items-center justify-center">
                  <Paperclip className="w-5 h-5 text-white" />
                </div>
                <span className="text-white text-sm font-medium">Attach File</span>
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
            aria-label="Select files to attach"
          />

          <input
            ref={imageInputRef}
            type="file"
            multiple
            onChange={handleImageSelect}
            className="hidden"
            accept="image/*"
            aria-label="Select images to attach"
          />

          <div
            className={`flex flex-col rounded-full transition-all duration-200 ${
              isFocused ? 'ring-2 ring-[#D1D1D1]' : ''
            }`}
            style={{
              backgroundColor: '#2C2C2C',
              minHeight: '52px',
            }}
          >
            {attachedFiles?.length > 0 && (
              <>
                <div className="px-3 pt-2">
                  <FileAttachmentList attachedFiles={attachedFiles} onRemoveFile={handleRemoveFile} />
                </div>
                <div className="mx-3 my-1 border-t border-white/10" />
              </>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 min-h-[52px]">
              <button
                type="button"
                onClick={() => setShowAttachmentMenu((prev) => !prev)}
                disabled={disabled}
                className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80"
                style={{ backgroundColor: 'transparent', padding: '6px' }}
                aria-label="Add attachments or options"
              >
                <Paperclip className="w-5 h-5 sm:w-5 sm:h-5 text-white/70" strokeWidth={2} />
              </button>

              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e?.target?.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Type here"
                disabled={disabled}
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/70 text-sm sm:text-base font-normal px-1 py-1 resize-none disabled:opacity-50 disabled:cursor-not-allowed overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
                style={{
                  caretColor: '#FFFFFF',
                  minHeight: '20px',
                  maxHeight: '84px',
                  lineHeight: '1.35',
                }}
              />

              <button
                type="button"
                onClick={handleRightButtonClick}
                disabled={disabled || (!isAgentWorking && !message?.trim())}
                className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ backgroundColor: buttonBgColor, padding: '6px' }}
                aria-label={isAgentWorking ? (isPaused ? 'Resume agent' : 'Pause agent') : 'Send message'}
              >
                {isAgentWorking ? (
                  <Pause className="w-5 h-5 sm:w-5 sm:h-5" strokeWidth={2.25} fill={iconColor} style={{ color: iconColor }} />
                ) : (
                  <ArrowUp className="w-5 h-5 sm:w-5 sm:h-5" strokeWidth={2.25} style={{ color: iconColor }} />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessageInput;
