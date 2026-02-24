import Image from 'next/image'

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  withText?: boolean
  href?: string
}

const sizeConfig = {
  xs: { width: 20, height: 20, className: 'h-5 w-5' },
  sm: { width: 24, height: 24, className: 'h-6 w-6' },
  md: { width: 32, height: 32, className: 'h-8 w-8' },
  lg: { width: 40, height: 40, className: 'h-10 w-10' },
}

export function Logo({ size = 'md', withText = false, href }: LogoProps) {
  const dimensions = sizeConfig[size]

  const logoContent = (
    <div className="flex items-center gap-2">
      <Image
        src="/server.png"
        alt="Terabits"
        width={dimensions.width}
        height={dimensions.height}
        priority
        className={dimensions.className}
      />
      {withText && <span className="text-sm font-semibold text-foreground">Terabits</span>}
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
