import { User } from 'lucide-react'

interface IProps {
  content: string
}

export default function ChatItemUser(props: IProps) {
  const { content } = props

  return (
    <div className="my-4 mt-8 flex items-start justify-end gap-2 first:mt-2">
      <div className="ml-2 rounded-lg bg-primary-soft px-3 py-2 text-sm text-foreground">{content}</div>
      <div className="w-5">
        <User className="mt-1 h-5 w-5 text-primary" />
      </div>
    </div>
  )
}
