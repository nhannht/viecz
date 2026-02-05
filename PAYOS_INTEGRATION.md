# PayOS Payment Gateway Integration

This document describes the PayOS payment gateway integration implemented for the Viecz project.

## Overview

The integration consists of:
- **Server**: Go (Gin framework) backend with PayOS SDK
- **Client**: React Native (Expo) frontend with payment UI
- **Payment Flow**: Button-initiated payment with 2000 VND test amount

## Architecture

### Server Component (`packages/server/`)

Built with Go and Gin framework, the server provides:

#### API Endpoints
1. **GET /api/health** - Health check
2. **POST /api/payment/create** - Create payment link
3. **GET /api/payment/return** - Handle PayOS redirect after payment
4. **POST /api/payment/webhook** - Receive payment confirmation webhooks

#### Key Files
- `cmd/server/main.go` - Entry point with Gin router setup
- `internal/config/config.go` - Environment configuration loader
- `internal/services/payos.go` - PayOS SDK wrapper
- `internal/handlers/payment.go` - Payment creation handler
- `internal/handlers/webhook.go` - Webhook verification handler
- `internal/handlers/return.go` - Return URL redirect handler
- `internal/middleware/cors.go` - CORS middleware
- `internal/models/payment.go` - Request/response models

#### Dependencies
- `github.com/gin-gonic/gin` - Web framework
- `github.com/payOSHQ/payos-lib-golang/v2` - Official PayOS Go SDK
- `github.com/joho/godotenv` - Environment variable management

### Client Component (`packages/client/`)

Built with React Native and Expo, the client provides:

#### Payment Screens
1. `app/payment/index.tsx` - Main payment screen with 2000 VND test button
2. `app/payment/success.tsx` - Payment success result screen
3. `app/payment/cancelled.tsx` - Payment cancelled screen
4. `app/payment/error.tsx` - Payment error screen
5. `app/payment/_layout.tsx` - Stack navigator for payment routes

#### Key Files
- `components/payment-button.tsx` - Reusable payment button component
- `services/api.ts` - API client service with error handling
- `constants/api.ts` - API configuration and endpoints
- `types/payment.ts` - TypeScript type definitions

## Payment Flow

1. **User Initiates Payment**
   - User taps "Pay 2,000 VND" button in the app
   - Client calls `POST /api/payment/create` with amount and description

2. **Server Creates Payment Link**
   - Server generates unique order code (timestamp in milliseconds)
   - Server calls PayOS SDK to create payment link
   - Server returns checkout URL and QR code to client

3. **User Completes Payment**
   - Client opens checkout URL in device browser
   - User scans QR code or selects bank for payment
   - User completes payment in banking app

4. **PayOS Redirects to Server**
   - After payment, PayOS redirects to `GET /api/payment/return`
   - Server verifies payment status with PayOS
   - Server redirects to client app using deep link (`viecz://`)

5. **Client Displays Result**
   - App opens appropriate screen based on deep link
   - Success: `viecz://payment/success?orderCode=...&amount=...&status=...`
   - Cancelled: `viecz://payment/cancelled?orderCode=...`
   - Error: `viecz://payment/error?code=...&orderCode=...`

6. **Webhook Confirmation (Async)**
   - PayOS sends webhook to `POST /api/payment/webhook`
   - Server verifies webhook signature
   - Server logs payment confirmation (TODO: save to database)

## Setup Instructions

### 1. Get PayOS Credentials

1. Sign up at https://payos.vn
2. Create a payment channel
3. Navigate to dashboard settings
4. Copy your credentials:
   - Client ID
   - API Key
   - Checksum Key

### 2. Configure Server

Create `packages/server/.env`:

```env
PORT=8080
GO_ENV=development
PAYOS_CLIENT_ID=your_client_id_here
PAYOS_API_KEY=your_api_key_here
PAYOS_CHECKSUM_KEY=your_checksum_key_here
CLIENT_URL=http://localhost:8081
```

### 3. Install Dependencies

```bash
# From project root
cd packages/server
go mod download

# Or using yarn workspace
yarn workspace @viecz/server install:deps
```

### 4. Run Server

```bash
# From packages/server/
yarn dev

# Or from project root
yarn server:dev
```

Server starts on http://localhost:8080

### 5. Run Client

```bash
# From project root
yarn start

# Then press 'a' for Android, 'i' for iOS, or 'w' for web
```

