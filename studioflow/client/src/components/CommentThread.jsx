import * as React from "react"
import { useUser } from "@clerk/clerk-react"
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
import { getFilePreviewUrl } from "../lib/api/files"
import { useAuth } from "@clerk/clerk-react"

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
  const reactionEntries = Object.entries(reactions).filter(([emoji, users]) =>
    users.length > 0 && emoji !== 'null' && emoji !== 'undefined' && emoji !== null
  )

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

const getInitials = (raw = "") => {
  if (!raw) return "?"
  const cleaned = raw.replace(/[^a-zA-Z\s]/g, " ").trim()
  if (!cleaned) return "?"
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  const first = parts[0][0]
  const last = parts[parts.length - 1][0]
  return `${first}${last}`.toUpperCase()
}

const CommentComposer = React.forwardRef(({
  projectMembers = [],
  placeholder = "Write a comment...",
  onSubmit,
  onCancel,
  initialValue = "",
  autoFocus = false,
  showCancel = false,
  variant = "full",
  className,
  ...props
}, ref) => {
  const textareaRef = React.useRef(null)
  const { user } = useUser()
  const [text, setText] = React.useState(initialValue)
  const [mentionQuery, setMentionQuery] = React.useState("")
  const [mentionPos, setMentionPos] = React.useState({ top: 0, left: 0 })
  const [showMentions, setShowMentions] = React.useState(false)
  const [attachedFiles, setAttachedFiles] = React.useState([])
  const [isFocused, setIsFocused] = React.useState(false)
  const isInline = variant === "inline"
  const maxChars = 2000
  const displayName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || "You"
  const initials = getInitials(displayName)
  // Use a unique ID for draft persistence if provided, otherwise fallback to variant
  const composerId = props.id || `comment-composer-${variant}`
  const draftKey = React.useMemo(() => `comment-draft-${composerId}`, [composerId])

  React.useEffect(() => {
    if (!initialValue) {
      const savedDraft = localStorage.getItem(draftKey)
      if (savedDraft) {
        setText(savedDraft)
      }
    }
  }, [draftKey, initialValue])

  React.useEffect(() => {
    if (text.trim()) {
      localStorage.setItem(draftKey, text)
    } else {
      localStorage.removeItem(draftKey)
    }
  }, [text, draftKey])

  const handleTextChange = (e) => {
    const value = e.target.value
    setText(value)

    const cursorPos = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1])
      setShowMentions(true)
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
    localStorage.removeItem(draftKey)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      ref={ref}
      className={cn(
        "space-y-3 transition-all",
        isInline
          ? "rounded-xl border border-border/60 bg-muted/30 p-2"
          : "rounded-xl border border-border/60 bg-background/50 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80",
        className
      )}
      {...props}
    >
      <div className="flex gap-2">
        {!isInline && (
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 space-y-2">
          <div
            className={cn(
              "relative rounded-xl border bg-muted/20 transition-all focus-within:ring-1 focus-within:ring-primary/20",
              isInline && "rounded-lg",
              isFocused ? "border-primary/50 bg-background" : "border-border/50"
            )}
          >
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              autoFocus={autoFocus}
              className={cn(
                "w-full resize-none border-0 bg-transparent px-3 py-2 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70 min-h-[40px]",
                isInline && "min-h-[60px]"
              )}
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
              {attachedFiles.map((file, idx) => {
                const isImage = file.type?.startsWith('image/');
                const previewUrl = isImage ? URL.createObjectURL(file) : null;

                return (
                  <div key={idx} className="relative group">
                    {isImage ? (
                      <div className="relative">
                        <img
                          src={previewUrl}
                          alt={file.name}
                          className="h-16 w-16 object-cover rounded-md border border-border/50"
                          onLoad={() => URL.revokeObjectURL(previewUrl)}
                        />
                        <button
                          onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/90 transition-colors"
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <Badge variant="outline" className="gap-1 rounded-full border-dashed border-border/60 bg-background/50 px-3 py-1 text-xs">
                        {file.name}
                        <button
                          onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="ml-1 text-muted-foreground hover:text-destructive"
                          type="button"
                        >
                          ×
                        </button>
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-2",
              isInline ? "pt-1" : "border-t border-border/60 pt-3"
            )}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <EmojiPicker
                onEmojiSelect={handleEmojiSelect}
                className={cn(
                  "h-9 w-9",
                  isInline && "h-8 w-8"
                )}
              />
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full border border-dashed border-border/70 text-muted-foreground hover:text-foreground",
                  isInline ? "h-8 w-8" : "h-9 w-9"
                )}
                asChild
              >
                <label className="cursor-pointer">
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
              {!isInline && (
                <span className="hidden md:inline text-[11px] text-muted-foreground/80">
                  Attach screenshots or documents (max 5)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {showCancel && (
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button
                size={isInline ? "sm" : "default"}
                className="gap-2 shadow-sm"
                onClick={handleSubmit}
              >
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className={cn("text-[11px] text-muted-foreground", isInline ? "pt-1" : "px-1")}
      >
        Press Ctrl+Enter to send • Type @ to mention • Use <span className="text-primary font-medium">#high #bug #todo</span> to automate tasks
      </div>
    </div>
  )
})

CommentComposer.displayName = "CommentComposer"

const CommentItem = ({
  comment,
  projectMembers = [],
  currentUserId,
  projectId,
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
    ? getInitials(comment.userName)
    : getInitials(comment.userEmail || "")

  const handleReplySubmit = (data) => {
    onReply?.(comment._id, data)
    setShowReplyBox(false)
  }

  const handleEditSubmit = (data) => {
    onEdit?.(comment._id, data)
    setIsEditing(false)
  }

  const { getToken } = useAuth()

  const handleFileClick = async (e, file) => {
    e.preventDefault()

    if (file.url && !projectId) {
      // For optimistic files with object URLs, just open them
      if (file.isOptimistic) {
        window.open(file.url, '_blank')
        return
      }
      window.open(file.url, '_blank')
      return
    }

    // Use signed URL if available or fetch one
    if (projectId && file.fileId) {
      try {
        const token = await getToken()
        const response = await getFilePreviewUrl(projectId, file.fileId, token)
        window.open(response.previewUrl, '_blank')
      } catch (error) {
        console.error("Failed to get preview URL:", error)
        toast.error("Failed to open file")
      }
    } else if (file.url) {
      window.open(file.url, '_blank')
    } else {
      toast.error("Cannot open file: Missing URL or ID")
    }
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
              initialValue={comment.content || comment.text}
              onSubmit={handleEditSubmit}
              onCancel={() => setIsEditing(false)}
              showCancel
              autoFocus
              variant="inline"
            />
          ) : (
            <>
              <div className="text-sm whitespace-pre-wrap break-words">
                {comment.content || comment.text}
              </div>

              {comment.attachments?.length > 0 && (
                <div className="mt-2 space-y-2">
                  {/* Image Grid */}
                  {comment.attachments.filter(f => (f.mimeType || f.type)?.startsWith('image/')).length > 0 && (
                    <div className={cn(
                      "grid gap-2",
                      comment.attachments.filter(f => (f.mimeType || f.type)?.startsWith('image/')).length === 1 ? "grid-cols-1 max-w-sm" :
                        comment.attachments.filter(f => (f.mimeType || f.type)?.startsWith('image/')).length === 2 ? "grid-cols-2" :
                          "grid-cols-2 sm:grid-cols-3"
                    )}>
                      {comment.attachments.filter(f => (f.mimeType || f.type)?.startsWith('image/')).map((file, idx) => (
                        <a
                          key={`img-${idx}`}
                          href={file.url || '#'}
                          onClick={(e) => handleFileClick(e, file)}
                          className="relative aspect-square overflow-hidden rounded-lg border border-border/50 bg-muted/20 group/image cursor-pointer"
                        >
                          <img
                            src={file.url}
                            alt={file.filename || file.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover/image:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Other Files */}
                  {comment.attachments.filter(f => !(f.mimeType || f.type)?.startsWith('image/')).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {comment.attachments.filter(f => !(f.mimeType || f.type)?.startsWith('image/')).map((file, idx) => (
                        <a
                          key={`file-${idx}`}
                          href={file.url || '#'}
                          onClick={(e) => handleFileClick(e, file)}
                          className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 text-sm shadow-sm hover:border-primary/50 hover:shadow-md transition-all group/file max-w-xs cursor-pointer"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Paperclip className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="truncate font-medium text-foreground/90 group-hover/file:text-primary transition-colors">
                              {file.filename || file.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {file.size ? (file.size / 1024 < 1024 ? `${Math.round(file.size / 1024)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`) : 'Attachment'}
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <ReactionBar
                  reactions={comment.reactions || {}}
                  currentUserId={currentUserId}
                  onReact={(emoji) => onReact?.(comment._id, emoji)}
                />

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <EmojiPicker
                    onEmojiSelect={(emoji) => onReact?.(comment._id, emoji)}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 rounded-md border-0 bg-transparent hover:bg-accent w-auto"
                  >
                    <Smile className="h-3 w-3 mr-1" />
                    React
                  </EmojiPicker>

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
                variant="inline"
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
                      projectId={projectId}
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
  projectId,
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
  const composerRef = React.useRef(null)
  const panelRef = React.useRef(null)
  const [showNewIndicator, setShowNewIndicator] = React.useState(false)
  const wasAtBottomRef = React.useRef(true)

  const setRef = React.useCallback((node) => {
    panelRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }, [ref])

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    setShowNewIndicator(false)
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50
      wasAtBottomRef.current = isNearBottom

      if (isNearBottom) {
        setShowNewIndicator(false)
      }
    }
  }

  React.useEffect(() => {
    const logRects = () => {
      if (panelRef.current && scrollRef.current && composerRef.current) {
        console.log('Layout Debug:', {
          panelRect: panelRef.current.getBoundingClientRect(),
          listRect: scrollRef.current.getBoundingClientRect(),
          composerRect: composerRef.current.getBoundingClientRect()
        })
      }
    }

    logRects()
    window.addEventListener('resize', logRects)
    return () => window.removeEventListener('resize', logRects)
  }, [])

  React.useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return

    const { scrollHeight, clientHeight, scrollTop } = scrollEl
    const previousWasAtBottom = wasAtBottomRef.current

    console.log('On append comment:', {
      previousScrollHeight: scrollHeight,
      clientHeight,
      scrollTop,
      wasAtBottom: previousWasAtBottom,
      newCommentCount: comments.length
    })

    if (previousWasAtBottom) {
      console.log('Auto-scrolling to bottom')
      const timer = setTimeout(scrollToBottom, 50)
      return () => clearTimeout(timer)
    } else {
      console.log('Not auto-scrolling (user not at bottom)')
      setShowNewIndicator(true)
    }
  }, [comments.length])

  return (
    <div ref={setRef} className={cn("flex flex-col h-full relative", className)} {...props}>
      <div className="flex items-center justify-between mb-4 flex-shrink-0 px-1">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments
        </h3>
        <span className="text-sm text-muted-foreground">
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </span>
      </div>

      <div className="px-1 mb-4">
        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-2.5 flex gap-2.5 items-start">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-1 rounded-full shrink-0 mt-0.5">
            <CheckCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <span className="font-semibold text-blue-700 dark:text-blue-400 block mb-0.5">Pro Tip: Auto-create Tasks</span>
            Use <span className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded text-blue-700 dark:text-blue-300">#todo</span> or <span className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded text-blue-700 dark:text-blue-300">#bug</span> in your comment to automatically create a task.
          </div>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto overflow-x-hidden pr-4 scroll-smooth"
        >
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
                  projectId={projectId}
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

      <div ref={composerRef} className="mt-6 flex-shrink-0 sticky bottom-0 z-30 border-t border-border/60 bg-background/95 px-1 pb-2 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <CommentComposer
          projectMembers={projectMembers}
          onSubmit={onAddComment}
          className="w-full"
        />
      </div>
    </div>
  )
})

CommentThread.displayName = "CommentThread"

export { CommentThread, CommentComposer, CommentItem, ReactionBar }
export default CommentThread
