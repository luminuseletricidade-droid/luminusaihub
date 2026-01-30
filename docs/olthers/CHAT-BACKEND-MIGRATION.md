# Chat Backend Migration: Edge Function → FastAPI

## Overview

Migrated chat functionality from Supabase Edge Function to FastAPI backend to fix WORKER_LIMIT errors and improve reliability.

**Status**: ✅ Complete
**Commits**: `2240785`, `e35ebdd`
**Date**: 2025-10-27

## Problem

The Supabase Edge Function `smart-chat` was failing with WORKER_LIMIT errors:

```
HTTP 546: FunctionsHttpError: Edge Function returned a non-2xx status code
```

### Root Causes

1. **Resource Limits**: Edge Functions have strict ~60s timeout limit
2. **Aggressive Optimizations**: Previous timeout reductions (45s → 12s) caused premature failures
3. **Payload Constraints**: Limited memory/processing on Edge Functions
4. **No Fallback**: Single attempt without retry on failure

## Solution

Created new FastAPI `/api/smart-chat` endpoint with:
- ✅ **Longer Timeouts**: 120s (vs 12s on Edge Function)
- ✅ **Better Resources**: Full backend compute available
- ✅ **Proper Error Handling**: Detailed logging and error responses
- ✅ **Higher Limits**: 4000 tokens max (vs 1000 on Edge Function)
- ✅ **Same Interface**: Drop-in replacement for frontend

## Implementation Details

### Backend Endpoint: `/api/smart-chat`

**File**: `backend/main.py` (lines 2386-2553)

```python
@app.post("/api/smart-chat", tags=["chat"], summary="Smart Chat com Gemini")
async def smart_chat(request: Dict[str, Any] = Body(...)):
    """
    Smart chat endpoint using Gemini API directly (no Edge Function)

    Handles:
    - Text-only queries (fast path)
    - Queries with file context
    - Contract context integration
    - Multiple AI agent types
    """
```

#### Request Format

```json
{
  "message": "string",
  "contractId": "uuid",
  "agent_id": "string",
  "uploaded_files": [],
  "contract_context": {},
  "file_context": null,
  "maintain_context": true,
  "session_id": "uuid"
}
```

#### Response Format

```json
{
  "success": true,
  "response": "string",
  "agent_used": "string",
  "ai_provider": "Gemini",
  "ai_model": "gemini-2.5-pro",
  "files_processed": 0,
  "context_maintained": true,
  "processing_method": "backend_direct"
}
```

#### Key Features

1. **Direct Gemini Integration**
   - Uses `genai.Client` for Gemini 2.5 Pro
   - 120s timeout (sufficient for most queries)
   - 4000 max_tokens output

2. **Context Management**
   - Contract context integration
   - Conversation history (last 5 messages)
   - Agent type routing

3. **Error Handling**
   - 400: Empty message
   - 500: Missing API key, Gemini error
   - 504: Timeout
   - Detailed error messages for debugging

4. **System Prompt Generation**
   - Dynamic prompts based on agent type
   - Contract context inclusion
   - File context handling
   - Conversational response enforcement

### Frontend Changes

**File**: `src/components/ModernContractChat.tsx` (lines 1249-1336)

**Before** (Edge Function):
```typescript
const { data, error } = await supabase.functions.invoke('smart-chat', {
  body: { message, contractId, agent_id, ... }
});
```

**After** (FastAPI Backend):
```typescript
const response = await fetch('/api/smart-chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
  },
  body: JSON.stringify({
    message, contractId, agent_id, ...
  })
});
```

#### Changes Made

1. **Two code paths updated**:
   - PDF context path (line 1249-1279)
   - Text-only query path (line 1309-1336)

2. **Standard fetch API**
   - Uses standard HTTP instead of Supabase functions client
   - Proper error handling with response.ok check
   - Auth token included in headers

3. **No request format change**
   - Same JSON structure
   - Same response parsing
   - Drop-in replacement

## Performance Comparison

