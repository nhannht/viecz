package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
	"viecz.vieczserver/internal/testutil"
)

// newTestNotificationHandler creates a NotificationHandler with a mock repo.
func newTestNotificationHandler() (*NotificationHandler, *testutil.MockNotificationRepository) {
	repo := testutil.NewMockNotificationRepository()
	notifService := services.NewNotificationService(repo, nil)
	handler := NewNotificationHandler(notifService)
	return handler, repo
}

// seedNotification inserts a notification into the mock repo with deterministic ID.
func seedNotification(repo *testutil.MockNotificationRepository, id, userID int64, isRead bool) {
	repo.Notifications[id] = &models.Notification{
		ID:      id,
		UserID:  userID,
		Type:    models.NotificationTypeTaskCreated,
		Title:   "Test Notification",
		Message: "Test notification message",
		IsRead:  isRead,
	}
}

func TestNotificationHandler_GetNotifications(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("success with notifications", func(t *testing.T) {
		handler, repo := newTestNotificationHandler()
		seedNotification(repo, 1, 1, false)
		seedNotification(repo, 2, 1, true)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1))
		c.Request = httptest.NewRequest(http.MethodGet, "/notifications?limit=20&offset=0", nil)

		handler.GetNotifications(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
		}

		var resp map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}

		notifications, ok := resp["notifications"].([]interface{})
		if !ok {
			t.Fatal("expected notifications array in response")
		}
		if len(notifications) != 2 {
			t.Errorf("expected 2 notifications, got %d", len(notifications))
		}

		total, ok := resp["total"].(float64)
		if !ok {
			t.Fatal("expected total in response")
		}
		if int(total) != 2 {
			t.Errorf("expected total 2, got %d", int(total))
		}
	})

	t.Run("unauthorized - no user_id in context", func(t *testing.T) {
		handler, _ := newTestNotificationHandler()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/notifications", nil)

		handler.GetNotifications(c)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("default limit and offset when not provided", func(t *testing.T) {
		handler, repo := newTestNotificationHandler()
		seedNotification(repo, 1, 1, false)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1))
		c.Request = httptest.NewRequest(http.MethodGet, "/notifications", nil)

		handler.GetNotifications(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
		}

		var resp map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}
		notifications := resp["notifications"].([]interface{})
		if len(notifications) != 1 {
			t.Errorf("expected 1 notification, got %d", len(notifications))
		}
	})

	t.Run("negative limit uses default 20", func(t *testing.T) {
		handler, repo := newTestNotificationHandler()
		seedNotification(repo, 1, 1, false)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1))
		c.Request = httptest.NewRequest(http.MethodGet, "/notifications?limit=-5&offset=0", nil)

		handler.GetNotifications(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
		}
	})

	t.Run("limit exceeding 100 uses default 20", func(t *testing.T) {
		handler, repo := newTestNotificationHandler()
		seedNotification(repo, 1, 1, false)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1))
		c.Request = httptest.NewRequest(http.MethodGet, "/notifications?limit=200&offset=0", nil)

		handler.GetNotifications(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
		}
	})

	t.Run("empty notifications returns empty list", func(t *testing.T) {
		handler, _ := newTestNotificationHandler()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1))
		c.Request = httptest.NewRequest(http.MethodGet, "/notifications?limit=20&offset=0", nil)

		handler.GetNotifications(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
		}

		var resp map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}

		total := resp["total"].(float64)
		if int(total) != 0 {
			t.Errorf("expected total 0, got %d", int(total))
		}
	})

	t.Run("notifications filtered by user - only own notifications", func(t *testing.T) {
		handler, repo := newTestNotificationHandler()
		seedNotification(repo, 1, 1, false) // user 1
		seedNotification(repo, 2, 2, false) // user 2
		seedNotification(repo, 3, 1, true)  // user 1

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1))
		c.Request = httptest.NewRequest(http.MethodGet, "/notifications?limit=20&offset=0", nil)

		handler.GetNotifications(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
		}

		var resp map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}

		notifications := resp["notifications"].([]interface{})
		if len(notifications) != 2 {
			t.Errorf("expected 2 notifications for user 1, got %d", len(notifications))
		}
	})
}

