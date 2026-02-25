package models

import (
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func int64Ptr(i int64) *int64 { return &i }

func validTaskApplication() *TaskApplication {
	return &TaskApplication{
		TaskID:   1,
		TaskerID: 2,
		Status:   ApplicationStatusPending,
	}
}

func TestTaskApplication_Validate(t *testing.T) {
	tests := []struct {
		name    string
		app     *TaskApplication
		wantErr bool
		errMsg  string
	}{
		{
			name:    "valid application - minimal",
			app:     validTaskApplication(),
			wantErr: false,
		},
		{
			name: "valid application - with proposed price and message",
			app: func() *TaskApplication {
				a := validTaskApplication()
				a.ProposedPrice = int64Ptr(50000)
				a.Message = stringPtr("I can help with this task!")
				return a
			}(),
			wantErr: false,
		},
		{
			name: "valid application - accepted status",
			app: func() *TaskApplication {
				a := validTaskApplication()
				a.Status = ApplicationStatusAccepted
				return a
			}(),
			wantErr: false,
		},
		{
			name: "valid application - rejected status",
			app: func() *TaskApplication {
				a := validTaskApplication()
				a.Status = ApplicationStatusRejected
				return a
			}(),
			wantErr: false,
		},
		{
			name: "missing task_id",
			app: func() *TaskApplication {
				a := validTaskApplication()
				a.TaskID = 0
				return a
			}(),
			wantErr: true,
			errMsg:  "task_id is required",
		},
		{
			name: "missing tasker_id",
			app: func() *TaskApplication {
				a := validTaskApplication()
				a.TaskerID = 0
				return a
			}(),
			wantErr: true,
			errMsg:  "tasker_id is required",
		},
		{
			name: "proposed price zero",
			app: func() *TaskApplication {
				a := validTaskApplication()
				a.ProposedPrice = int64Ptr(0)
				return a
			}(),
			wantErr: true,
			errMsg:  "proposed_price must be greater than 0",
		},
		{
			name: "proposed price negative",
			app: func() *TaskApplication {
				a := validTaskApplication()
				a.ProposedPrice = int64Ptr(-100)
				return a
			}(),
			wantErr: true,
			errMsg:  "proposed_price must be greater than 0",
		},
		{
			name: "nil proposed price - valid",
			app: func() *TaskApplication {
				a := validTaskApplication()
				a.ProposedPrice = nil
				return a
			}(),
			wantErr: false,
		},
		{
			name: "message too long",
			app: func() *TaskApplication {
				a := validTaskApplication()
				longMsg := string(make([]byte, 501))
				a.Message = &longMsg
				return a
			}(),
			wantErr: true,
			errMsg:  "message must be less than 500 characters",
		},
		{
			name: "message exactly 500 - valid",
			app: func() *TaskApplication {
				a := validTaskApplication()
				msg := string(make([]byte, 500))
				a.Message = &msg
				return a
			}(),
			wantErr: false,
		},
		{
			name: "nil message - valid",
			app: func() *TaskApplication {
				a := validTaskApplication()
				a.Message = nil
				return a
			}(),
			wantErr: false,
		},
		{
			name: "invalid status",
			app: func() *TaskApplication {
				a := validTaskApplication()
				a.Status = "invalid_status"
				return a
			}(),
			wantErr: true,
			errMsg:  "invalid status: invalid_status",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.app.Validate()

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

func TestTaskApplication_BeforeCreate(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Silent),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&TaskApplication{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	tests := []struct {
		name    string
		app     *TaskApplication
		wantErr bool
	}{
		{
			name:    "valid application - hook passes",
			app:     validTaskApplication(),
			wantErr: false,
		},
		{
			name: "invalid application - missing task_id",
			app: func() *TaskApplication {
				a := validTaskApplication()
				a.TaskID = 0
				return a
			}(),
			wantErr: true,
		},
		{
			name: "invalid application - missing tasker_id",
			app: func() *TaskApplication {
				a := validTaskApplication()
				a.TaskerID = 0
				return a
			}(),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := db.Create(tt.app).Error

			if tt.wantErr {
				if err == nil {
					t.Error("Expected BeforeCreate hook to fail, but it passed")
				}
			} else {
				if err != nil {
					t.Errorf("Expected BeforeCreate hook to pass, got error: %v", err)
				}
				if tt.app.ID == 0 {
					t.Error("Expected ID to be set after create")
				}
			}
		})
	}
}

func TestTaskApplication_BeforeUpdate(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Silent),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&TaskApplication{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	tests := []struct {
		name    string
		update  func(*TaskApplication)
		wantErr bool
	}{
		{
			name: "valid update - change status",
			update: func(a *TaskApplication) {
				a.Status = ApplicationStatusAccepted
			},
			wantErr: false,
		},
		{
			name: "invalid update - zero task_id",
			update: func(a *TaskApplication) {
				a.TaskID = 0
			},
			wantErr: true,
		},
		{
			name: "invalid update - invalid status",
			update: func(a *TaskApplication) {
				a.Status = "bogus"
			},
			wantErr: true,
		},
		{
			name: "invalid update - zero proposed price",
			update: func(a *TaskApplication) {
				a.ProposedPrice = int64Ptr(0)
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testApp := validTaskApplication()
			if err := db.Create(testApp).Error; err != nil {
				t.Fatalf("Failed to create test application: %v", err)
			}

			tt.update(testApp)
			err := db.Save(testApp).Error

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