## Testing

### Test Server Health

```bash
curl http://localhost:8080/api/health
# Expected: {"status":"ok"}
```

### Test Payment Creation (Server Only)

```bash
curl -X POST http://localhost:8080/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{"amount": 2000, "description": "Test Payment"}'
```

Expected response:
```json
{
  "orderCode": 1738694400000,
  "checkoutUrl": "https://pay.payos.vn/web/...",
  "qrCode": "00020101..."
}
```

### Test Full Payment Flow

1. Start server: `yarn server:dev`
2. Start client: `yarn start`
3. Open app in simulator/device
4. Navigate to payment screen
5. Tap "Pay 2,000 VND" button
6. Browser opens with PayOS checkout
7. Complete payment (use test bank account)
8. App redirects to success/cancelled/error screen

### Webhook Testing (Local Development)

Use ngrok to expose local server:

```bash
# Install ngrok from https://ngrok.com/download
ngrok http 8080

# Copy ngrok URL (e.g., https://abc123.ngrok.io)
# Update webhook URL in PayOS dashboard:
# https://abc123.ngrok.io/api/payment/webhook
```

## Project Files Created

### Server (15 files)
- `cmd/server/main.go`
- `internal/config/config.go`
- `internal/services/payos.go`
- `internal/handlers/payment.go`
- `internal/handlers/webhook.go`
- `internal/handlers/return.go`
- `internal/middleware/cors.go`
- `internal/models/payment.go`
- `.env.example`
- `.gitignore`
- `README.md` (updated)
- `package.json` (updated)
- `go.mod` (updated)
- `go.sum` (updated)

### Client (9 files)
- `app/payment/index.tsx`
- `app/payment/success.tsx`
- `app/payment/cancelled.tsx`
- `app/payment/error.tsx`
- `app/payment/_layout.tsx`
- `components/payment-button.tsx`
- `services/api.ts`
- `constants/api.ts`
- `types/payment.ts`

### Root (1 file)
- `package.json` (updated with server scripts)

**Total: 25 files created/modified**

## Security Features

1. **Webhook Signature Verification**: All webhook requests verify PayOS signature
2. **CORS Protection**: Server only accepts requests from configured client URL
3. **Environment Variables**: Sensitive credentials stored in .env file
4. **Input Validation**: All API requests validate input data
5. **Error Handling**: Comprehensive error handling with user-friendly messages

## Next Steps

### Immediate TODOs
- [ ] Create PayOS account and get credentials
- [ ] Test payment flow end-to-end
- [ ] Verify webhook reception and signature validation

### Future Enhancements
- [ ] Add database for storing payment records
- [ ] Implement payment history screen in client
- [ ] Add user authentication
- [ ] Support multiple payment amounts
- [ ] Add payment confirmation emails
- [ ] Implement refund functionality
- [ ] Add analytics and reporting
- [ ] Support multiple payment methods beyond QR

## Troubleshooting

### Issue: Server fails to start with "PAYOS_CLIENT_ID is required"
**Solution**: Create `.env` file with PayOS credentials

### Issue: CORS errors when calling API from client
**Solution**: Ensure `CLIENT_URL` in server `.env` matches client URL

### Issue: Payment link creation fails
**Solution**: Verify PayOS credentials are correct and payment channel is active

### Issue: Deep link doesn't redirect to app
**Solution**: Ensure `viecz://` scheme is registered in `app.json` (already configured)

### Issue: Webhook not receiving events
**Solution**: Use ngrok for local testing, configure webhook URL in PayOS dashboard

## Production Deployment Checklist

- [ ] Set `GO_ENV=production` on server
- [ ] Use system environment variables (not `.env` file)
- [ ] Enable HTTPS on server
- [ ] Update webhook URL in PayOS dashboard to production URL
- [ ] Set `CLIENT_URL` to production client URL
- [ ] Update `API_BASE_URL` in client `constants/api.ts`
- [ ] Test payment flow in production environment
- [ ] Monitor server logs for errors
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure database for payment records

## Resources

- PayOS Documentation: https://payos.vn/docs
- PayOS Dashboard: https://my.payos.vn
- PayOS Go SDK: https://github.com/payOSHQ/payos-lib-golang
- Gin Framework: https://gin-gonic.com
- Expo Router: https://docs.expo.dev/router/introduction/
