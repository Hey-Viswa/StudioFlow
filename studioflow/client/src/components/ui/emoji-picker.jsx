import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Button } from "./button"
import { ScrollArea } from "./scroll-area"
import { Smile } from "lucide-react"
import { cn } from "@/lib/utils"

const EMOJI_CATEGORIES = {
  "Smileys": ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘"],
  "Gestures": ["👍", "👎", "👏", "🙌", "👌", "✌️", "🤞", "🤝", "🙏", "💪", "✊", "👊", "🤛", "🤜"],
  "Hearts": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "💔", "❣️", "💕", "💞", "💓"],
  "Objects": ["🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈", "🥉", "⭐", "✨", "💫", "🔥", "💯", "✅", "❌", "⚠️"]
}

const EmojiPicker = React.forwardRef(({ onEmojiSelect, className, variant = "ghost", size = "icon", children, ...props }, ref) => {
  const [open, setOpen] = React.useState(false)

  const handleEmojiClick = (emoji) => {
    onEmojiSelect?.(emoji)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant={variant}
          size={size}
          className={cn("h-8 w-8 rounded-full border border-border/60 bg-background/80 hover:bg-background hover:border-primary/60", className)}
          aria-label="Add emoji"
          {...props}
        >
          {children || <Smile className="h-4 w-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <ScrollArea className="h-72">
          <div className="p-3 space-y-3">
            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
              <div key={category}>
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  {category}
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiClick(emoji)}
                      className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded text-xl transition-colors"
                      aria-label={`Insert ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
})

EmojiPicker.displayName = "EmojiPicker"

export { EmojiPicker, EMOJI_CATEGORIES }
