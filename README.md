# Dice Cricket

The public site. No build step, no frameworks, nothing to install. Every word on
it lives in a plain text file, and every number comes out of the scorer.

---

## Changing the words on a page

Thirty seconds, in your browser.

1. In GitHub, open the repository and click the page you want, for example
   `the-game.md`.
2. Click the **pencil icon**, top right.
3. Type. It is ordinary text. `# ` at the start of a line makes a big heading,
   `## ` a small one, `**like this**` makes bold, `- ` at the start of a line
   makes a bullet.
4. Scroll down, click **Commit changes**.

Live in about a minute. If you break something, the History tab has every
previous version and restores it in two clicks.

## Adding a whole new page

Two minutes.

1. In the repository, click **Add file**, then **Create new file**.
2. Name it something short with no spaces and ending in `.md`, for example
   `shop.md`.
3. Write the page. Commit.
4. Open `site.json`, click the pencil, and add one line to the `nav` list:

```json
{"title": "Shop", "type": "page", "file": "shop"}
```

The `file` value is the filename without `.md`. Commit, and the page appears in
the menu.

To **remove** a page from the menu, delete its line. To **reorder** the menu,
move the lines around. To **rename** the site or change the footer, the top of
the same file does it.

## Updating the league after a fixture

1. In the scorer, **Statistics** tab, click **Export for the website**. You get
   `league.json`.
2. In GitHub, click **Add file**, **Upload files**, and drop `league.json` in.
   Commit. It overwrites the old one.

The table, every scorecard, the career records and the curiosities all rebuild
themselves. Nothing else needs touching.

The export deliberately strips the dice profiles. The public site shows the
statistics and never the mechanics.

## Adding episodes

Edit `episodes.json`:

```json
[
 {"number":"Episode 1","title":"Castle Carpathia v Baskerville Hall","date":"May 1977","url":"https://youtu.be/xxxxxxx"}
]
```

Mind the commas: every entry except the last needs one after its closing brace.

## The data in here now is a demonstration

`league.json` ships with a simulated season so you can see every page working. A red notice at the top of the site says so. Your first real export
replaces the file and the notice disappears on its own.

## Putting it online, once, about ten minutes

1. Make a free account at github.com.
2. Click **New repository**. Name it `dicecricket`. Set it **Public**. Create it.
3. On the empty repository page click **uploading an existing file**, then drag
   every file from this folder into the browser. There are no subfolders, so
   nothing can land in the wrong place. Commit.
4. **Settings**, then **Pages** in the left column.
5. Source **Deploy from a branch**, branch **main**, folder **/ (root)**. Save.
6. Wait two minutes and refresh. The address is at the top of that page.

## Your own address

Buy a domain, then **Settings → Pages → Custom domain**. For the bare domain add
four A records at your registrar pointing to `185.199.108.153`,
`185.199.109.153`, `185.199.110.153` and `185.199.111.153`, and a CNAME on `www`
pointing at `yourusername.github.io`.

## What each file is

```
index.html            the shell. You will almost never touch this
style.css             all the design
app.js                the table, scorecards, records and statistics engine
site.json        site name, footer, and the menu
*.md       every written page, one file each
league.json      exported from the scorer, overwrite after each fixture
episodes.json    your video list
.nojekyll             tells GitHub to serve the files as they are
```

You should only ever need to touch the four things under ``.
