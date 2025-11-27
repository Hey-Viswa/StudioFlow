import * as React from "react"
import { useAuth, useUser } from "@clerk/clerk-react"
import { toast } from "sonner"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { ScrollArea } from "./ui/scroll-area"
import { EmojiPicker } from "./ui/emoji-picker"
import { MentionAutocomplete, MentionChip } from "./ui/mention-autocomplete"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { 
  Reply, 
  Edit3, 
  Trash2, 
  MoreHorizontal, 
  CheckCircle, 
  RefreshCw,
  Send,
  Paperclip,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Smile
} from "lucide-react"
import { cn } from "../lib/utils"
import { format, formatDistanceToNow } from "date-fns"

const formatTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffHours = (now - date) / (1000 * 60 * 60)
  
  if (diffHours < 24) {
    return formatDistanceToNow(date, { addSuffix: true })
  }
  return format(date, 'MMM dd, yyyy \'at\' h:mm a')
}

const ReactionBar = ({ reactions = {}, currentUserId, onReact }) => {
  const reactionEntries = Object.entries(reactions).filter(([_, users]) => users.length > 0)

  if (reactionEntries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {reactionEntries.map(([emoji, users]) => {
        const hasReacted = users.includes(currentUserId)
        
        return (
          <button
            key={emoji}
            onClick={() => onReact(emoji)}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all",
              hasReacted 
                ? "bg-primary/10 border-primary text-primary" 
                : "bg-muted border-border hover:border-primary"
            )}
            aria-label={`React with ${emoji}`}
          >
            <span>{emoji}</span>
            <span className="font-medium">{users.length}</span>
          </button>
        )
      })}
    </div>
  )
}

