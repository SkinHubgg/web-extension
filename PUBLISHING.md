# Releasing this to the extension stores

Written 2026-08-21. Everything here was read off the current Chrome, Mozilla and Microsoft docs on
that date rather than recalled; the links are in each section so you can re-check the day you do it.

---

## Short version

1. Pay Google **US$5, once, ever** and you have a Chrome Web Store developer account.
2. Zip three things: `manifest.json`, `src/`, `icons/`.
3. Upload it, fill in the listing, answer the privacy questions, submit.
4. Wait. A few days is normal, a few weeks happens.
5. Edge is the same package for free. Firefox is not, and probably does not work yet - see the last
   section.

Everything the listing needs is already in `store/`.

---

## First: does the repo have to be public?

**No.** Nothing about publishing an extension requires a public repository. Google, Mozilla and
Microsoft all take a zip file; none of them look at, ask for or link to source hosting.

What is actually true:

- **Your code ships either way.** An extension is plain JavaScript in a zip. Anybody who installs it
  can read `src/content.js` in about ten seconds. There is no secret in this folder to protect - the
  entire point of the design is that the decoding and the catalogue live on the server.
- **Reviewers do read it.** Google's review is slower on obfuscated or minified code. This extension
  is neither, which is a real advantage on review time, and it is unrelated to whether GitHub can see
  it.
- **Public buys you trust, and that is the whole argument.** The best thing about this extension is
  "zero permissions, nothing leaves your browser". That claim is worth more when a sceptic can check
  it. A CS2 audience is used to being scammed by browser extensions and will check.
- **Public costs you an issue tracker to answer** and the small chance somebody reskins it. They can
  reskin it from the store package anyway.

Recommendation: make it public. Not because you have to, but because "read the source" is the
cheapest answer to the only question users will ask about it. The app repo stays private either way -
this is a separate repo and it contains no renderer, no shaders and no export pipeline.

---

## Chrome Web Store

### 1. The developer account

<https://developer.chrome.com/docs/webstore/register>

- A Google account, plus a **one-time US$5 registration fee**. Not annual, not per extension. There
  is no way around it and no free tier.
- Use an account you will still control in three years. Moving an extension between developer
  accounts later is a support ticket, not a button.
- You will be asked for a **publisher display name** and a contact email. That email is shown
  publicly on the listing and Google verifies it. Use a support address, not your personal one.
- Dashboard: <https://chrome.google.com/webstore/devconsole>

### 2. Package it

The zip is only the extension. Docs, screenshots and this file do not belong in it.

```bash
cd web-extension
zip -r ../skinhub-extension-0.2.0.zip manifest.json src icons
```

Check the zip has `manifest.json` at the **top level**, not inside a `web-extension/` folder - that is
the single most common rejection on a first upload.

`manifest.json` must have a **higher `version` than the last upload**, every time. `0.2.0` is what is
in there now.

### 3. The listing

