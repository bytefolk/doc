import { useState, useCallback } from 'react'
import { Node } from '@tiptap/pm/model'
import { Editor } from '@tiptap/core'
import DragHandle from '@tiptap/extension-drag-handle-react'
import AddButton from './add-button'
import DragButton from './drag-button'
import TriggerAIButton from './trigger-ai-button'
import { useGetEditor } from '@/components/editor'

const CONTENT_MENU_TIPPY_OPTIONS = {
  offset: [-4, 10] as [number, number],
  zIndex: 40,
}

export default function ContentMenu() {
  const editor = useGetEditor()

  const [currentNode, setCurrentNode] = useState<Node | null>(null)
  const [currentNodePos, setCurrentNodePos] = useState<number>(-1)

  const handleNodeChange = useCallback(
    (data: { node: Node | null; editor: Editor; pos: number }) => {
      if (data.node) {
        setCurrentNode(data.node)
      }

      setCurrentNodePos(data.pos)
    },
    [setCurrentNodePos, setCurrentNode]
  )

  if (editor == null) return

  return (
    <DragHandle
      pluginKey="ContentItemMenu"
      editor={editor}
      onNodeChange={handleNodeChange}
      tippyOptions={CONTENT_MENU_TIPPY_OPTIONS}
    >
      <div
        className="flex items-center text-muted-foreground"
        style={{ pointerEvents: !editor.isEditable ? 'none' : 'auto' }}
      >
        <AddButton currentNode={currentNode} currentNodePos={currentNodePos} />
        <DragButton currentNode={currentNode} currentNodePos={currentNodePos} />
        <TriggerAIButton currentNode={currentNode} currentNodePos={currentNodePos} />
      </div>
    </DragHandle>
  )
}
