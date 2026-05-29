import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'

export function PanOverlay() {
  const reactFlow = useReactFlow()

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    let lastX = e.clientX
    let lastY = e.clientY

    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - lastX
      const dy = me.clientY - lastY
      lastX = me.clientX
      lastY = me.clientY
      const vp = reactFlow.getViewport()
      reactFlow.setViewport({ x: vp.x + dx, y: vp.y + dy, zoom: vp.zoom })
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [reactFlow])

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'move' }}
    />
  )
}
