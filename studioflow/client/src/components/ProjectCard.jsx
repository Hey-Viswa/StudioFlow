import * as React from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { MoreHorizontal, Eye, FileText, MessageSquare, RefreshCw, CheckCircle, Calendar, Users } from "lucide-react"
import { cn } from "../lib/utils"
import { format } from "date-fns"

const getStatusColor = (status) => {
  const colors = {
    active: "bg-status-active text-status-active-foreground",
    completed: "bg-status-completed text-status-completed-foreground",
    "on-hold": "bg-status-on-hold text-status-on-hold-foreground",
    archived: "bg-status-archived text-status-archived-foreground",
    "needs-revision": "bg-status-needs-revision text-status-needs-revision-foreground",
    finalized: "bg-status-finalized text-status-finalized-foreground"
  }
  return colors[status] || colors.active
}

const ProjectCard = React.forwardRef(({ 
  project,
  onView,
  onOpenFiles,
  onOpenComments,
  onRequestRevision,
  onApproveFinal,
  showClientInfo = true,
  className,
  ...props 
}, ref) => {
  const {
    _id,
    title,
    brief,
    status = "active",
    progress = 0,
    dueDate,
    members = [],
    invoiceStats = { pending: 0, paid: 0, total: 0 },
    filesCount = 0,
    commentsCount = 0
  } = project || {}

  const clientMember = members.find(m => m.role === 'client')
  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'completed'

  return (
    <Card 
      ref={ref} 
      className={cn(
        "transition-all hover:shadow-md",
        isOverdue && "border-destructive",
        className
      )} 
      {...props}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">{title}</CardTitle>
            {brief && (
              <CardDescription className="line-clamp-2 mt-1">
                {brief}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView?.(_id)}>
                <Eye className="mr-2 h-4 w-4" />
                View Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenFiles?.(_id)}>
                <FileText className="mr-2 h-4 w-4" />
                Open Files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenComments?.(_id)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Open Comments
              </DropdownMenuItem>
              {onRequestRevision && (
                <DropdownMenuItem onClick={() => onRequestRevision?.(_id)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Request Revision
                </DropdownMenuItem>
              )}
              {onApproveFinal && status === 'needs-revision' && (
                <DropdownMenuItem onClick={() => onApproveFinal?.(_id)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Final
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge className={cn("text-xs", getStatusColor(status))}>
            {status.replace('-', ' ')}
          </Badge>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              Overdue
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pb-3">
        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Invoices</div>
            <div className="text-sm font-medium">
              {invoiceStats.paid}/{invoiceStats.total}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Files</div>
            <div className="text-sm font-medium">{filesCount}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Comments</div>
            <div className="text-sm font-medium">{commentsCount}</div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
        {showClientInfo && clientMember && (
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span className="truncate max-w-[120px]">{clientMember.name || clientMember.email}</span>
          </div>
        )}
        {dueDate && (
          <div className={cn(
            "flex items-center gap-1.5 ml-auto",
            isOverdue && "text-destructive font-medium"
          )}>
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(dueDate), 'MMM dd, yyyy')}</span>
          </div>
        )}
      </CardFooter>
    </Card>
  )
})

ProjectCard.displayName = "ProjectCard"

export { ProjectCard }
