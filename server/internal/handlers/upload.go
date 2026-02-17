package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"viecz.vieczserver/internal/services"
)

const maxAvatarSize = 5 << 20 // 5MB

// allowedMIMETypes maps allowed MIME types to file extensions.
var allowedMIMETypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// UploadHandler handles file upload HTTP requests.
type UploadHandler struct {
	uploadDir   string
	userService *services.UserService
}

// NewUploadHandler creates a new upload handler.
func NewUploadHandler(uploadDir string, userService *services.UserService) *UploadHandler {
	return &UploadHandler{
		uploadDir:   uploadDir,
		userService: userService,
	}
}

// UploadAvatar handles avatar image uploads.
// POST /api/v1/users/me/avatar (multipart/form-data, field: "avatar")
func (h *UploadHandler) UploadAvatar(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Limit request body to maxAvatarSize + 512 bytes for multipart overhead
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxAvatarSize+512)

	file, header, err := c.Request.FormFile("avatar")
	if err != nil {
		if err.Error() == "http: request body too large" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "file too large, maximum 5MB"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "avatar file is required"})
		return
	}
	defer file.Close()

	// Check declared file size
	if header.Size > maxAvatarSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file too large, maximum 5MB"})
		return
	}

	// Read first 512 bytes for MIME detection
	buf := make([]byte, 512)
	n, err := file.Read(buf)
	if err != nil && err != io.EOF {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read file"})
		return
	}
	buf = buf[:n]

	// Detect MIME type via http.DetectContentType + magic byte validation
	detectedMIME := http.DetectContentType(buf)
	// http.DetectContentType may return "image/jpeg", "image/png", "image/webp", etc.
	// Normalize: strip any parameters (e.g., "image/jpeg; charset=...")
	detectedMIME = strings.Split(detectedMIME, ";")[0]

	if !validateMagicBytes(buf, detectedMIME) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid image file, only JPEG, PNG, and WebP are allowed"})
		return
	}

	ext, allowed := allowedMIMETypes[detectedMIME]
	if !allowed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid image file, only JPEG, PNG, and WebP are allowed"})
		return
	}

	// Seek back to start after reading header bytes
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process file"})
		return
	}

	// Delete old avatar if it exists
	user, err := h.userService.GetProfile(c.Request.Context(), userID.(int64))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	if user.AvatarURL != nil && *user.AvatarURL != "" {
		// AvatarURL is like "/uploads/avatars/<uuid>.<ext>"
		// Extract filename and resolve relative to uploadDir
		oldFilename := filepath.Base(*user.AvatarURL)
		oldPath := filepath.Join(h.uploadDir, "avatars", oldFilename)
		_ = os.Remove(oldPath) // best-effort delete
	}

	// Generate UUID filename
	filename := uuid.New().String() + ext
	avatarDir := filepath.Join(h.uploadDir, "avatars")
	if err := os.MkdirAll(avatarDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create upload directory"})
		return
	}

	destPath := filepath.Join(avatarDir, filename)
	out, err := os.Create(destPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		os.Remove(destPath) // cleanup on failure
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}

	// Build URL and update user profile
	avatarURL := fmt.Sprintf("/uploads/avatars/%s", filename)
	input := &services.UpdateProfileInput{
		AvatarURL: &avatarURL,
	}

	updatedUser, err := h.userService.UpdateProfile(c.Request.Context(), userID.(int64), input)
	if err != nil {
		os.Remove(destPath) // cleanup on failure
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, updatedUser)
}

// validateMagicBytes checks file header bytes against known image signatures.
func validateMagicBytes(buf []byte, mime string) bool {
	switch mime {
	case "image/jpeg":
		// JPEG: FF D8 FF
		return len(buf) >= 3 && buf[0] == 0xFF && buf[1] == 0xD8 && buf[2] == 0xFF
	case "image/png":
		// PNG: 89 50 4E 47
		return len(buf) >= 4 && buf[0] == 0x89 && buf[1] == 0x50 && buf[2] == 0x4E && buf[3] == 0x47
	case "image/webp":
		// WebP: RIFF....WEBP (bytes 0-3: "RIFF", bytes 8-11: "WEBP")
		return len(buf) >= 12 &&
			buf[0] == 'R' && buf[1] == 'I' && buf[2] == 'F' && buf[3] == 'F' &&
			buf[8] == 'W' && buf[9] == 'E' && buf[10] == 'B' && buf[11] == 'P'
	default:
		return false
	}
}
