"use client";

import React, { useState, useRef, useEffect, ReactElement, ReactNode } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";

interface SelectFilterProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  label?: string;
  showIcon?: boolean;
}

export function SelectFilter({ value, onChange, children, label, showIcon }: SelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const options = React.Children.toArray(children)
    .filter(React.isValidElement)
    .map((child) => {
      const element = child as ReactElement<any>;
      return {
        value: element.props.value,
        label: element.props.children,
      };
    });

  const selectedLabel = options.find((o) => o.value === value)?.label || value;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div 
      className={`selectFilter ${isOpen ? "active" : ""}`} 
      ref={containerRef} 
      aria-label={label}
    >
      {showIcon && <SlidersHorizontal size={16} aria-hidden />}
      <button
        type="button"
        className="selectButton"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedLabel}</span>
        <ChevronDown size={16} className={`chevron ${isOpen ? "up" : ""}`} />
      </button>

      {isOpen && (
        <ul className="selectMenu" role="listbox">
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`selectOption ${opt.value === value ? "selected" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
