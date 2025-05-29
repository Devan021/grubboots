class GrubsChatWidget {
  constructor() {
    this.chatButton = document.getElementById("chat-button")
    this.chatWindow = document.getElementById("chat-window")
    this.closeChat = document.getElementById("close-chat")
    this.chatMessages = document.getElementById("chat-messages")
    this.chatForm = document.getElementById("chat-form")
    this.chatInput = document.getElementById("chat-input")
    this.sendButton = document.getElementById("send-button")
    this.suggestionsContainer = document.getElementById("suggestions-container")

    this.initialMessage = {
      id: "1",
      role: "assistant",
      content:
        "Hi there! 👋 Welcome to Grubs! I'm here to find you the perfect boots for any adventure. What activities will you be tackling with your new footwear?",
      timestamp: new Date(),
    }

    this.suggestions = [
      "Walking boots",
      "Safety boots",
      "Country boots",
      "Equestrian boots",
      "Waterproof boots",
      "Winter boots",
    ]

    this.messages = [this.initialMessage]
    this.isTyping = false

    this.init()
  }

  init() {
    this.renderMessages()
    this.renderSuggestions()
    this.bindEvents()
  }

  bindEvents() {
    this.chatButton.addEventListener("click", () => this.toggleChat())
    this.closeChat.addEventListener("click", () => this.toggleChat())
    this.chatForm.addEventListener("submit", (e) => this.handleSubmit(e))
    this.chatInput.addEventListener("input", () => this.handleInput())
  }

  toggleChat() {
    this.chatWindow.classList.toggle("hidden")

    if (!this.chatWindow.classList.contains("hidden")) {
      setTimeout(() => {
        this.chatWindow.classList.add("active")
        this.chatInput.focus()
        this.scrollToBottom()
      }, 10)
    } else {
      this.chatWindow.classList.remove("active")
    }
  }

  handleInput() {
    this.sendButton.disabled = !this.chatInput.value.trim()
  }

  async handleSubmit(e) {
    e.preventDefault()

    const messageText = this.chatInput.value.trim()
    if (!messageText || this.isTyping) return

    this.addMessage("user", messageText)
    this.chatInput.value = ""
    this.sendButton.disabled = true

    await this.sendMessageToWebhook(messageText)
  }

  handleSuggestionClick(suggestion) {
    if (this.isTyping) return

    this.addMessage("user", suggestion)
    this.sendMessageToWebhook(suggestion)
  }

  async sendMessageToWebhook(messageText) {
    this.isTyping = true
    this.showTypingIndicator()
    this.hideSuggestions()

    try {
      const response = await fetch("https://pugai.app.n8n.cloud/webhook/demo1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText,
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Webhook responded with status: ${response.status}`)
      }

      const data = await response.text()
      this.removeTypingIndicator()
      await this.streamResponse(data)

      setTimeout(() => {
        this.renderSuggestions()
      }, 1000)
    } catch (error) {
      console.error("Error:", error)
      this.removeTypingIndicator()

      this.addMessage("assistant", "Sorry, I'm having trouble connecting right now. Please try again in a moment! 😊")

      setTimeout(() => {
        this.renderSuggestions()
      }, 1000)
    } finally {
      this.isTyping = false
    }
  }

  async streamResponse(text) {
    const messageId = Date.now().toString()
    const messageElement = this.createMessageElement("assistant", "", messageId)
    this.chatMessages.appendChild(messageElement)
    this.scrollToBottom()

    const messageBubble = messageElement.querySelector(".message-bubble")
    const words = text.split(" ")
    let streamedText = ""

    for (let i = 0; i < words.length; i++) {
      streamedText += (i > 0 ? " " : "") + words[i]
      // Format URLs as HTML links for better display
      const formattedText = this.formatTextWithLinks(streamedText)
      messageBubble.innerHTML = formattedText
      this.scrollToBottom()
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    this.messages.push({
      id: messageId,
      role: "assistant",
      content: text,
      timestamp: new Date(),
    })

    const productInfo = this.extractProductInfo(text)
    if (productInfo) {
      const productCard = this.createProductCard(productInfo.name, productInfo.link)
      const messageContent = messageElement.querySelector(".message-content")
      messageContent.appendChild(productCard)
      this.scrollToBottom()
    }
  }

  // Add a new method to format text with clickable links
  formatTextWithLinks(text) {
    // Regular expression to find URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g

    // Replace URLs with HTML links
    return text.replace(urlRegex, (url) => {
      // Truncate display URL if it's too long
      const displayUrl = url.length > 30 ? url.substring(0, 27) + "..." : url
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${displayUrl}</a>`
    })
  }

  createMessageElement(role, content, id) {
    const messageDiv = document.createElement("div")
    messageDiv.className = `message ${role}`
    messageDiv.dataset.id = id

    const messageContent = document.createElement("div")
    messageContent.className = "message-content"

    const messageBubble = document.createElement("div")
    messageBubble.className = "message-bubble"

    // Format content with links if it's not empty
    if (content) {
      messageBubble.innerHTML = this.formatTextWithLinks(content)
    } else {
      messageBubble.textContent = ""
    }

    messageContent.appendChild(messageBubble)

    if (role === "user") {
      const avatar = document.createElement("div")
      avatar.className = "message-avatar"
      avatar.innerHTML = "<span>You</span>"
      messageDiv.appendChild(messageContent)
      messageDiv.appendChild(avatar)
    } else {
      const avatar = document.createElement("div")
      avatar.className = "message-avatar"
      avatar.innerHTML = '<i class="fas fa-hiking-boot"></i>'
      messageDiv.appendChild(avatar)
      messageDiv.appendChild(messageContent)
    }

    return messageDiv
  }

  createProductCard(productName, productLink) {
    const card = document.createElement("div")
    card.className = "product-card-chat"

    // Truncate product name if it's too long
    const displayName = productName.length > 25 ? productName.substring(0, 22) + "..." : productName

    card.innerHTML = `
    <div class="product-card-header">
      <i class="fas fa-hiking-boot"></i>
      <span>${displayName}</span>
    </div>
    <div class="product-card-image">
      <i class="fas fa-hiking-boot"></i>
    </div>
    <div class="product-card-footer">
      <a href="${productLink}" class="product-card-link" target="_blank" rel="noopener noreferrer">
        View Boot Details
      </a>
    </div>
  `

    return card
  }

  showTypingIndicator() {
    const typingDiv = document.createElement("div")
    typingDiv.className = "message assistant typing"
    typingDiv.id = "typing-indicator"

    typingDiv.innerHTML = `
      <div class="message-avatar">
        <i class="fas fa-hiking-boot"></i>
      </div>
      <div class="message-content">
        <div class="message-bubble typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `

    this.chatMessages.appendChild(typingDiv)
    this.scrollToBottom()
  }

  removeTypingIndicator() {
    const typingIndicator = document.getElementById("typing-indicator")
    if (typingIndicator) {
      typingIndicator.remove()
    }
  }

  renderMessages() {
    this.chatMessages.innerHTML = ""
    this.messages.forEach((message) => {
      const messageElement = this.createMessageElement(message.role, message.content, message.id)
      this.chatMessages.appendChild(messageElement)

      if (message.role === "assistant") {
        const productInfo = this.extractProductInfo(message.content)
        if (productInfo) {
          const productCard = this.createProductCard(productInfo.name, productInfo.link)
          const messageContent = messageElement.querySelector(".message-content")
          messageContent.appendChild(productCard)
        }
      }
    })
    this.scrollToBottom()
  }

  renderSuggestions() {
    this.suggestionsContainer.innerHTML = ""

    if (!this.isTyping && this.messages.length > 0) {
      this.suggestions.forEach((suggestion) => {
        const chip = document.createElement("button")
        chip.className = "suggestion-chip"
        chip.textContent = suggestion
        chip.addEventListener("click", () => this.handleSuggestionClick(suggestion))
        this.suggestionsContainer.appendChild(chip)
      })
    }
  }

  hideSuggestions() {
    this.suggestionsContainer.innerHTML = ""
  }

  extractProductInfo(content) {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const match = content.match(urlRegex)

    if (match && match[0]) {
      const url = match[0].replace(/[.,!]$/, "") // Remove trailing punctuation
      const productNameMatch = url.match(/\/product-page\/([^/]+)/)
      let productName = "Boot"

      if (productNameMatch && productNameMatch[1]) {
        productName = productNameMatch[1]
          .replace(/-/g, " ")
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      } else {
        // Try to extract product name from content using various patterns
        const patterns = [
          /(?:the|our)\s+([A-Z][A-Z0-9\s.]+?)(?:\s+(?:is|are|–|boots?))/i,
          /(?:the|our)\s+"([^"]+)"/i,
          /(?:the|our)\s+\*\*([^*]+)\*\*/i,
        ]

        for (const pattern of patterns) {
          const contentMatch = content.match(pattern)
          if (contentMatch && contentMatch[1]) {
            productName = contentMatch[1].trim()
            break
          }
        }
      }

      return { link: url, name: productName }
    }
    return null
  }

  scrollToBottom() {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight
  }
}

// Initialize the chat widget when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new GrubsChatWidget()
})
