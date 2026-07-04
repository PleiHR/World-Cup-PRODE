# Build spec — mobile fixes + duplicate-code cleanup

Working notes for the first practice build. Read this before touching code; each task lists what "done" means and how we'll check it independently. Everything here was checked twice: once by me, then by a separate, skeptical subagent whose job was to try to prove me wrong. Corrections from that second pass are folded in below.

Goal for the whole session: fix the bottom-nav mobile bug Priscila noticed, clean up dead duplicate code safely, and tidy two smaller mobile rough edges — without touching scoring, login, admin logic, or saved predictions.

---

## Task 0 — Delete the dead duplicate copy of the app (do this first)

**What's wrong:** `index.html` contains two full copies of the entire app pasted back to back — lines 1–4174 (copy 1) and lines 4175–8336 (copy 2). Every future edit to "the code" has to be made twice, and it's easy to edit the wrong half and see nothing change.

**Root cause, verified twice, independently:**
- `git log` shows commit `034968f` (Jun 29) inserted the second copy in one shot (+4127 lines, 0 deletions). A subagent traced it further: that commit actually inserted new content *before* the old file's content, meaning copy 2 (lines 4175+) is the original, pre-existing code, and copy 1 (lines 1–4174) is the newer content. So copy 1 isn't "the old one" — it's the one that ended up first in the file and is the one that runs.
- Both copies declare the same ~21 JavaScript variables at the top level using `const`/`let` (e.g. `const MATCHES = [...]`). Browsers share one global scope across `<script>` tags on the same page, and redeclaring a `const`/`let` name is a hard error. I proved this with a real test using Node's V8 engine (the same engine Chrome uses): the second copy's script throws `SyntaxError: Identifier 'MATCHES' has already been declared` the moment the browser tries to run it, and **nothing else in that second script runs** — not its data, not its functions, not its Firebase setup. A follow-up subagent independently re-ran this test using the actual extracted code from the real file (not a simplified example) and confirmed the same result, including checking that copy 1's functions are completely unaffected by copy 2's failed script.
- The subagent also diffed every line that differs between the two copies. Nothing of current value is trapped in copy 2: it's an older, pre-fix version of the bracket logic and match schedule that copy 1 already superseded. One small thing (`validateKnockoutBracket()`, a sanity-check function) exists only in copy 1 — good, since copy 1 is the one that's live.
- Deletion boundary verified byte-for-byte: removing lines 4175 through 8336 (inclusive) leaves copy 1 completely intact, with no stray leftover tags.

**Change:** delete lines 4175–8336 in full. Nothing else changes.

**Safe zone:** yes. This removes code that never runs; it cannot change anything a user sees or does today.

**"Done" looks like:** the file is ~4174 lines, ends in `</html>`, and the site behaves identically to before (nothing should look or act different, since the deleted half never executed).

**Independent check:** a subagent opens the local preview (not the live site) before and after the change, clicks through Matches, Ranking, Bracket, Prizes, Guide, Profile, Admin, and confirms nothing changed. Also do one real-browser smoke test (open the file in an actual browser tab, check the console for errors) since our verification so far used code analysis and Node, not an actual rendered browser tab — cheap extra insurance before calling this done.

---

## Task 1 — Bottom nav: items get cut off on some phones

**Root cause (confirmed, refined by subagent review):** `.bottom-nav-item` is a flex item (`flex: 1`) with no `min-width` override. Flex items default to a minimum width equal to their own content ("min-content"), so they can't shrink smaller than their label text. With 6 items (7 for admin accounts), the total minimum width can exceed a narrow phone's screen, and since there's no wrapping or scrolling set up, the overflow items get pushed off-screen instead of shrinking.

**Correction from review:** just adding `min-width: 0` isn't enough on its own — it lets the box shrink, but the text inside would then overflow and visually overlap the next item. And adding `flex-wrap` (an easy first instinct) is a bad idea here since the bar has a fixed height and wrapping would either squash icons to nothing or break the bar's height. The right fix is shrink + truncate.

**Change** (in the live copy, current lines ~685–703):
```css
.bottom-nav-item {
  flex: 1;
  min-width: 0;              /* add */
  ...                        /* existing rules unchanged */
}
.bottom-nav-item span:not(.bnav-icon) {   /* new rule */
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```
No HTML changes needed — labels are already plain `<span>` elements.

**Safe zone:** yes — pure CSS, no JS anywhere measures the pixel size of these buttons (checked directly, zero matches).

**"Done" looks like:** on a narrow-phone preview (e.g. 320–375px wide) with an admin account (7 items showing), all 7 icons are visible and any label that doesn't fit shows "…" instead of disappearing or overlapping.

**Independent check:** subagent opens the local preview at a few narrow widths (320px, 360px, 390px), as both a regular user and an admin account, and confirms every nav item is visible and tappable, not just the icons rendering but actually navigating on click.

---

## Task 2 — Bottom nav / header: safe-area spacing on notched phones

