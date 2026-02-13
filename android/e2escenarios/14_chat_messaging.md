# Scenario 14: Chat Messaging (Multi-User Real-Time)

This scenario tests the full chat/messaging feature between two users. It covers conversation creation, sending/receiving messages via WebSocket, and verifying the conversation list.

**Message Count:** 10 messages exchanged (5 from Alice, 5 from Bob)
**Edge Case Tested:** One 2000-word long message to test message handling with large content

**Requires:** Go test server running on port 9999 (WebSocket support needed)

**Automated Test:** `S14_ChatMessagingE2ETest.chatMessaging_AliceSendsBobReplies()`

---

## Flow Diagram

```
Alice registers → deposits 200k → creates task (100k)
    → Alice logs out
Bob registers → becomes tasker → applies for task
    → Bob logs out
Alice logs in → accepts application (task → IN_PROGRESS)
    → Alice taps "Message" on task detail → conversation created
    → Alice and Bob exchange 10 messages (5 each):
      1. Alice: "Hello Bob, when can you start?"
      2. Bob: "I can start tomorrow!"
      3. Alice: "Great! What time works best for you?"
      4. Bob: "How about 2 PM?"
      5. Alice: "Perfect! I'll be at home."
      6. Bob: "Do you need me to bring any tools?"
      7. Alice: "Yes, if you have a dolly that would be helpful."
      8. Bob: [2000-word long message with moving tips] (edge case test)
      9. Alice: "Wow, thanks for all the detailed tips!"
      10. Bob: "No problem, see you tomorrow!"
    → Alice logs in and verifies all 10 messages visible
```

---

## Test Users

| User | Email | Password | Role |
|------|-------|----------|------|
| Alice | `alice_{timestamp}@test.com` | `Password123` | Task poster (requester) |
| Bob | `bob_{timestamp}@test.com` | `Password123` | Tasker (applicant) |

---

## Prerequisites (Steps 1-5)

These steps set up the required state (IN_PROGRESS task with accepted application). They are identical to Scenario 13 (Full Job Lifecycle) steps 1-10.

### Step 1: Alice registers and deposits 200k

1. App starts → Login screen
2. Register as Alice (Full Name, Email, Password)
3. **Verify:** MainScreen with "Marketplace" tab visible
4. Tap "Wallet" tab → tap "Deposit" in top bar → enter 200000 → tap "Deposit"
5. Wait for mock PayOS webhook (2s)
6. **Verify:** Wallet balance shows "200.000"

### Step 2: Alice creates a task (100k)

1. Tap "Marketplace" tab → tap "Add Job" in top bar
2. Fill form: Title "Help me move furniture", Description, Price 100000, Location, Category "Vận chuyển"
3. Tap "Create Task"
4. **Verify:** Task Details screen shows "Help me move furniture"

### Step 3: Alice logs out

1. Tap Back → Marketplace → Profile tab → scroll to Logout → confirm
2. **Verify:** Login screen ("Welcome Back")

### Step 4: Bob registers, becomes tasker, applies

1. Register as Bob
2. Profile tab → "Become a Tasker" → "Yes, Register"
3. Marketplace tab → tap "Help me move furniture" → "Apply for this Task" → "Submit Application"
4. **Verify:** "Application Pending" shown

### Step 5: Bob logs out, Alice accepts application

1. Bob: Back → Marketplace → Profile tab → Logout
2. Login as Alice
3. Tap "Help me move furniture" on Marketplace
4. Tap "Accept Application" → confirm "Accept"
5. **Verify:** "Payment processed successfully!" → task is now IN_PROGRESS

---

## Chat-Specific Steps (Steps 6-15)

### Step 6: Alice opens chat from task detail

After accepting the application, Alice is still on the Task Detail screen. The task status is now IN_PROGRESS, which makes the "Message" button visible.

1. **Verify:** "Message" button is displayed (with mail icon)
2. Tap "Message" button
3. Server creates conversation via `POST /api/v1/conversations` (or returns existing one)
4. App navigates to ChatScreen (`chat/{conversationId}`)

**What happens on the server:**
- `POST /api/v1/conversations` with `task_id` and `tasker_id`
- Server creates Conversation record linking Alice (poster) and Bob (tasker) to the task
- Returns conversation with ID

**UI element:** `TaskDetailScreen.kt` — Button with `Icons.Outlined.MailOutline` and text "Message" (only shown when `task.status == TaskStatus.IN_PROGRESS`)

### Step 7: Alice verifies ChatScreen UI

1. **Verify:** Top bar shows title "Chat"
2. **Verify:** Connection status shows "Connected" (green text)
3. **Verify:** Message input field visible with placeholder "Type a message..."
4. **Verify:** Send button (FAB) visible but disabled (no text entered)
5. **Verify:** Chat area is empty (no messages yet)

