import { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

interface SelectFilterProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  label?: string;
  showIcon?: boolean;
}

export function SelectFilter({ value, onChange, children, label, showIcon }: SelectFilterProps) {
  return (
    <label className="selectFilter" aria-label={label}>
      {showIcon && <SlidersHorizontal size={16} aria-hidden />}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}
