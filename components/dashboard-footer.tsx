"use client"

import { useLanguage } from "@/contexts/language-context"

export function DashboardFooter() {
  const { t } = useLanguage()

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
      <div className="px-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">{t("auth.footer")}</p>
      </div>
    </footer>
  )
}
