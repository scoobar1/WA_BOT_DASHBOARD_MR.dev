"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Search, MessageSquare, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { io, type Socket } from "socket.io-client"

interface WhatsAppLog {
  id: string
  phoneNumber: string
  incomingMessage: string
  botReply: string
  timestamp: Date | string
}

interface Stats {
  total: number
  badWords: number
  positive: number
  today: number
}

interface ConversationsResponse {
  conversations: WhatsAppLog[]
  stats: Stats
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

export function LogsManagementWidget() {
  const [logs, setLogs] = useState<WhatsAppLog[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    total: 0,
    badWords: 0,
    positive: 0,
    today: 0,
  })
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_BOT_SERVER_URL || "http://localhost:3001"
        const response = await fetch(`${apiUrl}/api/conversations?limit=100&offset=0`)
        const data: ConversationsResponse = await response.json()

        const conversationsWithDates = data.conversations.map((conv) => ({
          ...conv,
          timestamp: new Date(conv.timestamp),
        }))

        setLogs(conversationsWithDates)
        setStats(data.stats)
      } catch (err) {
        console.error(err)
        setLogs([])
        setStats({ total: 0, badWords: 0, positive: 0, today: 0 })
      } finally {
        setIsLoading(false)
      }
    }

    fetchInitialData()

    const apiUrl = process.env.NEXT_PUBLIC_BOT_SERVER_URL || "http://localhost:3001"
    const socketConnection: Socket = io(apiUrl)
    setSocket(socketConnection)

    socketConnection.on("conversationUpdate", (newConversation: WhatsAppLog) => {
      const conv = { ...newConversation, timestamp: new Date(newConversation.timestamp) }
      setLogs((prev) => [conv, ...prev.slice(0, 999)])

      setStats((prevStats) => ({
        ...prevStats,
        total: prevStats.total + 1,
        today:
          new Date(conv.timestamp).toDateString() === new Date().toDateString()
            ? prevStats.today + 1
            : prevStats.today,
      }))
    })

    socketConnection.on(
      "conversationsData",
      (data: { conversations: WhatsAppLog[]; stats: Stats }) => {
        const conversationsWithDates = data.conversations.map((conv) => ({
          ...conv,
          timestamp: new Date(conv.timestamp),
        }))
        setLogs(conversationsWithDates)
        setStats(data.stats)
      }
    )

    return () => {
      socketConnection.disconnect()
    }
  }, [])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) =>
      log.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.incomingMessage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.botReply.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [logs, searchTerm])

  const downloadLogs = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_BOT_SERVER_URL || "http://localhost:3001"
      const searchParam = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ""
      const response = await fetch(`${apiUrl}/api/conversations/export${searchParam}`)
      const data: WhatsAppLog[] = await response.json()

      const csvContent = [
        ["Phone Number", "Incoming Message", "Bot Reply", "Timestamp"],
        ...data.map((log) => [
          log.phoneNumber,
          `"${log.incomingMessage.replace(/"/g, '""')}"`,
          `"${log.botReply.replace(/"/g, '""')}"`,
          format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
        ]),
      ].map((row) => row.join(",")).join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `whatsapp-conversations-${format(new Date(), "yyyy-MM-dd")}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <Card className="bg-black border border-gray-800">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            WhatsApp Conversations
          </CardTitle>
          <Button
            onClick={downloadLogs}
            size="sm"
            variant="outline"
            className="h-8 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          />
        </div>

        <div className="flex justify-between p-4 bg-gray-900 rounded-lg text-center">
          <div className="flex-1">
            <p className="text-lg font-semibold text-white">{stats.total ?? 0}</p>
            <p className="text-xs text-gray-300">Total</p>
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold text-red-500">{stats.badWords ?? 0}</p>
            <p className="text-xs text-gray-300">Bad Words</p>
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold text-green-500">{stats.positive ?? 0}</p>
            <p className="text-xs text-gray-300">Positive</p>
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold text-blue-500">{stats.today ?? 0}</p>
            <p className="text-xs text-gray-300">Today</p>
          </div>
        </div>

        <div className="border border-gray-700 rounded-lg bg-black">
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-gray-300">Loading conversations...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-700">
                    <TableHead className="text-white font-semibold">Phone Number</TableHead>
                    <TableHead className="text-white font-semibold">Incoming Message</TableHead>
                    <TableHead className="text-white font-semibold">Bot Reply</TableHead>
                    <TableHead className="text-white font-semibold">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-800 border-b border-gray-800">
                      <TableCell className="font-mono text-sm font-medium text-white">{log.phoneNumber}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="bg-gray-700 rounded-lg px-3 py-2">
                          <p className="text-sm truncate text-white" title={log.incomingMessage}>{log.incomingMessage}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="rounded-lg px-3 py-2 max-w-full" style={{ backgroundColor: "#25D366" }}>
                            <p className="text-sm truncate text-white" title={log.botReply}>{log.botReply}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-300">
                        {format(new Date(log.timestamp), "MMM dd, HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>

        {filteredLogs.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-300">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No conversations found matching your criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
