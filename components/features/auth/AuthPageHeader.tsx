import Image from 'next/image'

interface AuthPageHeaderProps {
  subtitle?: string
}

export function AuthPageHeader({ subtitle }: AuthPageHeaderProps) {
  return (
    <div className="flex flex-col items-center mb-4">
      <div className="flex items-center justify-center gap-4">
        <Image
          src="/frog-large-transparent-fixed.png"
          alt="Ripit Fitness mascot"
          width={104}
          height={104}
          className="w-[104px] h-[104px]"
          priority
        />
        <Image
          src="/rf-stacked-text.png"
          alt="Ripit Fitness"
          width={286}
          height={72}
          className="h-[72px] w-auto"
        />
      </div>
      {subtitle && (
        <p className="mt-4 text-center text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}
