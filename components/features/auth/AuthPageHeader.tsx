import Image from 'next/image'

interface AuthPageHeaderProps {
  subtitle?: string
}

export function AuthPageHeader({ subtitle }: AuthPageHeaderProps) {
  return (
    <div className="flex flex-col items-center">
      <Image
        src="/frog-large-transparent-fixed.png"
        alt="Ripit Fitness mascot"
        width={160}
        height={160}
        className="w-36 h-36 sm:w-40 sm:h-40"
        priority
      />
      <Image
        src="/rf-stacked-text.png"
        alt="Ripit Fitness"
        width={200}
        height={100}
        className="mt-2 w-44 sm:w-52 h-auto"
      />
      {subtitle && (
        <p className="mt-4 text-center text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}
