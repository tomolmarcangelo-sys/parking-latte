import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder = 'Search...', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div 
        className="flex items-center justify-between cursor-pointer w-full text-left bg-transparent"
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={14} className="text-text-muted flex-shrink-0 ml-1" />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 w-[240px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-72 transform origin-top-left transition-colors">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 transition-colors">
            <Search size={14} className="text-slate-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              className="w-full text-xs outline-none bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1.5 no-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option.value}
                  className={`px-3 py-2.5 text-xs flex items-center cursor-pointer rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${option.value === value ? 'bg-slate-900 dark:bg-brand-secondary text-white dark:text-slate-950 font-bold' : 'text-slate-600 dark:text-slate-400'}`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="p-4 text-xs text-slate-400 italic text-center">No segments found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
