export default function LordIcon({
  src,
  size = 52,
  trigger = "loop",
  loading = "lazy",
  stroke = "regular",
  state,
  colors = "primary:#0b1f45,secondary:#356df3",
  className = "",
}) {
  return (
    <lord-icon
      className={`lordicon ${className}`.trim()}
      src={src}
      trigger={trigger}
      loading={loading}
      stroke={stroke}
      state={state}
      colors={colors}
      aria-hidden="true"
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}
