/** Clawd, built from rects on a 120×90 grid so he keeps his chunky mascot look. */

export const CLAWD_PALETTE = { primary: '#D97757', shade: '#B9603F', ink: '#1F1E1D' }
const { primary, shade, ink } = CLAWD_PALETTE

export const Body = () => (
  <g>
    <rect x={18} y={18} width={84} height={50} fill={primary} />
    <rect x={18} y={60} width={84} height={8} fill={shade} />
  </g>
)

export const ArmLeft = () => <rect x={6} y={36} width={13} height={12} fill={primary} />
export const ArmRight = () => <rect x={101} y={36} width={13} height={12} fill={primary} />

export const EyeLeft = () => <rect x={40} y={30} width={8} height={14} fill={ink} />
export const EyeRight = () => <rect x={72} y={30} width={8} height={14} fill={ink} />

const leg = (x: number) => () => <rect x={x} y={62} width={8} height={18} fill={shade} />
export const Legs = [leg(26), leg(40), leg(72), leg(86)]
