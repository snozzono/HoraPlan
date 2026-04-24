/**
 * SliderField.jsx
 * Input range estilizado con gradiente dinámico y thumb personalizado.
 *
 * Props:
 *   label   {string}   - Etiqueta visible sobre el slider
 *   min     {number}   - Valor mínimo
 *   max     {number}   - Valor máximo
 *   value   {number}   - Valor actual (controlado)
 *   onChange {function} - Callback con el nuevo valor numérico
 *   unit    {string}   - Sufijo del valor mostrado (ej: "h")
 *   th      {object}   - Tokens del tema activo (de themes.js)
 */
export default function SliderField({ label, min, max, value, onChange, unit = "", th }) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1">
        <label className={`text-xs font-mono ${th.textLabel} uppercase tracking-widest`}>
          {label}
        </label>
        <span className={`text-sm font-mono ${th.textAccentSoft} font-bold`}>
          {value}{unit}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-full h-1 appearance-none rounded-full cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-amber-400
          [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(251,191,36,0.5)]
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:border-2
          ${th.sliderThumbBorder}`}
        style={{
          background: `linear-gradient(to right, #f59e0b ${pct}%, ${th.sliderEmpty} ${pct}%)`
        }}
      />
    </div>
  );
}
