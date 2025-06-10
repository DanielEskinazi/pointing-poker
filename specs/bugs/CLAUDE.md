# Bug Fix Guidelines

Create bugs in "/specs/bugs" folder
After creating a bug, don't work on it immediately, ask first if you should solve it.

## Before considering any bug fix complete:

1. **Trace the execution path** - Follow the code from trigger to expected outcome
2. **Check assumptions** - Verify async/await, event handlers, and state updates work as expected
3. **Look for edge cases** - Consider error states, race conditions, and missing data
4. **Build & lint** - Run `npm run build` and `npm run lint` for both frontend and backend
5. **Review related code** - Check if the fix affects other components using similar patterns
6. **Check Logs** - Ensure the service logs validate the fix, if we are missing logs to check, add them.

# Bug Fix Requirements - NO EXCEPTIONS

## MANDATORY BEFORE CLOSING ANY BUG:

**🚫 STOP - Answer these 3 questions with YES:**

1. Can I show a screenshot of the bug fixed in the ACTUAL APPLICATION?
2. Did I test the exact scenario from the original bug report?
3. Did the user confirm "this is working now"?

**If ANY answer is NO, keep working.**

## FORBIDDEN SHORTCUTS:

❌ Test files instead of real app
❌ "Should work" without showing it working
❌ Build passes = bug fixed
❌ Moving to archive without user approval

## REQUIRED PROOF:

- Screenshot of fix working in real application
- User confirmation: "this works"

**Type "BUG VERIFIED FIXED" only after providing both.**

## After Bug completion

1. **Close matching Github Issues** - Check if there is a matching github issue and close it.
2. **Archive bug** - Move the completed bug into "/specs/bugs/archive"
