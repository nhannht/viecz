package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
	"viecz.vieczserver/internal/testutil"
)

// ──────────────────────────────────────────────
// 1. GetConversation — was 0% coverage
// ──────────────────────────────────────────────

func TestMessageHandler_GetConversation_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	convRepo := newMockConversationRepo()
	convRepo.conversations[1] = &models.Conversation{
		ID:       1,
		PosterID: 1,
		TaskerID: 2,
		TaskID:   10,
	}

	msgService := services.NewMessageService(&mockMessageRepo{}, convRepo, nil)
	handler := NewMessageHandler(msgService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/v1/conversations/1", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("user_id", int64(1))

	handler.GetConversation(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestMessageHandler_GetConversation_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := newTestMessageHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/v1/conversations/1", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	// no user_id set

	handler.GetConversation(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestMessageHandler_GetConversation_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := newTestMessageHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/v1/conversations/abc", nil)
	c.Params = gin.Params{{Key: "id", Value: "abc"}}
	c.Set("user_id", int64(1))

	handler.GetConversation(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestMessageHandler_GetConversation_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	convRepo := newMockConversationRepo()
	// no conversations in repo
	msgService := services.NewMessageService(&mockMessageRepo{}, convRepo, nil)
	handler := NewMessageHandler(msgService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/v1/conversations/999", nil)
	c.Params = gin.Params{{Key: "id", Value: "999"}}
	c.Set("user_id", int64(1))

	handler.GetConversation(c)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestMessageHandler_GetConversation_NotParticipant(t *testing.T) {
	gin.SetMode(gin.TestMode)

	convRepo := newMockConversationRepo()
	convRepo.conversations[1] = &models.Conversation{
		ID:       1,
		PosterID: 10,
		TaskerID: 20,
		TaskID:   5,
	}

	msgService := services.NewMessageService(&mockMessageRepo{}, convRepo, nil)
	handler := NewMessageHandler(msgService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/v1/conversations/1", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("user_id", int64(99)) // user 99 is not poster (10) or tasker (20)

	handler.GetConversation(c)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for non-participant, got %d: %s", w.Code, w.Body.String())
	}
}

// ──────────────────────────────────────────────
// 2. ListTasks — was 56.1%, add filter path tests
// ──────────────────────────────────────────────

func TestTaskHandler_ListTasks_WithSearchQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, taskRepo, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	taskRepo.Tasks[1] = testutil.NewTaskBuilder().WithID(1).Build()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/tasks?search=moving+help", nil)

	handler.ListTasks(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTaskHandler_ListTasks_WithStatusFilter(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, taskRepo, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	taskRepo.Tasks[1] = testutil.NewTaskBuilder().WithID(1).WithStatus(models.TaskStatusOpen).Build()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/tasks?status=open", nil)

	handler.ListTasks(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTaskHandler_ListTasks_WithMinMaxPrice(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, taskRepo, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	taskRepo.Tasks[1] = testutil.NewTaskBuilder().WithID(1).WithPrice(50000).Build()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/tasks?min_price=10000&max_price=100000", nil)

	handler.ListTasks(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTaskHandler_ListTasks_WithLocationFilter(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, taskRepo, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	taskRepo.Tasks[1] = testutil.NewTaskBuilder().WithID(1).Build()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/tasks?location=Hanoi", nil)

	handler.ListTasks(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTaskHandler_ListTasks_WithRequesterIDFilter(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, taskRepo, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	taskRepo.Tasks[1] = testutil.NewTaskBuilder().WithID(1).WithRequesterID(1).Build()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/tasks?requester_id=1", nil)

	handler.ListTasks(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTaskHandler_ListTasks_WithTaskerIDFilter(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, taskRepo, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	taskRepo.Tasks[1] = testutil.NewTaskBuilder().WithID(1).Build()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/tasks?tasker_id=2", nil)

	handler.ListTasks(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTaskHandler_ListTasks_WithPageParam(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, taskRepo, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	taskRepo.Tasks[1] = testutil.NewTaskBuilder().WithID(1).Build()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/tasks?page=2&limit=5", nil)

	handler.ListTasks(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTaskHandler_ListTasks_AllFiltersCombined(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, taskRepo, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	taskRepo.Tasks[1] = testutil.NewTaskBuilder().WithID(1).Build()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET",
		"/tasks?category_id=1&status=open&min_price=5000&max_price=50000&location=HCMC&search=clean&page=1&limit=10&requester_id=1&tasker_id=2",
		nil)

	handler.ListTasks(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

// ──────────────────────────────────────────────
// 3. AcceptApplication — was 50%
// ──────────────────────────────────────────────

func TestTaskHandler_AcceptApplication_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, taskRepo, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	// Setup: task owned by user 1, open status
	taskRepo.Tasks[1] = testutil.NewTaskBuilder().
		WithID(1).
		WithRequesterID(1).
		WithStatus(models.TaskStatusOpen).
		Build()

	// Setup: pending application from user 2
	appRepo := handler.applicationRepo.(*mockTaskApplicationRepository)
	appRepo.applications[1] = &models.TaskApplication{
		ID:       1,
		TaskID:   1,
		TaskerID: 2,
		Status:   models.ApplicationStatusPending,
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/v1/applications/1/accept", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("user_id", int64(1))

	handler.AcceptApplication(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTaskHandler_AcceptApplication_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, _, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/v1/applications/1/accept", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	// no user_id

	handler.AcceptApplication(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestTaskHandler_AcceptApplication_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, _, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/v1/applications/abc/accept", nil)
	c.Params = gin.Params{{Key: "id", Value: "abc"}}
	c.Set("user_id", int64(1))

	handler.AcceptApplication(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTaskHandler_AcceptApplication_ApplicationNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, _, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/v1/applications/999/accept", nil)
	c.Params = gin.Params{{Key: "id", Value: "999"}}
	c.Set("user_id", int64(1))

	handler.AcceptApplication(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTaskHandler_AcceptApplication_NotOwner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, taskRepo, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	// Task owned by user 5
	taskRepo.Tasks[1] = testutil.NewTaskBuilder().
		WithID(1).
		WithRequesterID(5).
		WithStatus(models.TaskStatusOpen).
		Build()

	appRepo := handler.applicationRepo.(*mockTaskApplicationRepository)
	appRepo.applications[1] = &models.TaskApplication{
		ID:       1,
		TaskID:   1,
		TaskerID: 2,
		Status:   models.ApplicationStatusPending,
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/v1/applications/1/accept", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("user_id", int64(1)) // user 1 is not the owner

	handler.AcceptApplication(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTaskHandler_AcceptApplication_TaskNotOpen(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, taskRepo, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	taskRepo.Tasks[1] = testutil.NewTaskBuilder().
		WithID(1).
		WithRequesterID(1).
		WithStatus(models.TaskStatusInProgress).
		Build()

	appRepo := handler.applicationRepo.(*mockTaskApplicationRepository)
	appRepo.applications[1] = &models.TaskApplication{
		ID:       1,
		TaskID:   1,
		TaskerID: 2,
		Status:   models.ApplicationStatusPending,
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/v1/applications/1/accept", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("user_id", int64(1))

	handler.AcceptApplication(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTaskHandler_AcceptApplication_ApplicationNotPending(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, taskRepo, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	taskRepo.Tasks[1] = testutil.NewTaskBuilder().
		WithID(1).
		WithRequesterID(1).
		WithStatus(models.TaskStatusOpen).
		Build()

	appRepo := handler.applicationRepo.(*mockTaskApplicationRepository)
	appRepo.applications[1] = &models.TaskApplication{
		ID:       1,
		TaskID:   1,
		TaskerID: 2,
		Status:   models.ApplicationStatusRejected, // already rejected
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/v1/applications/1/accept", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("user_id", int64(1))

	handler.AcceptApplication(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

// ──────────────────────────────────────────────
// 4. GetTaskApplications — was 53.8%
// ──────────────────────────────────────────────

func TestTaskHandler_GetTaskApplications_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, taskRepo, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	taskRepo.Tasks[1] = testutil.NewTaskBuilder().
		WithID(1).
		WithRequesterID(1).
		Build()

	appRepo := handler.applicationRepo.(*mockTaskApplicationRepository)
	appRepo.applications[1] = &models.TaskApplication{
		ID:       1,
		TaskID:   1,
		TaskerID: 2,
		Status:   models.ApplicationStatusPending,
	}
	appRepo.applications[2] = &models.TaskApplication{
		ID:       2,
		TaskID:   1,
		TaskerID: 3,
		Status:   models.ApplicationStatusPending,
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/v1/tasks/1/applications", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("user_id", int64(1))

	handler.GetTaskApplications(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTaskHandler_GetTaskApplications_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, _, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/v1/tasks/1/applications", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	// no user_id

	handler.GetTaskApplications(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestTaskHandler_GetTaskApplications_InvalidTaskID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, _, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/v1/tasks/xyz/applications", nil)
	c.Params = gin.Params{{Key: "id", Value: "xyz"}}
	c.Set("user_id", int64(1))

	handler.GetTaskApplications(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTaskHandler_GetTaskApplications_TaskNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, _, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	// No tasks in repo

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/v1/tasks/999/applications", nil)
	c.Params = gin.Params{{Key: "id", Value: "999"}}
	c.Set("user_id", int64(1))

	handler.GetTaskApplications(c)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTaskHandler_GetTaskApplications_NotOwner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, taskRepo, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	taskRepo.Tasks[1] = testutil.NewTaskBuilder().
		WithID(1).
		WithRequesterID(5). // owned by user 5
		Build()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/v1/tasks/1/applications", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("user_id", int64(1)) // user 1 is not the owner

	handler.GetTaskApplications(c)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

// ──────────────────────────────────────────────
// 5. HandleWebhook HTTP-level — was 48.3%
// ──────────────────────────────────────────────

// mockPayOSForWebhook implements services.PayOSServicer for webhook handler tests
type mockPayOSForWebhook struct {
	verifyResult map[string]interface{}
	verifyErr    error
}

func (m *mockPayOSForWebhook) CreatePaymentLink(_ context.Context, _ int64, _ int, _, _, _ string) (*services.PaymentLinkResponse, error) {
	return &services.PaymentLinkResponse{CheckoutUrl: "https://example.com"}, nil
}

func (m *mockPayOSForWebhook) VerifyWebhookData(_ context.Context, _ map[string]interface{}) (map[string]interface{}, error) {
	if m.verifyErr != nil {
		return nil, m.verifyErr
	}
	return m.verifyResult, nil
}

func (m *mockPayOSForWebhook) ConfirmWebhook(_ context.Context, url string) (string, error) {
	return url, nil
}

func (m *mockPayOSForWebhook) CreatePayout(_ context.Context, _ string, _ int, _, _, _ string) (*services.PayoutResponse, error) {
	return &services.PayoutResponse{ID: "test"}, nil
}

func (m *mockPayOSForWebhook) GetPayout(_ context.Context, _ string) (*services.PayoutStatusResponse, error) {
	return &services.PayoutStatusResponse{State: "PROCESSING"}, nil
}

func (m *mockPayOSForWebhook) CancelPaymentLink(_ context.Context, _ int64, _ string) error {
	return nil
}

func TestWebhookHandler_HandleWebhook_TestPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &WebhookHandler{
		payos:           &mockPayOSForWebhook{},
		transactionRepo: testutil.NewMockTransactionRepository(),
		taskRepo:        testutil.NewMockTaskRepository(),
	}

	// PayOS test webhook with "Ma giao dich thu nghiem"
	body := map[string]interface{}{
		"code": "00",
		"desc": "success",
		"data": map[string]interface{}{
			"description": "Ma giao dich thu nghiem",
			"orderCode":   float64(12345),
		},
	}
	bodyBytes, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/webhook", bytes.NewReader(bodyBytes))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.HandleWebhook(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestWebhookHandler_HandleWebhook_VQRIO123(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &WebhookHandler{
		payos:           &mockPayOSForWebhook{},
		transactionRepo: testutil.NewMockTransactionRepository(),
		taskRepo:        testutil.NewMockTaskRepository(),
	}

	body := map[string]interface{}{
		"code": "00",
		"data": map[string]interface{}{
			"description": "VQRIO123",
			"orderCode":   float64(11111),
		},
	}
	bodyBytes, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/webhook", bytes.NewReader(bodyBytes))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.HandleWebhook(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestWebhookHandler_HandleWebhook_InvalidBody(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &WebhookHandler{
		payos:           &mockPayOSForWebhook{},
		transactionRepo: testutil.NewMockTransactionRepository(),
		taskRepo:        testutil.NewMockTaskRepository(),
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/webhook", bytes.NewReader([]byte("not json")))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.HandleWebhook(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestWebhookHandler_HandleWebhook_InvalidSignature(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &WebhookHandler{
		payos: &mockPayOSForWebhook{
			verifyErr: http.ErrAbortHandler, // simulate signature failure
		},
		transactionRepo: testutil.NewMockTransactionRepository(),
		taskRepo:        testutil.NewMockTaskRepository(),
	}

	body := map[string]interface{}{
		"code": "00",
		"data": map[string]interface{}{
			"description": "real payment",
			"orderCode":   float64(12345),
		},
		"signature": "invalid",
	}
	bodyBytes, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/webhook", bytes.NewReader(bodyBytes))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.HandleWebhook(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestWebhookHandler_HandleWebhook_SuccessPayment(t *testing.T) {
	gin.SetMode(gin.TestMode)

	txRepo := testutil.NewMockTransactionRepository()
	taskRepo := testutil.NewMockTaskRepository()
	refRepo := testutil.NewMockPaymentReferenceRepository()

	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)

	// Pre-create wallet and deposit transaction
	walletRepo.Wallets[1] = testutil.NewWalletBuilder().WithID(1).WithUserID(1).WithBalance(0).Build()
	depositTx := &models.Transaction{
		ID:             1,
		PayerID:        1,
		Amount:         30000,
		NetAmount:      30000,
		Type:           models.TransactionTypeDeposit,
		Status:         models.TransactionStatusPending,
		PayOSOrderCode: int64Ptr(55555),
		Description:    "Test deposit",
	}
	txRepo.Transactions[1] = depositTx

	handler := &WebhookHandler{
		payos: &mockPayOSForWebhook{
			verifyResult: map[string]interface{}{
				"orderCode": float64(55555),
				"code":      "00",
				"reference": "FT20260101000055",
				"amount":    float64(30000),
			},
		},
		transactionRepo: txRepo,
		taskRepo:        taskRepo,
		walletService:   walletService,
		refRepo:         refRepo,
	}

	body := map[string]interface{}{
		"code": "00",
		"data": map[string]interface{}{
			"description": "Test deposit",
			"orderCode":   float64(55555),
		},
		"signature": "valid",
	}
	bodyBytes, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/webhook", bytes.NewReader(bodyBytes))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.HandleWebhook(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	// Verify wallet was credited
	wallet := walletRepo.Wallets[1]
	if wallet.Balance != 30000 {
		t.Errorf("expected wallet balance 30000, got %d", wallet.Balance)
	}
}

func TestWebhookHandler_HandleWebhook_CancelledPayment(t *testing.T) {
	gin.SetMode(gin.TestMode)

	txRepo := testutil.NewMockTransactionRepository()
	taskRepo := testutil.NewMockTaskRepository()

	pendingTx := &models.Transaction{
		ID:             1,
		PayerID:        1,
		Amount:         20000,
		Type:           models.TransactionTypeDeposit,
		Status:         models.TransactionStatusPending,
		PayOSOrderCode: int64Ptr(66666),
	}
	txRepo.Transactions[1] = pendingTx

	handler := &WebhookHandler{
		payos: &mockPayOSForWebhook{
			verifyResult: map[string]interface{}{
				"orderCode": float64(66666),
				"code":      "01", // cancelled
			},
		},
		transactionRepo: txRepo,
		taskRepo:        taskRepo,
	}

	body := map[string]interface{}{
		"code": "00",
		"data": map[string]interface{}{
			"description": "deposit",
			"orderCode":   float64(66666),
		},
		"signature": "valid",
	}
	bodyBytes, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/webhook", bytes.NewReader(bodyBytes))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.HandleWebhook(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	// Verify transaction was cancelled
	updatedTx := txRepo.Transactions[1]
	if updatedTx.Status != models.TransactionStatusCancelled {
		t.Errorf("expected status cancelled, got %s", updatedTx.Status)
	}
}

func TestWebhookHandler_HandleWebhook_UnknownStatusCode(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &WebhookHandler{
		payos: &mockPayOSForWebhook{
			verifyResult: map[string]interface{}{
				"orderCode": float64(77777),
				"code":      "99", // unknown
			},
		},
		transactionRepo: testutil.NewMockTransactionRepository(),
		taskRepo:        testutil.NewMockTaskRepository(),
	}

	body := map[string]interface{}{
		"code": "00",
		"data": map[string]interface{}{
			"description": "payment",
			"orderCode":   float64(77777),
		},
		"signature": "valid",
	}
	bodyBytes, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/webhook", bytes.NewReader(bodyBytes))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.HandleWebhook(c)

	// Should still return 200 (PayOS expects 200 for all processed webhooks)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// 6. ConfirmWebhook — was 0%
// ──────────────────────────────────────────────

func TestWebhookHandler_ConfirmWebhook_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &WebhookHandler{
		payos: &mockPayOSForWebhook{},
	}

	body, _ := json.Marshal(map[string]string{"webhook_url": "https://example.com/webhook"})
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/confirm-webhook", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.ConfirmWebhook(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestWebhookHandler_ConfirmWebhook_MissingURL(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &WebhookHandler{
		payos: &mockPayOSForWebhook{},
	}

	body, _ := json.Marshal(map[string]string{})
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/confirm-webhook", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.ConfirmWebhook(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

// ──────────────────────────────────────────────
// 7. CreatePayment — was 0%
// ──────────────────────────────────────────────

func TestPaymentHandler_CreatePayment_InvalidBody(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &PaymentHandler{
		payosReturnBaseURL: "http://localhost:8080",
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/payment", bytes.NewReader([]byte("{}")))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.CreatePayment(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

// ──────────────────────────────────────────────
// 8. NewWebSocketHandler constructor — was 0%
// ──────────────────────────────────────────────

func TestNewWebSocketHandler(t *testing.T) {
	handler := NewWebSocketHandler(nil, nil, "test-secret")
	if handler == nil {
		t.Error("expected non-nil handler")
	}
	if handler.jwtSecret != "test-secret" {
		t.Errorf("expected jwtSecret 'test-secret', got '%s'", handler.jwtSecret)
	}
}

// ──────────────────────────────────────────────
// 9. NewWalletHandlerWithWithdrawal constructor — was 0%
// ──────────────────────────────────────────────

func TestNewWalletHandlerWithWithdrawal(t *testing.T) {
	handler := NewWalletHandlerWithWithdrawal(nil, nil, nil, nil, nil, "http://localhost", 10000, 200000)
	if handler == nil {
		t.Error("expected non-nil handler")
	}
	if handler.minWithdrawal != 10000 {
		t.Errorf("expected minWithdrawal 10000, got %d", handler.minWithdrawal)
	}
	if handler.maxWithdrawal != 200000 {
		t.Errorf("expected maxWithdrawal 200000, got %d", handler.maxWithdrawal)
	}
}

// ──────────────────────────────────────────────
// 10. HandleReturn code=00 success path — was 68.2%
// ──────────────────────────────────────────────

func TestReturnHandler_HandleReturn_CancelFalseString(t *testing.T) {
	// When cancel is not "true", it should not trigger cancel flow
	gin.SetMode(gin.TestMode)

	handler := NewReturnHandler(nil, "http://localhost:3000")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/return?code=01&cancel=false&orderCode=12345", nil)

	handler.HandleReturn(c)

	if w.Code != http.StatusFound {
		t.Errorf("expected 302, got %d", w.Code)
	}

	location := w.Header().Get("Location")
	expected := "viecz://payment/cancelled?orderCode=12345"
	if location != expected {
		t.Errorf("expected redirect to \"%s\", got \"%s\"", expected, location)
	}
}

func TestReturnHandler_HandleReturn_EmptyCode(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := NewReturnHandler(nil, "http://localhost:3000")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/return?orderCode=12345", nil)

	handler.HandleReturn(c)

	if w.Code != http.StatusFound {
		t.Errorf("expected 302, got %d", w.Code)
	}

	location := w.Header().Get("Location")
	expected := "viecz://payment/error?code=&orderCode=12345"
	if location != expected {
		t.Errorf("expected redirect to '%s', got '%s'", expected, location)
	}
}

// ──────────────────────────────────────────────
// 11. Wallet Deposit — more edge cases for 67.6%
// ──────────────────────────────────────────────

func TestWalletHandler_Deposit_ExceedsMaxBalance(t *testing.T) {
	gin.SetMode(gin.TestMode)

	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	// Wallet already near max (200000)
	walletRepo.Wallets[1] = testutil.NewWalletBuilder().WithID(1).WithUserID(1).WithBalance(190000).Build()

	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	handler := newTestWalletHandler(walletService)

	body, _ := json.Marshal(DepositRequest{
		Amount: 50000, // Would exceed 200000
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/wallet/deposit", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", int64(1))

	handler.Deposit(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestWalletHandler_Deposit_ValidWithPayOS(t *testing.T) {
	gin.SetMode(gin.TestMode)

	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	walletRepo.Wallets[1] = testutil.NewWalletBuilder().WithID(1).WithUserID(1).WithBalance(0).Build()

	txRepo := testutil.NewMockTransactionRepository()
	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)

	payos := &mockPayOSForWebhook{} // implements PayOSServicer with CreatePaymentLink

	handler := &WalletHandler{
		walletService:      walletService,
		payosService:       payos,
		transactionRepo:    txRepo,
		payosReturnBaseURL: "http://localhost:8080",
	}

	body, _ := json.Marshal(DepositRequest{
		Amount:      50000,
		Description: "Test deposit",
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/wallet/deposit", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", int64(1))

	handler.Deposit(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestWalletHandler_Deposit_WithReturnURL(t *testing.T) {
	gin.SetMode(gin.TestMode)

	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	walletRepo.Wallets[1] = testutil.NewWalletBuilder().WithID(1).WithUserID(1).WithBalance(0).Build()

	txRepo := testutil.NewMockTransactionRepository()
	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	payos := &mockPayOSForWebhook{}

	handler := &WalletHandler{
		walletService:      walletService,
		payosService:       payos,
		transactionRepo:    txRepo,
		payosReturnBaseURL: "http://localhost:8080",
	}

	body, _ := json.Marshal(DepositRequest{
		Amount:    50000,
		ReturnURL: "https://viecz.fishcmus.io.vn/payment/return",
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/wallet/deposit", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", int64(1))

	handler.Deposit(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestWalletHandler_Deposit_LongDescription(t *testing.T) {
	gin.SetMode(gin.TestMode)

	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	walletRepo.Wallets[1] = testutil.NewWalletBuilder().WithID(1).WithUserID(1).WithBalance(0).Build()

	txRepo := testutil.NewMockTransactionRepository()
	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	payos := &mockPayOSForWebhook{}

	handler := &WalletHandler{
		walletService:      walletService,
		payosService:       payos,
		transactionRepo:    txRepo,
		payosReturnBaseURL: "http://localhost:8080",
	}

	body, _ := json.Marshal(DepositRequest{
		Amount:      50000,
		Description: "This description is much longer than twenty five characters and should be truncated",
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/wallet/deposit", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", int64(1))

	handler.Deposit(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

// ──────────────────────────────────────────────
// 12. GetTransactionHistory edge cases — was 77.8%
// ──────────────────────────────────────────────

func TestWalletHandler_GetTransactionHistory_InvalidPagination(t *testing.T) {
	gin.SetMode(gin.TestMode)

	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	walletRepo.Wallets[1] = testutil.NewWalletBuilder().WithID(1).WithUserID(1).WithBalance(0).Build()

	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	handler := newTestWalletHandler(walletService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/wallet/transactions?limit=-1&offset=-5", nil)
	c.Set("user_id", int64(1))

	handler.GetTransactionHistory(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 (negative params corrected to defaults), got %d: %s", w.Code, w.Body.String())
	}
}

func TestWalletHandler_GetTransactionHistory_NonNumericPagination(t *testing.T) {
	gin.SetMode(gin.TestMode)

	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	walletRepo.Wallets[1] = testutil.NewWalletBuilder().WithID(1).WithUserID(1).WithBalance(0).Build()

	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	handler := newTestWalletHandler(walletService)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/wallet/transactions?limit=abc&offset=xyz", nil)
	c.Set("user_id", int64(1))

	handler.GetTransactionHistory(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 (non-numeric params fall back to defaults), got %d: %s", w.Code, w.Body.String())
	}
}

// ──────────────────────────────────────────────
// 13. HandleWithdrawal — missing bankAccountRepo nil check (70%)
// ──────────────────────────────────────────────

func TestHandleWithdrawal_NoBankAccountRepo(t *testing.T) {
	gin.SetMode(gin.TestMode)

	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	wallet := testutil.NewWalletBuilder().WithUserID(1).WithBalance(100000).Build()
	walletRepo.Wallets[wallet.ID] = wallet

	taskRepo := testutil.NewMockTaskRepository()
	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)

	// Handler WITHOUT bankAccountRepo
	handler := &WalletHandler{
		walletService:   walletService,
		taskRepo:        taskRepo,
		bankAccountRepo: nil,
		minWithdrawal:   10000,
		maxWithdrawal:   200000,
	}

	body, _ := json.Marshal(WithdrawalRequest{
		Amount:        50000,
		BankAccountID: 1,
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/wallet/withdraw", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", int64(1))

	handler.HandleWithdrawal(c)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500 (withdrawal not configured), got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandleWithdrawal_InvalidJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &WalletHandler{
		minWithdrawal: 10000,
		maxWithdrawal: 200000,
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/wallet/withdraw", bytes.NewReader([]byte("not json")))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", int64(1))

	handler.HandleWithdrawal(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

// ──────────────────────────────────────────────
// 14. CompleteTask — was 66.7%
// ──────────────────────────────────────────────

func TestTaskHandler_CompleteTask_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, _, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/v1/tasks/1/complete", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	// no user_id

	handler.CompleteTask(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestTaskHandler_CompleteTask_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, _, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/v1/tasks/xyz/complete", nil)
	c.Params = gin.Params{{Key: "id", Value: "xyz"}}
	c.Set("user_id", int64(1))

	handler.CompleteTask(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// 15. ApplyForTask — was 64.7%
// ──────────────────────────────────────────────

func TestTaskHandler_ApplyForTask_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, _, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/v1/tasks/1/applications", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	// no user_id

	handler.ApplyForTask(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestTaskHandler_ApplyForTask_InvalidTaskID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, _, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/v1/tasks/bad/applications", nil)
	c.Params = gin.Params{{Key: "id", Value: "bad"}}
	c.Set("user_id", int64(1))

	handler.ApplyForTask(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTaskHandler_ApplyForTask_InvalidBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler, _, cleanup := setupTaskHandlerTest(t)
	defer cleanup()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/v1/tasks/1/applications",
		bytes.NewReader([]byte("not json")))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("user_id", int64(1))

	handler.ApplyForTask(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

// ──────────────────────────────────────────────
// 16. GetWallet edge case — with taskRepo for available balance
// ──────────────────────────────────────────────

func TestWalletHandler_GetWallet_WithTaskRepoForAvailableBalance(t *testing.T) {
	gin.SetMode(gin.TestMode)

	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	walletRepo.Wallets[1] = testutil.NewWalletBuilder().
		WithID(1).WithUserID(1).WithBalance(100000).WithEscrowBalance(20000).
		Build()

	taskRepo := testutil.NewMockTaskRepository()
	// Add an open task that should reduce available balance
	taskRepo.Tasks[1] = testutil.NewTaskBuilder().
		WithID(1).WithRequesterID(1).WithPrice(30000).WithStatus(models.TaskStatusOpen).
		Build()

	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)

	handler := &WalletHandler{
		walletService: walletService,
		taskRepo:      taskRepo,
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/wallet", nil)
	c.Set("user_id", int64(1))

	handler.GetWallet(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp WalletResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	// available = balance(100000) - escrow(20000) - open_tasks(30000) = 50000
	if resp.AvailableBalance != 50000 {
		t.Errorf("expected available balance 50000, got %d", resp.AvailableBalance)
	}
}

// ──────────────────────────────────────────────
// 17. Payment handler edge cases
// ──────────────────────────────────────────────

func TestPaymentHandler_ReleasePayment_InvalidBody(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler, cleanup := setupPaymentHandlerTest(t, nil)
	defer cleanup()

	body, _ := json.Marshal(map[string]interface{}{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/release", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", int64(1))

	handler.ReleasePayment(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestPaymentHandler_GetTransactionsByTask_EmptyResult(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler, cleanup := setupPaymentHandlerTest(t, nil)
	defer cleanup()

	router := gin.New()
	router.GET("/transactions/:task_id", handler.GetTransactionsByTask)

	req, _ := http.NewRequest("GET", "/transactions/999", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}