**Original ask was incomplete — a subagent caught a real gap here, worth reading carefully.**

**Root cause:** the bottom bar has no extra space reserved for the home-indicator gesture area on newer iPhones. The fix requires telling the browser to let content extend into that area (`viewport-fit=cover` on the `<meta name="viewport">` tag), which is currently missing entirely — without it, the padding trick below does nothing.

**The catch:** `viewport-fit=cover` applies to the *whole screen*, not just the bottom. Turning it on removes the browser's automatic reservation at the *top* too — meaning the sticky header would then start under the iPhone notch/status bar unless we also pad the top. This wasn't in the original ask; skipping it would trade one visual bug for a new one at the top of every page. Both sides need to be fixed together, in the same change.

**Change:**
1. Add `viewport-fit=cover` to the viewport meta tag (line 5): `content="width=device-width, initial-scale=1.0, viewport-fit=cover"`.
2. Bottom nav — grow the bar instead of squeezing it (current lines ~674–683):
   ```css
   .bottom-nav {
     ...
     height: calc(62px + env(safe-area-inset-bottom));   /* was 62px */
     padding: 0 0 env(safe-area-inset-bottom) 0;          /* was 0 */
   }
   ```
3. Main content area — add the same clearance so the last bit of content isn't hidden behind the now-taller bar (current line ~658):
   ```css
   .main { padding: 12px 10px calc(90px + env(safe-area-inset-bottom)); }  /* was 12px 10px 90px */
   ```
4. Header — reserve space at the top so it doesn't render under the notch (current `.header`, `position: sticky; top:0`):
   ```css
   .header { padding-top: env(safe-area-inset-top); }
   ```
On phones without a notch, `env(...)` resolves to 0 everywhere, so nothing changes for those users.

**Small heads-up, not blocking:** the "toast" notification popup already sits close to the bottom nav on mobile (pre-existing, unrelated to this fix); making the nav slightly taller nudges that overlap a little more. Worth a glance after this change, not worth a separate task.

**Safe zone:** yes — pure CSS.

**"Done" looks like:** on a simulated notched-phone preview (e.g. browser dev tools "iPhone 14 Pro" preset), the header logo isn't obscured by the notch/status bar, and the bottom nav has breathing room above the home-indicator bar. On a non-notched phone preview, nothing looks different from today.

**Independent check:** subagent checks the local preview using dev-tools device emulation for both a notched phone and a plain one, screenshots both, confirms header and bottom-nav spacing look right on the notched one and unchanged on the plain one.

---

## Task 3 — Tablet breakpoint (optional / low priority)

**Status:** this is a product/design decision, not a bug. Only one breakpoint exists (700px), so tablets in portrait (e.g. iPad, ~768px) get the desktop layout. A subagent confirmed there's zero JavaScript tied to that 700px number, so adding a second breakpoint later is risk-free whenever you want it. Not scheduling this now — flagging it as a "someday if you care about tablet users" item, not part of this build.

---

## Task 4 — Admin "Users" table cramped on mobile (low priority)

**Root cause, corrected:** the table's parent (`.users-panel`) already has `overflow: hidden` (needed for its rounded corners — don't touch that). So today, anything too wide in that table isn't causing a sideways-scrolling page like originally guessed — it's silently clipped/hidden instead, which is arguably worse (missing controls, not just an ugly scrollbar).

**Change:** wrap only the `<table>` itself in a new scroll container, without touching `.users-panel`'s existing `overflow:hidden`. In the JS template that builds this panel (around line 3668):
```js
// before:
<div class="users-panel-header">...</div>
<table class="users-table">
  ...
</table>

// after:
<div class="users-panel-header">...</div>
<div class="table-scroll">
<table class="users-table">
  ...
</table>
</div>
```
Plus one new CSS rule: `.table-scroll { overflow-x: auto; }`

**Safe zone:** yes — admin-only screen, purely visual, no sticky headers or position-dependent buttons found in that table.

**"Done" looks like:** on a narrow phone preview, logged in as admin, the Users table scrolls sideways smoothly if it doesn't fit, and the password-reset button/input for each row stays reachable (not clipped).

**Independent check:** subagent logs into the local preview as admin, opens Users panel at a narrow width, confirms it scrolls and every row's reset control is reachable and clickable.

---

## Order to build in

1. Task 0 (duplicate cleanup) first — it doesn't change behavior, but it makes every task after it simpler (one place to edit, not two).
2. Task 1 (nav item cutoff) — the bug Priscila actually noticed.
3. Task 2 (safe-area spacing) — small polish, do it in the same sitting as Task 1 since it touches the same nav bar.
4. Task 4 (admin table) — whenever there's a spare few minutes; not urgent.
5. Task 3 — someday, not scheduled.

## Rollback plan

Every change here is a small, isolated diff in one file, already in git. If anything looks wrong after building, GitHub Desktop shows the exact diff — discard it (or ask to revert) before committing. Nothing gets pushed live until each task is previewed and approved.
