"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Pause, RotateCcw, Activity, Clock } from "lucide-react"
import axios from "axios"

export function BotControlWidget() {
  const [isPaused, setIsPaused] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [uptime, setUptime] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // ---- جلب الحالة من السيرفر ----
  const fetchStatus = async () => {
    try {
      const res = await axios.get("http://localhost:3001/api/bot/status")
      setIsPaused(res.data.isPaused)
      setIsActive(res.data.isActive)
      setUptime(res.data.uptime || 0)
    } catch (err) {
      console.error("خطأ في جلب الحالة:", err)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0")
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0")
    const s = (seconds % 60).toString().padStart(2, "0")
    return `${h}:${m}:${s}`
  }

  const togglePause = async () => {
    try {
      await axios.post("http://localhost:3001/api/bot/toggle-pause")
      fetchStatus()
    } catch (err) {
      console.error("خطأ في الإيقاف/التشغيل:", err)
    }
  }

  const toggleBot = async () => {
    setIsTransitioning(true)
    try {
      await axios.post("http://localhost:3001/api/bot/toggle-active")
      fetchStatus()
    } catch (err) {
      console.error("خطأ في تشغيل/إيقاف البوت:", err)
    } finally {
      setIsTransitioning(false)
    }
  }

  const resetStats = async () => {
    try {
      await axios.post("http://localhost:3001/api/messages/reset")
      fetchStatus()
    } catch (err) {
      console.error("خطأ في إعادة التعيين:", err)
    }
  }

  return (
    <Card className="bg-gray-900 border border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span className="text-green-400">Bot Control</span>
          </CardTitle>
          <Badge className={isPaused ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}>
            {isPaused ? "Paused" : "Running"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* الحالة + السويتش */}
        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div>
            <h3 className="font-semibold text-white">WhatsApp Bot</h3>
            <p className="text-sm text-gray-400">
              {isActive ? "Bot is active and processing messages" : "Bot is currently stopped"}
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={toggleBot}
            disabled={isTransitioning}
            className="data-[state=checked]:bg-green-500"
          />
        </div>

        {/* Active Time */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Active Time</span>
          </div>
          <div className="text-center text-2xl font-mono font-bold text-green-400 mt-4">
            {formatTime(uptime)}
          </div>
        </div>

        {/* أزرار */}
        <div className="flex gap-6 pt-4 border-t border-gray-600">
          <Button onClick={resetStats} variant="outline" size="sm" className="flex-1">
            <RotateCcw className="w-4 h-4 mr-1" /> Reset Stats
          </Button>
          <Button
            onClick={togglePause}
            size="sm"
            className={`flex-1 ${isPaused ? "bg-green-600" : "bg-red-600"}`}
          >
            <Pause className="w-4 h-4 mr-2" />
            {isPaused ? "Resume Bot" : "Pause Bot"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
