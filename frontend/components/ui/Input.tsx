import { FC, InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: FC<InputProps> = ({ label, className = "", ...props }) => {
  return (
    <div className={label ? "mb-4" : ""}>
      {label ? <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label> : null}
      <input
        className={`w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 ${className}`}
        aria-label={label ?? (typeof props.placeholder === "string" ? props.placeholder : undefined)}
        {...props}
      />
    </div>
  );
};
