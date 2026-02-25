package models

import (
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func validTask() *Task {
	return &Task{
		RequesterID: 1,
		CategoryID:  1,
		Title:       "Fix my website",
		Description: "Need help fixing CSS layout issues on my portfolio site.",
		Price:       50000,
		Location:    "Ho Chi Minh City",
		Status:      TaskStatusOpen,
	}
}

func TestTask_Validate(t *testing.T) {
	tests := []struct {
		name    string
		task    *Task
		wantErr bool
		errMsg  string
	}{
		{
			name:    "valid task - open",
			task:    validTask(),
			wantErr: false,
		},
		{
			name: "valid task - in_progress",
			task: func() *Task {
				tk := validTask()
				tk.Status = TaskStatusInProgress
				return tk
			}(),
			wantErr: false,
		},
		{
			name: "valid task - completed",
			task: func() *Task {
				tk := validTask()
				tk.Status = TaskStatusCompleted
				return tk
			}(),
			wantErr: false,
		},
		{
			name: "valid task - cancelled",
			task: func() *Task {
				tk := validTask()
				tk.Status = TaskStatusCancelled
				return tk
			}(),
			wantErr: false,
		},
		{
			name: "valid task with images",
			task: func() *Task {
				tk := validTask()
				tk.ImageURLs = []string{"https://example.com/img1.png", "https://example.com/img2.png"}
				return tk
			}(),
			wantErr: false,
		},
		{
			name: "missing requester_id",
			task: func() *Task {
				tk := validTask()
				tk.RequesterID = 0
				return tk
			}(),
			wantErr: true,
			errMsg:  "requester_id is required",
		},
		{
			name: "missing category_id",
			task: func() *Task {
				tk := validTask()
				tk.CategoryID = 0
				return tk
			}(),
			wantErr: true,
			errMsg:  "category_id is required",
		},
		{
			name: "missing title",
			task: func() *Task {
				tk := validTask()
				tk.Title = ""
				return tk
			}(),
			wantErr: true,
			errMsg:  "title is required",
		},
		{
			name: "title too long",
			task: func() *Task {
				tk := validTask()
				tk.Title = string(make([]byte, 201))
				return tk
			}(),
			wantErr: true,
			errMsg:  "title must be less than 200 characters",
		},
		{
			name: "title exactly 200 - valid",
			task: func() *Task {
				tk := validTask()
				tk.Title = string(make([]byte, 200))
				return tk
			}(),
			wantErr: false,
		},
		{
			name: "missing description",
			task: func() *Task {
				tk := validTask()
				tk.Description = ""
				return tk
			}(),
			wantErr: true,
			errMsg:  "description is required",
		},
		{
			name: "description too long",
			task: func() *Task {
				tk := validTask()
				tk.Description = string(make([]byte, 2001))
				return tk
			}(),
			wantErr: true,
			errMsg:  "description must be less than 2000 characters",
		},
		{
			name: "description exactly 2000 - valid",
			task: func() *Task {
				tk := validTask()
				tk.Description = string(make([]byte, 2000))
				return tk
			}(),
			wantErr: false,
		},
		{
			name: "price zero",
			task: func() *Task {
				tk := validTask()
				tk.Price = 0
				return tk
			}(),
			wantErr: true,
			errMsg:  "price must be greater than 0",
		},
		{
			name: "price negative",
			task: func() *Task {
				tk := validTask()
				tk.Price = -100
				return tk
			}(),
			wantErr: true,
			errMsg:  "price must be greater than 0",
		},
		{
			name: "missing location",
			task: func() *Task {
				tk := validTask()
				tk.Location = ""
				return tk
			}(),
			wantErr: true,
			errMsg:  "location is required",
		},
		{
			name: "location too long",
			task: func() *Task {
				tk := validTask()
				tk.Location = string(make([]byte, 256))
				return tk
			}(),
			wantErr: true,
			errMsg:  "location must be less than 255 characters",
		},
		{
			name: "location exactly 255 - valid",
			task: func() *Task {
				tk := validTask()
				tk.Location = string(make([]byte, 255))
				return tk
			}(),
			wantErr: false,
		},
		{
			name: "invalid status",
			task: func() *Task {
				tk := validTask()
				tk.Status = "invalid_status"
				return tk
			}(),
			wantErr: true,
			errMsg:  "invalid status: invalid_status",
		},
		{
			name: "too many images",
			task: func() *Task {
				tk := validTask()
				tk.ImageURLs = []string{"a", "b", "c", "d", "e", "f"}
				return tk
			}(),
			wantErr: true,
			errMsg:  "cannot have more than 5 images",
		},
		{
			name: "exactly 5 images - valid",
			task: func() *Task {
				tk := validTask()
				tk.ImageURLs = []string{"a", "b", "c", "d", "e"}
				return tk
			}(),
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.task.Validate()

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error '%s', got nil", tt.errMsg)
				} else if err.Error() != tt.errMsg {
					t.Errorf("Expected error '%s', got '%s'", tt.errMsg, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
			}
		})
	}
}

