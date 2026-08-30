import Logo from './logo-component'
import ChangeTheme from './change-theme'
import ChangeLocale from './change-locale'

export default function HomeNav() {
  return (
    <nav
      aria-label="Home"
      className="fixed left-0 right-0 top-0 z-10 flex min-h-[var(--ui-topbar-height)] items-center border-b border-border bg-canvas px-4 text-foreground shadow-sm"
    >
      <div className="text-start">
        <Logo />
      </div>
      <div className="flex-1 text-end">
        <div className="inline-flex items-center">
          <ChangeLocale />
          <ChangeTheme />
        </div>
      </div>
    </nav>
  )
}
