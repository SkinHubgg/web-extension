/*
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * *** "INSPECT IN 3D" — the whole extension, in one content script. ***
 *
 * WHAT IT DOES: finds Steam's own "Inspect in Game..." link on an item panel, puts our button
 * immediately after it, and on click opens `<origin>/inspect?…` in an overlay on the Steam page.
 * `src/modal.js` owns the overlay; this file finds the link, keeps the button's target fresh, and
 * hands the URL over.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * *** WHY IT IS THIS SMALL, AND WHY IT DECODES NOTHING. ***
 *
 * The inspect link on a CS2 item is a protobuf payload — the float, the pattern seed, the stickers,
 * the charm, the name plate — and turning it into a URL like `/mag-7/copper-oxide` also needs
 * `data/skins.json`, a 4.4 MB catalogue holding the only `defindex -> weapon` column that exists.
 * A content script that carried a codec and a catalogue would be a second copy of both, shipped to a
 * store, updated by users, and out of step with the site within a release.
 *
 * So this script reads a link and hands it over. `apps/web/app/inspect/page.tsx` is the other half
 * and does all of the thinking; the rules can change there without anybody reinstalling anything.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * *** WHAT WAS MEASURED, AND WHAT WAS NOT — read this before trusting the selectors. ***
 *
 * VERIFIED on 2026-08-21, driving a real LOGGED-OUT public inventory
 * (`steamcommunity.com/profiles/76561198028510846/inventory/#730_2`) with Playwright:
 *
 *   - The item panel is React with hashed class names (`_3QKUrmKA1DptBhihc8GSAF`). NOTHING may be
 *     selected by class; they are a build artefact and change without notice. The only stable
 *     handles are the `#iteminfo0` / `#iteminfo1` panel ids and the href itself.
 *   - The link's shape is `steam://run/730//+csgo_econ_action_preview%20<HEX>` — `run`, not
 *     `rungame`, and a bare double slash where the steam id used to be.
 *   - The payload is XOR-masked with its own first byte and decodes to the whole item. The captured
 *     one read as defindex 27 / paint 1306 / wear 0.0391966737806797 / seed 256, and the round trip
 *     through `/inspect` landed on `/mag-7/copper-oxide` at that exact wear and seed.
 *   - The link sits alone in a `display: flex; --wrap: wrap` actions row, so `afterend` puts our
 *     button in that row as a sibling.
 *
 * NOT VERIFIED, and there is no way to from here: anything behind a Steam LOGIN. That is the
 * trade-offer page (`/tradeoffer/*`) and the "Inspect in Game" link on your OWN inventory while
 * signed in. The match pattern includes trade offers because the panel is built by the same code, but
 * nobody has watched it work. See README.md.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 */

/*
 * WRAPPED IN AN IIFE so nothing here becomes a global on Steam's page. A content script already runs
 * in an isolated world, so this is belt-and-braces rather than a requirement — but `src/config.js`
 * DOES publish `globalThis.SKINHUB` on purpose (that world is shared between the two files and is the
 * only channel between them), and one deliberate global is the budget.
 */
