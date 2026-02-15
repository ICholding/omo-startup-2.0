import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import Icon from '../AppIcon';


const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef?.current && !dropdownRef?.current?.contains(event?.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const currentThemeOption = themeOptions?.find(opt => opt?.value === theme) || themeOptions?.[2];
  const CurrentIcon = currentThemeOption?.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
        aria-label="Toggle theme"
        title="Change theme"
      >
        <CurrentIcon className="w-4 h-4 text-foreground" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-card border border-border rounded-lg shadow-elevation-lg overflow-hidden z-50">
          {themeOptions?.map((option) => {
            const Icon = option?.icon;
            const isActive = theme === option?.value;
            
            return (
              <button
                key={option?.value}
                onClick={() => {
                  setTheme(option?.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{option?.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;