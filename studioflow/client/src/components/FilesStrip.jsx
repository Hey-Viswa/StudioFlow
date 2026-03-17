import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { FileText, Image, Film, FileArchive, ExternalLink } from "lucide-react"
import { cn } from "../lib/utils"

const getFileIcon = (mimeType) => {
  if (!mimeType) return FileText

  if (mimeType.startsWith('image/')) return Image
  if (mimeType.startsWith('video/')) return Film
  if (mimeType.includes('zip') || mimeType.includes('archive')) return FileArchive

  return FileText
}

const FileThumbnail = ({ file, onClick }) => {
  const Icon = getFileIcon(file.mimeType)
  const isPreviewable = file.mimeType?.startsWith('image/') || file.mimeType?.startsWith('video/')
  const previewSrc = file.previewUrl || file.url
  const [thumbnailLoadFailed, setThumbnailLoadFailed] = React.useState(false)

  React.useEffect(() => {
    setThumbnailLoadFailed(false)
  }, [previewSrc])

  return (
    <button
      onClick={() => onClick?.(file)}
      className="relative group flex flex-col items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
      aria-label={`Preview ${file.filename || file.originalFilename}`}
    >
      <div className="relative w-16 h-16 flex items-center justify-center rounded bg-muted">
        {isPreviewable && previewSrc && !thumbnailLoadFailed ? (
          file.mimeType.startsWith('video/') ? (
            <video
              src={previewSrc}
              className="w-full h-full object-cover rounded"
              muted
              onError={() => setThumbnailLoadFailed(true)}
            />
          ) : (
            <img
              src={previewSrc}
              alt={file.filename}
              className="w-full h-full object-cover rounded"
              onError={() => setThumbnailLoadFailed(true)}
            />
          )
        ) : (
          <Icon className="h-8 w-8 text-muted-foreground" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded transition-colors flex items-center justify-center">
          <ExternalLink className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <span className="text-xs text-center truncate w-full max-w-[80px] sm:max-w-[100px]">
        {file.filename || file.originalFilename}
      </span>
    </button>
  )
}

const FilesStrip = React.forwardRef(({
  files = [],
  title = "Recent Files",
  maxVisible = 6,
  onFileClick,
  onViewAll,
  className,
  ...props
}, ref) => {
  const displayFiles = files.slice(0, maxVisible)
  const hasMore = files.length > maxVisible

  return (
    <Card ref={ref} className={cn("", className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {hasMore && onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="h-8 text-xs"
          >
            View all ({files.length})
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No files yet</p>
          </div>
        ) : (
          <ScrollArea className="w-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pb-2">
              {displayFiles.map((file) => (
                <FileThumbnail
                  key={file._id || file.fileId}
                  file={file}
                  onClick={onFileClick}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
})

FilesStrip.displayName = "FilesStrip"

export { FilesStrip, FileThumbnail }
