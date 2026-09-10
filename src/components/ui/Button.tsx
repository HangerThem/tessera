import { tv } from 'tailwind-variants'

const button = tv({
	base: "flex items-center justify-center gap-2 w-full rounded-md font-semibold transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
	variants: {
		variant: {
			primary: "bg-foreground text-background hover:bg-foreground/80",
			secondary: "bg-background text-foreground border border-foreground hover:bg-foreground hover:text-background",
		},
		size: {
			small: 'py-2 px-2.5',
			medium: 'p-3',
			large: 'py-3.5 px-4',
		},
	},
	defaultVariants: {
		variant: 'primary',
		size: 'medium',
	},
})

type ButtonProps = preact.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: 'primary' | 'secondary'
	size?: 'small' | 'medium' | 'large'
}

export const Button = ({ variant, size, children, ...props }: ButtonProps) => {
	return (
		<button className={button({ variant, size })} {...props}>
			{children}
		</button>
	)
}