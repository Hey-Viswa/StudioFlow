import { Moon, Sun } from "lucide-react"
import { Button } from "./ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { useThemeColor } from "./ThemeColorProvider"
import { useTheme } from "next-themes"

export function ModeToggle() {
    const { setTheme } = useTheme()
    const { setThemeColor } = useThemeColor()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    System
                </DropdownMenuItem>
                <div className="h-px bg-border my-1" />
                <div className="p-2 grid grid-cols-4 gap-2">
                    {[
                        { name: 'green', class: 'theme-green', color: 'bg-emerald-500 ring-emerald-300' },
                        { name: 'blue', class: 'theme-blue', color: 'bg-blue-500 ring-blue-300' },
                        { name: 'violet', class: 'theme-violet', color: 'bg-violet-500 ring-violet-300' },
                        { name: 'orange', class: 'theme-orange', color: 'bg-orange-500 ring-orange-300' },
                        { name: 'rose', class: 'theme-rose', color: 'bg-rose-500 ring-rose-300' },
                        { name: 'yellow', class: 'theme-yellow', color: 'bg-yellow-500 ring-yellow-300' },
                        { name: 'red', class: 'theme-red', color: 'bg-red-500 ring-red-300' },
                        { name: 'zinc', class: 'theme-zinc', color: 'bg-zinc-500 ring-zinc-300' },
                    ].map((theme) => (
                        <button
                            key={theme.name}
                            onClick={() => setThemeColor(theme.name)}
                            className={`w-4 h-4 rounded-full hover:ring-2 ${theme.color} cursor-pointer`}
                            title={theme.name}
                        />
                    ))}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
