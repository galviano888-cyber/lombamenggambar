import { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"
import type { Socket } from "socket.io-client"

interface ChatMessage {
  playerName: string
  playerIndex: number
  message: string
  timestamp: number
}

const PLAYER_COLORS = [
  "#E52521", "#43B047", "#5C94FC", "#FBD000", "#8b5cf6",
]

export function ChatBox({ socket }: { socket: Socket | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!socket) return

    const onChatMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-50), msg]) // keep last 50 messages
    }

    socket.on("chat_message", onChatMessage)
    return () => { socket.off("chat_message", onChatMessage) }
  }, [socket])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = () => {
    if (!socket || !input.trim()) return
    socket.emit("chat_message", { message: input.trim() })
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-50">
      {/* Toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="arcade-btn bg-primary text-primary-foreground px-3 sm:px-4 py-2 sm:py-3 font-bold text-xs sm:text-sm flex items-center gap-2"
        >
          💬 Chat
          {messages.length > 0 && (
            <span className="bg-white dark:bg-input text-primary text-[10px] sm:text-xs px-1.5 py-0.5 border-2 border-black font-bold">
              {messages.length}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="w-[calc(100vw-16px)] sm:w-72 border-4 border-black bg-card flex flex-col" style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.3)", maxHeight: "300px" }}>
          {/* Header */}
          <div className="flex items-center justify-between border-b-4 border-black bg-primary px-3 py-1.5 sm:py-2">
            <span className="text-[10px] sm:text-xs font-bold text-primary-foreground uppercase">Chat</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground font-bold text-sm hover:opacity-70"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 min-h-[100px] max-h-[180px] sm:max-h-[250px]">
            {messages.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4 font-medium">
                No messages yet. Say hi!
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span
                  className="text-xs font-bold shrink-0"
                  style={{ color: PLAYER_COLORS[msg.playerIndex % PLAYER_COLORS.length] }}
                >
                  {msg.playerName}:
                </span>
                <span className="text-xs text-foreground break-words">{msg.message}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t-4 border-black p-2 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              maxLength={200}
              className="flex-1 border-2 border-black bg-white dark:bg-input dark:text-foreground text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="border-2 border-black bg-primary text-primary-foreground p-1.5 disabled:opacity-40"
            >
              <Send className="size-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
