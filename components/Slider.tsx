'use client'
import React from 'react';

interface SliderProps {
  id: string;
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (newValue: number) => void;
  disabled?: boolean;
}

export function Slider({
  id,
  name,
  label,
  min,
  max,
  step,
  value,
  onChange,
  disabled = false,
}: SliderProps) {
  return (
    <div className="flex items-center space-x-2">
      <label htmlFor={id} className="whitespace-nowrap">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="flex-1"
      />
      <span className="w-12 text-right">
        {value}
        {label.toLowerCase().includes('delay') ? 's' : ''}
      </span>
    </div>
  );
}