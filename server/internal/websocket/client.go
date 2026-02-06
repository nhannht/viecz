package websocket

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
	"viecz.vieczserver/internal/models"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period (must be less than pongWait)
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 512 * 1024 // 512 KB
)

// Client represents a WebSocket client connection
type Client struct {
	// The websocket connection
	conn *websocket.Conn

	// Hub instance
	hub *Hub

	// User ID of this client
	UserID uint

	// Buffered channel of outbound messages
	send chan *models.WebSocketMessage

	// Message handler for incoming messages
	messageHandler MessageHandler
}

// MessageHandler processes incoming WebSocket messages
type MessageHandler interface {
	HandleMessage(client *Client, message *models.WebSocketMessage) error
}

// NewClient creates a new Client instance
func NewClient(conn *websocket.Conn, hub *Hub, userID uint, handler MessageHandler) *Client {
	return &Client{
		conn:           conn,
		hub:            hub,
		UserID:         userID,
		send:           make(chan *models.WebSocketMessage, 256),
		messageHandler: handler,
	}
}

// readPump pumps messages from the websocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.hub.Unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		var message models.WebSocketMessage
		err := c.conn.ReadJSON(&message)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[Client] WebSocket error: %v", err)
			}
			break
		}

		// Handle the message
		if c.messageHandler != nil {
			if err := c.messageHandler.HandleMessage(c, &message); err != nil {
				log.Printf("[Client] Error handling message: %v", err)
				// Send error back to client
				errorMsg := &models.WebSocketMessage{
					Type:  "error",
					Error: err.Error(),
				}
				c.send <- errorMsg
			}
		}
	}
}

// writePump pumps messages from the hub to the websocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			// Send message as JSON
			if err := c.conn.WriteJSON(message); err != nil {
				log.Printf("[Client] Write error: %v", err)
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// Start begins the client's read and write pumps
func (c *Client) Start() {
	go c.writePump()
	go c.readPump()
}

// Send sends a message to the client
func (c *Client) Send(message *models.WebSocketMessage) {
	select {
	case c.send <- message:
	default:
		log.Printf("[Client] Failed to send message to UserID=%d (buffer full)", c.UserID)
	}
}

// SendJSON sends a JSON-serializable object to the client
func (c *Client) SendJSON(v interface{}) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}

	message := &models.WebSocketMessage{
		Type:    "data",
		Content: string(data),
	}

	c.Send(message)
	return nil
}

// Close closes the client connection
func (c *Client) Close() {
	c.hub.Unregister <- c
}
