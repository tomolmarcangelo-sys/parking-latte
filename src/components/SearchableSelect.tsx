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
        <ChevronDown size={14} className="text-[#64748B] flex-shrink-0 ml-1" />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 w-[240px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-72 transform origin-top-left transition-colors">
          <div className="p-3 border-b border-slate-100 flex items-center gap-3 transition-colors">
            <Search size={14} className="text-[#64748B] flex-shrink-0" />
            <input
              autoFocus
              type="text"
              className="w-full text-xs outline-none bg-transparent text-[#1A1F2E] placeholder:text-slate-300 font-medium"
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
                  className={`px-3 py-2.5 text-xs flex items-center cursor-pointer rounded-xl hover:bg-slate-50 transition-all ${option.value === value ? 'bg-[#1A1F2E] text-white font-bold' : 'text-[#64748B]'}`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="p-4 text-xs text-slate-300 italic text-center font-medium">No segments found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
