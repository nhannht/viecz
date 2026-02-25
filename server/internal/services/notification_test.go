package services

import (
	"context"
	"testing"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/testutil"
)

func TestNewNotificationService(t *testing.T) {
	repo := testutil.NewMockNotificationRepository()
	svc := NewNotificationService(repo, nil)
	if svc == nil {
		t.Fatal("expected non-nil NotificationService")
	}
	if svc.notificationRepo != repo {
		t.Fatal("expected notificationRepo to be set")
	}
}

func TestCreateNotification(t *testing.T) {
	tests := []struct {
		name      string
		userID    int64
		notifType models.NotificationType
		title     string
		message   string
		taskID    *int64
		params    models.StringMap
		wantErr   bool
	}{
		{
			name:      "success without task_id",
			userID:    1,
			notifType: models.NotificationTypeTaskCreated,
			title:     "New Task",
			message:   "A new task was created",
			taskID:    nil,
			params:    nil,
			wantErr:   false,
		},
		{
			name:      "success with task_id",
			userID:    1,
			notifType: models.NotificationTypeApplicationReceived,
			title:     "Application Received",
			message:   "You received an application",
			taskID:    int64Ptr(42),
			params:    models.StringMap{"taskTitle": "Fix bug"},
			wantErr:   false,
		},
		{
			name:      "success with params",
			userID:    2,
			notifType: models.NotificationTypePaymentReceived,
			title:     "Payment",
			message:   "Payment received",
			taskID:    int64Ptr(10),
			params:    models.StringMap{"amount": "50000", "currency": "VND"},
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := testutil.NewMockNotificationRepository()
			svc := NewNotificationService(repo, nil)

			err := svc.CreateNotification(context.Background(), tt.userID, tt.notifType, tt.title, tt.message, tt.taskID, tt.params)
			if (err != nil) != tt.wantErr {
				t.Fatalf("CreateNotification() error = %v, wantErr %v", err, tt.wantErr)
			}

			if !tt.wantErr {
				// Verify notification was stored
				if len(repo.Notifications) != 1 {
					t.Fatalf("expected 1 notification in repo, got %d", len(repo.Notifications))
				}
				var stored *models.Notification
				for _, n := range repo.Notifications {
					stored = n
				}
				if stored.UserID != tt.userID {
					t.Errorf("UserID = %d, want %d", stored.UserID, tt.userID)
				}
				if stored.Type != tt.notifType {
					t.Errorf("Type = %s, want %s", stored.Type, tt.notifType)
				}
				if stored.Title != tt.title {
					t.Errorf("Title = %s, want %s", stored.Title, tt.title)
				}
				if stored.Message != tt.message {
					t.Errorf("Message = %s, want %s", stored.Message, tt.message)
				}
				if tt.taskID != nil {
					if stored.TaskID == nil || *stored.TaskID != *tt.taskID {
						t.Errorf("TaskID = %v, want %v", stored.TaskID, *tt.taskID)
					}
				} else {
					if stored.TaskID != nil {
						t.Errorf("TaskID = %v, want nil", stored.TaskID)
					}
				}
			}
		})
	}
}

func TestGetNotifications(t *testing.T) {
	tests := []struct {
		name        string
		seedUserID  int64
		seedCount   int
		queryUserID int64
		limit       int
		offset      int
		wantCount   int
		wantTotal   int64
	}{
		{
			name:        "returns paginated results",
			seedUserID:  1,
			seedCount:   3,
			queryUserID: 1,
			limit:       10,
			offset:      0,
			wantCount:   3,
			wantTotal:   3,
		},
		{
			name:        "empty results for different user",
			seedUserID:  1,
			seedCount:   3,
			queryUserID: 999,
			limit:       10,
			offset:      0,
			wantCount:   0,
			wantTotal:   0,
		},
		{
			name:        "empty results when no notifications",
			seedUserID:  0,
			seedCount:   0,
			queryUserID: 1,
			limit:       10,
			offset:      0,
			wantCount:   0,
			wantTotal:   0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := testutil.NewMockNotificationRepository()
			svc := NewNotificationService(repo, nil)

			// Seed notifications
			for i := 0; i < tt.seedCount; i++ {
				repo.Notifications[int64(i+1)] = &models.Notification{
					ID:      int64(i + 1),
					UserID:  tt.seedUserID,
					Type:    models.NotificationTypeTaskCreated,
					Title:   "Test",
					Message: "Test message",
				}
			}

			notifications, total, err := svc.GetNotifications(context.Background(), tt.queryUserID, tt.limit, tt.offset)
			if err != nil {
				t.Fatalf("GetNotifications() unexpected error: %v", err)
			}
			if len(notifications) != tt.wantCount {
				t.Errorf("got %d notifications, want %d", len(notifications), tt.wantCount)
			}
			if total != tt.wantTotal {
				t.Errorf("total = %d, want %d", total, tt.wantTotal)
			}
		})
	}
}

