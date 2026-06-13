# UI/UX Design

## Layout

Split-panel layout throughout the authenticated app:
- **Left sidebar** — persistent, always visible, not collapsible
- **Right panel** — active chat content

---

## Login Screen

- Centered card on a plain background
- Logo above the card
- Fields: Email, Password
- Login button
- No registration link — accounts are provisioned by developers

---

## Sidebar

### Chat List
- Scrollable list of chat cards
- Active chat is highlighted
- Each card shows:
  - Chat title
  - Last message preview (truncated)
  - Last activity timestamp
  - Three-dot menu (Delete only; rename deferred)

### Delete Chat
- Three-dot menu → Delete opens a confirmation dialog
- Dialog: "Are you sure you want to delete [chat title]? This cannot be undone." + Delete / Cancel buttons

### New Chat Button
- Floating "+" button in the sidebar

### User Avatar
- User initials/avatar pinned to the bottom of the sidebar
- Clicking opens a small popover with a Logout option

---

## Create Chat Dialog

Floats over the full layout when "+" is clicked.

**Fields:**
1. **Title** — text input, default value `Untitled #1` (auto-increments per user)
2. **Document selection** — searchable multiselect list; documents are fetched from the backend `/chat` service
   - Search bar for filtering documents (basic text match)
   - Min and max selection constraints enforced
   - Max selectable count configurable (to be defined per deployment)

**Buttons:**
- **Create** — enabled only when: min number of documents is selected AND title is not already taken
- **Cancel**

**On Create:**
- New chat is created
- User is navigated directly to the new chat
- A loading spinner runs immediately (backend may take time to initialise the chat)
- When ready, the welcome message is displayed

---

## Chat Screen (Right Panel)

### Header
- Chat title
- Document chips — compact tags showing which documents are loaded in context

### Message List
- **User messages** — right-aligned chat bubbles
- **Assistant responses** — full-width, markdown rendered directly (supports headings, lists, code blocks, etc.)
- **Loading state** — spinner shown while waiting for assistant response; full message appears at once when ready (no streaming for MVP)
- **Welcome message** — first message in every new chat, returned by the backend after initialisation; follows the same spinner → full-message flow as any other response
- **Error state** — inline error notice displayed below the last message with a Retry button when the backend call fails

### Message Feedback
Appears below each assistant message:
- Thumbs up / Thumbs down buttons
- Clicking either opens an optional text comment field
- Text comment is optional, not required to submit feedback

### Input Area
- Fixed multiline textarea (always shows ~3-4 lines)
- Send button only — no keyboard shortcut for sending
- Enter and Shift+Enter both insert a newline

---

## Deferred / Future Screens

| Feature | Notes |
|---|---|
| Document upload screen | Modelled similarly to chat list home screen; upload may be time-consuming so needs its own flow |
| Top-level navigation (icon rail) | Add when Documents and Settings sections are introduced |
| Sidebar collapse | Nice-to-have, not needed for MVP |
| Chat rename | Three-dot menu item, deferred |
| User registration | Login is credentials-only for now |
| Streaming responses | Backend contract change required; revisit post-MVP |
| Suggested starter questions | Requires hardcoded or backend-generated prompts; deferred |
