# Scenario 15: Multi-User Chat & Conversation List

## Overview

Tests multi-conversation handling with 3 users and 20 total messages across 2 conversations. Verifies the chat list displays multiple conversations correctly with proper last message previews, and that messages are scrollable within each conversation.

## Preconditions

- Go test server running on port 9999 (fresh database)
- Android device/emulator connected
- Dev flavor app installed

## Users

| User  | Role              |
|-------|-------------------|
| Alice | Task poster       |
| Bob   | Tasker (Task 1)   |
| Carol | Tasker (Task 2)   |

## Flow

### Phase 1: Setup

1. Alice registers, deposits 400,000 VND
2. Alice creates Task 1: "Clean my apartment" (100,000 VND)
3. Alice creates Task 2: "Fix my garden" (100,000 VND)
4. Alice logs out
5. Bob registers, becomes tasker, applies to Task 1
6. Bob logs out
7. Carol registers, becomes tasker, applies to Task 2
8. Carol logs out

### Phase 2: Alice accepts and messages

9. Alice logs in
10. Alice opens Task 1 → accepts Bob's application (escrow created)
11. Alice taps "Message" → conversation 1 created
12. Alice sends 5 messages to Bob (messages 1-5)
13. Alice navigates back to Marketplace
14. Alice opens Task 2 → accepts Carol's application (escrow created)
15. Alice taps "Message" → conversation 2 created
16. Alice sends 5 messages to Carol (messages 6-10)
17. Alice checks Messages tab → verifies 2 conversations visible
18. Alice logs out

### Phase 3: Bob replies

19. Bob logs in → Messages tab → opens conversation 1
20. Bob verifies Alice's messages arrived
21. Bob sends 5 replies (messages 11-15)
22. Bob verifies conversation list shows 1 conversation
23. Bob logs out

### Phase 4: Carol replies

24. Carol logs in → Messages tab → opens conversation 2
25. Carol verifies Alice's messages arrived
26. Carol sends 5 replies (messages 16-20)
27. Carol verifies conversation list shows 1 conversation
28. Carol logs out

### Phase 5: Final verification

29. Alice logs in → Messages tab
30. Verify both conversations visible in chat list
31. Verify last message preview for conversation 1: "See you Saturday morning, Alice!"
32. Verify last message preview for conversation 2: "I have all the tools we need, see you soon!"
33. Open conversation 1 → scroll and verify key messages from 10-message exchange
34. Open conversation 2 → scroll and verify key messages from 10-message exchange

## Messages (20 total)

### Conversation 1: Alice ↔ Bob ("Clean my apartment")

| # | Sender | Message |
|---|--------|---------|
| 1 | Alice  | Hi Bob, thanks for taking the cleaning job! |
| 2 | Alice  | When can you come to clean the apartment? |
| 3 | Alice  | The apartment is about 80 square meters. |
| 4 | Alice  | Please bring your own cleaning supplies. |
| 5 | Alice  | The door code is 4521, let yourself in. |
| 6 | Bob    | Hi Alice, happy to help with the cleaning! |
| 7 | Bob    | I can come this Saturday morning at 9 AM. |
| 8 | Bob    | I have all the supplies I need. |
| 9 | Bob    | What floor is your apartment on? |
| 10| Bob    | See you Saturday morning, Alice! |

### Conversation 2: Alice ↔ Carol ("Fix my garden")

| # | Sender | Message |
|---|--------|---------|
| 11| Alice  | Hi Carol, welcome to the garden project! |
| 12| Alice  | The garden really needs a lot of work. |
| 13| Alice  | There are weeds growing everywhere. |
| 14| Alice  | The wooden fence also needs some repair. |
| 15| Alice  | Can you bring pruning shears and gloves? |
| 16| Carol  | Thanks Alice, excited about this project! |
| 17| Carol  | I specialize in garden restoration work. |
| 18| Carol  | I will tackle the weeds first thing. |
| 19| Carol  | Then move on to fixing the fence. |
| 20| Carol  | I have all the tools we need, see you soon! |

## Key Verifications

- **Chat list shows multiple conversations**: Alice sees both conversations
- **Last message previews are correct**: Each conversation card shows the most recent message
- **Single-user view is correct**: Bob sees only his conversation, Carol sees only hers
- **Message scrolling works**: All 10 messages per conversation are accessible via scrolling
- **Conversation isolation**: Messages from one conversation don't leak into another

## Test Class

`S15_MultiUserChatE2ETest.kt` — extends `RealServerBaseE2ETest`