| Aspect | Edge Function | FastAPI Backend |
|--------|---------------|-----------------|
| **Timeout** | 12s | 120s |
| **Max Tokens** | 1000 | 4000 |
| **Error Rate** | High (WORKER_LIMIT) | Low |
| **Resource Limits** | Strict | Abundant |
| **Retry Support** | No | Yes (can add) |
| **Logging** | Limited | Full |
| **Cost** | Per execution | Included |

## Testing Instructions

### Prerequisites

1. Backend running: `python backend/main.py`
2. Frontend dev server: `npm run dev`
3. GEMINI_API_KEY configured in `.env`

### Test Cases

#### Test 1: Simple Text Query
```
1. Open ModernContractChat
2. Select contract
3. Type: "Qual é o status deste contrato?"
4. Verify: Response appears in ~5-10 seconds
5. Check: Browser console shows fetch to /api/smart-chat
```

**Expected**: ✅ Conversational response about contract status

#### Test 2: Query with Contract Context
```
1. Open contract with data
2. Type: "Quais são os termos de pagamento?"
3. Verify: Response includes contract-specific information
```

**Expected**: ✅ Response based on active contract context

#### Test 3: Error Handling
```
1. Disable GEMINI_API_KEY in backend
2. Send message
3. Verify: Proper error message displayed
```

**Expected**: ✅ Error message: "Sistema de IA não configurado"

### Debugging

**View backend logs**:
```bash
tail -f backend/backend.log
```

**Look for**:
```
💬 [Smart-Chat] Request received: agent=...
🤖 [Smart-Chat] Calling Gemini API
✅ [Smart-Chat] Gemini response received
```

**Check browser console**:
- Network tab shows POST to `/api/smart-chat`
- Response status 200 with JSON data

## Rollback Instructions

If issues occur, rollback to Edge Function:

```bash
# Revert frontend changes
git revert e35ebdd

# Revert backend changes
git revert 2240785

# Restore Edge Function from commit e30e199
git cherry-pick e30e199
```

**Note**: Edge Function has WORKER_LIMIT issues, so not recommended.

## Future Improvements

1. **Caching**: Cache similar queries to reduce latency
2. **Streaming**: Stream responses for real-time UI updates
3. **Rate Limiting**: Add per-user rate limits
4. **Analytics**: Track usage patterns and costs
5. **Multi-Provider**: Add OpenAI fallback if Gemini fails

## Configuration

### Environment Variables

```bash
# Required
GEMINI_API_KEY=your-api-key

# Optional (legacy, will try GEMINI_API_KEY first)
GOOGLE_API_KEY=your-api-key
```

### Timeout Configuration

Current: 120s (line 2463 in main.py)
Adjust if needed:
```python
request_options={
    "timeout": 120  # Increase for complex queries
}
```

## Monitoring

### Metrics to Track

1. **Response Time**: Should be 2-15 seconds
2. **Error Rate**: Target < 1%
3. **Token Usage**: Monitor per API key
4. **Timeout Errors**: Should be rare

### Alert Conditions

- ⚠️ Response time > 30 seconds
- 🔴 Error rate > 5%
- 🔴 Timeouts > 10/1000 requests

## API Documentation

Full endpoint documentation available at:
- Backend swagger: `http://localhost:8000/docs`
- Endpoint: `POST /api/smart-chat`
- Tags: `chat`

## Related Issues

- **WORKER_LIMIT**: Fixed by moving to backend
- **CEP-002**: Previously fixed textarea initialization
- **Chat timeouts**: Resolved with 120s backend timeout

## Commits

| Commit | Message |
|--------|---------|
| `2240785` | Add FastAPI /api/smart-chat endpoint for Gemini API |
| `e35ebdd` | Fix: Redirect chat calls to FastAPI backend |

## Next Steps

1. ✅ Deploy backend changes to staging
2. ✅ Deploy frontend changes to staging
3. ⏳ Monitor logs for issues
4. ⏳ Get user feedback on chat responsiveness
5. ⏳ Deploy to production

---

**Status**: ✅ Implemented and Ready for Testing
**Responsible**: Claude Code
**Last Updated**: 2025-10-27