**What happens:**
- `ChatViewModel.loadConversation(id)` fetches message history via REST API (empty)
- `WebSocketClient.connect(token)` establishes WebSocket connection to `/api/v1/ws?token=...`
- After connected, `WebSocketClient.joinConversation(id)` sends `{"type":"join"}` message
- Server Hub adds client to conversation room

**UI elements:**
- Top bar: `Text("Chat")` title, connection status text below
- Input: `OutlinedTextField` with placeholder "Type a message..."
- Send: `FloatingActionButton` with `Icons.AutoMirrored.Filled.Send`

### Step 8: Alice sends first message (Message 1/10)

1. Tap message input field
2. Type: "Hello Bob, when can you start?"
3. **Verify:** Send button becomes active (primary color)
4. Tap Send button
5. **Verify:** Message appears as a sent bubble (right-aligned, primary color background)
6. **Verify:** Message text "Hello Bob, when can you start?" visible in the bubble
7. **Verify:** Input field cleared after sending

**What happens on the server:**
1. WebSocket receives `{"type":"message","conversationId":X,"content":"Hello Bob, when can you start?"}`
2. `MessageService.HandleMessage()` validates sender is conversation participant
3. Creates Message record in database
4. Updates `conversation.LastMessage = "Hello Bob, when can you start?"` and `LastMessageAt`
5. Broadcasts message to other conversation participants (Bob is offline, so no delivery)
6. Sends `{"type":"message_sent"}` confirmation back to Alice

**UI elements:**
- Sent bubble: `MessageBubble` composable with `isFromMe = true` → right-aligned, primary color
- Bubble shape: rounded corners (16dp top, 4dp bottom-end for sent messages)

### Step 9: Alice verifies conversation list

1. Tap Back button (returns to Task Detail or Marketplace)
2. Navigate back to Marketplace if needed
3. Tap "Messages" tab in bottom bar
4. **Verify:** ConversationListScreen shows at least one conversation
5. **Verify:** Conversation card shows:
   - Other user's name (Bob's name) with Person icon
   - Task title "Help me move furniture"
   - Last message preview "Hello Bob, when can you start?"
   - Timestamp

**UI elements:**
- ConversationCard: Person icon, task title (`conversation.task?.title`), last message (`conversation.lastMessage`), formatted timestamp
- Empty state: "No conversations yet" (should NOT show since we have one)

### Step 10: Alice logs out

1. Tap "Profile" tab → scroll to "Logout" → confirm
2. **Verify:** Login screen ("Welcome Back")

### Step 11: Bob logs in and checks Messages tab

1. Enter Bob's email and password → "Login"
2. **Verify:** MainScreen with "Marketplace" tab
3. Tap "Messages" tab in bottom bar
4. **Verify:** Conversation visible in list
5. **Verify:** Conversation card shows:
   - Alice's name (other user from Bob's perspective)
   - Task title "Help me move furniture"
   - Last message preview "Hello Bob, when can you start?"

### Step 12: Bob reads Alice's message

