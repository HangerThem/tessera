type ColorPickerProps = {
  colors?: Record<string, string>
  allowCustom?: boolean
  value: string
  onChange: (color: string) => void
}

export const PRESET_COLORS: Record<string, string> = {
  '#3b82f6': 'Blue',
  '#10b981': 'Green',
  '#f59e0b': 'Yellow',
  '#ef4444': 'Red',
  '#8b5cf6': 'Purple',
  '#ec4899': 'Pink',
  '#06b6d4': 'Cyan',
  '#84cc16': 'Lime',
}

export default function ColorPicker({ colors, allowCustom, value, onChange }: ColorPickerProps) {
  const colorOptions = colors || PRESET_COLORS

  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-foreground/70">Card colour</label>
      <div className="flex flex-wrap gap-2 mt-1 justify-between">
        {Object.keys(colorOptions).map((c) => (
          <button
            key={c}
            type="button"
            className={`w-8 h-8 rounded-full cursor-pointer ${c === value ? 'border-2 border-foreground' : ''}`}
            style={{ backgroundColor: c }}
            aria-label={`Select colour ${colorOptions[c]}`}
            aria-pressed={c === value}
            onClick={() => onChange(c)}
          />
        ))}
        <button
          type="button"
          disabled={!allowCustom}
          className={`relative w-8 h-8 rounded-full border-foreground bg-conic/decreasing from-violet-700 via-lime-300 to-violet-700 ${value && !(Object.keys(colorOptions)).includes(value) ? 'border-2' : ''}`}
          aria-label="Custom colour"
          aria-pressed={!!(value && !Object.keys(colorOptions).includes(value))}
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
