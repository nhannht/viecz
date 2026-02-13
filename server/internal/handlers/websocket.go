package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"viecz.vieczserver/internal/auth"
	"viecz.vieczserver/internal/services"
	ws "viecz.vieczserver/internal/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// TODO: In production, check origin properly
		return true
	},
}

// WebSocketHandler handles WebSocket connections
type WebSocketHandler struct {
	hub            *ws.Hub
	messageService *services.MessageService
	jwtSecret      string
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(hub *ws.Hub, messageService *services.MessageService, jwtSecret string) *WebSocketHandler {
	return &WebSocketHandler{
		hub:            hub,
		messageService: messageService,
		jwtSecret:      jwtSecret,
	}
}

// HandleWebSocket upgrades HTTP connection to WebSocket
// GET /ws?token=<jwt_token>
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	// Get JWT token from query parameter or header
	tokenString := c.Query("token")
	if tokenString == "" {
		tokenString = c.GetHeader("Authorization")
		if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
			tokenString = tokenString[7:]
		}
	}

	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authentication token"})
		return
	}

	// Validate JWT token
	claims, err := auth.ValidateToken(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	// Extract user ID from claims
	userID := uint(claims.UserID)

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WebSocket] Upgrade error: %v", err)
		return
	}

	// Create client and register with hub
	client := ws.NewClient(conn, h.hub, userID, h.messageService)
	h.hub.Register <- client

	// Start client's read/write pumps
	client.Start()

	log.Printf("[WebSocket] Client connected: UserID=%d", userID)
}

// MessageHandler handles HTTP message endpoints
type MessageHandler struct {
	messageService *services.MessageService
}

// NewMessageHandler creates a new message handler
func NewMessageHandler(messageService *services.MessageService) *MessageHandler {
	return &MessageHandler{
		messageService: messageService,
	}
}

// GetConversations returns all conversations for the authenticated user
// GET /api/v1/conversations
func (h *MessageHandler) GetConversations(c *gin.Context) {
	userID, ok := auth.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	conversations, err := h.messageService.GetUserConversations(c.Request.Context(), uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, conversations)
}

// GetConversationMessages returns message history for a conversation
// GET /api/v1/conversations/:id/messages?limit=50&offset=0
func (h *MessageHandler) GetConversationMessages(c *gin.Context) {
	userID, ok := auth.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	conversationID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid conversation ID"})
		return
	}

	limit := 50
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	offset := 0
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil {
			offset = o
		}
	}

	messages, err := h.messageService.GetConversationHistory(
		c.Request.Context(),
		uint(conversationID),
		uint(userID),
		limit,
		offset,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, messages)
}

// CreateConversation creates a new conversation for a task
// POST /api/v1/conversations
// Body: {"task_id": 1, "tasker_id": 2}
func (h *MessageHandler) CreateConversation(c *gin.Context) {
	userID, ok := auth.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req struct {
		TaskID   uint `json:"task_id" binding:"required"`
		TaskerID uint `json:"tasker_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	conversation, err := h.messageService.CreateConversation(
		c.Request.Context(),
		req.TaskID,
		uint(userID),
		req.TaskerID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, conversation)
}
