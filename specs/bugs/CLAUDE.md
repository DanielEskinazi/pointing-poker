# Bug Fix Verification Guidelines

## Create bugs in "/specs/bugs" folder and an accompanying github issue

## Before considering any bug fix complete:

1. **Trace the execution path** - Follow the code from trigger to expected outcome
2. **Check assumptions** - Verify async/await, event handlers, and state updates work as expected
3. **Look for edge cases** - Consider error states, race conditions, and missing data
4. **Build & lint** - Run `npm run build` and `npm run lint` for both frontend and backend
5. **Review related code** - Check if the fix affects other components using similar patterns
6. **Check Logs** - Ensure the service logs validate the fix, if we are missing logs to check, add them.

## Show Proof of bug fix

1. **Show logic** - Explain your logic to why this bug fix would work and wouldn't break other things.
2. **Show Logs** - Show proof with service logs
3. **Show Screenshots** - If changing frontend code, show screenshots taken with playwright

## After Bug completion

1. **Close matching Github Issues** - Check if there is a matching github issue and close it.
2. **Archive bug** - Move the completed bug into "/specs/bugs/archive"
