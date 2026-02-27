package services

import (
	"fmt"
	"strings"

	"viecz.vieczserver/internal/models"
)

// ProfileAction defines which action the user is trying to perform.
type ProfileAction string

const (
	ProfileActionPostTask    ProfileAction = "post_task"
	ProfileActionApplyTask   ProfileAction = "apply_task"
	ProfileActionSendMessage ProfileAction = "send_message"
)

// ProfileIncompleteError is returned when a user's profile is missing
// required fields for a given action. Clients use the structured fields
// to render an inline completion UI instead of redirecting to the profile page.
type ProfileIncompleteError struct {
	MissingFields []string      `json:"missing_fields"`
	Action        ProfileAction `json:"action"`
	Message       string        `json:"message"`
}

func (e *ProfileIncompleteError) Error() string {
	return fmt.Sprintf("profile incomplete for %s: missing %s", e.Action, strings.Join(e.MissingFields, ", "))
}

// profileRequirements maps each action to the fields it requires.
var profileRequirements = map[ProfileAction][]string{
	ProfileActionPostTask:    {"name"},
	ProfileActionApplyTask:   {"name", "bio"},
	ProfileActionSendMessage: {"name"},
}

// CheckProfileForAction validates that the user's profile has all required
// fields for the given action. Returns nil if the profile is complete,
// or a *ProfileIncompleteError listing what's missing.
func CheckProfileForAction(user *models.User, action ProfileAction) *ProfileIncompleteError {
	required, ok := profileRequirements[action]
	if !ok {
		return nil
	}

	var missing []string
	for _, field := range required {
		if isFieldEmpty(user, field) {
			missing = append(missing, field)
		}
	}

	if len(missing) == 0 {
		return nil
	}

	return &ProfileIncompleteError{
		MissingFields: missing,
		Action:        action,
		Message:       profileMessage(action, missing),
	}
}

// isFieldEmpty checks whether a given profile field is missing or blank.
func isFieldEmpty(user *models.User, field string) bool {
	switch field {
	case "name":
		return strings.TrimSpace(user.Name) == "" || strings.TrimSpace(user.Name) == "User"
	case "bio":
		return user.Bio == nil || strings.TrimSpace(*user.Bio) == ""
	default:
		return false
	}
}

// profileMessage returns a user-facing message for the missing fields.
func profileMessage(action ProfileAction, missing []string) string {
	switch action {
	case ProfileActionPostTask:
		return "Complete your profile to post tasks"
	case ProfileActionApplyTask:
		if containsField(missing, "bio") {
			return "Add a bio so the poster can evaluate your application"
		}
		return "Complete your profile to apply for tasks"
	case ProfileActionSendMessage:
		return "Set your name before starting a conversation"
	default:
		return "Complete your profile to continue"
	}
}

func containsField(fields []string, target string) bool {
	for _, f := range fields {
		if f == target {
			return true
		}
	}
	return false
}
