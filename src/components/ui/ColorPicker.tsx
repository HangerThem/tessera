type ColorPickerProps = {
	colors?: string[]
	allowCustom?: boolean
	value: string
	onChange: (color: string) => void
}

export const PRESET_COLORS = [
	'#3b82f6',
	'#10b981',
	'#f59e0b',
	'#ef4444',
	'#8b5cf6',
	'#ec4899',
	'#06b6d4',
	'#84cc16',
]

export default function ColorPicker({ colors, allowCustom, value, onChange }: ColorPickerProps) {
	return (
		<div className="flex flex-col">
			<label className="text-sm font-medium text-foreground/70">Card colour</label>
			<div className="flex flex-wrap gap-2 mt-1">
				{(colors || PRESET_COLORS).map((c) => (
					<button
						key={c}
						type="button"
						className={`w-8 h-8 rounded-full cursor-pointer ${c === value ? 'border-2 border-foreground' : ''}`}
						style={{ backgroundColor: c }}
						aria-label={c}
						onClick={() => onChange(c)}
					/>
				))}
				<button
					type="button"
					disabled={!allowCustom}
					className={`relative w-8 h-8 rounded-full border-foreground bg-conic/decreasing from-violet-700 via-lime-300 to-violet-700 ${value && !(colors || PRESET_COLORS)?.includes(value) ? 'border-2' : ''}`}
					aria-label="Custom colour"
				>
					<input
						type="color"
						className="curosr-pointer absolute inset-0 w-full h-full opacity-0"
						tabIndex={-1}
						onInput={(e) => onChange((e.target as HTMLInputElement).value)}
					/>
				</button>
			</div>
		</div>
	)
}