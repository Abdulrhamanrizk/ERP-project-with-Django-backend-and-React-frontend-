import { IconLoader } from '../icons'

interface LoadingStateProps {
  text?: string
}

export default function LoadingState({ text = 'جاري التحميل...' }: LoadingStateProps) {
  return (
    <div className="loading-state">
      <IconLoader size={32} className="loading-spinner" />
      <p className="loading-text">{text}</p>
    </div>
  )
}
