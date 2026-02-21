import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  withText?: boolean
  href?: string
}

const sizeConfig = {
  sm: { width: 24, height: 24 },
  md: { width: 32, height: 32 },
  lg: { width: 40, height: 40 },
}

export function Logo({ size = 'md', withText = false, href }: LogoProps) {
  const dimensions = sizeConfig[size]

  const logoContent = (
    <div className="flex items-center gap-2">
      <Image
        src="/icon-nobg.svg"
        alt="Terabits"
        width={dimensions.width}
        height={dimensions.height}
        priority
        className="h-auto w-auto"
      />
      {withText && <span className="font-semibold text-foreground">Terabits</span>}
    </div>
  )

  if (href) {
    return (
      <a href={href} className="flex items-center gap-2">
        {logoContent}
      </a>
    )
  }

  return logoContent
}
