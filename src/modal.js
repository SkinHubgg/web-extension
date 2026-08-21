/*
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * *** THE IN-PAGE MODAL. An overlay on Steam's own page, not a popup window. ***
 *
 * The owner's words: *"I don't like the popup it opens, it opens a new window instead of a cool
 * modal/popup in the same page like SkinCraft/other providers."*
 *
 * A large centred panel over a dimmed backdrop, with the viewer in an IFRAME. Escape, the backdrop
 * and the X all close it; the page underneath is left exactly as it was found.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * *** AN IFRAME IS THE MECHANISM, AND IT IS THE ONE THE VIEWER WAS BUILT FOR. ***
 *
 * The renderer is not a thing that can be embedded - it is a Next app that loads a 4.4 MB catalogue,
 * a 7 MB manifest, GLBs, EXRs and an HDR from `cdn.skinhub.gg`, and composites the finish at runtime.
 * `?ui=steam-inventory` is the compact shell it already ships for exactly this, and the URL is the
 * whole contract. Nothing about the item is computed here; see `content.js`'s header for why.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * *** IT STILL COSTS NO PERMISSION, WHICH WAS NOT OBVIOUS AND WAS CHECKED RATHER THAN ASSUMED. ***
 *
 *   - The iframe points at an ORDINARY https URL, so there is no `web_accessible_resources` entry -
 *     that key is for serving files out of the extension, and this serves none.
 *   - Everything happens in the page, so no `tabs`, no `windows`, no `scripting`.
 *   - The panel size is a constant in `config.js`, so no `storage`.
 *
 * The manifest gained NO `permissions` key going from the popup to this. Its only changes are the
 * name and one more file in the script list. See README.md.
 *
 * *** STEAM'S OWN CSP DOES NOT REACH THIS FRAME, and that is the fact worth recording. ***
 * `steamcommunity.com` serves `frame-src 'self' steam: https://store.steampowered.com/ …` - a list
 * `skinhub.gg` is not on. A frame this page wrote itself would be blocked. Chrome runs a content
 * script in an ISOLATED WORLD with the EXTENSION's CSP, and a frame the content script inserts is
 * checked against that instead, so the load goes through. MEASURED, not recalled: Chromium 1234 with
 * this extension loaded, on the live logged-out inventory, the frame reached
 * `skinhub.gg/mag-7/copper-oxide?ui=steam-inventory&i=…` and mounted its canvas, with no CSP report
 * in the console. See README.md's "What was verified".
 *
 * And `skinhub.gg` sends no `X-Frame-Options` and no `frame-ancestors`, so the other half of the
 * handshake is open too. Measured the same day.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 */