1. Tap on the conversation card
2. **Verify:** ChatScreen opens
3. **Verify:** Top bar shows "Chat" with "Connected" status
4. **Verify:** Alice's message "Hello Bob, when can you start?" appears as received bubble (left-aligned, surface variant color)
5. **Verify:** Sender name displayed above the message bubble (Alice's name)

**What happens:**
- `ChatViewModel.loadConversation(id)` fetches message history → Alice's message returned
- WebSocket connects and joins conversation room
- Messages displayed in LazyColumn with `MessageBubble` composable

**UI elements:**
- Received bubble: `MessageBubble` with `isFromMe = false` → left-aligned, `surfaceVariant` color
- Sender name: shown above received messages (`message.sender.name`)

### Step 13: Bob sends reply and continues conversation (Messages 2-10)

1. Tap message input field
2. Type: "I can start tomorrow!"
3. Tap Send button
4. **Verify:** Bob's message appears as sent bubble (right-aligned, primary color)
5. **Verify:** Both messages now visible in chat:
   - Alice's message (left-aligned, received)
   - Bob's message (right-aligned, sent)
6. **Verify:** Messages are in chronological order (Alice's first, Bob's second)

**Continued message exchange:** Alice and Bob continue exchanging messages, alternating between logging in/out, sending a total of 10 messages:
- Message 3: Alice: "Great! What time works best for you?"
- Message 4: Bob: "How about 2 PM?"
- Message 5: Alice: "Perfect! I'll be at home."
- Message 6: Bob: "Do you need me to bring any tools?"
- Message 7: Alice: "Yes, if you have a dolly that would be helpful."
- Message 8: Bob: [2000-word long message about moving experience and tips] **(edge case test)**
- Message 9: Alice: "Wow, thanks for all the detailed tips!"
- Message 10: Bob: "No problem, see you tomorrow!"

**What happens on the server:**
- Creates Message record for each message
- Updates `conversation.LastMessage` after each send
- Broadcasts to conversation room (offline users receive on next login)
- Long message (2000 words) tests database column size, WebSocket payload handling, and UI rendering

### Step 14: Bob verifies updated conversation list

1. Tap Back button
2. **Verify:** ConversationListScreen shows
3. **Verify:** Conversation card now shows:
   - Last message updated to "I can start tomorrow!" (Bob's reply)
   - Updated timestamp

### Step 15: Bob logs out

1. Tap "Profile" tab → scroll to "Logout" → confirm
2. **Verify:** Login screen ("Welcome Back")

### Step 16: Alice verifies complete conversation (all 10 messages)

1. Login as Alice
2. Tap "Messages" tab in bottom bar
3. **Verify:** Conversation card shows last message "No problem, see you tomorrow!" (Bob's final message)
4. Tap on the conversation
5. **Verify:** ChatScreen shows all 10 messages in chronological order:
   - Message 1: "Hello Bob, when can you start?" (Alice, sent bubble)
   - Message 2: "I can start tomorrow!" (Bob, received bubble)
   - Message 3: "Great! What time works best for you?" (Alice, sent bubble)
   - Message 4: "How about 2 PM?" (Bob, received bubble)
   - Message 5: "Perfect! I'll be at home." (Alice, sent bubble)
   - Message 6: "Do you need me to bring any tools?" (Bob, received bubble)
   - Message 7: "Yes, if you have a dolly that would be helpful." (Alice, sent bubble)
   - Message 8: [2000-word long message] (Bob, received bubble) — verify first 50 chars visible
   - Message 9: "Wow, thanks for all the detailed tips!" (Alice, sent bubble)
   - Message 10: "No problem, see you tomorrow!" (Bob, received bubble)
6. **Verify:** All messages display correctly, including the long message (2000 words)
7. **Verify:** Chat UI handles long message gracefully (scrollable, readable, no truncation)

---

## Architecture Details

### Server Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/v1/conversations` | Create conversation (task_id + tasker_id) |
| `GET` | `/api/v1/conversations` | List user's conversations |
| `GET` | `/api/v1/conversations/:id/messages` | Message history (limit/offset) |
| `GET` | `/api/v1/ws?token=JWT` | WebSocket upgrade for real-time messaging |

### WebSocket Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `join` | Client → Server | Join conversation room |
| `joined` | Server → Client | Confirm joined room |
| `message` | Client → Server | Send chat message |
| `message_sent` | Server → Client | Confirm message saved |
| `message` | Server → Client | Broadcast received message |
| `typing` | Client → Server | Typing indicator |
| `read` | Client → Server | Mark messages as read |

### Key Code Files

| File | Purpose |
|------|---------|
| `ChatScreen.kt` | Chat UI with message bubbles, input, connection status |
| `ChatViewModel.kt` | WebSocket lifecycle, message state, send/receive |
| `ConversationListScreen.kt` | Conversation list with cards |
| `ConversationListViewModel.kt` | Load conversations from API |
| `WebSocketClient.kt` | OkHttp WebSocket client with ping/pong |
| `TaskDetailScreen.kt:342-356` | "Message" button (IN_PROGRESS tasks only) |
| `server/internal/websocket/hub.go` | Server-side pub/sub hub |
| `server/internal/websocket/client.go` | Server-side client read/write pumps |
| `server/internal/services/message.go` | Message handling, broadcasting |

---

## Prerequisites

```bash
# Terminal 1: Start the Go test server (required for WebSocket)
cd server
CGO_ENABLED=1 go build -o bin/testserver ./cmd/testserver
./bin/testserver
# Server runs on port 9999 with WebSocket support at /api/v1/ws

# Terminal 2: Install app on emulator
cd android && ./gradlew installDevDebug
```

---

## Common Failure Points

| Step | Failure | Cause | Fix |
|------|---------|-------|-----|
| 6 | "Message" button not visible | Task not IN_PROGRESS | Ensure application was accepted in Step 5 |
| 7 | Connection shows "Disconnected" | WebSocket can't connect | Check test server is running, check `10.0.2.2:9999` reachable |
| 7 | Connection shows "Error" | JWT token invalid | Re-login to get fresh token |
| 8 | Send button stays disabled | WebSocket not connected | Wait for "Connected" status before sending |
| 8 | Message not appearing | WebSocket message not processed | Check server logcat for WebSocket errors |
| 9 | Conversation list empty | API call failed | Check `GET /conversations` returns data |
| 10 | Logout scroll fails | LazyColumn off-screen | Use `performScrollToNode()` not `performScrollTo()` |
| 12 | Alice's message not showing | Message not persisted | Check server DB, verify `GET /conversations/:id/messages` |
| 16 | Only some messages visible | Messages not saved | Check WebSocket message_sent confirmation for each |
| 16 | Long message not displaying | Message too large for UI | Check LazyColumn rendering, verify no truncation |
| 16 | Long message causes crash | Out of memory / buffer overflow | Check server DB TEXT column, WebSocket max frame size |
| Any | Test timeout on long message | Network slow / large payload | Increase timeout for message 8, check server processing time |
