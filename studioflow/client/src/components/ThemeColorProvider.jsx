import { createContext, useContext, useEffect, useState } from "react"

const ThemeColorContext = createContext({
  themeColor: "green",
  setThemeColor: () => null,
})

export function ThemeColorProvider({
  children,
  defaultThemeColor = "green",
  storageKey = "vite-ui-theme-color",
  ...props
}) {
  const [themeColor, setThemeColor] = useState(
    () => localStorage.getItem(storageKey) || defaultThemeColor
  )

  useEffect(() => {
    const root = window.document.documentElement
    
    // Remove all existing theme color classes
    root.classList.remove("theme-green", "theme-blue", "theme-violet", "theme-orange")
    
    // Add the new theme color class
    root.classList.add(`theme-${themeColor}`)
    
    localStorage.setItem(storageKey, themeColor)
  }, [themeColor, storageKey])

  const value = {
    themeColor,
    setThemeColor,
  }

  return (
    <ThemeColorContext.Provider value={value} {...props}>
      {children}
    </ThemeColorContext.Provider>
  )
}

export const useThemeColor = () => {
  const context = useContext(ThemeColorContext)

  if (context === undefined)
    throw new Error("useThemeColor must be used within a ThemeColorProvider")

  return context
}
