'use client';

import { useEffect, useCallback } from 'react';

interface SidebarPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
  width?: string;
}

export default function SidebarPanel({ 
  isOpen, 
  onClose, 
  title, 
  subtitle,
  children, 
  side = 'left',
  width = 'max-w-md'
}: SidebarPanelProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const sideClasses = side === 'left' ? 'left-0 rounded-r-lg border-l-0' : 'right-0 rounded-l-lg border-r-0';

  return (
    <div className={`absolute top-20 ${sideClasses} bg-stone-800 border border-stone-700 p-4 shadow-xl ${width} w-full max-h-[calc(100vh-120px)] flex flex-col z-20`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-stone-100">{title}</h2>
          {subtitle && (
            <p className="text-xs text-stone-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-stone-400 transition-colors hover:bg-stone-700 hover:text-stone-200"
          aria-label="Close panel"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  );
}
