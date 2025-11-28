# Outstanding Issues & TODOs

## 1. Fix Mention Autocomplete Tests
- **Issue**: The `MentionAutocomplete` component was moved to a React Portal (`createPortal`) to fix visual clipping/z-index issues ("black square container").
- **Status**: The UI fix is implemented, but the unit tests in `CommentThread.test.jsx` are failing because they cannot find the mention list in the DOM.
- **Action**: Update tests to query `document.body` or use `baseElement` to find the portal content.

## 2. Fix Emoji Insertion Logic
- **Issue**: Test failure: `CommentComposer > inserts emoji when selected from picker`. Expected "😀", but got "@😀".
- **Status**: It seems the emoji insertion might be appending to the current text state without clearing the trigger character if it was just typed, or the test sequence is retaining previous state.
- **Action**: Review `handleEmojiSelect` in `CommentThread.jsx` and the test case.

## 3. Investigate "Null" Reaction Bug
- **Issue**: User reports "react show null 1" bug persists.
- **Status**: I added filtering in `ReactionBar` to ignore 'null' keys, but the underlying data might still be corrupted or the backend might be accepting 'null'.
- **Action**: 
    - Check `useComments.js` `reactToComment` function.
    - Check backend `projects.js` route for reaction handling.
    - Ensure `null` is never sent as an emoji payload.

## 4. State Persistence & Reload Issues
- **Issue**: User reports "data some thime dont persist, or state or the same page doeswnt remain same".
- **Status**: Potential race conditions in `useComments` or `CommentThread` draft saving logic.
- **Action**: 
    - Review `localStorage` draft logic in `CommentComposer`.
    - Verify `useProjectSocket` listeners are correctly updating state on reconnect/reload.

## 5. Verify "Black Square" Fix
- **Issue**: The mention list was appearing as a "black square container".
- **Status**: Moved to Portal.
- **Action**: Manually verify in the browser that the mention list now appears correctly above/below the input without being clipped or misstyled.
