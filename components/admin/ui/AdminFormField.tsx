"use client";
import React from "react";

interface AdminFormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function AdminFormField({ label, error, hint, required, children }: AdminFormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface AdminInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function AdminInput({ error, className = "", ...props }: AdminInputProps) {
  return (
    <input
      className={`w-full px-3 py-2 bg-slate-800 border rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-colors ${
        error
          ? "border-red-500 focus:ring-red-500/20"
          : "border-slate-700 focus:ring-indigo-500/30 focus:border-indigo-500"
      } ${className}`}
      {...props}
    />
  );
}

interface AdminTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function AdminTextarea({ error, className = "", ...props }: AdminTextareaProps) {
  return (
    <textarea
      className={`w-full px-3 py-2 bg-slate-800 border rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-colors resize-none ${
        error
          ? "border-red-500 focus:ring-red-500/20"
          : "border-slate-700 focus:ring-indigo-500/30 focus:border-indigo-500"
      } ${className}`}
      {...props}
    />
  );
}

interface AdminSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function AdminSelect({ error, options, placeholder, className = "", ...props }: AdminSelectProps) {
  return (
    <select
      className={`w-full px-3 py-2 bg-slate-800 border rounded-lg text-sm text-white focus:outline-none focus:ring-2 transition-colors ${
        error
          ? "border-red-500 focus:ring-red-500/20"
          : "border-slate-700 focus:ring-indigo-500/30 focus:border-indigo-500"
      } ${className}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
