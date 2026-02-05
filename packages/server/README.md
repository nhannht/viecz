# Viecz Server

Go server for PayOS payment gateway integration.

## Prerequisites

- Go 1.25.5 or higher
- PayOS account with payment channel configured
- PayOS credentials (Client ID, API Key, Checksum Key)

## Setup

1. **Install Dependencies**

```bash
go mod download
# or
yarn install:deps
```

2. **Configure Environment Variables**

Create a `.env` file in the `packages/server/` directory:

```bash
cp .env.example .env
```

Edit `.env` and add your PayOS credentials:

```env
PORT=8080
GO_ENV=development

# Get these from PayOS dashboard (https://payos.vn)
PAYOS_CLIENT_ID=your_client_id_here
PAYOS_API_KEY=your_api_key_here
PAYOS_CHECKSUM_KEY=your_checksum_key_here

CLIENT_URL=http://localhost:8081
```

## Running the Server

### Development Mode

```bash
yarn dev
# or
GO_ENV=development go run cmd/server/main.go
```

The server will start on `http://localhost:8080`

### Production Mode

```bash
# Build
yarn build
# or
go build -o bin/server cmd/server/main.go

# Run
./bin/server
```

## API Endpoints

### Health Check
- **GET** `/api/health`
- Returns: `{"status":"ok"}`

### Create Payment Link
- **POST** `/api/payment/create`
- Request Body:
  ```json
  {
    "amount": 2000,
    "description": "Test Payment - 2000 VND"
  }
  ```
- Response:
  ```json
  {
    "orderCode": 1234567890,
    "checkoutUrl": "https://pay.payos.vn/web/...",
    "qrCode": "00020101..."
  }
  ```

### Payment Return URL
- **GET** `/api/payment/return`
- Handles redirects from PayOS after payment
- Redirects to client app using deep link (`viecz://`)

### Payment Webhook
- **POST** `/api/payment/webhook`
- Receives payment confirmation from PayOS
- Verifies webhook signature

## Testing

### Test Health Endpoint

```bash
curl http://localhost:8080/api/health
```

### Test Payment Creation

```bash
curl -X POST http://localhost:8080/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{"amount": 2000, "description": "Test Payment"}'
```

### Webhook Testing with ngrok

For local development, use ngrok to expose your server for webhook testing:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 8080

# Update webhook URL in PayOS dashboard with ngrok URL:
# https://your-ngrok-url.ngrok.io/api/payment/webhook
```

## Project Structure

```
packages/server/
├── cmd/
│   └── server/
│       └── main.go              # Application entry point
├── internal/
│   ├── config/
│   │   └── config.go            # Configuration loader
│   ├── services/
│   │   └── payos.go             # PayOS service wrapper
│   ├── handlers/
│   │   ├── payment.go           # Payment creation handler
│   │   ├── webhook.go           # Webhook handler
│   │   └── return.go            # Return URL handler
│   ├── middleware/
│   │   └── cors.go              # CORS middleware
│   └── models/
│       └── payment.go           # Request/response models
├── .env.example                  # Example environment config
├── .gitignore
├── go.mod
├── go.sum
└── README.md
```

## Getting PayOS Credentials

1. Sign up at https://payos.vn
2. Create a payment channel
3. Go to dashboard settings
4. Copy your:
   - Client ID
   - API Key
   - Checksum Key

## Troubleshooting

### Port Already in Use

Change the `PORT` in your `.env` file:

```env
PORT=8081
```

### CORS Errors

Make sure `CLIENT_URL` in `.env` matches your client app URL.

### Payment Link Creation Fails

Check that your PayOS credentials are correct and your payment channel is active.

## Production Deployment

1. Set `GO_ENV=production`
2. Use system environment variables instead of `.env` file
3. Ensure HTTPS is enabled
4. Update webhook URL in PayOS dashboard to production URL
5. Set `CLIENT_URL` to production client URL
