import { tv } from 'tailwind-variants'

const select = tv({
  slots: {
    root: 'flex flex-col gap-1',
    label: 'text-sm font-medium text-foreground/70',
    field: [
      'w-full border border-transparent rounded-md',
      'bg-foreground/5 text-foreground text-sm focus:border-foreground/50',
      'outline-none transition-colors duration-150',
      'appearance-none',
    ],
  },
  variants: {
    size: {
      small: { field: 'py-2 px-2.5' },
      medium: { field: 'p-3' },
      large: { field: 'py-3.5 px-4' },
    },
    error: {
      true: { field: 'input-error' },
    },
  },
  defaultVariants: {
    size: 'medium',
  },
})

type SelectProps = Omit<preact.InputHTMLAttributes<HTMLSelectElement>, 'size'> & {
  label?: string
  error?: string
  size?: 'small' | 'medium' | 'large'
}

export const Select = ({ label, error, size = 'medium', ...props }: SelectProps) => {
  const { root, label: labelClass, field } = select({ size, error: !!error })

  return (
    <div className={root()}>
      {label && (
        <label htmlFor={props.id} className={labelClass()}>
          {label}
        </label>
      )}
      <select className={field()} {...props} />
    </div>
  )
}