package main

// EXAMPLE: How to use logcat-style logging in your Go server
// This file shows usage examples - don't run it directly

import (
	"errors"
	"time"
	"viecz.vieczserver/internal/logger"
)

func examplePaymentHandler() {
	// Create tagged logger (like Android)
	log := logger.New("PaymentHandler")

	// Debug log (like Log.d(TAG, message))
	log.D("CreatePayment called",
		"endpoint", "/api/payment/create",
		"method", "POST")

	// Info log with fields (like Log.i(TAG, message))
	log.I("Creating payment",
		"amount", 2000,
		"description", "Payment - 2000 VND",
		"userId", 12345)

	// Simulate PayOS API call
	startTime := time.Now()

	// Success log
	log.I("Payment link created successfully",
		"orderCode", 1770237417875,
		"checkoutUrl", "https://pay.payos.vn/web/abc123",
		"duration", time.Since(startTime))

	// Error log (like Log.e(TAG, message, error))
	err := errors.New("connection timeout")
	log.E("PayOS API failed", err,
		"retries", 3,
		"timeout", "30s")

	// Warning log (like Log.w(TAG, message))
	log.W("Payment amount is unusually high",
		"amount", 1000000,
		"threshold", 100000)
}

func exampleMiddleware() {
	log := logger.New("Middleware")

	// Request logging
	log.D("Incoming request",
		"method", "POST",
		"path", "/api/payment/create",
		"ip", "192.168.1.100",
		"userAgent", "okhttp/4.12.0")

	// Response logging
	log.I("Request completed",
		"status", 200,
		"duration", 1234*time.Millisecond,
		"responseSize", 512)
}

func exampleDatabase() {
	log := logger.New("Database")

	// Query logging
	log.D("Executing query",
		"table", "payments",
		"action", "INSERT")

	// Query success
	log.I("Query executed",
		"rowsAffected", 1,
		"duration", 45*time.Millisecond)

	// Connection warning
	log.W("Database connection pool nearly exhausted",
		"active", 95,
		"max", 100)
}

/*
OUTPUT (similar to Android logcat):

2026-02-05 15:30:12 D [PaymentHandler] CreatePayment called endpoint=/api/payment/create method=POST
2026-02-05 15:30:12 I [PaymentHandler] Creating payment amount=2000 description="Payment - 2000 VND" userId=12345
2026-02-05 15:30:13 I [PaymentHandler] Payment link created successfully checkoutUrl=https://pay.payos.vn/web/abc123 duration=1.234s orderCode=1770237417875
2026-02-05 15:30:14 E [PaymentHandler] PayOS API failed error="connection timeout" retries=3 timeout=30s
2026-02-05 15:30:15 W [PaymentHandler] Payment amount is unusually high amount=1000000 threshold=100000

2026-02-05 15:30:16 D [Middleware] Incoming request ip=192.168.1.100 method=POST path=/api/payment/create userAgent=okhttp/4.12.0
2026-02-05 15:30:17 I [Middleware] Request completed duration=1.234s responseSize=512 status=200

2026-02-05 15:30:18 D [Database] Executing query action=INSERT table=payments
2026-02-05 15:30:18 I [Database] Query executed duration=45ms rowsAffected=1
2026-02-05 15:30:19 W [Database] Database connection pool nearly exhausted active=95 max=100
*/
