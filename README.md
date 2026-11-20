# SkinHub - Inspect CS2 Skins

See any CS2 skin on Steam in real 3D, without leaving the page.

The extension adds one button - **Inspect in 3D** - next to Steam's own *Inspect in Game...*
button. Click it and the item opens in SkinHub's 3D viewer, in a panel over the Steam page. The exact
item: its float, its pattern seed, its stickers, its charm, its name tag. Not a stock picture of the
skin.

The viewer, open over a Steam inventory

---

## Your data stays yours

**The extension asks for zero permissions.** When you install it, Chrome shows no permission warning,
because there is nothing to warn about.

- It does not read your inventory.
- It does not touch your Steam account, your cookies or your trade URL.
- It does not track you, and there is no analytics of any kind in it.
- It sends nothing anywhere until you click the button.

When you do click, one thing travels: the item's own public inspect link, the one Steam already put on
the page for anybody to copy. It goes to skinhub.gg so the viewer knows which gun to draw. That is the
whole of it.

It only runs on four Steam addresses (listed below) and is completely inert everywhere else on the
web.

---



## Where the button appears

Next to Steam's button, in the same row, on the item you have selected.

The button, next to Steam's own

It shows up on:

- your own Steam inventory, and anyone else's public one
- CS2 Community Market listings
- trade offers

If an item has no inspect link at all - a case or a capsule - there is nothing to inspect, so no button
appears. Most stickers, charms, agents and pins do carry one and get a button; graffiti carries one too
but has nowhere to open it to (see below).

---



## Installing it



### From the store

Not there yet. When it is published, this is where the link will live.

### Right now, by hand

1. Download this folder to your computer (green **Code** button at the top, then **Download ZIP**,
  then unzip it).
2. Open `chrome://extensions` in Chrome, Edge, Brave or Opera.
3. Turn on **Developer mode**, top right.
4. Click **Load unpacked** and pick the folder you unzipped.
5. Open a Steam inventory and click any skin.

Firefox is not supported yet. See "Firefox" at the bottom for why.

---



## Using it


|           |                                                             |
| --------- | ----------------------------------------------------------- |
| Open      | Click **Inspect in 3D**                                |
| Close     | The X, the Esc key, or click the dark area around the panel |
| Full page | **Open on skinhub.gg** in the panel's top bar               |


Click a different item while the panel is open and it swaps to that item. It does not stack panels or
bury your browser in windows.

Inside the panel you get the full viewer: spin the gun, change the map lighting, put it in first
person or in an agent's hands, add stickers and charms, and drag the float and seed sliders to see
what the same skin looks like at a different wear.

---



## Things worth knowing

**Some items have no 3D model here.** A weapon, knife, glove, agent, sticker, charm, pin, coin or medal
should open. Cases, capsules, graffiti and music kits open to a card that says so, rather than to a
wrong picture.

**The first open takes a moment.** The viewer downloads the model, the textures and the map lighting.
After that it is quick.

**The float and seed are read from Steam's own link,** not guessed. If the panel says seed 256, Steam
says *Pattern Template: 256* a few lines further down the same page.

---



## Something wrong?

Open an issue on this repository with the item name and, if you can, the Steam page you were on.

---

---



# For developers

Everything below this line is for people working on the extension. Nothing above it needs any of it.

## Layout

```
manifest.json      MV3, four match patterns, zero permissions
src/config.js      origin, ?ui= value, panel size   <- the only file you normally edit
src/modal.js       the in-page overlay: shadow root, iframe, Esc / backdrop / X, scroll lock
src/content.js     find Steam's inspect link, insert the button, keep its target fresh
src/content.css    the button only. Steam's metrics, SkinHub's colour
icons/             16 / 48 / 128
docs/              the two README screenshots
```

The other half of the feature lives in the (private) app repo:

- `apps/web/app/inspect/page.tsx` decodes the inspect link, resolves a weapon, agent, pin/coin/medal,
sticker or charm out of the catalogue, and redirects to the item's real URL.
- `apps/web/app/[UI]/Shell/chromeMode.ts` is `?ui=steam-inventory`, the compact shell the iframe loads.

**The extension decodes nothing.** The `defindex -> weapon` table is a 4.4 MB `skins.json` and the
inspect-link codec is `@skinhub/cdn`. A content script carrying either would be a second copy that
goes stale the day the site changes, in the one place that cannot be updated without users
reinstalling.

## Pointing it at a dev server

`src/config.js`, one line, then reload from `chrome://extensions`:

