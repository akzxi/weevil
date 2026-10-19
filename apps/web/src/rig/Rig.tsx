import { motion } from 'motion/react'
import type { ItemDef } from '../items/types'
import { rigVariants } from './animations'
import type { PartDef, RigDef, RigMode } from './types'

interface RigProps {
  rig: RigDef
  mode: RigMode
  items: ItemDef[]
  className?: string
}

/** Renders a rig's part tree; equipped items ride inside their socket's part. */
export function Rig({ rig, mode, items, className }: RigProps) {
  const childrenOf = (parent: string | undefined) =>
    rig.parts.filter((p) => p.parent === parent).sort((a, b) => a.layer - b.layer)

  const itemsOn = (partId: string) => items.filter((item) => rig.sockets[item.socket].part === partId)

  const renderPart = (part: PartDef) => (
    <motion.g
      key={part.id}
      data-part={part.id}
      variants={rigVariants[part.role]}
      custom={part.phase ?? 0}
      style={{ transformBox: 'view-box', transformOrigin: `${part.pivot.x}px ${part.pivot.y}px` }}
    >
      <part.Art />
      {childrenOf(part.id).map(renderPart)}
      {itemsOn(part.id).map((item) => {
        const { x, y } = rig.sockets[item.socket]
        return (
          <g key={item.id} data-socket={item.socket} transform={`translate(${x} ${y})`}>
            <g data-item={item.id}>
              <item.Art />
            </g>
          </g>
        )
      })}
    </motion.g>
  )

  return (
    <motion.svg
      viewBox={`0 0 ${rig.viewBox.width} ${rig.viewBox.height}`}
      overflow="visible"
      className={className}
      animate={mode}
      aria-hidden
    >
      {childrenOf(undefined).map(renderPart)}
    </motion.svg>
  )
}
