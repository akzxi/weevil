import { useWeevil } from '../state/store'

export function ShopButton() {
  const setShopOpen = useWeevil((s) => s.setShopOpen)
  return (
    <button
      type="button"
      onClick={() => setShopOpen(true)}
      className="mc-button flex h-10 items-center gap-2 px-3 font-pixel text-base"
    >
      {/* Pixel shop awning. */}
      <svg viewBox="0 0 8 8" className="size-4" shapeRendering="crispEdges" aria-hidden>
        <path d="M0 1h8v2H0zM1 3h6v4H1z" fill="currentColor" opacity="0.35" />
        <path d="M0 1h2v2H0zM4 1h2v2H4zM3 4h2v3H3z" fill="currentColor" />
      </svg>
      Shop
    </button>
  )
}