```js
ORIGIN: 'http://localhost:3102',   // was 'https://skinhub.gg'
```

There is no options page on purpose. It would cost the `storage` permission for a string almost
nobody changes, and zero permissions is the best thing this extension has.

## How the modal works

An `<skinhub-inspect-modal>` host is appended to `documentElement` with `all: initial` inline, and
everything lives in an **open shadow root** - Steam ships global rules on `button`, `a`, `div` and
`iframe`, and a shadow root is the only boundary they do not cross. The host is `position: fixed` at
z-index `2147483647`; Steam's own dialogs sit in the low thousands.

The viewer is an **iframe** pointing at `<origin>/inspect?i=…&hash=…&ui=steam-inventory`. That is the
mechanism the viewer is built for. Do not try to embed the renderer: it is a Next app that pulls a
4.4 MB catalogue, a 7 MB manifest, GLBs, EXRs and an HDR from `cdn.skinhub.gg` and composites the
finish at runtime.

Closing sets the iframe to `about:blank`. A hidden frame keeps its WebGL context, its render loop and
its textures; blanking it is what makes closing actually close.

**Esc has a hole in it, and it is a browser boundary rather than a bug.** Once you click into the
viewer, focus is inside a cross-origin frame and its key events never reach the Steam document. The
close button takes focus when the panel opens, so the first Esc always works; after that, the X and
the backdrop are the way out.

## Permissions, and why there are still none


| Not requested              | Why it is not needed                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `tabs` / `windows`         | Everything happens inside the page.                                                                                     |
| `storage`                  | The one configurable value is a constant in `src/config.js`.                                                            |
| `activeTab` / `scripting`  | The content scripts are declared statically.                                                                            |
| `web_accessible_resources` | The iframe points at an ordinary https URL, and the logo is an inline SVG path. Nothing is served out of the extension. |
| broad host access          | Four match patterns, no `<all_urls>`.                                                                                   |


Where it runs:

```
https://steamcommunity.com/id/*/inventory*
https://steamcommunity.com/profiles/*/inventory*
https://steamcommunity.com/market/listings/730/*
https://steamcommunity.com/tradeoffer/*
```



## What was verified, and what was not

**Verified 2026-08-21**, Chromium 1234 with the extension loaded (`--load-extension`), driving the
real, logged-out inventory `steamcommunity.com/profiles/76561198028510846/inventory/#730_2`:

- The button is inserted exactly once, as the next sibling of *Inspect in Game...*.
- Selecting a different item updates the existing button's target instead of stacking another.
Steam's React panel reuses the anchor and only rewrites its `href`, so a button that captured its
URL at build time would open the previous item.
- **The iframe loads through Steam's CSP.** This was the open question. `steamcommunity.com` serves
`frame-src 'self' steam: https://store.steampowered.com/ …`, a list `skinhub.gg` is not on, so a
frame the page wrote itself would be refused. Chrome runs a content script in an isolated world with
the extension's CSP and checks the frame against that instead. Measured: the frame reached
`skinhub.gg/mag-7/copper-oxide?ui=steam-inventory&i=…`, mounted its canvas and rendered the weapon,
with no CSP report in the console. `skinhub.gg` sends no `X-Frame-Options` and no `frame-ancestors`,
so the other half is open too.
- Float **0.0392** and seed **256** in the panel, matching the *Pattern Template: 256* Steam prints on
the same page.
- Esc closes it, a backdrop click closes it, the iframe goes to `about:blank`, and
`documentElement.style.overflow` comes back to exactly the value it had before.

**NOT VERIFIED. Nobody here can sign in to Steam, and these are gaps rather than claims:**

- **Trade offers** (`/tradeoffer/`*). Included because the item panel is built by the same component,
never watched working. If the legacy trade UI still emits the old `S…A…D…` link, that payload
carries three ids and no item data; it will not decode and `/inspect` falls back to the item's
**name**, which gives the right skin at a default float.
- **Community Market listings.** Steam served this headless client a listings page with **zero**
inspect links and zero listing rows, so nothing could be observed either way. The match pattern
stays; it has not been seen working.
- **Your own inventory while signed in.** Expected identical to the logged-out case.
- **Anything in a real, human-driven browser.** All of the above is Playwright.
- **Firefox.** Do not assume this works. Firefox applies the **page's** CSP to a content script's  
injected iframe, which is exactly what Chrome does not do and exactly what this depends on. Steam's  
`frame-src` does not list `skinhub.gg`, so the panel would very likely open empty. Untested, and  
fixing it is real work rather than a manifest tweak.

