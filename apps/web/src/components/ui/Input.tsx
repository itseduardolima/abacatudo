import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  // Erro de campo é sempre o texto exato que a API devolveu — nunca inventado no cliente
  // (04-padroes-codigo § Formulários).
  error?: string
}

// Input Field do design system: raio card, borda 1px border (foco: border-strong, sem anel de brilho).
// Erro: borda 2px danger + ícone no campo; mensagem abaixo, danger 500 12px (DESIGN_SYSTEM § Validação).
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className = '', ...rest },
  ref,
) {
  const inputId = id ?? rest.name
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-text">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`min-h-control w-full rounded-card border bg-canvas px-4 text-base text-ink placeholder:text-muted focus:outline-none ${
            error ? 'border-2 border-danger pr-10' : 'border-border focus:border-border-strong'
          } ${className}`}
          {...rest}
        />
        {error && (
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-danger"
          >
            <circle cx="8" cy="8" r="7" fill="currentColor" />
            <rect x="7.1" y="3.5" width="1.8" height="5.5" rx="0.9" fill="var(--color-canvas)" />
            <rect x="7.1" y="10.2" width="1.8" height="1.8" rx="0.9" fill="var(--color-canvas)" />
          </svg>
        )}
      </div>
      {error && (
        <span id={errorId} className="text-xs font-medium text-danger">
          {error}
        </span>
      )}
    </div>
  )
})
