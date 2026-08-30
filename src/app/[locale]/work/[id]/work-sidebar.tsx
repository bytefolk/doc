'use client'

import { Sidebar, SidebarSection } from '@fullstack-ai-infra/ui'
import { LogOut } from 'lucide-react'
import UserSettingButton from '@/components/user-setting-button'
import SignOutButton from '@/components/sign-out-button'
import Trash from '../(dialog-pages)/trash'
import StarList from '../(dialog-pages)/star-list'
import SearchComp from '../(dialog-pages)/search'
import WorkHomeLink from '@/components/work-home-link'
import ShareList from '../(dialog-pages)/share-list'
import PubDocList from '../(dialog-pages)/pub-list'

// The shared-UI Sidebar pulls antd (module-scope createContext), which cannot be
// evaluated in Next's react-server graph. The async work layout is a server
// component, so the Sidebar is rendered behind this client boundary instead of
// being imported by the layout directly.
interface WorkSidebarProps {
  navigationLabel: string
  logoutLabel: string
  directory: React.ReactNode
}

export default function WorkSidebar({ navigationLabel, logoutLabel, directory }: WorkSidebarProps) {
  return (
    <Sidebar
      label={navigationLabel}
      className="bg-navigation text-foreground-muted"
      header={<UserSettingButton />}
      footer={
        <div className="space-y-1">
          <Trash />
          <SignOutButton className="w-full justify-start" variant="ghost" size="sm">
            <LogOut className="h-4 w-4" />
            {logoutLabel}
          </SignOutButton>
        </div>
      }
    >
      <SidebarSection>
        <WorkHomeLink />
        <SearchComp />
        <StarList />
        <ShareList />
        <PubDocList />
      </SidebarSection>
      <SidebarSection className="mt-4 border-t border-border pt-3">{directory}</SidebarSection>
    </Sidebar>
  )
}
