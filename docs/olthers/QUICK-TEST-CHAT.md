# Quick Test: Chat Backend Integration

## Setup (2 minutes)

### 1. Verify Environment Variables
```bash
# Check .env file
cat .env | grep VITE_API_URL

# Should output:
# VITE_API_URL=http://localhost:8000
```

### 2. Start Backend (Terminal 1)
```bash
cd backend
python main.py
# Wait for: "Uvicorn running on http://0.0.0.0:8000"
```

### 3. Start Frontend (Terminal 2)
```bash
npm run dev
# Wait for: "Local: http://localhost:5173"
```

## Testing (5 minutes)

### Test 1: Simple Chat Message
```
1. Open http://localhost:5173
2. Navigate to Contract > Chat
3. Select any contract
4. Type: "Qual é o cliente deste contrato?"
5. Click Send
```

**Expected Result** ✅
- Loading spinner appears (2-3 seconds)
- Response: "O cliente deste contrato é..."
- Check browser Network tab:
  - POST http://localhost:8000/api/smart-chat (200 OK)

**If Error**:
- Check backend console for logs
- Look for: `💬 [Smart-Chat] Request received`
- Check response: `✅ [Smart-Chat] Gemini response received`

### Test 2: Contract Context Integration
```
1. Open contract with data
2. Send: "Quais são os termos de pagamento?"
3. Wait for response
```

**Expected Result** ✅
- Response mentions payment terms from contract
- Conversational format (not JSON)

### Test 3: Error Handling
```
1. Stop backend (Ctrl+C in Terminal 1)
2. Send a message in chat
3. Wait 2 seconds
```

**Expected Result** ✅
- Error message: "Operação demorou muito. Tente uma pergunta mais simples."
- HTTP 504 in Network tab (timeout)

**Restart backend**:
```bash
python main.py
```

## Debugging

### Check Backend Logs
```bash
# In Terminal 1 (backend)
# Look for these log patterns:

💬 [Smart-Chat] Request received: agent=general-conversation
🤖 [Smart-Chat] Calling Gemini API with X char system prompt
✅ [Smart-Chat] Gemini response received: X chars
```

### Check Frontend Network
```
1. Open DevTools (F12)
2. Go to Network tab
3. Send chat message
4. Look for POST /api/smart-chat:
   - URL: http://localhost:8000/api/smart-chat
   - Status: 200 (success) or 500/504 (error)
   - Response: JSON with "response" field
```

### Common Issues

**Issue**: `404 Not Found: /api/smart-chat`
- **Cause**: Frontend using wrong URL
- **Fix**: Restart frontend with `npm run dev`
- **Check**: Network tab shows localhost:8080 instead of 8000

**Issue**: `504 Gateway Timeout`
- **Cause**: Backend not responding
- **Fix**: Check backend is running `python main.py`
- **Check**: Backend console shows no errors

**Issue**: `No response or blank response`
- **Cause**: Gemini API key not configured
- **Fix**: Check `backend/.env` has `GEMINI_API_KEY=...`
- **Check**: Backend logs show `✅ Gemini API Key configured`

**Issue**: `Chat hangs (no response for 60+ seconds)`
- **Cause**: Request exceeded 120s timeout
- **Fix**: Try simpler question
- **Improvement**: Check backend for slow Gemini responses

## Success Criteria ✅

- [x] Backend running on http://localhost:8000
- [x] Frontend running on http://localhost:5173
- [x] Network shows POST to http://localhost:8000/api/smart-chat
- [x] Response received within 5-15 seconds
- [x] Chat message appears in conversational format
- [x] No JSON/code in responses
- [x] Error handling works (proper error messages)

## Backend Endpoints Available

After starting backend, check all endpoints:
```
http://localhost:8000/docs
```

This shows SwaggerUI with all available endpoints including:
- POST /api/smart-chat (our new endpoint)
- POST /api/chat (legacy Agno endpoint)
- And many more...

## Next Steps if Working

1. ✅ Test with different agents (if available)
2. ✅ Test with contract context
3. ✅ Test error scenarios
4. ✅ Ready for staging deployment

## Commit Info

These commits enable chat:
- `2240785`: Added /api/smart-chat endpoint
- `e35ebdd`: Redirected frontend to backend
- `58a94c6`: Fixed API_BASE_URL routing

---

**Last Updated**: 2025-10-27
**Status**: Ready for Testing
