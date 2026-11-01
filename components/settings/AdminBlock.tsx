import { Shield } from 'lucide-react'
import { SettingsBlock, SettingsLinkRow } from './SettingsBlock'

/** Admin: only rendered for admins and editors (the page decides). */
export default function AdminBlock() {
  return (
    <SettingsBlock title="Admin" icon={<Shield size={16} />}>
      <SettingsLinkRow href="/admin" icon={<Shield size={18} />} label="Admin panel" />
    </SettingsBlock>
  )
}