;(() => {
	const CONFIG = globalThis.SKINHUB

	/**
	 * *** A SHADOW ROOT, BECAUSE STEAM'S STYLESHEET IS ALLOWED TO BE HOSTILE AND IS. ***
	 *
	 * `content.css` styles ONE button and can afford to declare every property it depends on. A panel
	 * with a header, a close button and a frame cannot: steamcommunity.com ships global rules on
	 * `button`, `a`, `div`, `img` and `iframe`, plus a `box-sizing` reset, and any of them would land
	 * inside this. A shadow root is the only boundary those rules do not cross.
	 *
	 * `open` RATHER THAN `closed`, which is the opposite of the reflex and is deliberate. The style
	 * boundary is the same either way - `closed` only hides the internals from JavaScript, and a page
	 * that wanted to break this could already delete the host node. What `closed` does cost is every
	 * way of looking at it: devtools, and a Playwright selector, both stop at the boundary, so the
	 * regression test below could not click its own close button. Debuggable beats sealed here.
	 *
	 * THE HOST IS AN UNKNOWN ELEMENT NAME so no selector of theirs matches it, and it carries
	 * `all: initial` INLINE - an inline declaration outranks any stylesheet rule, including a `*`
	 * reset, so the host starts from nothing and only the properties written after it apply.
	 */
	const HOST_TAG = 'skinhub-inspect-modal'

	const HOST_STYLE = [
		'all: initial',
		'position: fixed',
		'inset: 0',
		/* Steam's own dialogs sit in the low thousands. This is the largest a 32-bit z-index holds. */
		'z-index: 2147483647',
		'display: none',
		'color-scheme: dark',
	].join(';')

	/**
	 * The knife from the SkinHub wordmark (`apps/web/public/logo.webp`), traced to a path so it can be
	 * drawn in `currentColor` at any size with no `web_accessible_resources` entry. Same mark as the
	 * button in `content.js`; kept as two literals rather than a shared module because a content
	 * script has no import.
	 */
	const MARK =
		'<svg viewBox="0 0 240 613" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
		'<path fill-rule="evenodd" d="M46 381V0h13a135 144 0 0 1 135 144v237zM46 100h27a21 21 0 0 1 0 42H46zm0 95h27a21 21 0 0 1 0 42H46zm0 95h27a21 21 0 0 1 0 42H46zM31 417h178a31 31 0 0 1 0 62H31a31 31 0 0 1 0-62zM46 479h148v134H46z"/></svg>'

	/*
	 * `--skinhub-primary` IS `--primary` FROM `apps/web/app/globals.css`, RESOLVED TO sRGB - the same
	 * restatement `content.css` makes, for the same reason: neither file can import a Tailwind token.
	 * `#181922` is the app's `--background`, so the panel's chrome and the frame's own page agree while
	 * the frame is still loading.
	 */
	const STYLE = `
		:host { all: initial }

		.backdrop {
			position: absolute;
			inset: 0;
			background: rgba(6, 8, 12, 0.72);
			backdrop-filter: blur(6px);
			-webkit-backdrop-filter: blur(6px);
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 24px;
			box-sizing: border-box;
			font:
				400 13px/1.4 "Motiva Sans",
				"Segoe UI",
				Helvetica,
				Arial,
				sans-serif;
			animation: fade 140ms ease both;
		}

		.panel {
			position: relative;
			display: flex;
			flex-direction: column;
			width: min(var(--panel-w), 96vw);
			height: min(var(--panel-h), 92vh);
			max-width: 100%;
			max-height: 100%;
			box-sizing: border-box;
			overflow: hidden;
			border: 1px solid rgba(255, 255, 255, 0.12);
			border-radius: 12px;
			background: #181922;
			box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
			animation: rise 160ms cubic-bezier(0.2, 0.8, 0.3, 1) both;
		}

		.bar {
			display: flex;
			align-items: center;
			gap: 10px;
			flex: none;
			height: 44px;
			padding: 0 8px 0 14px;
			box-sizing: border-box;
			border-bottom: 1px solid rgba(255, 255, 255, 0.08);
			color: #fff;
		}

		.bar svg {
			display: block;
			height: 16px;
			width: auto;
			fill: var(--skinhub-primary);
			flex: none;
		}

		.title {
			flex: 1 1 auto;
			min-width: 0;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
			font-weight: 700;
			font-size: 13px;
			letter-spacing: 0.01em;
		}

		.title .dim {
			color: rgba(255, 255, 255, 0.45);
			font-weight: 400;
		}

		.act {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 6px;
			flex: none;
			height: 28px;
			padding: 0 10px;
			margin: 0;
			box-sizing: border-box;
			border: 0;
			border-radius: 6px;
			background: rgba(255, 255, 255, 0.08);
			color: rgba(255, 255, 255, 0.82);
			font: inherit;
			font-size: 12px;
			font-weight: 600;
			text-decoration: none;
			cursor: pointer;
			transition: background 120ms ease, color 120ms ease;
		}

		.act:hover { background: rgba(255, 255, 255, 0.16); color: #fff }
		.act:focus-visible { outline: 2px solid var(--skinhub-primary); outline-offset: 2px }
		.close { width: 28px; padding: 0; font-size: 15px; line-height: 1 }

		.stage { position: relative; flex: 1 1 auto; min-height: 0 }

		iframe {
			display: block;
			width: 100%;
			height: 100%;
			border: 0;
			background: #181922;
			opacity: 0;
			transition: opacity 180ms ease;
		}

		.panel[data-ready="1"] iframe { opacity: 1 }

		.spinner {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			pointer-events: none;
			color: rgba(255, 255, 255, 0.5);
			font-size: 12px;
			letter-spacing: 0.04em;
			text-transform: uppercase;
		}

		.panel[data-ready="1"] .spinner { display: none }

		.spinner span {
			width: 26px;
			height: 26px;
			border: 2px solid rgba(255, 255, 255, 0.14);
			border-top-color: var(--skinhub-primary);
			border-radius: 50%;
			animation: spin 700ms linear infinite;
		}

		@keyframes spin { to { transform: rotate(360deg) } }
		@keyframes fade { from { opacity: 0 } }
		@keyframes rise { from { opacity: 0; transform: translateY(8px) scale(0.985) } }

		@media (prefers-reduced-motion: reduce) {
			.backdrop, .panel { animation: none }
			iframe { transition: none }
			.spinner span { animation-duration: 2s }
		}
	`

	/* ─────────────────────────────────────────────────────────────────────────────────────────── */

	/** Built once, on the first click, and then reused. Null until then. */
	let ui = null

	/**
	 * *** WHAT THE PAGE LOOKED LIKE BEFORE WE TOUCHED IT. ***
	 *
	 * The scroll lock writes two INLINE styles, and "put it back" has to mean the exact string that
	 * was there - including the empty one, which is what removes the property again. Setting them to
	 * `''` unconditionally on close would be right today and wrong the day Steam sets its own
	 * `overflow` inline, so the previous values are recorded instead of assumed.
	 */
	let restore = null

	const lockScroll = () => {
		const root = document.documentElement
		const body = document.body
		restore = { root: root.style.overflow, body: body?.style.overflow ?? null }
		root.style.overflow = 'hidden'
		if (body) body.style.overflow = 'hidden'
	}

	const unlockScroll = () => {
		if (!restore) return
		document.documentElement.style.overflow = restore.root
		if (document.body && restore.body !== null) document.body.style.overflow = restore.body
		restore = null
	}

	/**
	 * *** ESCAPE, WITH THE HOLE IN IT NAMED. ***
	 *
	 * Capture phase, on the document, so this runs before Steam's own key handling rather than after
	 * it - the inventory binds keys and this must not be one it can swallow.
	 *
	 * IT CANNOT SEE A KEYPRESS INSIDE THE FRAME. The frame is cross-origin; once focus is in the
	 * viewer, its key events belong to `skinhub.gg` and never reach this document. That is a browser
	 * boundary, not an oversight, and it is why the X and the backdrop exist and why the close button
	 * takes focus when the panel opens - the first Escape after opening always works, and after a
	 * click into the viewer the pointer is what closes it.
	 */
	const onKeyDown = event => {
		if (event.key !== 'Escape' && event.key !== 'Esc') return
		event.stopPropagation()
		close()
	}

	const build = () => {
		const host = document.createElement(HOST_TAG)
		host.setAttribute('style', HOST_STYLE)

		const root = host.attachShadow({ mode: 'open' })
		const style = document.createElement('style')
		style.textContent = STYLE
		root.append(style)

		const backdrop = document.createElement('div')
		backdrop.className = 'backdrop'
		backdrop.style.setProperty('--skinhub-primary', '#17ff74')
		backdrop.style.setProperty('--panel-w', `${CONFIG.PANEL_MAX_WIDTH}px`)
		backdrop.style.setProperty('--panel-h', `${CONFIG.PANEL_MAX_HEIGHT}px`)

		const panel = document.createElement('div')
		panel.className = 'panel'
		panel.setAttribute('role', 'dialog')
		panel.setAttribute('aria-modal', 'true')
		panel.setAttribute('aria-label', 'SkinHub 3D viewer')

		panel.innerHTML =
			`<div class="bar">${MARK}` +
			`<div class="title"></div>` +
			`<a class="act" target="_blank" rel="noopener noreferrer">Open on skinhub.gg</a>` +
			`<button class="act close" type="button" aria-label="Close" title="Close (Esc)">&#10005;</button>` +
			'</div>' +
			`<div class="stage">` +
			`<div class="spinner"><span></span></div>` +
			`<iframe title="SkinHub 3D viewer" allow="fullscreen; xr-spatial-tracking" ` +
			`referrerpolicy="strict-origin-when-cross-origin"></iframe>` +
			'</div>'

		backdrop.append(panel)
		root.append(backdrop)

		const iframe = panel.querySelector('iframe')
		/* The frame is cross-origin, so this is the only signal the app is up. It fires on an error
		   page too, which is the honest behaviour: the panel then shows whatever the browser shows. */
		iframe.addEventListener('load', () => {
			if (iframe.getAttribute('src')) panel.setAttribute('data-ready', '1')
		})

		/*
		 * `mousedown` AND `click` BOTH, MATCHED. A `click` alone fires when the press started on the
		 * panel and the release landed on the backdrop - which is every drag of the viewer's turntable
		 * that ends past the panel's edge, and closing the modal at the end of a rotate is the most
		 * annoying bug this component has available to it. The press has to have started outside too.
		 */
		let pressedOutside = false
		backdrop.addEventListener('mousedown', event => {
			pressedOutside = event.target === backdrop
		})
		backdrop.addEventListener('click', event => {
			if (event.target === backdrop && pressedOutside) close()
			pressedOutside = false
		})

		panel.querySelector('.close').addEventListener('click', close)

		/* `documentElement` and not `body`: a market listing page re-parents parts of the body during
		   load, and this outlives every rearrangement. Same reasoning as the observer in content.js. */
		document.documentElement.append(host)

		ui = {
			host,
			panel,
			iframe,
			title: panel.querySelector('.title'),
			link: panel.querySelector('a.act'),
			close: panel.querySelector('.close'),
		}
		return ui
	}

	/**
	 * *** OPEN, OR RE-POINT THE ONE THAT IS ALREADY OPEN. ***
	 *
	 * Clicking through five items in an inventory moves the picture in the panel that is already
	 * there. That was the point of the named window before and it is cheaper here - the frame
	 * navigates, the panel does not flicker.
	 */
	const open = (url, name) => {
		const el = ui ?? build()

		el.title.innerHTML = name ? `${escapeHtml(name)}<span class="dim"> &middot; SkinHub</span>` : 'SkinHub 3D viewer'
		el.link.setAttribute('href', url)

		if (el.iframe.getAttribute('src') !== url) {
			el.panel.removeAttribute('data-ready')
			el.iframe.setAttribute('src', url)
		}

		if (el.host.style.display !== 'block') {
			el.host.style.display = 'block'
			lockScroll()
			document.addEventListener('keydown', onKeyDown, true)
		}

		/* Focus the X, so the first Escape lands here rather than in Steam's page. See `onKeyDown`. */
		el.close.focus({ preventScroll: true })
	}

	/**
	 * *** CLOSE PUTS EVERYTHING BACK, INCLUDING THE FRAME. ***
	 *
	 * `src` goes to `about:blank` rather than the panel merely being hidden. The viewer is a live
	 * WebGL context with a render loop, an HDR environment and a few hundred MB of textures; a hidden
	 * frame keeps every one of them and keeps drawing. Blanking it is what makes closing actually
	 * close. The cost is that re-opening the same item reloads it, which is the right trade for a
	 * panel that is open for a few seconds at a time.
	 *
	 * The host STAYS in the DOM, display:none. Removing it would drop the shadow root and rebuild the
	 * stylesheet on every open for no gain.
	 */
	const close = () => {
		if (!ui || ui.host.style.display === 'none') return
		ui.host.style.display = 'none'
		ui.iframe.setAttribute('src', 'about:blank')
		ui.panel.removeAttribute('data-ready')
		document.removeEventListener('keydown', onKeyDown, true)
		unlockScroll()
	}

	/** The item name goes into the title bar as text. It comes off Steam's DOM, so it is not trusted. */
	const escapeHtml = value => value.replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

	CONFIG.openModal = open
	CONFIG.closeModal = close
})()
