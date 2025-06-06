# Story Creation Permission Error Handling Issue

**Priority**: Medium  
**Status**: Open  
**Reporter**: User  
**Date**: June 4, 2025  
**Affected Components**: Story Management, Error Handling, User Experience

## Summary

When a non-host user attempts to create a story, the application returns a 403 "Host authorization required" error but displays a generic "Failed to create story" message to the user. The actual permission error is only visible in the browser console, providing poor user experience and unclear feedback.

## Expected Behavior

- Users who are not the session host should see a clear, informative error message when attempting to create stories
- The error message should explain that only the session host can create stories
- The UI should provide guidance on what the user can do (e.g., "Ask the session host to create stories")
- No confusing generic error messages should be shown

## Actual Behavior

- User attempts to create a story when they're not the host
- Browser console shows: `POST http://192.168.68.58:3001/api/sessions/.../stories 403 (Forbidden)`
- Console shows: `Error creating story: {message: 'Host authorization required', code: 'ERR_BAD_REQUEST', status: 403}`
- User sees generic toast message: "Failed to create story - Please try again"
- User has no indication that this is a permission issue, not a technical failure

## Steps to Reproduce

1. User A creates a session and becomes the host
2. User B joins the same session (becomes a regular participant)
3. User B attempts to create a new story by clicking "Add Story" or "Create Story"
4. **Bug**: User B sees generic "Failed to create story" message instead of permission-specific feedback

## Technical Analysis

### Root Cause

**Location**: `/src/components/StoryCreator.tsx:47-51`

**Issue**: Generic error handling that doesn't differentiate between permission errors and other failures:

```typescript
} catch (error) {
  console.error('Error creating story:', error);
  showToast('Failed to create story', 'error', {
    message: 'Please try again'  // ❌ Generic message for all errors
  });
}
```

**Backend Response**: The API correctly returns a 403 status with `"Host authorization required"` message, but the frontend doesn't parse this specific error.

### Contributing Factors

1. **Store Error Propagation** (`/src/store.ts:539-542`):
   ```typescript
   } catch (error) {
     console.error('Error creating story:', error);
     throw error; // ✅ Correctly propagates error
   }
   ```

2. **Missing Error Type Checking**: The frontend doesn't check `error.status` or `error.message` to provide context-specific feedback.

3. **No Permission-Based UI**: The "Add Story" button is visible to all users regardless of their permissions.

## Proposed Solution

### Phase 1: Improve Error Message Handling

1. **Update StoryCreator error handling** to check for specific error types:
   ```typescript
   } catch (error: any) {
     console.error('Error creating story:', error);
     
     if (error.status === 403 || error.message?.includes('Host authorization required')) {
       showToast('Only the session host can create stories', 'error', {
         message: 'Ask the host to create stories for the session'
       });
     } else if (error.status === 401) {
       showToast('Authentication required', 'error', {
         message: 'Please refresh and rejoin the session'
       });
     } else {
       showToast('Failed to create story', 'error', {
         message: 'Please try again or contact support'
       });
     }
   }
   ```

2. **Add error type definitions** for better type safety:
   ```typescript
   interface ApiError {
     message: string;
     code: string;
     status: number;
     details?: unknown;
   }
   ```

### Phase 2: Prevent Invalid Actions (Optional Enhancement)

1. **Hide/Disable "Add Story" button for non-hosts**:
   ```typescript
   const isHost = useGameStore(state => state.isCurrentUserHost());
   
   // Hide button entirely or show as disabled with tooltip
   {isHost ? (
     <Button onClick={handleCreateStory}>Add Story</Button>
   ) : (
     <Tooltip content="Only the session host can create stories">
       <Button disabled>Add Story</Button>
     </Tooltip>
   )}
   ```

2. **Add permission indicators** in the UI to show user roles clearly.

### Phase 3: Consistent Error Handling Pattern

1. **Create centralized error handler** for API responses:
   ```typescript
   export function handleApiError(error: any, context: string): string {
     if (error.status === 403) {
       if (error.message?.includes('Host authorization required')) {
         return 'Only the session host can perform this action';
       }
       return 'You do not have permission to perform this action';
     }
     // ... other error types
     return `Failed to ${context}. Please try again.`;
   }
   ```

2. **Apply consistent error handling** across all story operations (create, update, delete, activate).

## Impact Assessment

**Severity**: Medium - UX issue but doesn't break functionality  
**User Experience**: Poor - Confusing and unhelpful error messages  
**Business Impact**: Medium - Users may think the app is broken rather than understanding permissions

### Affected User Flows
- Story creation attempts by non-host users
- New user onboarding (understanding roles and permissions)
- Error recovery and troubleshooting

## Testing Strategy

### Manual Testing
1. Test story creation as host (should work)
2. Test story creation as non-host (should show clear permission error)
3. Test with network failures (should show technical error)
4. Test with authentication issues (should show auth error)

### Automated Testing
1. Unit tests for error message formatting
2. Integration tests for permission-based error responses
3. E2E tests for user experience scenarios

## Files to Modify

### Frontend
- `src/components/StoryCreator.tsx` - Improve error handling and messaging
- `src/store.ts` - Ensure proper error propagation (already working)
- `src/types/errors.ts` - Add error type definitions (new file)
- `src/utils/errorHandling.ts` - Centralized error handling utilities (new file)

### Optional Enhancements
- `src/components/StoryList.tsx` - Hide/disable actions based on permissions
- `src/hooks/usePermissions.ts` - Permission checking hook (new file)

## Acceptance Criteria

- [ ] Non-host users see clear "Only the session host can create stories" message when attempting story creation
- [ ] Error message includes helpful guidance ("Ask the host to create stories")
- [ ] Different error types (permission, auth, network) show appropriate messages
- [ ] No more generic "Failed to create story" messages for permission errors
- [ ] Console errors still logged for debugging but user sees helpful UI messages
- [ ] Error handling is consistent across all story operations
- [ ] Solution is maintainable and extensible to other permission-based actions

## Related Issues

- Story synchronization bug (related to WebSocket story events)
- Session management and user roles
- General error handling improvements across the application

## Implementation Notes

This is a user experience improvement that should be straightforward to implement. The backend is already returning proper error codes and messages - we just need to handle them appropriately in the frontend.

Priority should be given to the basic error message improvement (Phase 1) as it provides immediate value with minimal complexity.