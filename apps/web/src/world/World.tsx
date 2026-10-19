import { useState } from 'react'
import { characters } from '../characters/registry'
import { useWeevil } from '../state/store'
import { Sprite } from './Sprite'
import { useWanderLoop, type SpriteRegistry } from './useWanderLoop'

export function World() {
  const [registry] = useState<SpriteRegistry>(() => new Map())
  const selectedId = useWeevil((s) => s.selectedId)
  const select = useWeevil((s) => s.select)
  useWanderLoop(registry)

  return (
    <div className="absolute inset-0" data-testid="world">
      {characters.map((c) => (
        <Sprite key={c.id} character={c} registry={registry} selected={selectedId === c.id} onSelect={select} />
      ))}
    </div>
  )
}
