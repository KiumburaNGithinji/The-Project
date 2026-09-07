/**
 * The Project's mark: three candles stepping up, in the chart-pane black and
 * the TradingView blue the rest of the theme is built from. Kept in sync with
 * src/app/icon.svg by hand — it is nine rectangles, not worth a build step.
 *
 * `animate` makes each candle print from its own base, staggered. Used by the
 * splash and the welcome flow; the header wants the static version.
 */
export default function Mark({
  className = "h-7 w-7",
  animate = false,
}: {
  className?: string;
  animate?: boolean;
}) {
  const candle = (n: 1 | 2 | 3) => (animate ? `candle candle-${n}` : undefined);

  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="The Project">
      <rect width="64" height="64" rx="14" fill="#0a0c12" />
      <rect
        x="0.5"
        y="0.5"
        width="63"
        height="63"
        rx="13.5"
        fill="none"
        stroke="#2a3142"
      />
      <g fill="#edf0f7" className={candle(1)}>
        <rect x="15.75" y="26" width="2.5" height="30" rx="1.25" />
        <rect x="12" y="34" width="10" height="16" rx="1.5" />
      </g>
      <g fill="#edf0f7" className={candle(2)}>
        <rect x="30.75" y="16" width="2.5" height="31" rx="1.25" />
        <rect x="27" y="23" width="10" height="17" rx="1.5" />
      </g>
      <g fill="#2962ff" className={candle(3)}>
        <rect x="45.75" y="7" width="2.5" height="31" rx="1.25" />
        <rect x="42" y="12" width="10" height="18" rx="1.5" />
      </g>
    </svg>
  );
}
