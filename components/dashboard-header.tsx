"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Globe, LogOut, Bot } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

export function DashboardHeader() {
  const { language, setLanguage, t, isRTL } = useLanguage()
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated")
    router.push("/")
  }

  return (
    <header className="bg-gray-900 border-b border-gray-700 shadow-lg">
      <div className="px-6 py-4">
        <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
          {/* Logo with Bot Icon */}
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-green-400" />
            <h1 className="text-2xl font-bold text-green-400">Mr.dev AI</h1>
            <span className="text-sm text-green-300 font-medium">BOT</span>
          </div>

          {/* Header Controls */}
          <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-600 hover:border-gray-500"
                >
                  <Globe className="h-4 w-4" />
                  <span className="sr-only">Switch language</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-800 border-gray-600">
                <DropdownMenuItem
                  onClick={() => setLanguage("en")}
                  className={`text-gray-300 hover:bg-gray-700 hover:text-white ${language === "en" ? "bg-blue-900/30 text-blue-300" : ""}`}
                >
                  English
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLanguage("ar")}
                  className={`text-gray-300 hover:bg-gray-700 hover:text-white ${language === "ar" ? "bg-blue-900/30 text-blue-300" : ""}`}
                >
                  العربية
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-9 px-3 text-red-300 hover:text-red-200 hover:bg-red-900/20 border border-red-600/30 hover:border-red-500/50"
            >
              <LogOut className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
              {t("header.exit")}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
