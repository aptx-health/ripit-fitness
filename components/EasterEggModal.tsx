'use client'

import Image from 'next/image'

type Props = {
  isOpen: boolean
  onClose: () => void
}

export function EasterEggModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-card border-2 border-primary p-8 max-w-sm w-full doom-noise doom-shadow pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Content */}
          <div className="flex flex-col items-center gap-6">
            <Image
              src="/green_four_fingered_hand_holding_handle_of_dumbbell_-sloppy__messy__blurry__noisy__highly_detailed__ultra_textured__photo__realistic_367818898.png"
              alt="Stop that"
              width={256}
              height={256}
              className="rounded"
            />
            <p className="text-2xl font-bold text-primary text-center uppercase tracking-wider">
              Stop that
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
