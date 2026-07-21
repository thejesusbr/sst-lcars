/// <reference types="vite/client" />

declare class WarpSpeed {
  constructor(targetId: string, config?: Record<string, unknown>)
  TARGET_SPEED: number
  destroy(): void
}
