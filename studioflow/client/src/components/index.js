// Dashboard Components
export { ClientDashboard } from '../pages/ClientDashboard'
export { ProjectCard } from './ProjectCard'
export { FilesStrip } from './FilesStrip'
export { DashboardGraphs, RevenueChart, InvoiceStatusChart, ProjectProgressChart } from './DashboardGraphs'

// Comment System
export { CommentThread, CommentComposer, CommentItem, ReactionBar } from './CommentThread'

// UI Components
export { KpiCard } from './ui/kpi-card'
export { EmojiPicker } from './ui/emoji-picker'
export { MentionAutocomplete, MentionChip } from './ui/mention-autocomplete'

// Hooks
export { useProjects, useProjectMetrics } from '../hooks/useProjects'
export { useComments } from '../hooks/useComments'
export { useFiles } from '../hooks/useFiles'
