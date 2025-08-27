"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, MessageSquare, Globe, Sparkles } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LanguageProvider, useLanguage } from "@/contexts/language-context"


function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { t, language, setLanguage, isRTL } = useLanguage()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Simulate login delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 800))

    if (username === "mahmoud" && password === "1872004") {
      // Store auth state
      localStorage.setItem("isAuthenticated", "true")
      router.push("/dashboard")
    } else {
      setError(t("auth.invalid_credentials"))
    }

    setIsLoading(false)
  }

  return (
    <div
      className={`min-h-screen bg-black relative overflow-hidden flex items-center justify-center p-4 ${isRTL ? "rtl" : "ltr"}`}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-white/5 to-gray-300/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-l from-white/3 to-gray-400/8 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-white/4 to-gray-200/6 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Language Switcher */}
        <div className={`${isRTL ? "text-left" : "text-right"} mb-6`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-sm transition-all duration-300"
              >
                <Globe className="h-4 w-4 text-white" />
                <span className="sr-only">Switch language</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black/90 border-white/20 backdrop-blur-md">
              <DropdownMenuItem
                onClick={() => setLanguage("en")}
                className={`text-white hover:bg-white/10 ${language === "en" ? "bg-white/5" : ""}`}
              >
                English
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLanguage("ar")}
                className={`text-white hover:bg-white/10 ${language === "ar" ? "bg-white/5" : ""}`}
              >
                العربية
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-white/20 to-white/5 rounded-3xl mb-6 shadow-2xl border border-white/10 backdrop-blur-sm group hover:scale-105 transition-all duration-300">
            <MessageSquare className="w-10 h-10 text-white group-hover:scale-110 transition-transform duration-300" />
            <Sparkles className="w-4 h-4 text-white/60 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">{t("auth.title")}</h1>
          <p className="text-white/70 text-lg">{t("auth.subtitle")}</p>
        </div>

        <Card className="shadow-2xl border border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-all duration-500 group">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold text-center text-white group-hover:text-white/90 transition-colors duration-300">
              {t("auth.welcome")}
            </CardTitle>
            <CardDescription className="text-center text-white/60">{t("auth.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white/90">
                  {t("auth.username")}
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={t("auth.username")}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/10 transition-all duration-300"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/90">
                  {t("auth.password")}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`h-12 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/10 transition-all duration-300 ${isRTL ? "pl-12" : "pr-12"}`}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`absolute ${isRTL ? "left-0" : "right-0"} top-0 h-full px-3 py-2 hover:bg-transparent text-white/60 hover:text-white transition-colors duration-300`}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 backdrop-blur-sm">
                  <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-white to-white/90 hover:from-white/90 hover:to-white text-black font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    {t("auth.signing_in")}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {t("auth.signin")}
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-white/50">{t("auth.footer")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <LanguageProvider>
      <LoginForm />
    </LanguageProvider>
  )
}