const CommentComposer = React.forwardRef(({ 
  projectMembers = [],
  placeholder = "Write a comment...",
  onSubmit,
  onCancel,
  initialValue = "",
  autoFocus = false,
  showCancel = false,
  className,
  ...props 
}, ref) => {
  const textareaRef = React.useRef(null)
  const [text, setText] = React.useState(initialValue)
  const [mentionQuery, setMentionQuery] = React.useState("")
  const [mentionPos, setMentionPos] = React.useState({ top: 0, left: 0 })
  const [showMentions, setShowMentions] = React.useState(false)
  const [attachedFiles, setAttachedFiles] = React.useState([])

  React.useEffect(() => {
    // Save draft to localStorage
    const draftKey = `comment-draft-${Date.now()}`
    if (text.trim()) {
      localStorage.setItem(draftKey, text)
    }
  }, [text])

  const handleTextChange = (e) => {
    const value = e.target.value
    setText(value)

    // Detect @ mention
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1])
      setShowMentions(true)
      
      // Calculate position
      const textarea = textareaRef.current
      if (textarea) {
        const rect = textarea.getBoundingClientRect()
        setMentionPos({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX
        })
      }
    } else {
      setShowMentions(false)
    }
  }

  const handleMentionSelect = (member) => {
    const cursorPos = textareaRef.current.selectionStart
    const textBeforeCursor = text.slice(0, cursorPos)
    const textAfterCursor = text.slice(cursorPos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)
    
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index)
      const mentionText = `@${member.name || member.email} `
      setText(beforeMention + mentionText + textAfterCursor)
    }
    
    setShowMentions(false)
    textareaRef.current?.focus()
  }

  const handleEmojiSelect = (emoji) => {
    const cursorPos = textareaRef.current?.selectionStart || text.length
    const newText = text.slice(0, cursorPos) + emoji + text.slice(cursorPos)
    setText(newText)
    textareaRef.current?.focus()
  }

  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files || [])
    setAttachedFiles(prev => [...prev, ...files])
  }

  const handleSubmit = () => {
    if (!text.trim() && attachedFiles.length === 0) {
      toast.error("Comment cannot be empty")
      return
    }

    onSubmit?.({ text: text.trim(), files: attachedFiles })
    setText("")
    setAttachedFiles([])
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div ref={ref} className={cn("space-y-2", className)} {...props}>
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="min-h-[80px] resize-none pr-20"
          aria-label="Comment text"
        />
        
        <MentionAutocomplete
          members={projectMembers}
          query={mentionQuery}
          visible={showMentions}
          position={mentionPos}
          onSelect={handleMentionSelect}
        />
      </div>

      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachedFiles.map((file, idx) => (
            <Badge key={idx} variant="outline" className="gap-1">
              {file.name}
              <button
                onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <label>
              <Paperclip className="h-4 w-4" />
              <input
                type="file"
                multiple
                onChange={handleFileAttach}
                className="sr-only"
                aria-label="Attach files"
              />
            </label>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {showCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={handleSubmit}>
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        Press Ctrl+Enter to send • Type @ to mention
      </div>
    </div>
  )
})

CommentComposer.displayName = "CommentComposer"

const CommentItem = ({ 
  comment, 
  projectMembers = [],
  currentUserId,
  isNested = false,
  maxNestLevel = 3,
  nestLevel = 0,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onResolve,
  onRequestRevision,
  onApproveFinal,
  canModerate = false
}) => {
  const [collapsed, setCollapsed] = React.useState(false)
  const [showReplyBox, setShowReplyBox] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)

  const isOwner = comment.userId === currentUserId
  const canReply = nestLevel < maxNestLevel

  const authorInitials = comment.userName 
    ? comment.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : comment.userEmail?.[0]?.toUpperCase() || '?'

  const handleReplySubmit = (data) => {
    onReply?.(comment._id, data)
    setShowReplyBox(false)
  }

  const handleEditSubmit = (data) => {
    onEdit?.(comment._id, data)
    setIsEditing(false)
  }

  return (
    <div className={cn("group", isNested && "ml-8 mt-3")}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{comment.userName || comment.userEmail}</span>
                {comment.isResolved && (
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Resolved
                  </Badge>
                )}
                {comment.isSystemMessage && (
                  <Badge variant="secondary" className="text-xs">System</Badge>
                )}
              </div>
              <time className="text-xs text-muted-foreground" dateTime={comment.createdAt}>
                {formatTime(comment.createdAt)}
                {comment.editedAt && " (edited)"}
              </time>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canReply && (
                  <DropdownMenuItem onClick={() => setShowReplyBox(true)}>
                    <Reply className="mr-2 h-4 w-4" />
                    Reply
                  </DropdownMenuItem>
                )}
                {isOwner && (
                  <>
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(comment._id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
                {(canModerate && !comment.isResolved) && (
                  <DropdownMenuItem onClick={() => onResolve?.(comment._id)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark Resolved
                  </DropdownMenuItem>
                )}
                {onRequestRevision && (
                  <DropdownMenuItem onClick={() => onRequestRevision?.(comment._id)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Request Revision
                  </DropdownMenuItem>
                )}
                {onApproveFinal && (
                  <DropdownMenuItem onClick={() => onApproveFinal?.(comment._id)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve Final
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isEditing ? (
            <CommentComposer
              projectMembers={projectMembers}
              initialValue={comment.text}
              onSubmit={handleEditSubmit}
              onCancel={() => setIsEditing(false)}
              showCancel
              autoFocus
            />
          ) : (
            <>
              <div className="text-sm whitespace-pre-wrap break-words">
                {comment.text}
              </div>

              {comment.attachments?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {comment.attachments.map((file, idx) => (
                    <Badge key={idx} variant="outline">
                      <Paperclip className="h-3 w-3 mr-1" />
                      {file.name}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <ReactionBar 
                  reactions={comment.reactions || {}}
                  currentUserId={currentUserId}
                  onReact={(emoji) => onReact?.(comment._id, emoji)}
                />
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => onReact?.(comment._id, null)}
                  >
                    <Smile className="h-3 w-3 mr-1" />
                    React
                  </Button>
                  
                  {canReply && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setShowReplyBox(!showReplyBox)}
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {showReplyBox && (
            <div className="pt-3">
              <CommentComposer
                projectMembers={projectMembers}
                placeholder={`Reply to ${comment.userName || comment.userEmail}...`}
                onSubmit={handleReplySubmit}
                onCancel={() => setShowReplyBox(false)}
                showCancel
                autoFocus
              />
            </div>
          )}

          {comment.replies?.length > 0 && (
            <div className="space-y-1 pt-2">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {collapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
                {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </button>

              {!collapsed && (
                <div className="space-y-3">
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply._id}
                      comment={reply}
                      projectMembers={projectMembers}
                      currentUserId={currentUserId}
                      isNested
                      nestLevel={nestLevel + 1}
                      maxNestLevel={maxNestLevel}
                      onReply={onReply}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onReact={onReact}
                      onResolve={onResolve}
                      onRequestRevision={onRequestRevision}
                      onApproveFinal={onApproveFinal}
                      canModerate={canModerate}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const CommentThread = React.forwardRef(({ 
  comments = [],
  projectMembers = [],
  currentUserId,
  onAddComment,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onResolve,
  onRequestRevision,
  onApproveFinal,
  canModerate = false,
  loading = false,
  className,
  ...props 
}, ref) => {
  const scrollRef = React.useRef(null)
  const [showNewIndicator, setShowNewIndicator] = React.useState(false)

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    setShowNewIndicator(false)
  }

  React.useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      
      if (!isNearBottom) {
        setShowNewIndicator(true)
      }
    }
  }, [comments.length])

  return (
    <div ref={ref} className={cn("flex flex-col", className)} {...props}>
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments
        </h3>
        <span className="text-sm text-muted-foreground">
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </span>
      </div>

      <div className="mb-4 flex-shrink-0">
        <CommentComposer
          projectMembers={projectMembers}
          onSubmit={onAddComment}
        />
      </div>

      <div className="relative">
        <div ref={scrollRef} className="max-h-[600px] overflow-y-auto overflow-x-hidden pr-4 scroll-smooth">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">No comments yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {comments.map((comment) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  projectMembers={projectMembers}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReact={onReact}
                  onResolve={onResolve}
                  onRequestRevision={onRequestRevision}
                  onApproveFinal={onApproveFinal}
                  canModerate={canModerate}
                />
              ))}
            </div>
          )}
        </div>

        {showNewIndicator && (
          <Button
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg z-10"
            size="sm"
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            New comments
          </Button>
        )}
      </div>
    </div>
  )
})

CommentThread.displayName = "CommentThread"

export { CommentThread, CommentComposer, CommentItem, ReactionBar }
export default CommentThread
