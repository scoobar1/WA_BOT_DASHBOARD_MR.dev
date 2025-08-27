"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, TrendingUp, TrendingDown } from "lucide-react"
import { format } from "date-fns"
import { io } from "socket.io-client"

interface MessageData {
  date: string
  count: number
}

interface StatsPayload {
  today: number
  total30Days: number
  daily: MessageData[]
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"
const API_URL = process.env.NEXT_PUBLIC_API_URL || SOCKET_URL

export function MessageStatusWidget() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [messageData, setMessageData] = useState<MessageData[]>([])
  const [currentStatus, setCurrentStatus] = useState<"high" | "low" | "neutral">("neutral")
  const [messagesSent, setMessagesSent] = useState(0)
  const [total30Days, setTotal30Days] = useState(0)

  // جلب البيانات الأولية من الـ API
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const res = await fetch(`${API_URL}/api/messages/stats`)
        const data: StatsPayload = await res.json()
        if (Array.isArray(data?.daily)) {
          setMessageData(data.daily)

          // حساب اليوم المختار
          const todayStr = selectedDate.toISOString().split("T")[0]
          const todayData = data.daily.find(d => d.date === todayStr)
          setMessagesSent(todayData?.count || 0)

          // حساب آخر 30 يوم
          const sorted = [...data.daily].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          const last30 = sorted.slice(-30)
          setTotal30Days(last30.reduce((sum, d) => sum + d.count, 0))
        }
      } catch (e) {
        console.error("Error fetching initial stats:", e)
      }
    }
    fetchInitial()
  }, [selectedDate])

  // الاشتراك في السوكيت للتحديث اللحظي
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] })

    const onStats = (stats: StatsPayload) => {
      if (Array.isArray(stats?.daily)) {
        setMessageData(stats.daily)

        const todayStr = new Date().toISOString().split("T")[0]

        // تحديث Messages Sent فورًا إذا اليوم المختار هو اليوم الحالي
        if (selectedDate.toISOString().split("T")[0] === todayStr) {
          const todayData = stats.daily.find(d => d.date === todayStr)
          setMessagesSent(todayData?.count || 0)
        }

        // تحديث Total (30 days) دائماً
        const sorted = [...stats.daily].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        const last30 = sorted.slice(-30)
        setTotal30Days(last30.reduce((sum, d) => sum + d.count, 0))
      }
    }

    socket.on("messageStats", onStats)

    return () => {
      socket.off("messageStats", onStats)
      socket.close()
    }
  }, [selectedDate])

  // تحديث الحالة High/Low/Neutral
  useEffect(() => {
    const selectedDateStr = selectedDate.toISOString().split("T")[0]
    const selectedData = messageData.find(d => d.date === selectedDateStr)
    const messageCount = selectedData?.count || 0

    if (messageCount === 0 || messageCount < 5) {
      setCurrentStatus("low")
    } else if (messageCount > 10) {
      setCurrentStatus("high")
    } else {
      setCurrentStatus("neutral")
    }
  }, [selectedDate, messageData])

  const getCubeStyle = () => {
    switch (currentStatus) {
      case "high":
        return { backgroundColor: "#16a34a", boxShadow: "0 25px 50px -12px rgba(22, 163, 74, 0.4)" }
      case "low":
        return { backgroundColor: "#dc2626", boxShadow: "0 25px 50px -12px rgba(220, 38, 38, 0.4)" }
      default:
        return { backgroundColor: "#3b82f6", boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.4)" }
    }
  }

  const getStatusIcon = () => {
    switch (currentStatus) {
      case "high":
        return <TrendingUp className="w-5 h-5" style={{ color: "#16a34a" }} />
      case "low":
        return <TrendingDown className="w-5 h-5" style={{ color: "#dc2626" }} />
      default:
        return <TrendingUp className="w-5 h-5" style={{ color: "#3b82f6" }} />
    }
  }

  const getStatusText = () => {
    switch (currentStatus) {
      case "high":
        return "High Activity"
      case "low":
        return "Low Activity"
      default:
        return "Normal Activity"
    }
  }

  return (
    <Card className="bg-card border-border shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
          Message Status
          {getStatusIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Cube */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className={`w-20 h-20 rounded-xl shadow-xl transform transition-all duration-500 hover:scale-110 hover:rotate-3`} style={getCubeStyle()}>
              <div className="absolute inset-0 bg-white/10 rounded-xl transform -translate-x-1 -translate-y-1"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-xl">{messagesSent}</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-white">{getStatusText()}</p>
            <p className="text-xs text-muted-foreground">{format(selectedDate, "MMM dd, yyyy")}</p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">Select Date to Compare</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal bg-secondary border-border text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => date > new Date() || date < new Date("2024-01-01")}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-2xl font-bold text-card-foreground">{messagesSent}</p>
            <p className="text-xs text-muted-foreground">Messages Sent</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-card-foreground">{total30Days}</p>
            <p className="text-xs text-muted-foreground">Total (30 days)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
