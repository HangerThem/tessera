import { tv } from 'tailwind-variants'

const input = tv({
  slots: {
    root: 'flex flex-col',
    label: 'text-sm font-medium',
    field: [
      'w-full border-[1.5px] border-transparent rounded-[8px]',
      'bg-[var(--card-color)] text-[var(--foreground-color)]',
      'font-[var(--font-family)] text-[0.95rem]',
      'outline-none transition-[border-color] duration-150',
      'appearance-none',
    ],
  },
  variants: {
    size: {
      small:  { field: 'py-2 px-2.5' },
      medium: { field: 'py-[11px] px-3' },
      large:  { field: 'py-3.5 px-4' },
    },
    error: {
      true: { field: 'input-error' },
    },
  },
  defaultVariants: {
    size: 'medium',
  },
})

type InputProps = Omit<preact.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label?: string
  error?: string
  size?: 'small' | 'medium' | 'large'
}

export const Input = ({ label, error, size = 'medium', ...props }: InputProps) => {
  const { root, label: labelClass, field } = input({ size, error: !!error })

  return (
    <div className={root()}>
      {label && (
        <label htmlFor={props.id} className={labelClass()}>
          {label}
        </label>
      )}
      <input className={field()} {...props} />
    </div>
  )
}