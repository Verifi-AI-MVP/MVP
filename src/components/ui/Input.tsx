interface InputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
  autoComplete?: string
  name?: string
  required?: boolean
}

export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  label,
  error,
  disabled,
  className = '',
  autoComplete,
  name,
  required,
}: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-[13px] font-medium text-surface-500 dark:text-surface-400 mb-1.5 tracking-tight">
          {label}
        </label>
      )}
      <input
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        required={required}
        className={`w-full rounded-xl border bg-white/90 dark:bg-surface-900/60 px-4 py-3 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500
          focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-400
          disabled:bg-surface-50 disabled:text-surface-400 dark:disabled:bg-surface-900 dark:disabled:text-surface-500
          transition-shadow duration-200
          ${error ? 'border-red-300 dark:border-red-600' : 'border-surface-200 dark:border-surface-600'}`}
      />
      {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
    </div>
  )
}