func TestTask_IsOverdue(t *testing.T) {
	pastTime := time.Now().Add(-24 * time.Hour)
	futureTime := time.Now().Add(24 * time.Hour)

	tests := []struct {
		name     string
		deadline *time.Time
		want     bool
	}{
		{
			name:     "past deadline - overdue",
			deadline: &pastTime,
			want:     true,
		},
		{
			name:     "future deadline - not overdue",
			deadline: &futureTime,
			want:     false,
		},
		{
			name:     "nil deadline - not overdue",
			deadline: nil,
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			task := &Task{Deadline: tt.deadline}
			got := task.IsOverdue()
			if got != tt.want {
				t.Errorf("IsOverdue() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestTask_BeforeCreate(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Silent),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&Task{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	tests := []struct {
		name    string
		task    *Task
		wantErr bool
	}{
		{
			name:    "valid task - hook passes",
			task:    validTask(),
			wantErr: false,
		},
		{
			name: "invalid task - missing title",
			task: func() *Task {
				tk := validTask()
				tk.Title = ""
				return tk
			}(),
			wantErr: true,
		},
		{
			name: "invalid task - missing requester_id",
			task: func() *Task {
				tk := validTask()
				tk.RequesterID = 0
				return tk
			}(),
			wantErr: true,
		},
		{
			name: "invalid task - price zero",
			task: func() *Task {
				tk := validTask()
				tk.Price = 0
				return tk
			}(),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := db.Create(tt.task).Error

			if tt.wantErr {
				if err == nil {
					t.Error("Expected BeforeCreate hook to fail, but it passed")
				}
			} else {
				if err != nil {
					t.Errorf("Expected BeforeCreate hook to pass, got error: %v", err)
				}
				if tt.task.ID == 0 {
					t.Error("Expected ID to be set after create")
				}
			}
		})
	}
}

func TestTask_BeforeUpdate(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Silent),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&Task{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	tests := []struct {
		name    string
		update  func(*Task)
		wantErr bool
	}{
		{
			name: "valid update - hook passes",
			update: func(tk *Task) {
				tk.Title = "Updated Title"
				tk.Price = 75000
			},
			wantErr: false,
		},
		{
			name: "invalid update - empty title",
			update: func(tk *Task) {
				tk.Title = ""
			},
			wantErr: true,
		},
		{
			name: "invalid update - negative price",
			update: func(tk *Task) {
				tk.Price = -1
			},
			wantErr: true,
		},
		{
			name: "invalid update - invalid status",
			update: func(tk *Task) {
				tk.Status = "bogus"
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testTask := validTask()
			if err := db.Create(testTask).Error; err != nil {
				t.Fatalf("Failed to create test task: %v", err)
			}

			tt.update(testTask)
			err := db.Save(testTask).Error

			if tt.wantErr {
				if err == nil {
					t.Error("Expected BeforeUpdate hook to fail, but it passed")
				}
			} else {
				if err != nil {
					t.Errorf("Expected BeforeUpdate hook to pass, got error: %v", err)
				}
			}
		})
	}
}
