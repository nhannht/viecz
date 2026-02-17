package handlers

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
)

// createMultipartBody builds a multipart/form-data body with the given field name and file content.
func createMultipartBody(fieldName, fileName string, content []byte) (*bytes.Buffer, string) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile(fieldName, fileName)
	part.Write(content)
	writer.Close()
	return body, writer.FormDataContentType()
}

// validJPEG returns a minimal valid JPEG byte sequence.
func validJPEG() []byte {
	// Minimal JPEG: SOI + APP0 marker + EOI
	return []byte{
		0xFF, 0xD8, 0xFF, 0xE0, // SOI + APP0 marker
		0x00, 0x10, // Length
		'J', 'F', 'I', 'F', 0x00, // JFIF identifier
		0x01, 0x01, // Version
		0x00,       // Units
		0x00, 0x01, // X density
		0x00, 0x01, // Y density
		0x00, 0x00, // Thumbnail
		0xFF, 0xD9, // EOI
	}
}

// validPNG returns a minimal valid PNG byte sequence.
func validPNG() []byte {
	return []byte{
		0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
		// Minimal IHDR chunk
		0x00, 0x00, 0x00, 0x0D, // Chunk length
		'I', 'H', 'D', 'R',
		0x00, 0x00, 0x00, 0x01, // Width: 1
		0x00, 0x00, 0x00, 0x01, // Height: 1
		0x08, 0x02, // Bit depth: 8, Color type: RGB
		0x00, 0x00, 0x00, // Compression, filter, interlace
		0x90, 0x77, 0x53, 0xDE, // CRC
	}
}

