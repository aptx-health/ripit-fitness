'use client'

import { useState } from 'react'
import LogCardioModal from './LogCardioModal'

export default function LogCardioButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button type="button"
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider text-sm"
      >
        LOG CARDIO
      </button>

      <LogCardioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