func TestNotificationHandler_GetUnreadCount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("success with unread notifications", func(t *testing.T) {
		handler, repo := newTestNotificationHandler()
		seedNotification(repo, 1, 1, false) // unread
		seedNotification(repo, 2, 1, true)  // read
		seedNotification(repo, 3, 1, false) // unread

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1))
		c.Request = httptest.NewRequest(http.MethodGet, "/notifications/unread-count", nil)

		handler.GetUnreadCount(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
		}

		var resp map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}

		count := resp["unread_count"].(float64)
		if int(count) != 2 {
			t.Errorf("expected unread_count 2, got %d", int(count))
		}
	})

	t.Run("success with zero unread", func(t *testing.T) {
		handler, repo := newTestNotificationHandler()
		seedNotification(repo, 1, 1, true) // read

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1))
		c.Request = httptest.NewRequest(http.MethodGet, "/notifications/unread-count", nil)

		handler.GetUnreadCount(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
		}

		var resp map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}

		count := resp["unread_count"].(float64)
		if int(count) != 0 {
			t.Errorf("expected unread_count 0, got %d", int(count))
		}
	})

	t.Run("unauthorized - no user_id in context", func(t *testing.T) {
		handler, _ := newTestNotificationHandler()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/notifications/unread-count", nil)

		handler.GetUnreadCount(c)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})
}

func TestNotificationHandler_MarkAsRead(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("success", func(t *testing.T) {
		handler, repo := newTestNotificationHandler()
		seedNotification(repo, 1, 1, false)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1))
		c.Params = gin.Params{{Key: "id", Value: "1"}}
		c.Request = httptest.NewRequest(http.MethodPost, "/notifications/1/read", nil)

		handler.MarkAsRead(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
		}

		var resp map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}

		msg := resp["message"].(string)
		if msg != "notification marked as read" {
			t.Errorf("expected message 'notification marked as read', got '%s'", msg)
		}

		// Verify notification is now read in the repo
		if !repo.Notifications[1].IsRead {
			t.Error("expected notification to be marked as read in repo")
		}
	})

	t.Run("unauthorized - no user_id in context", func(t *testing.T) {
		handler, _ := newTestNotificationHandler()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "id", Value: "1"}}
		c.Request = httptest.NewRequest(http.MethodPost, "/notifications/1/read", nil)

		handler.MarkAsRead(c)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("invalid id - non-numeric", func(t *testing.T) {
		handler, _ := newTestNotificationHandler()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1))
		c.Params = gin.Params{{Key: "id", Value: "abc"}}
		c.Request = httptest.NewRequest(http.MethodPost, "/notifications/abc/read", nil)

		handler.MarkAsRead(c)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}

		var resp map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}
		if resp["error"] != "invalid notification id" {
			t.Errorf("expected error 'invalid notification id', got '%s'", resp["error"])
		}
	})

	t.Run("notification not found", func(t *testing.T) {
		handler, _ := newTestNotificationHandler()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1))
		c.Params = gin.Params{{Key: "id", Value: "999"}}
		c.Request = httptest.NewRequest(http.MethodPost, "/notifications/999/read", nil)

		handler.MarkAsRead(c)

		if w.Code != http.StatusNotFound {
			t.Errorf("expected status %d, got %d", http.StatusNotFound, w.Code)
		}
	})

	t.Run("notification belongs to different user", func(t *testing.T) {
		handler, repo := newTestNotificationHandler()
		seedNotification(repo, 1, 2, false) // belongs to user 2

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1)) // user 1 trying to mark user 2's notification
		c.Params = gin.Params{{Key: "id", Value: "1"}}
		c.Request = httptest.NewRequest(http.MethodPost, "/notifications/1/read", nil)

		handler.MarkAsRead(c)

		if w.Code != http.StatusNotFound {
			t.Errorf("expected status %d, got %d", http.StatusNotFound, w.Code)
		}
	})
}

