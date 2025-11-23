import * as React from "react";

export function Select({ value, onChange, children, className }: { value?: string; onChange?: (v: string) => void; children?: React.ReactNode; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange?.(e.target.value)} className={"h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm " + (className || "")}>{children}</select>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>;
}