`store/` has the assets already, at the exact sizes Google requires
(<https://developer.chrome.com/docs/webstore/images>):

| Asset | Size | File |
|---|---|---|
| Store icon | 128x128 PNG | `icons/icon-128.png` |
| Screenshot 1 | 1280x800 | `store/screenshot-1-viewer.png` |
| Screenshot 2 | 1280x800 | `store/screenshot-2-button.png` |
| Small promo tile | 440x280 | `store/promo-tile-440x280.png` |
| Marquee tile | 1400x560 | not made - optional, only needed to be featured |

Up to five screenshots are allowed. Two is fine; more is better if you want to show stickers, the
agent view and the float slider.

Text fields:

- **Name** comes from `manifest.json`: `SkinHub - Inspect CS2 Skins` (27 chars, limit 45).
- **Summary** also comes from the manifest `description` (120 chars, limit 132).
- **Detailed description** you write in the dashboard. Lift the top of `README.md` - what it does, the
  privacy paragraph, where the button appears. Lead with the privacy line; it is the differentiator.
- **Category**: Tools, or Fun. Tools is the honest one.
- **Language**: English.

### 4. The privacy questions - the part that actually needs thought

Under the **Privacy** tab you must, regardless of permissions:

- Write a **single purpose** statement. One sentence, and it must match what the code does. Something
  like: *"Adds a button to Steam CS2 item pages that opens that item in SkinHub's 3D viewer."* Do not
  list two purposes. A vague or multi-purpose statement is a common rejection.
- Justify **every permission**. You have none, which is the easiest version of this form anybody
  fills in.
- Complete the **data usage disclosures** and tick the **limited use** certification. This is
  mandatory even at zero data; an incomplete submission gets a warning and can be suspended after 30
  days. <https://developer.chrome.com/docs/webstore/program-policies/user-data-faq>

**Is a privacy policy URL required?** Strictly, no. Google requires one from products that *handle
user data*, and an extension that collects nothing has, in their words, no special obligations.

**Publish one anyway,** for two reasons. First, the honest reading is arguable: on click, the item's
inspect link and name go to skinhub.gg, and a reviewer deciding that counts as a transfer would bounce
you and cost a full review cycle. Second, a link that says "we collect nothing" is a selling point on
a store listing full of extensions that do. Add a `skinhub.gg/privacy` page saying, plainly: the
extension requests no permissions, stores nothing, has no analytics, and sends the public inspect link
and item name to skinhub.gg only when you click the button, in order to render it.

### 5. Submit, and wait

Submit for review from the dashboard. You can tick **deferred publishing** to review the approval
yourself before it goes live - worth doing on the first release.

Review time, from Google's own page
(<https://developer.chrome.com/docs/webstore/review-process>): *"For most extensions, review is
completed within a few days, but it can take up to a few weeks."* Their dashboard is currently warning
about extended times because of submission volume. If it sits for more than three weeks with no
change, contact developer support.

Things that make it slower, all of which you avoid: broad host permissions, sensitive permissions, a
lot of code, obfuscated or minified code, a brand-new developer account. You are new, so budget for
the slow end on the first one. Updates after that are usually much faster.

**Do not release from a fresh account the week you need it live.** Pay the $5 and get the account
created now, even if you submit later.

---

## Microsoft Edge

Nearly free work, since Edge is Chromium and takes the same zip.

- **No registration fee.**
  <https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account>
- You need a **Microsoft account** (outlook/live/hotmail, or a GitHub account which creates one) and a
  **Partner Center** developer account. Sign up at
  <https://partner.microsoft.com/dashboard/microsoftedge/public/login>.
- **Pick Individual, not Company**, unless SkinHub is a registered business you want on the listing.
  Individual verification is short. Company verification involves Microsoft phoning an approver and
  runs from a few days to a few weeks. **The account type cannot be changed later.**
- Same zip, same icons, same screenshots, same description. The listing form is a near copy of
  Google's.
- The modal works here for the same reason it works in Chrome: Edge is Chromium, same content-script
  CSP behaviour.

Worth doing once Chrome is approved. It is an hour of form filling for a second store.

---

## Firefox - read this before promising it

Firefox has the friendliest store and, right now, the extension probably does not work in it.

The store part is easy: <https://addons.mozilla.org/developers/>, a Mozilla account, **no fee**, upload
a `.zip` / `.xpi` up to 200 MB, and Mozilla signs listed add-ons automatically. The manifest is MV3
with no background script and no Chrome-only API, so it should load.

**The modal is the problem, and it is a real one.** The whole feature rests on a fact measured in
Chrome: `steamcommunity.com` sends
`Content-Security-Policy: … frame-src 'self' steam: https://store.steampowered.com/ …`, and
`skinhub.gg` is not on that list. Chrome runs a content script in an isolated world with the
*extension's* CSP and checks the injected iframe against that, so the frame loads. **Firefox applies
the page's CSP to a content script's injected iframe.** Known and reported behaviour, and it is
exactly what this depends on not happening.

So on Firefox the panel would very likely open empty, on Steam specifically. **This is untested** - it
is reasoning from Firefox's documented difference, not something anybody here has watched fail.

If you want Firefox:

1. Test it first. Load it temporarily via `about:debugging#/runtime/this-firefox`, open a Steam
   inventory, click the button, and look at the console for a `frame-src` violation.
2. If it is blocked, the fix is not a manifest tweak. It is a different mechanism for that browser -
   and the simple fallback is to keep the old behaviour there: open the viewer in a window instead of
   a frame, only on Firefox. That code was deleted in this change and is in git history.

Do not submit to Mozilla until somebody has seen it work. A listing that opens a blank panel is worse
than no listing.

---

## After the first release

- Bump `version` in `manifest.json` for every upload. Stores reject a re-used version number.
- Updates go through review too, but are usually much faster than the first submission.
- Users auto-update within a day or so of approval. There is no way to force it sooner.
- If `skinhub.gg/inspect` changes shape, **that does not need a store release**. The extension only
  builds a URL. That was the point of keeping it this small.
