interface TipTapNode {
  type: string
  text?: string
  content?: TipTapNode[]
}

export function extractPlainText(value: unknown): string {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return ''
  const parts: string[] = []
  collectText(value as TipTapNode, parts)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

export function extractPlainTextFromJson(jsonStr: string): string {
  if (!jsonStr?.trim()) return ''
  try {
    const parsed = JSON.parse(jsonStr)
    return extractPlainText(parsed)
  } catch {
    return ''
  }
}

function collectText(node: TipTapNode, parts: string[]) {
  if (node.type === 'text' && typeof node.text === 'string') {
    parts.push(node.text)
    return
  }
  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      collectText(child, parts)
    }
  }
}
