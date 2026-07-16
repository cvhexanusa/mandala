import { useState, useEffect, useRef } from "react";
import { ChevronDownIcon } from "../../icons";

interface Option {
  value: string | number;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string | number;
  value?: string | number;
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({
  options,
  placeholder,
  onChange,
  className = "",
  defaultValue = "",
  value,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | number>(value !== undefined ? value : defaultValue);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with value prop
  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleOptionClick = (optionValue: string | number) => {
    if (disabled) return;
    setSelectedValue(optionValue);
    onChange(String(optionValue));
    setIsOpen(false);
  };

  const selectedOption = options.find((opt) => String(opt.value) === String(selectedValue));

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`h-11 w-full flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs transition-all text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500 ${
          disabled
            ? "bg-gray-150 border-gray-200 dark:border-gray-800 dark:bg-gray-800 text-gray-400 cursor-not-allowed opacity-60"
            : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white/90 focus:border-brand-300 dark:focus:border-brand-800"
        }`}
      >
        <span className={selectedOption ? "text-gray-900 dark:text-white/90 font-medium" : "text-gray-400 dark:text-white/30"}>
          {selectedOption ? selectedOption.label : (placeholder || "-- Pilih --")}
        </span>
        <ChevronDownIcon
          className={`size-5 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Options Dropdown List */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1.5 z-[100] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg p-1.5 max-h-60 overflow-y-auto custom-scrollbar">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400 text-center">Tidak ada pilihan</div>
          ) : (
            options.map((option) => {
              const isSelected = String(option.value) === String(selectedValue);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleOptionClick(option.value)}
                  className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-brand-50/50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.01]"
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected && (
                    <span className="text-brand-500 dark:text-brand-400 font-bold">✓</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Select;