func TestNotificationHandler_MarkAllAsRead(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("success", func(t *testing.T) {
		handler, repo := newTestNotificationHandler()
		seedNotification(repo, 1, 1, false)
		seedNotification(repo, 2, 1, false)
		seedNotification(repo, 3, 2, false) // different user, should not be affected

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1))
		c.Request = httptest.NewRequest(http.MethodPost, "/notifications/read-all", nil)

		handler.MarkAllAsRead(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
		}

		var resp map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}

		msg := resp["message"].(string)
		if msg != "all notifications marked as read" {
			t.Errorf("expected message 'all notifications marked as read', got '%s'", msg)
		}

		// Verify user 1's notifications are read
		if !repo.Notifications[1].IsRead {
			t.Error("expected notification 1 to be marked as read")
		}
		if !repo.Notifications[2].IsRead {
			t.Error("expected notification 2 to be marked as read")
		}
		// Verify user 2's notification is NOT affected
		if repo.Notifications[3].IsRead {
			t.Error("expected notification 3 (user 2) to remain unread")
		}
	})

	t.Run("unauthorized - no user_id in context", func(t *testing.T) {
		handler, _ := newTestNotificationHandler()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPost, "/notifications/read-all", nil)

		handler.MarkAllAsRead(c)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})
}

func TestNotificationHandler_DeleteNotification(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("success", func(t *testing.T) {
		handler, repo := newTestNotificationHandler()
		seedNotification(repo, 1, 1, false)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1))
		c.Params = gin.Params{{Key: "id", Value: "1"}}
		c.Request = httptest.NewRequest(http.MethodDelete, "/notifications/1", nil)

		handler.DeleteNotification(c)

		if w.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
		}

		var resp map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}

		msg := resp["message"].(string)
		if msg != "notification deleted" {
			t.Errorf("expected message 'notification deleted', got '%s'", msg)
		}

		// Verify notification is deleted from repo
		if _, exists := repo.Notifications[1]; exists {
			t.Error("expected notification to be deleted from repo")
		}
	})

	t.Run("unauthorized - no user_id in context", func(t *testing.T) {
		handler, _ := newTestNotificationHandler()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "id", Value: "1"}}
		c.Request = httptest.NewRequest(http.MethodDelete, "/notifications/1", nil)

		handler.DeleteNotification(c)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("invalid id - non-numeric", func(t *testing.T) {
		handler, _ := newTestNotificationHandler()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1))
		c.Params = gin.Params{{Key: "id", Value: "xyz"}}
		c.Request = httptest.NewRequest(http.MethodDelete, "/notifications/xyz", nil)

		handler.DeleteNotification(c)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}

		var resp map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}
		if resp["error"] != "invalid notification id" {
			t.Errorf("expected error 'invalid notification id', got '%s'", resp["error"])
		}
	})

	t.Run("notification not found", func(t *testing.T) {
		handler, _ := newTestNotificationHandler()

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1))
		c.Params = gin.Params{{Key: "id", Value: "999"}}
		c.Request = httptest.NewRequest(http.MethodDelete, "/notifications/999", nil)

		handler.DeleteNotification(c)

		if w.Code != http.StatusNotFound {
			t.Errorf("expected status %d, got %d", http.StatusNotFound, w.Code)
		}
	})

	t.Run("notification belongs to different user", func(t *testing.T) {
		handler, repo := newTestNotificationHandler()
		seedNotification(repo, 1, 2, false) // belongs to user 2

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", int64(1)) // user 1 trying to delete user 2's notification
		c.Params = gin.Params{{Key: "id", Value: "1"}}
		c.Request = httptest.NewRequest(http.MethodDelete, "/notifications/1", nil)

		handler.DeleteNotification(c)

		if w.Code != http.StatusNotFound {
			t.Errorf("expected status %d, got %d", http.StatusNotFound, w.Code)
		}

		// Verify notification is NOT deleted
		if _, exists := repo.Notifications[1]; !exists {
			t.Error("expected notification to still exist in repo")
		}
	})
}