;(() => {
	const CONFIG = globalThis.SKINHUB

	/**
	 * The one thing we look for. Deliberately a substring of the HREF and not a selector on Steam's
	 * markup: the command is Valve's own and is the same string on the inventory, the market and a
	 * trade offer, while every class and wrapper around it differs per surface and per deploy.
	 */
	const COMMAND = 'csgo_econ_action_preview'

	/** The hex body, out of any of the spellings Steam emits. See the header for the two seen live. */
	const PAYLOAD = /csgo_econ_action_preview(?:%20|\+|\s)+([0-9A-Fa-f]+)/

	/**
	 * *** THE TEMPLATE, WHICH MUST BE IGNORED RATHER THAN SENT. ***
	 *
	 * Market listing rows ship the href as `…+csgo_econ_action_preview%20%propid:6%` and Steam's own
	 * script substitutes the asset's Item Certificate into it. Caught mid-substitution the href is a
	 * placeholder, and a button built from it would open a page about nothing. Skipping it costs
	 * nothing — the observer below sees the substitution land and builds the button then.
	 *
	 * `%assetid%` and `%listingid%` are the older spellings of the same idea and go the same way.
	 */
	const TEMPLATE = /%(propid:\d+|assetid|listingid|owner_steamid)%/

	/** Marks our own button so a re-scan updates it instead of stacking a second one beside it. */
	const FLAG = 'data-skinhub-inspect'

	/**
	 * The knife from the SkinHub wordmark (`apps/web/public/logo.webp`), traced to a path so it can be
	 * drawn in `currentColor` at any size with no `web_accessible_resources` entry — which is a
	 * permission this extension then does not have to declare. See README.md.
	 */
	const MARK =
		'<svg viewBox="0 0 240 613" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
		'<path fill-rule="evenodd" d="M46 381V0h13a135 144 0 0 1 135 144v237zM46 100h27a21 21 0 0 1 0 42H46zm0 95h27a21 21 0 0 1 0 42H46zm0 95h27a21 21 0 0 1 0 42H46zM31 417h178a31 31 0 0 1 0 62H31a31 31 0 0 1 0-62zM46 479h148v134H46z"/></svg>'

	/* ─────────────────────────────────────────────────────────────────────────────────────────── */

	/**
	 * The item's NAME, as the fallback for a link we cannot read.
	 *
	 * *** IT IS A FALLBACK AND IT IS A WEAKER ANSWER, which is why it is sent alongside the link and
	 * never instead of it. *** A name is a KIND of item ("AK-47 | Redline"); the link is an INSTANCE
	 * of one, with a float and a pattern. `/inspect` prefers the link and only reaches for this when
	 * the payload did not decode — the known case being any surface that still emits the old
	 * `S<steam64>A<assetid>D<d>` form, which carries three ids and no item data at all.
	 *
	 * IT CLIMBS RATHER THAN SELECTING. The panel's own wrapper differs per surface (`#iteminfo0` on
	 * an inventory, `#largeiteminfo` on a market listing) and its inner class names are hashed, so the
	 * reliable move is to walk up from the link we already found and take the first heading on the
	 * way. Six levels was four more than the live panel needed.
	 *
	 * THE `<img alt>` IS THE LAST RESORT and is worth having: the item image's alt text is the item
	 * name, set by the same code that sets the heading, and it survives a heading that becomes a
	 * `<div>` in some future redesign.
	 */
	const HEADINGS = 'h1, .hover_item_name, #largeiteminfo_item_name, .market_listing_item_name, .item_desc_name'

	const nameNear = anchor => {
		let node = anchor.parentElement
		for (let depth = 0; depth < 6 && node; depth += 1, node = node.parentElement) {
			const heading = node.querySelector(HEADINGS)
			const text = heading?.textContent?.trim()
			if (text) return text
			const alt = node.querySelector('img[alt]')?.getAttribute('alt')?.trim()
			if (alt) return alt
		}
		return null
	}

	/**
	 * `<origin>/inspect?i=<payload>&hash=<name>&ui=steam-inventory`, plus the name for the title bar.
	 *
	 * BOTH ARE SENT WHEN BOTH ARE KNOWN, and the server decides which one wins — see `/inspect`, which
	 * takes the link first and falls back to the name. Deciding here would put that rule in the half
	 * of the system that cannot be changed without a reinstall.
	 */
	const viewerTarget = anchor => {
		const href = anchor.getAttribute('href') ?? ''
		const payload = PAYLOAD.exec(href)?.[1] ?? null
		const name = nameNear(anchor)
		if (!payload && !name) return null

		const url = new URL('/inspect', CONFIG.ORIGIN)
		if (payload) url.searchParams.set('i', payload)
		if (name) url.searchParams.set('hash', name)
		url.searchParams.set('ui', CONFIG.UI_MODE)
		return { url: url.toString(), name }
	}

	/* ─────────────────────────────────────────────────────────────────────────────────────────── */

	const build = () => {
		const button = document.createElement('button')
		button.type = 'button'
		button.className = 'skinhub-inspect'
		button.setAttribute(FLAG, '1')
		button.innerHTML = `${MARK}<span>Inspect in 3D</span>`
		button.addEventListener('click', event => {
			event.preventDefault()
			/*
			 * `stopPropagation` STAYS. Steam's item panel has click handlers above this button - the
			 * inventory grid selects on click and the market row navigates - and letting the event
			 * bubble means the page moves underneath the overlay the moment it opens.
			 */
			event.stopPropagation()
			const url = button.getAttribute('data-skinhub-url')
			if (url) CONFIG.openModal(url, button.getAttribute('data-skinhub-name'))
		})
		return button
	}

	/**
	 * *** THE URL IS RE-READ ON EVERY SCAN, and that is the bug this shape prevents. ***
	 *
	 * Steam's panel is React: selecting a different item very often REUSES the same anchor node and
	 * only rewrites its `href`. A button that captured the URL when it was created would then open the
	 * previous item — a picture that is right about everything except which gun it is, which is the
	 * worst failure this feature has available to it. Storing the URL on the element and refreshing it
	 * on every pass makes a stale one impossible.
	 */
	const sync = anchor => {
		const target = viewerTarget(anchor)
		const existing = anchor.nextElementSibling?.hasAttribute?.(FLAG) ? anchor.nextElementSibling : null

		if (!target) {
			existing?.remove()
			return
		}

		const button = existing ?? build()
		button.setAttribute('data-skinhub-url', target.url)
		if (target.name) button.setAttribute('data-skinhub-name', target.name)
		else button.removeAttribute('data-skinhub-name')
		button.title = `Open this item in SkinHub's 3D viewer`
		if (!existing) anchor.insertAdjacentElement('afterend', button)
	}

	const scan = () => {
		for (const anchor of document.querySelectorAll(`a[href*="${COMMAND}"]`)) {
			const href = anchor.getAttribute('href') ?? ''
			// A placeholder Steam has not filled in yet. The observer will bring us back. See TEMPLATE.
			if (TEMPLATE.test(href)) continue
			sync(anchor)
		}
	}

	/**
	 * *** COALESCED INTO ONE PASS PER FRAME, because the thing being watched is a React tree. ***
	 *
	 * Selecting an item rebuilds a whole panel, which is hundreds of mutation records for one visible
	 * change. Running `scan` per record would run it hundreds of times for the same result; a frame is
	 * the natural unit here because the only thing `scan` can do is change what is on screen.
	 *
	 * `document.documentElement` AND NOT `body`: on a market listing page the panel is re-parented
	 * during load, and an observer rooted at a node that gets replaced stops seeing anything. The root
	 * element is the one node guaranteed to outlive every rearrangement.
	 *
	 * ATTRIBUTES ARE WATCHED, FILTERED TO `href`. That is the mutation that fires when React keeps an
	 * anchor and swaps the item under it — the exact case `sync` exists to survive — and filtering to
	 * one attribute keeps a page full of class-name churn from waking this up.
	 */
	let queued = false
	const schedule = () => {
		if (queued) return
		queued = true
		requestAnimationFrame(() => {
			queued = false
			scan()
		})
	}

	new MutationObserver(schedule).observe(document.documentElement, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['href'],
	})

	/*
	 * THE INVENTORY IS ADDRESSED BY HASH (`#730_2_42042808171`), and a hash change is a navigation
	 * that fires no mutation of its own until React has caught up. Cheap insurance, one listener.
	 */
	window.addEventListener('hashchange', schedule)

	scan()
})()
