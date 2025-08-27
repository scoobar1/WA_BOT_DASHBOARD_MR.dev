"use client"

import type React from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/contexts/language-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardFooter } from "@/components/dashboard-footer"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LanguageProvider>
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
          <DashboardHeader />
          <main className="flex-1">{children}</main>
          <DashboardFooter />
        </div>
      </LanguageProvider>
    </ThemeProvider>
  )
}
