'use client'

import { CONTENT_WIDTH } from '@/constants'
import ResumeTemplate from './templates/resume'
import ProjectHighLightTemplate from './templates/project-highlight'
import TodosTemplate from './templates/todos'

export default function DocTemplate() {
  return (
    <div
      className="absolute bottom-12 left-1/2 max-h-[calc(100vh-var(--ui-topbar-height)-8rem)] w-[calc(100%-2rem)] -translate-x-1/2 overflow-y-auto bg-background sm:w-3/4"
      style={{ maxWidth: `${CONTENT_WIDTH}px` }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <ResumeTemplate />
        <ProjectHighLightTemplate />
        <TodosTemplate />
      </div>
    </div>
  )
}
