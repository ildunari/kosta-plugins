# Tool Patterns — General Principles for Document Operations

These principles apply regardless of which specific tools you're using. They capture failure modes and safe practices discovered through real editing sessions.

## Universal Principles

### Always Read After Writing

Never trust that a write operation succeeded without verification. After any content change:
1. Re-read the affected section
2. Confirm the content matches what you intended
3. Check that surrounding content was not affected

This catches: silent failures, partial writes, encoding issues, unintended side effects.

### Account for Index Shifts

When editing a sequence of items (paragraphs in a document, rows in a spreadsheet, cells in a table):
- Inserting an item shifts all subsequent indices up by 1
- Deleting an item shifts all subsequent indices down by 1
- After any insert or delete, re-read the index map before editing the next item
- When making multiple structural changes, work from highest index to lowest to avoid cascading shifts
- Never assume an index is still valid after a structural change

### Backup Before Destructive Operations

Before deleting content, replacing sections, or restructuring a document:
- Save a copy of the current version (different filename or location)
- Note what the document looked like before changes
- If the tool supports undo or version history, confirm it's available before proceeding

### Handle Formatting Separately from Content

Content changes and formatting changes should be separate operations:
1. Make content changes first (text, values, citations)
2. Verify content is correct
3. Then apply formatting (bold, styles, highlights, colors)

Combining content and formatting in one operation increases the chance of unintended side effects (formatting loss, style corruption, or content changes being masked by formatting issues).

### Track Changes Protocol

When the document requires tracked changes for audit purposes:
1. Enable track changes BEFORE making any content edits
2. Set the author to the appropriate name (not the AI's name unless explicitly requested)
3. Verify track changes are active by checking the document state
4. After editing, verify tracked changes are visible and correctly attributed
5. Never accept or reject existing tracked changes unless explicitly asked to

### Citation Safety

Citations are the most fragile element in document editing. When moving, rewriting, or restructuring text that contains citations:
- Inventory all citations before making changes
- After changes, verify every citation is present and in the correct contextual location
- If a citation is moved to a new paragraph, verify it still supports the claim it's attached to
- If a citation appears in multiple locations, verify all instances are updated consistently
- Plain-text citations (e.g., "[14, 15]") must be carried manually — they don't auto-update

## Common Failure Modes

### Delete Operations That Don't Fully Delete

Some document editing tools (especially MCP-based ones operating on OOXML) may report a deletion as successful but leave behind an empty marker element. This is especially common when track changes are enabled, because the deletion itself becomes a tracked change.

**Detection:** After deleting, re-read the document structure. If the deleted item appears as an empty entry, it hasn't been fully removed.

**Workaround:** If the empty marker can't be removed programmatically, note it for manual cleanup and move on. Don't repeatedly attempt the same delete operation.

### Text Replacement Failing Due to Hidden Characters

Search-and-replace may fail when the visible text doesn't match the internal representation. Common causes:
- En-dashes (–) vs hyphens (-)
- Smart quotes (" ") vs straight quotes (" ")
- Non-breaking spaces vs regular spaces
- Revision markers extending the internal string length

**Detection:** If a replacement returns 0 matches for text you can see in the document, the internal representation differs.

**Workaround:** Use search functionality to find the text first and confirm its exact internal form. Use paragraph-level operations (full paragraph replacement) instead of substring replacement for problematic text.

### Formatting Loss on Paragraph Replacement

Full paragraph replacement operations may strip inline formatting (bold, italic, superscript, subscript). The replacement inserts plain text.

**Detection:** After replacing a paragraph, check whether heading prefixes, emphasis, or special formatting survived.

**Workaround:** Apply formatting as a separate step after content replacement. Note which elements need formatting restoration.

### Encoding Issues in Special Characters

Characters like degree symbols (°), micro symbols (µ), mathematical operators (×, ±), and non-ASCII characters may not survive round-trips through certain tools.

**Detection:** After editing, search for passages that originally contained special characters and verify they're intact.

**Workaround:** If a tool can't handle a character, use a placeholder during editing and restore the character in a final pass using a different tool or manual edit.

## Operation Order for Complex Edits

When a phase involves multiple types of changes to the same document:

1. **Structural changes first** — insert/delete sections, move paragraphs, restructure headings
2. **Content changes second** — rewrite text, update values, add/remove sentences
3. **Citation changes third** — move citations, add new references, remove orphaned citations
4. **Formatting changes last** — bold, styles, highlights, colors, headers/footers
5. **Comments and metadata** — add summary comments, update properties, save

This order minimizes the chance of one type of change undoing another.

## When to Ask the User for Help

Escalate to the user when:
- A tool operation fails twice with different approaches
- The fix requires GUI interaction (e.g., removing specific highlight colors that the tool can't target, complex table formatting, image positioning)
- The document has protection or permissions that block programmatic editing
- A cloud sync conflict is detected (file was modified externally during editing)
- The required tool doesn't exist in the current environment and can't be installed

When escalating, provide:
1. Exact description of the problem
2. What you tried and why it didn't work
3. Specific manual steps the user can take to fix it
4. Whether this blocks the rest of the work or can be deferred