func TestGetUnreadCount(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(repo *testutil.MockNotificationRepository)
		userID    int64
		wantCount int64
	}{
		{
			name: "returns unread count",
			setup: func(repo *testutil.MockNotificationRepository) {
				repo.Notifications[1] = &models.Notification{ID: 1, UserID: 1, IsRead: false}
				repo.Notifications[2] = &models.Notification{ID: 2, UserID: 1, IsRead: false}
				repo.Notifications[3] = &models.Notification{ID: 3, UserID: 1, IsRead: true}
			},
			userID:    1,
			wantCount: 2,
		},
		{
			name: "zero count when all read",
			setup: func(repo *testutil.MockNotificationRepository) {
				repo.Notifications[1] = &models.Notification{ID: 1, UserID: 1, IsRead: true}
				repo.Notifications[2] = &models.Notification{ID: 2, UserID: 1, IsRead: true}
			},
			userID:    1,
			wantCount: 0,
		},
		{
			name:      "zero count when no notifications",
			setup:     func(repo *testutil.MockNotificationRepository) {},
			userID:    1,
			wantCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := testutil.NewMockNotificationRepository()
			tt.setup(repo)
			svc := NewNotificationService(repo, nil)

			count, err := svc.GetUnreadCount(context.Background(), tt.userID)
			if err != nil {
				t.Fatalf("GetUnreadCount() unexpected error: %v", err)
			}
			if count != tt.wantCount {
				t.Errorf("count = %d, want %d", count, tt.wantCount)
			}
		})
	}
}

func TestMarkAsRead(t *testing.T) {
	tests := []struct {
		name    string
		setup   func(repo *testutil.MockNotificationRepository)
		id      int64
		userID  int64
		wantErr bool
	}{
		{
			name: "success",
			setup: func(repo *testutil.MockNotificationRepository) {
				repo.Notifications[1] = &models.Notification{ID: 1, UserID: 1, IsRead: false}
			},
			id:      1,
			userID:  1,
			wantErr: false,
		},
		{
			name: "error notification not found",
			setup: func(repo *testutil.MockNotificationRepository) {
				// no notifications seeded
			},
			id:      999,
			userID:  1,
			wantErr: true,
		},
		{
			name: "error user mismatch",
			setup: func(repo *testutil.MockNotificationRepository) {
				repo.Notifications[1] = &models.Notification{ID: 1, UserID: 1, IsRead: false}
			},
			id:      1,
			userID:  999, // different user
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := testutil.NewMockNotificationRepository()
			tt.setup(repo)
			svc := NewNotificationService(repo, nil)

			err := svc.MarkAsRead(context.Background(), tt.id, tt.userID)
			if (err != nil) != tt.wantErr {
				t.Fatalf("MarkAsRead() error = %v, wantErr %v", err, tt.wantErr)
			}

			if !tt.wantErr {
				n := repo.Notifications[tt.id]
				if !n.IsRead {
					t.Error("expected notification to be marked as read")
				}
			}
		})
	}
}

func TestMarkAllAsRead(t *testing.T) {
	tests := []struct {
		name    string
		setup   func(repo *testutil.MockNotificationRepository)
		userID  int64
		wantErr bool
	}{
		{
			name: "success marks all as read",
			setup: func(repo *testutil.MockNotificationRepository) {
				repo.Notifications[1] = &models.Notification{ID: 1, UserID: 1, IsRead: false}
				repo.Notifications[2] = &models.Notification{ID: 2, UserID: 1, IsRead: false}
				repo.Notifications[3] = &models.Notification{ID: 3, UserID: 2, IsRead: false} // different user
			},
			userID:  1,
			wantErr: false,
		},
		{
			name:    "success with no notifications",
			setup:   func(repo *testutil.MockNotificationRepository) {},
			userID:  1,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := testutil.NewMockNotificationRepository()
			tt.setup(repo)
			svc := NewNotificationService(repo, nil)

			err := svc.MarkAllAsRead(context.Background(), tt.userID)
			if (err != nil) != tt.wantErr {
				t.Fatalf("MarkAllAsRead() error = %v, wantErr %v", err, tt.wantErr)
			}

			if !tt.wantErr {
				// Verify only target user's notifications are marked as read
				for _, n := range repo.Notifications {
					if n.UserID == tt.userID && !n.IsRead {
						t.Errorf("notification %d for user %d should be marked as read", n.ID, n.UserID)
					}
					if n.UserID != tt.userID && n.IsRead {
						t.Errorf("notification %d for user %d should NOT be marked as read", n.ID, n.UserID)
					}
				}
			}
		})
	}
}

func TestDeleteNotification(t *testing.T) {
	tests := []struct {
		name    string
		setup   func(repo *testutil.MockNotificationRepository)
		id      int64
		userID  int64
		wantErr bool
	}{
		{
			name: "success",
			setup: func(repo *testutil.MockNotificationRepository) {
				repo.Notifications[1] = &models.Notification{ID: 1, UserID: 1}
			},
			id:      1,
			userID:  1,
			wantErr: false,
		},
		{
			name: "error notification not found",
			setup: func(repo *testutil.MockNotificationRepository) {
				// no notifications
			},
			id:      999,
			userID:  1,
			wantErr: true,
		},
		{
			name: "error user mismatch",
			setup: func(repo *testutil.MockNotificationRepository) {
				repo.Notifications[1] = &models.Notification{ID: 1, UserID: 1}
			},
			id:      1,
			userID:  999, // different user
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := testutil.NewMockNotificationRepository()
			tt.setup(repo)
			svc := NewNotificationService(repo, nil)

			err := svc.DeleteNotification(context.Background(), tt.id, tt.userID)
			if (err != nil) != tt.wantErr {
				t.Fatalf("DeleteNotification() error = %v, wantErr %v", err, tt.wantErr)
			}

			if !tt.wantErr {
				if _, exists := repo.Notifications[tt.id]; exists {
					t.Error("expected notification to be deleted from repo")
				}
			}
		})
	}
}

// int64Ptr is a helper to create a pointer to an int64 value.
func int64Ptr(v int64) *int64 {
	return &v
}
