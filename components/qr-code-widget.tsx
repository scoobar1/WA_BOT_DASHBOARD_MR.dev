"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { QrCode, RefreshCw, CheckCircle, Wifi, Smartphone, Play, Pause, Square, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { io } from "socket.io-client"
import QRCodeLib from "qrcode"

export function QRCodeWidget() {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; phone: string; platform: string } | null>(null)
  const [socket, setSocket] = useState<any>(null)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showLoading, setShowLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [botStatus, setBotStatus] = useState<"starting" | "ready" | "paused" | "stopped" | "error">("starting")
  const [statusMessage, setStatusMessage] = useState("Starting bot...")
  const [uptime, setUptime] = useState(0)
  const [hasRefreshedOnDeviceInfo, setHasRefreshedOnDeviceInfo] = useState(false)

  const generateQRImage = async (qrText: string) => {
    try {
      const url = await QRCodeLib.toDataURL(qrText, {
        width: 256,
        margin: 2,
        color: {
          dark: "#1f2937",
          light: "#ffffff",
        },
      })
      setQrImageUrl(url)
      setShowLoading(false)
    } catch (error) {
      console.error("[QR Widget] Error generating QR image:", error)
    }
  }

  const updateStatusMessage = (connected: boolean, paused: boolean, uptime: number) => {
    if (!connected) {
      setBotStatus("starting")
      setStatusMessage("Waiting for WhatsApp connection...")
    } else if (paused) {
      setBotStatus("paused")
      setStatusMessage("Bot is paused - not responding to messages")
    } else {
      setBotStatus("ready")
      const hours = Math.floor(uptime / 3600)
      const minutes = Math.floor((uptime % 3600) / 60)
      setStatusMessage(`Bot is running normally - Uptime: ${hours}h ${minutes}m`)
    }
  }

  useEffect(() => {
    const serverUrl = process.env.NEXT_PUBLIC_BOT_SERVER_URL || "http://localhost:3001"
    console.log("[QR Widget] Establishing socket connection to:", serverUrl)

    const socketConnection = io(serverUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 3,
      timeout: 10000,
      forceNew: true,
    })
    setSocket(socketConnection)

    socketConnection.on("connect", () => {
      console.log("[QR Widget] Socket connected:", socketConnection.id)
      setConnectionStatus("connected")
      socketConnection.emit("getBotStatus")
    })

    socketConnection.on("disconnect", (reason) => {
      console.log("[QR Widget] Socket disconnected:", reason)
      setConnectionStatus("disconnected")
      setShowLoading(true)
      setBotStatus("error")
      setStatusMessage("Connection to server lost")
      setHasRefreshedOnDeviceInfo(false)
    })

    socketConnection.on("qr", (qr: string) => {
      console.log("[QR Widget] QR code received")
      setQrCode(qr)
      setIsConnected(false)
      setShowLoading(false)
      generateQRImage(qr)
      setBotStatus("starting")
      setStatusMessage("Scan QR code to connect")
      setHasRefreshedOnDeviceInfo(false)
    })

    socketConnection.on(
      "botStatus",
      (status: {
        isConnected: boolean
        qrCode: string | null
        deviceInfo?: { name: string; phone: string; platform: string }
        isPaused?: boolean
        uptime?: number
      }) => {
        console.log("[QR Widget] Bot status received:", status)

        setIsConnected(status.isConnected)
        setIsPaused(status.isPaused || false)
        setUptime(status.uptime || 0)

        if (status.deviceInfo && !hasRefreshedOnDeviceInfo && !deviceInfo) {
          console.log("[QR Widget] Device info received, performing one-time refresh:", status.deviceInfo)
          setHasRefreshedOnDeviceInfo(true)
          setTimeout(() => {
            socketConnection.emit("getBotStatus")
          }, 1000)
        }

        if (status.deviceInfo) setDeviceInfo(status.deviceInfo)

        if (status.qrCode && !status.isConnected) {
          setQrCode(status.qrCode)
          generateQRImage(status.qrCode)
        } else if (status.isConnected) {
          setQrCode(null)
          setQrImageUrl(null)
          setShowLoading(false)
        }

        updateStatusMessage(status.isConnected, status.isPaused || false, status.uptime || 0)
      },
    )

    const pollInterval = setInterval(() => {
      if (socketConnection.connected) {
        socketConnection.emit("getBotStatus")
      }
    }, 5000)

    const uptimeInterval = setInterval(() => {
      if (isConnected && !isPaused) {
        setUptime((prev) => {
          const newUptime = prev + 1
          updateStatusMessage(isConnected, isPaused, newUptime)
          return newUptime
        })
      }
    }, 1000)

    return () => {
      console.log("[QR Widget] Cleaning up socket connection")
      clearInterval(pollInterval)
      clearInterval(uptimeInterval)
      socketConnection.disconnect()
    }
  }, [])

  const handleRefresh = () => {
    if (socket) {
      setIsRefreshing(true)
      setShowLoading(true)
      setBotStatus("starting")
      setStatusMessage("Restarting bot...")
      socket.emit("requestBotRestart")
      setQrCode(null)
      setQrImageUrl(null)
      setIsConnected(false)
      setDeviceInfo(null)
      setHasRefreshedOnDeviceInfo(false)
      setTimeout(() => setIsRefreshing(false), 2000)
    }
  }

  const handleResetSession = () => {
    if (socket) {
      setShowLoading(true)
      setBotStatus("starting")
      setStatusMessage("Resetting session...")
      setQrCode(null)
      setQrImageUrl(null)
      setIsConnected(false)
      setDeviceInfo(null)
      setHasRefreshedOnDeviceInfo(false)
      socket.emit("resetSession")
    }
  }

  const handlePauseResume = () => {
    if (socket) {
      if (isPaused) {
        socket.emit("resumeBot")
        setBotStatus("ready")
        setStatusMessage("Resuming bot...")
      } else {
        socket.emit("pauseBot")
        setBotStatus("paused")
        setStatusMessage("Pausing bot...")
      }
      setIsPaused(!isPaused)
    }
  }

  const getStatusBadge = () => {
    if (connectionStatus === "disconnected") {
      return (
        <Badge
          variant="secondary"
          className="font-medium shadow-lg transition-all duration-300"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            color: "#dc2626",
            borderColor: "rgba(239, 68, 68, 0.4)",
            border: "1px solid",
          }}
        >
          <AlertCircle className="w-3 h-3 mr-1.5" />
          Disconnected
        </Badge>
      )
    }

    if (!isConnected) {
      return (
        <Badge
          variant="secondary"
          className="font-medium shadow-lg transition-all duration-300"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            color: "#d97706",
            borderColor: "rgba(245, 158, 11, 0.4)",
            border: "1px solid",
          }}
        >
          <QrCode className="w-3 h-3 mr-1.5" />
          Scan Required
        </Badge>
      )
    }

    if (isPaused) {
      return (
        <Badge
          variant="secondary"
          className="font-medium shadow-lg transition-all duration-300"
          style={{
            backgroundColor: "rgba(249, 115, 22, 0.15)",
            color: "#ea580c",
            borderColor: "rgba(249, 115, 22, 0.4)",
            border: "1px solid",
          }}
        >
          <Pause className="w-3 h-3 mr-1.5" />
          Paused
        </Badge>
      )
    }

    return (
      <Badge
        variant="secondary"
        className="font-medium shadow-lg transition-all duration-300"
        style={{
          backgroundColor: "rgba(37, 211, 102, 0.15)",
          color: "#25D366",
          borderColor: "rgba(37, 211, 102, 0.4)",
          border: "1px solid",
        }}
      >
        <Wifi className="w-3 h-3 mr-1.5" />
        Connected
      </Badge>
    )
  }

  if (connectionStatus === "connecting" || (connectionStatus === "disconnected" && !qrImageUrl) || showLoading) {
    return (
      <Card className="bg-card border-border shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-500" />
            WhatsApp Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 py-8">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-green-400/40 border-t-green-500 rounded-full animate-spin shadow-lg" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-green-400/20 rounded-full animate-ping" />
            <div className="absolute inset-0 w-16 h-16 bg-green-400/10 rounded-full animate-pulse" />
          </div>
          <p className="text-muted-foreground text-center font-medium">{statusMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-500" />
            WhatsApp Connection
          </CardTitle>
          {getStatusBadge()}
        </div>
        <p className="text-sm text-muted-foreground mt-2">{statusMessage}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {isConnected ? (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 hover:scale-110`}
                  style={{
                    backgroundColor: isPaused ? "#f97316" : "#25D366", // WhatsApp green or orange for paused
                    boxShadow: isPaused
                      ? "0 0 30px rgba(249, 115, 22, 0.4), 0 0 60px rgba(249, 115, 22, 0.2)"
                      : "0 0 30px rgba(37, 211, 102, 0.4), 0 0 60px rgba(37, 211, 102, 0.2)",
                  }}
                >
                  {isPaused ? (
                    <Pause className="w-8 h-8 text-white drop-shadow-lg" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-white drop-shadow-lg" />
                  )}
                </div>
                <div
                  className="absolute inset-0 w-20 h-20 rounded-full animate-ping opacity-30"
                  style={{
                    backgroundColor: isPaused ? "#f97316" : "#25D366",
                  }}
                />
                <div
                  className="absolute inset-0 w-20 h-20 rounded-full animate-pulse opacity-20"
                  style={{
                    backgroundColor: isPaused ? "#f97316" : "#25D366",
                  }}
                />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-card-foreground">{isPaused ? "Bot Paused" : "Session Active"}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {isPaused
                  ? "Bot is paused and won't respond to messages until resumed"
                  : "WhatsApp Web is connected and ready to send messages"}
              </p>
            </div>

            {deviceInfo && (
              <div className="bg-secondary rounded-xl p-4 border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <Smartphone className="w-5 h-5 text-accent" />
                  <span className="text-secondary-foreground font-medium">Connected Device</span>
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-card-foreground">
                    {deviceInfo.name || "Unknown Device"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {deviceInfo.platform && `${deviceInfo.platform}`}
                    {deviceInfo.phone && ` • ${deviceInfo.phone}`}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleResetSession}
                variant="outline"
                className="flex-1 bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 hover:border-destructive/50 transition-all duration-300"
              >
                <Square className="w-4 h-4 mr-2" />
                Reset Session
              </Button>

              <Button
                onClick={handlePauseResume}
                variant="outline"
                size="sm"
                className="flex-1 transition-all duration-300 bg-transparent"
                style={{
                  backgroundColor: isPaused ? "rgba(37, 211, 102, 0.1)" : "rgba(249, 115, 22, 0.1)",
                  borderColor: isPaused ? "rgba(37, 211, 102, 0.3)" : "rgba(249, 115, 22, 0.3)",
                  color: isPaused ? "#25D366" : "#f97316",
                }}
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume Bot
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Bot
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : qrImageUrl ? (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <h2 className="text-xl font-bold text-card-foreground">Scan QR Code</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Open WhatsApp on your phone and scan this code to connect
              </p>
            </div>

            <div className="flex justify-center">
              <div className="p-6 bg-white rounded-2xl shadow-2xl border-4 border-border hover:shadow-accent/20 transition-all duration-300">
                <img src={qrImageUrl || "/placeholder.svg"} alt="WhatsApp QR Code" className="w-48 h-48 rounded-lg" />
              </div>
            </div>

            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="w-full bg-secondary border-border text-secondary-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent/50 transition-all duration-300"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh QR Code
                </>
              )}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
