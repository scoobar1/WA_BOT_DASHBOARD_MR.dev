"use client"

import { AuthGuard } from "@/components/auth-guard"
import { QRCodeWidget } from "@/components/qr-code-widget"
import { MessageStatusWidget } from "@/components/message-status-widget"
import { LogsManagementWidget } from "@/components/logs-management-widget"
import { useLanguage } from "@/contexts/language-context"

export default function DashboardPage() {
  const { t, isRTL } = useLanguage()

  return (
    <AuthGuard>
      <div className={`min-h-screen bg-black p-6 ${isRTL ? "rtl" : "ltr"}`}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{t("dashboard.title") || "WhatsApp Bot Dashboard"}</h1>
          <p className="text-gray-300">{t("dashboard.subtitle") || "إدارة بوت WhatsApp وعرض حالة الاتصال"}</p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MessageStatusWidget />
          <QRCodeWidget />

          {/* Logs ممدودة على العرض كله */}
          <div className="md:col-span-2">
            <LogsManagementWidget />
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
