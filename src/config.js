/*
 * THE ONLY THING IN THIS EXTENSION ANYBODY IS EXPECTED TO EDIT.
 *
 * It is a plain global rather than a stored setting on purpose. An options page would mean the
 * `storage` permission, and a permission this extension does not need is a permission it should not
 * ask for - see README.md's "Privacy" section, which is the whole argument. Point it at a dev server
 * by changing the one line below and reloading the extension.
 *
 * `src/modal.js` hangs `openModal` / `closeModal` off this same object rather than publishing a
 * second global. One deliberate global on somebody else's page is the budget.
 */

globalThis.SKINHUB = {
	/** No trailing slash. `http://localhost:3102` for local work against `bun web:dev -p 3102`. */
	ORIGIN: 'https://skinhub.gg',

	/**
	 * `?ui=steam-inventory` - the compact shell. `apps/web/app/[UI]/Shell/chromeMode.ts` is the reader
	 * and the argument for the param name; in short, it takes the search field, the keyboard legend and
	 * the socials popover out and leaves every control that acts on the item.
	 */
	UI_MODE: 'steam-inventory',

	/**
	 * THE PANEL'S CEILING, not its size. The overlay is `min(this, 96vw)` by `min(this, 92vh)`, so a
	 * laptop gets a panel that fits and a large monitor stops at a readable width instead of stretching
	 * the viewer across 3440px.
	 *
	 * 1180 is deliberately under the app's `xl` breakpoint (1280px), which is where the top bar stops
	 * trying to centre a 26rem search field - that field is gone in this mode anyway, and the compact
	 * shell centres its buttons at every width. The two numbers are the ones the old popup window used,
	 * kept because they were chosen against the real shell.
	 */
	PANEL_MAX_WIDTH: 1180,
	PANEL_MAX_HEIGHT: 780,
}
