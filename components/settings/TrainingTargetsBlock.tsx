import { Anchor, Bot, Dumbbell, Target, Wrench } from 'lucide-react'
import { SettingsBlock, SettingsLinkRow } from './SettingsBlock'

/** Training targets: the four sub-pages that shape suggestions. */
export default function TrainingTargetsBlock() {
  return (
    <SettingsBlock title="Training targets" icon={<Target size={16} />}>
      <SettingsLinkRow
        href="/settings/muscle-balance"
        icon={<Dumbbell size={18} />}
        label="Muscle balance"
        description="Set FAU ratios for ad-hoc exercise guidance."
      />
      <SettingsLinkRow
        href="/settings/target-movements"
        icon={<Anchor size={18} />}
        label="Target movements"
        description="Pin compound lifts to track in the picker's Anchors view."
      />
      <SettingsLinkRow
        href="/settings/equipment"
        icon={<Wrench size={18} />}
        label="Equipment"
        description="The equipment you have, for exercise suggestions."
      />
      <SettingsLinkRow
        href="/settings/agent-access"
        icon={<Bot size={18} />}
        label="Agent access"
        description="Connect your own AI agent to suggest workouts and programs."
      />
    </SettingsBlock>
  )
}
