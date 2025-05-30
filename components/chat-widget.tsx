"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, X, Send, Footprints, ThumbsUp } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatWidgetProps {
  position?: "bottom-right" | "bottom-left"
  primaryColor?: string
  secondaryColor?: string
}

export default function ChatWidget({
  position = "bottom-right",
  primaryColor = "#e7b200",
  secondaryColor = "#4A4930",
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi there! 👋 I'm your Grubs Footwear assistant. How can I help you find the perfect boots today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isTyping, setIsTyping] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const linkifyText = (text: string): React.ReactNode => {
    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g

    // If no URLs are found, return the plain text
    if (!text.match(urlRegex)) {
      return text
    }

    // Split the text by URLs and map each part
    const parts = text.split(urlRegex)
    const matches = text.match(urlRegex) || []

    return parts.map((part, index) => {
      // Every even index is text content
      if (index % 2 === 0) {
        return part
      }
      // Every odd index is a URL
      const url = matches[(index - 1) / 2]
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
          style={{ wordBreak: "break-word" }}
        >
          {url}
        </a>
      )
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.()

    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setIsTyping(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ""

      const assistantMessageObj: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessageObj])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") {
                setIsLoading(false)
                setIsTyping(false)
                return
              }

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  assistantMessage += parsed.content
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageObj.id ? { ...msg, content: assistantMessage } : msg,
                    ),
                  )
                }
              } catch (e) {
                // Ignore parsing errors for malformed chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setIsTyping(false)
    } finally {
      setIsLoading(false)
    }
  }

  const positionClasses = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-16 w-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          }}
        >
          <div className="relative">
            <Footprints className="h-7 w-7 absolute -left-4 -top-4 text-white/90" />
            <MessageCircle className="h-7 w-7 text-white" />
            <Footprints className="h-5 w-5 absolute -right-4 -bottom-4 text-white/90 rotate-180" />
          </div>
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card
          className="w-[340px] sm:w-[380px] h-[600px] shadow-2xl border-0 overflow-hidden animate-in slide-in-from-bottom-5 duration-300 rounded-2xl"
          style={{
            boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
            backgroundColor: "#1A1D24",
          }}
        >
          <CardHeader
            className="pb-3 text-white relative h-20 flex items-center"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              borderBottom: "2px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div
                className="absolute top-0 left-0 w-full h-full"
                style={{
                  backgroundImage: "url('/placeholder.svg?height=100&width=400')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.2,
                }}
              />
            </div>

            <div className="flex items-center justify-between z-10 w-full">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center p-2">
                  <Footprints className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Grubs Footwear</CardTitle>
                  <p className="text-xs opacity-90 flex items-center">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-300 mr-2 animate-pulse"></span>
                    Boot specialist ready to help
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 text-white hover:bg-white/20 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col h-[calc(600px-5rem)] p-0" style={{ backgroundColor: "#1A1D24" }}>
            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{
                backgroundColor: "#1A1D24",
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(231, 178, 0, 0.3) transparent",
              }}
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-4`}
                >
                  {message.role === "assistant" && (
                    <div
                      className="h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center mr-2 mt-1"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                    >
                      <Footprints className="h-4 w-4 text-white" />
                    </div>
                  )}

                  <div className="flex flex-col max-w-[80%]">
                    <div
                      className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        message.role === "user" ? "text-white rounded-tr-none" : "text-white rounded-tl-none"
                      }`}
                      style={{
                        backgroundColor: message.role === "user" ? primaryColor : "rgba(74, 73, 48, 0.8)",
                      }}
                    >
                      {linkifyText(message.content)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 px-2">
                      {new Intl.DateTimeFormat("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(message.timestamp)}
                    </div>
                  </div>

                  {message.role === "user" && (
                    <div
                      className="h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center ml-2 mt-1"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <span className="text-xs text-black font-medium">You</span>
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div
                    className="h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center mr-2"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                  >
                    <Footprints className="h-4 w-4 text-white" />
                  </div>
                  <div className="p-3 rounded-2xl rounded-tl-none" style={{ backgroundColor: "rgba(74, 73, 48, 0.8)" }}>
                    <div className="flex space-x-1">
                      <div
                        className="h-2 w-2 rounded-full animate-bounce"
                        style={{
                          backgroundColor: primaryColor,
                          animationDelay: "0ms",
                        }}
                      ></div>
                      <div
                        className="h-2 w-2 rounded-full animate-bounce"
                        style={{
                          backgroundColor: primaryColor,
                          animationDelay: "150ms",
                        }}
                      ></div>
                      <div
                        className="h-2 w-2 rounded-full animate-bounce"
                        style={{
                          backgroundColor: primaryColor,
                          animationDelay: "300ms",
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              className="border-t p-4"
              style={{
                backgroundColor: "#1A1D24",
                borderColor: "rgba(231, 178, 0, 0.3)",
              }}
            >
              <form onSubmit={handleSubmit} className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-1 rounded-full py-6 bg-transparent text-white placeholder-gray-400"
                  style={{
                    borderColor: "rgba(231, 178, 0, 0.3)",
                    backgroundColor: "rgba(74, 73, 48, 0.3)",
                  }}
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="rounded-full h-10 w-10 flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>

              <div className="flex justify-center mt-2">
                <span className="text-xs text-gray-400 flex items-center">
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Powered by Grubs Footwear
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
