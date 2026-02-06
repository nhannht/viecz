package websocket

import (
	"log"
	"sync"

	"viecz.vieczserver/internal/models"
)

// Hub maintains active clients and broadcasts messages to clients
type Hub struct {
	// Registered clients mapped by user ID
	clients map[uint]*Client

	// Clients in specific conversations
	conversations map[uint]map[*Client]bool

	// Inbound messages from clients
	Broadcast chan *BroadcastMessage

	// Register requests from clients
	Register chan *Client

	// Unregister requests from clients
	Unregister chan *Client

	// Mutex for thread-safe operations
	mu sync.RWMutex
}

// BroadcastMessage represents a message to broadcast to conversation participants
type BroadcastMessage struct {
	ConversationID uint
	Message        *models.WebSocketMessage
	ExcludeUserID  uint // Don't send to this user (usually the sender)
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		clients:       make(map[uint]*Client),
		conversations: make(map[uint]map[*Client]bool),
		Broadcast:     make(chan *BroadcastMessage, 256),
		Register:      make(chan *Client),
		Unregister:    make(chan *Client),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.registerClient(client)

		case client := <-h.Unregister:
			h.unregisterClient(client)

		case message := <-h.Broadcast:
			h.broadcastMessage(message)
		}
	}
}

func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Register client by user ID
	h.clients[client.UserID] = client

	log.Printf("[Hub] Client registered: UserID=%d", client.UserID)
}

func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Remove from clients map
	if _, ok := h.clients[client.UserID]; ok {
		delete(h.clients, client.UserID)
		close(client.send)
		log.Printf("[Hub] Client unregistered: UserID=%d", client.UserID)
	}

	// Remove from all conversations
	for conversationID, clients := range h.conversations {
		if clients[client] {
			delete(clients, client)
			if len(clients) == 0 {
				delete(h.conversations, conversationID)
			}
		}
	}
}

func (h *Hub) broadcastMessage(msg *BroadcastMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	// Get clients in this conversation
	clients, ok := h.conversations[msg.ConversationID]
	if !ok {
		log.Printf("[Hub] No clients in conversation %d", msg.ConversationID)
		return
	}

	// Broadcast to all clients in the conversation except sender
	for client := range clients {
		if client.UserID == msg.ExcludeUserID {
			continue
		}

		select {
		case client.send <- msg.Message:
			log.Printf("[Hub] Message sent to UserID=%d in ConversationID=%d", client.UserID, msg.ConversationID)
		default:
			// Client's send buffer is full, close connection
			close(client.send)
			delete(clients, client)
			delete(h.clients, client.UserID)
			log.Printf("[Hub] Client send buffer full, closing: UserID=%d", client.UserID)
		}
	}
}

// JoinConversation adds a client to a conversation room
func (h *Hub) JoinConversation(client *Client, conversationID uint) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.conversations[conversationID] == nil {
		h.conversations[conversationID] = make(map[*Client]bool)
	}

	h.conversations[conversationID][client] = true
	log.Printf("[Hub] Client joined conversation: UserID=%d, ConversationID=%d", client.UserID, conversationID)
}

// LeaveConversation removes a client from a conversation room
func (h *Hub) LeaveConversation(client *Client, conversationID uint) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, ok := h.conversations[conversationID]; ok {
		delete(clients, client)
		if len(clients) == 0 {
			delete(h.conversations, conversationID)
		}
		log.Printf("[Hub] Client left conversation: UserID=%d, ConversationID=%d", client.UserID, conversationID)
	}
}

// SendToUser sends a message to a specific user if they're connected
func (h *Hub) SendToUser(userID uint, message *models.WebSocketMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	client, ok := h.clients[userID]
	if !ok {
		log.Printf("[Hub] User not connected: UserID=%d", userID)
		return
	}

	select {
	case client.send <- message:
		log.Printf("[Hub] Message sent to UserID=%d", userID)
	default:
		log.Printf("[Hub] Failed to send to UserID=%d (buffer full)", userID)
	}
}

// IsUserOnline checks if a user is currently connected
func (h *Hub) IsUserOnline(userID uint) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	_, ok := h.clients[userID]
	return ok
}
