import ThemePicker from '@/components/settings/ThemePicker'

export const metadata = {
  title: 'Theme',
}

/** Settings → Theme: the theme cards. The theme lives on the device, so there is nothing to load. */
export default function ThemePage() {
  return (
    <main className="bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <ThemePicker />
      </div>
    </main>
  )
}
