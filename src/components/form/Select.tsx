import { useState, useEffect } from "react";
import { ChevronDownIcon } from "../../icons";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
  value?: string;
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
  // Manage the selected value
  const [internalValue, setInternalValue] = useState<string>(value || defaultValue);

  // Sync with prop value
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange(newValue); // Trigger parent handler
  };

  return (
    <div className="relative">
      <select
        disabled={disabled}
        className={`h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${
          disabled ? "bg-gray-100 cursor-not-allowed opacity-60 dark:bg-gray-800 text-gray-700" : ""
        } ${
          internalValue
            ? "text-gray-900 dark:text-white/90"
            : "text-gray-500 dark:text-gray-400"
        } ${className}`}
        value={internalValue}
        onChange={handleChange}
      >
        {/* Placeholder option */}
        {placeholder && (
          <option
            value=""
            disabled
            className="text-gray-500 dark:bg-gray-900 dark:text-gray-400"
          >
            {placeholder}
          </option>
        )}
        {/* Map over options */}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="text-gray-900 dark:bg-gray-900 dark:text-white/90"
          >
            {option.label}
          </option>
        ))}
      </select>

      {!disabled && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400">
          <ChevronDownIcon className="size-5" />
        </span>
      )}
    </div>
  );
};

export default Select;
