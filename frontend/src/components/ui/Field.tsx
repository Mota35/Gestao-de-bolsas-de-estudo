import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { ChevronDown, Eye, EyeOff } from 'lucide-react'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'

interface Common {
  label: string
  hint?: ReactNode
  error?: string
  className?: string
}

export const TextField = forwardRef<HTMLInputElement, Common & InputHTMLAttributes<HTMLInputElement>>(function TextField({ label, hint, error, className = '', ...rest }, ref) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className={`field ${error ? 'field-error' : ''}`}>
        <span className="field-label">{label}</span>
        <input id={id} ref={ref} className="field-control" aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined} {...rest} />
        {error ? (
          <span id={`${id}-e`} className="field-error-text" role="alert">
            {error}
          </span>
        ) : hint ? (
          <span className="field-hint">{hint}</span>
        ) : null}
      </label>
    </div>
  )
})

export const TextAreaField = forwardRef<HTMLTextAreaElement, Common & TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextAreaField(
  { label, hint, error, className = '', rows = 3, ...rest },
  ref,
) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className={`field ${error ? 'field-error' : ''}`}>
        <span className="field-label">{label}</span>
        <textarea id={id} ref={ref} rows={rows} className="field-control" aria-invalid={!!error} {...rest} />
        {error ? (
          <span className="field-error-text" role="alert">
            {error}
          </span>
        ) : hint ? (
          <span className="field-hint">{hint}</span>
        ) : null}
      </label>
    </div>
  )
})

export interface Option {
  value: string
  label: string
}

interface SelectProps extends Common {
  value: string
  onChange: (value: string) => void
  options: Array<string | Option>
  placeholder?: string
  name?: string
  disabled?: boolean
}

/**
 * Select acessível: um <select> nativo transparente por cima de um texto com seta,
 * para que a seta fique junto ao valor, como no desenho.
 */
export function SelectField({ label, hint, error, className = '', value, onChange, options, placeholder, name, disabled }: SelectProps) {
  const id = useId()
  const opts: Option[] = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const current = opts.find((o) => o.value === value)
  return (
    <div className={className}>
      <label htmlFor={id} className={`field relative ${error ? 'field-error' : ''}`}>
        <span className="field-label">{label}</span>
        <span className="field-control inline-flex items-center gap-[5px]">
          <span className={current ? '' : 'text-muted'}>{current?.label ?? placeholder ?? ''}</span>
          <ChevronDown size={9} strokeWidth={3} aria-hidden className="mt-[2px] shrink-0" />
        </span>
        <select
          id={id}
          name={name}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-invalid={!!error}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error ? (
          <span className="field-error-text" role="alert">
            {error}
          </span>
        ) : hint ? (
          <span className="field-hint">{hint}</span>
        ) : null}
      </label>
    </div>
  )
}

/** SelectField ligado ao React Hook Form. */
export function FormSelect<T extends FieldValues>({
  control,
  name,
  error,
  ...rest
}: Omit<SelectProps, 'value' | 'onChange' | 'name' | 'error'> & { control: Control<T>; name: Path<T>; error?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => <SelectField {...rest} error={error} name={field.name} value={String(field.value ?? '')} onChange={field.onChange} />}
    />
  )
}

export const CheckField = forwardRef<HTMLInputElement, { label: ReactNode; error?: string; className?: string } & InputHTMLAttributes<HTMLInputElement>>(function CheckField(
  { label, error, className = '', ...rest },
  ref,
) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="check">
        <input id={id} ref={ref} type="checkbox" {...rest} />
        <span>{label}</span>
      </label>
      {error && (
        <span className="field-error-text" role="alert">
          {error}
        </span>
      )}
    </div>
  )
})

type PasswordProps = Common &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
    /** Mostra o botão "olho" dentro do campo. Se for false, a visibilidade é controlada por `visible`. */
    eye?: boolean
    visible?: boolean
  }

/** Campo de senha. O valor nunca é guardado fora do formulário (nem em localStorage). */
export const PasswordField = forwardRef<HTMLInputElement, PasswordProps>(function PasswordField(
  { label, hint, error, className = '', eye = false, visible = false, autoComplete = 'new-password', ...rest },
  ref,
) {
  const id = useId()
  const [shown, setShown] = useState(false)
  const type = eye ? (shown ? 'text' : 'password') : visible ? 'text' : 'password'
  return (
    <div className={className}>
      <label htmlFor={id} className={`field ${error ? 'field-error' : ''}`}>
        <span className="field-label">{label}</span>
        <span className="flex items-center gap-3">
          <input
            id={id}
            ref={ref}
            type={type}
            autoComplete={autoComplete}
            className="field-control min-w-[40px] max-w-[calc(100%-28px)] [field-sizing:content]"
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-e` : undefined}
            {...rest}
          />
          {eye && (
            <button type="button" className="text-ink" aria-label={shown ? 'Esconder senha' : 'Mostrar senha'} aria-pressed={shown} onClick={() => setShown((v) => !v)}>
              {shown ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
            </button>
          )}
        </span>
        {error ? (
          <span id={`${id}-e`} className="field-error-text" role="alert">
            {error}
          </span>
        ) : hint ? (
          <span className="field-hint">{hint}</span>
        ) : null}
      </label>
    </div>
  )
})
