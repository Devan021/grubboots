"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, X, Send, ShoppingBag, Footprints, ThumbsUp } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  productLink?: string
  productName?: string
}

interface ChatWidgetProps {
  position?: "bottom-right" | "bottom-left"
  primaryColor?: string
  secondaryColor?: string
}

export default function ChatWidget({
  position = "bottom-right",
  primaryColor = "#ff6b6b",
  secondaryColor = "#546de5",
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hey there! 👋 I'm your Grubs Footwear  assistant. Let me help you deciide the best footwear for you...",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Extract product links from messages
  const extractProductInfo = (content: string): { link: string; name: string } | null => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const match = content.match(urlRegex)

    if (match && match[0]) {
      const url = match[0]
      // Try to extract product name from URL or from content
      const productNameMatch = url.match(/\/product-page\/([^/]+)/)
      let productName = "Product"

      if (productNameMatch && productNameMatch[1]) {
        productName = productNameMatch[1]
          .replace(/-/g, " ")
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      } else {
        // Try to extract from content using the format in the prompt
        const contentMatch = content.match(/our ([^–]+)–/)
        if (contentMatch && contentMatch[1]) {
          productName = contentMatch[1].trim()
        }
      }

      return { link: url, name: productName }
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent | string) => {
    e?.preventDefault?.()

    const messageText = typeof e === "string" ? e : input
    if ((!messageText.trim() && typeof e !== "string") || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setIsTyping(true)
    setShowSuggestions(false)

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

                // Extract product info after message is complete
                const productInfo = extractProductInfo(assistantMessage)
                if (productInfo) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageObj.id
                        ? {
                            ...msg,
                            content: assistantMessage,
                            productLink: productInfo.link,
                            productName: productInfo.name,
                          }
                        : msg,
                    ),
                  )
                }

                // Show suggestions again after a response
                setTimeout(() => setShowSuggestions(true), 1000)
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

      // Show suggestions again after error
      setTimeout(() => setShowSuggestions(true), 1000)
    } finally {
      setIsLoading(false)
    }
  }

  const suggestions = ["Running shoes", "Winter boots", "Rain boots", "Comfort wear"]

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
            <ShoppingBag className="h-7 w-7 absolute -left-4 -top-4 text-white/90" />
            <MessageCircle className="h-7 w-7 text-white" />
            <Footprints className="h-5 w-5 absolute -right-4 -bottom-4 text-white/90" />
          </div>
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card
          className="w-[340px] sm:w-[380px] h-[600px] shadow-2xl border-0 overflow-hidden animate-in slide-in-from-bottom-5 duration-300 rounded-2xl"
          style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.15)" }}
        >
          <CardHeader
            className="pb-3 text-white relative h-24 flex items-center"
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
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center p-2">
                  <div className="relative">
                    <ShoppingBag className="h-5 w-5 absolute -left-3 -top-3 text-white/90" />
                    <Footprints className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Grubs Footwear Assistant</CardTitle>
                  <p className="text-xs opacity-90 flex items-center">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-300 mr-2 animate-pulse"></span>
                    Ready to find your perfect footwear
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

          <CardContent className="flex flex-col h-[calc(600px-6rem)] p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex-shrink-0 flex items-center justify-center mr-2 mt-1">
                      <Footprints className="h-4 w-4 text-white" />
                    </div>
                  )}

                  <div className="flex flex-col max-w-[80%]">
                    <div
                      className={`p-3 rounded-2xl text-sm ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-tr-none"
                          : "bg-gray-100 text-gray-800 rounded-tl-none"
                      }`}
                    >
                      {message.content}
                    </div>

                    {/* Product Card */}
                    {message.role === "assistant" && message.productLink && (
                      <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                        <div className="p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <ShoppingBag className="h-4 w-4 text-pink-500" />
                            <span className="font-medium text-sm">{message.productName}</span>
                          </div>
                          <div className="bg-gray-100 h-24 rounded-lg mb-2 flex items-center justify-center">
                            <Footprints className="h-8 w-8 text-gray-400" />
                          </div>
                          <a
                            href={message.productLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-gradient-to-r from-pink-500 to-violet-500 text-white py-2 px-3 rounded-lg inline-block hover:opacity-90 transition-opacity"
                          >
                            View Product
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center ml-2 mt-1">
                      <span className="text-xs text-white font-medium">You</span>
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex-shrink-0 flex items-center justify-center mr-2">
                    <Footprints className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none">
                    <div className="flex space-x-1">
                      <div
                        className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Suggestions */}
              {showSuggestions && !isTyping && messages.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSubmit(suggestion)}
                      className="bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-xs py-1.5 px-3 rounded-full transition-colors flex items-center space-x-1"
                    >
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-4 bg-white">
              <form onSubmit={handleSubmit} className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about shoes, clothing..."
                  className="flex-1 border-gray-200 focus:border-gray-300 rounded-full py-6"
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
                  Powered by Grubs Warehouse
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