func TestUploadHandler_UploadAvatar(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setUserID      bool
		userID         int64
		setupMock      func(*mockUserRepository)
		buildRequest   func(uploadDir string) (*http.Request, error)
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder, string)
	}{
		{
			name:      "valid JPEG upload",
			setUserID: true,
			userID:    1,
			setupMock: func(repo *mockUserRepository) {
				repo.usersById[1] = &models.User{
					ID:    1,
					Email: "test@example.com",
					Name:  "Test User",
				}
			},
			buildRequest: func(_ string) (*http.Request, error) {
				body, contentType := createMultipartBody("avatar", "photo.jpg", validJPEG())
				req, err := http.NewRequest(http.MethodPost, "/api/v1/users/me/avatar", body)
				if err != nil {
					return nil, err
				}
				req.Header.Set("Content-Type", contentType)
				return req, nil
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder, uploadDir string) {
				var user models.User
				if err := json.Unmarshal(w.Body.Bytes(), &user); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if user.AvatarURL == nil || !strings.HasPrefix(*user.AvatarURL, "/uploads/avatars/") {
					t.Errorf("Expected avatar URL to start with /uploads/avatars/, got %v", user.AvatarURL)
				}
				if user.AvatarURL != nil && !strings.HasSuffix(*user.AvatarURL, ".jpg") {
					t.Errorf("Expected .jpg extension, got %s", *user.AvatarURL)
				}
				// Verify file exists on disk
				if user.AvatarURL != nil {
					filePath := filepath.Join(uploadDir, "avatars", filepath.Base(*user.AvatarURL))
					if _, err := os.Stat(filePath); os.IsNotExist(err) {
						t.Errorf("Expected file to exist at %s", filePath)
					}
				}
			},
		},
		{
			name:      "valid PNG upload",
			setUserID: true,
			userID:    1,
			setupMock: func(repo *mockUserRepository) {
				repo.usersById[1] = &models.User{
					ID:    1,
					Email: "test@example.com",
					Name:  "Test User",
				}
			},
			buildRequest: func(_ string) (*http.Request, error) {
				body, contentType := createMultipartBody("avatar", "photo.png", validPNG())
				req, err := http.NewRequest(http.MethodPost, "/api/v1/users/me/avatar", body)
				if err != nil {
					return nil, err
				}
				req.Header.Set("Content-Type", contentType)
				return req, nil
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder, _ string) {
				var user models.User
				if err := json.Unmarshal(w.Body.Bytes(), &user); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if user.AvatarURL == nil || !strings.HasSuffix(*user.AvatarURL, ".png") {
					t.Errorf("Expected .png extension, got %v", user.AvatarURL)
				}
			},
		},
		{
			name:      "invalid MIME type (text file)",
			setUserID: true,
			userID:    1,
			setupMock: func(repo *mockUserRepository) {
				repo.usersById[1] = &models.User{
					ID:    1,
					Email: "test@example.com",
					Name:  "Test User",
				}
			},
			buildRequest: func(_ string) (*http.Request, error) {
				body, contentType := createMultipartBody("avatar", "malicious.jpg", []byte("this is plain text, not an image"))
				req, err := http.NewRequest(http.MethodPost, "/api/v1/users/me/avatar", body)
				if err != nil {
					return nil, err
				}
				req.Header.Set("Content-Type", contentType)
				return req, nil
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder, _ string) {
				var response map[string]string
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if !strings.Contains(response["error"], "invalid image file") {
					t.Errorf("Expected invalid image error, got '%s'", response["error"])
				}
			},
		},
		{
			name:           "unauthenticated - no user ID",
			setUserID:      false,
			setupMock:      func(repo *mockUserRepository) {},
			buildRequest: func(_ string) (*http.Request, error) {
				body, contentType := createMultipartBody("avatar", "photo.jpg", validJPEG())
				req, err := http.NewRequest(http.MethodPost, "/api/v1/users/me/avatar", body)
				if err != nil {
					return nil, err
				}
				req.Header.Set("Content-Type", contentType)
				return req, nil
			},
			expectedStatus: http.StatusUnauthorized,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder, _ string) {
				var response map[string]string
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if response["error"] != "unauthorized" {
					t.Errorf("Expected 'unauthorized', got '%s'", response["error"])
				}
			},
		},
		{
			name:      "missing avatar field",
			setUserID: true,
			userID:    1,
			setupMock: func(repo *mockUserRepository) {},
			buildRequest: func(_ string) (*http.Request, error) {
				// Send multipart with wrong field name
				body, contentType := createMultipartBody("wrong_field", "photo.jpg", validJPEG())
				req, err := http.NewRequest(http.MethodPost, "/api/v1/users/me/avatar", body)
				if err != nil {
					return nil, err
				}
				req.Header.Set("Content-Type", contentType)
				return req, nil
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder, _ string) {
				var response map[string]string
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if !strings.Contains(response["error"], "avatar file is required") {
					t.Errorf("Expected 'avatar file is required', got '%s'", response["error"])
				}
			},
		},
		{
			name:      "old avatar deleted on new upload",
			setUserID: true,
			userID:    1,
			setupMock: func(repo *mockUserRepository) {
				oldURL := "/uploads/avatars/old-avatar.jpg"
				repo.usersById[1] = &models.User{
					ID:        1,
					Email:     "test@example.com",
					Name:      "Test User",
					AvatarURL: &oldURL,
				}
			},
			buildRequest: func(uploadDir string) (*http.Request, error) {
				// Create old avatar file
				avatarDir := filepath.Join(uploadDir, "avatars")
				os.MkdirAll(avatarDir, 0755)
				os.WriteFile(filepath.Join(avatarDir, "old-avatar.jpg"), validJPEG(), 0644)

				body, contentType := createMultipartBody("avatar", "new.jpg", validJPEG())
				req, err := http.NewRequest(http.MethodPost, "/api/v1/users/me/avatar", body)
				if err != nil {
					return nil, err
				}
				req.Header.Set("Content-Type", contentType)
				return req, nil
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder, uploadDir string) {
				// Verify old avatar file was deleted
				oldPath := filepath.Join(uploadDir, "avatars", "old-avatar.jpg")
				if _, err := os.Stat(oldPath); !os.IsNotExist(err) {
					t.Error("Expected old avatar file to be deleted")
				}

				// Verify new avatar URL is set
				var user models.User
				if err := json.Unmarshal(w.Body.Bytes(), &user); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if user.AvatarURL == nil || !strings.HasPrefix(*user.AvatarURL, "/uploads/avatars/") {
					t.Errorf("Expected new avatar URL, got %v", user.AvatarURL)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temp upload directory for each test
			uploadDir := t.TempDir()

			// Setup
			mockRepo := newMockUserRepository()
			if tt.setupMock != nil {
				tt.setupMock(mockRepo)
			}

			userService := services.NewUserService(mockRepo)
			handler := NewUploadHandler(uploadDir, userService)

			// Build request
			req, err := tt.buildRequest(uploadDir)
			if err != nil {
				t.Fatalf("Failed to build request: %v", err)
			}

			// Create response recorder and gin context
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = req

			// Set user ID in context if needed
			if tt.setUserID {
				c.Set("user_id", tt.userID)
			}

			// Execute
			handler.UploadAvatar(c)

			// Assert status
			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatus, w.Code, w.Body.String())
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, w, uploadDir)
			}
		})
	}
}

func TestValidateMagicBytes(t *testing.T) {
	tests := []struct {
		name     string
		buf      []byte
		mime     string
		expected bool
	}{
		{"valid JPEG", []byte{0xFF, 0xD8, 0xFF, 0xE0}, "image/jpeg", true},
		{"invalid JPEG", []byte{0x00, 0x00, 0x00}, "image/jpeg", false},
		{"valid PNG", []byte{0x89, 0x50, 0x4E, 0x47}, "image/png", true},
		{"invalid PNG", []byte{0x89, 0x50, 0x00, 0x00}, "image/png", false},
		{"valid WebP", []byte{'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'}, "image/webp", true},
		{"invalid WebP", []byte{'R', 'I', 'F', 'F', 0, 0, 0, 0, 'A', 'V', 'I', ' '}, "image/webp", false},
		{"unsupported MIME", []byte{0x47, 0x49, 0x46, 0x38}, "image/gif", false},
		{"empty buffer JPEG", []byte{}, "image/jpeg", false},
		{"short buffer PNG", []byte{0x89, 0x50}, "image/png", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validateMagicBytes(tt.buf, tt.mime)
			if result != tt.expected {
				t.Errorf("validateMagicBytes(%v, %q) = %v, want %v", tt.buf, tt.mime, result, tt.expected)
			}
		})
	}
}
