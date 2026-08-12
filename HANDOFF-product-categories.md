# Handoff: Hierarchical product categories with images

**Written 2026-08-12 by Fable 5 (design + architecture pass), then kept up to
date as the work landed. All "current state" facts below were verified against
the codebase.**

**Status: all six phases are implemented and verified. No code is outstanding.**
What remains is entirely content and decisions: the real category tree, real
category images, and the four questions in §6. Until a category is nested and
given an image, the feature is technically live but looks like the old flat
listing plus a card strip. Each phase below records what was built and the
traps found along the way; read the phase notes before changing that area.

**Content entry, when the tree is known** — the mechanics are trivial and can be
scripted (`drush php:script`) or clicked in the admin UI:
- nest terms by setting `parent` at `/admin/structure/taxonomy/manage/product_category/overview`
  (drag-indent) or `Term::create([... 'parent' => [$parent_tid]])`;
- attach an image by setting `field_category_image` to a **media entity id**
  (bundle `image`), e.g. `$term->set('field_category_image', $media_id)`;
- re-run `drush pathauto:aliases-generate create canonical_entities:taxonomy_term`
  afterwards so new/re-parented terms get their `/products/<parent>/<child>`
  aliases.
The blocker has never been the mechanics — it is that the category structure is
a business decision and the media library holds only seed stock photography
(Unsplash landscapes, a Bosch logo), nothing that depicts a hydraulic category.

> ⚠️ **Demo data currently in the dev database (2026-08-12), remove before
> launch.** Three children were added under *Hoses* (tid 5) at the user's
> request so the hierarchy could be seen working: *Hose fasteners* (tid 26),
> *Narrow hoses* (tid 27), *Hose systems* (tid 28). Products 15 and 16 were
> moved from Hoses into *Narrow hoses* and *Hose systems* respectively, and
> **seed stock photos were attached as category images** — media 3 on *Hoses*
> and media 2 on *Narrow hoses*. Those photos depict a plant and a shopfront;
> they are placeholders proving the image path renders, not content. To undo:
>
> ```php
> // drush php:eval
> $ts = \Drupal::entityTypeManager()->getStorage('taxonomy_term');
> $ns = \Drupal::entityTypeManager()->getStorage('node');
> $ns->load(15)->set('field_product_category', 5)->save();
> $ns->load(16)->set('field_product_category', 5)->save();
> foreach ([26, 27, 28] as $tid) { $ts->load($tid)?->delete(); }
> $ts->load(5)->set('field_category_image', NULL)->save();
> ```
>
> *Hose fasteners* deliberately has no products, and is therefore **invisible**
> in the sidebar, the browse strip and the subcategory cards — a live example of
> the zero-count rule below.

**Rule worth telling the client:** a category with no published products in its
whole subtree is hidden everywhere it would otherwise be listed. If they create
the tree before assigning products, the new categories will appear to be
missing. This is intentional (it stops dead-end cards and empty pages), but it
does mean the tree should be populated, or the rule explained, before anyone
reviews the result.

## 0. What the client wants

Category browsing like <https://dicsaes.com/en/products/components> (structure,
not design): opening **Products** shows a grid of **clickable category cards with
images**. Clicking a category shows its **subcategories as cards** (and/or its
products). Drill down until products appear. Breadcrumbs at every level.

Concretely for us:

1. `product_category` taxonomy becomes **hierarchical** (e.g. "Specific brand
   components" → "Pumps", "Control components", …).
2. Each category gets an **image** (uploadable by editors).
3. Category **assignment stays on the catalogue_item node form** (nothing about
   the node edit/create flow is removed).
4. `/products` opens with a category browse layer; each category has its own
   landing page with breadcrumbs, child-category cards and its products
   (including products of descendant categories).
5. Design must follow the existing HYDROCORE system (see §5) — no new visual
   language, no layout-shifting hover animations (client feedback: fades and
   overlay effects only, uniform timing).

## 1. Current state (verified)

- **Vocabulary** `product_category` exists and is FLAT today. Drupal taxonomy is
  natively hierarchical — hierarchy is created purely by drag-indenting terms at
  `/admin/structure/taxonomy/manage/product_category/overview`. No config change
  is needed to "enable" it. Terms are **not translatable** (no
  content_translation settings on the vocabulary) — see Open questions.
- **Node field** `field_product_category` on `catalogue_item`: entity_reference,
  **cardinality 1** (one category per product — makes count roll-ups simple),
  widget `options_select`, `auto_create: false`. An `options_select` widget
  renders hierarchy automatically with `-` indentation once terms are nested, so
  requirement 3 is satisfied by doing nothing here.
- **Products page** = view `products`, display `page_1`, path `/products`
  (`_sync/config/views.view.products.yml`). The whole UI is hand-built:
  - Template: `web/themes/custom/psmhydraulics/templates/views/views-view--products--page-1.html.twig`
    (ink head band w/ own breadcrumbs, filter sidebar as one GET form, toolbar,
    chips, grid). Rows template: `views-view-unformatted--products--page-1.html.twig`.
  - All template data comes from `psmhydraulics_preprocess_views_view()` in
    `web/themes/custom/psmhydraulics/psmhydraulics.theme` (~line 643): category/
    manufacturer/availability options with counts (via
    `_psmhydraulics_product_counts()` which does direct field-table COUNT
    queries), chips, head band from `psm_site.settings`.
  - Category filter: views filter `taxonomy_index_tid`, table
    `node__field_product_category`, exposed identifier `category` (multi-value
    OR). The sidebar checkboxes POST-as-GET `category[]=tid`.
  - Preprocess currently loads **only top-level terms**:
    `loadTree('product_category', 0, 1, TRUE)` — must change for hierarchy.
- **Product cards**: `templates/node/node--catalogue-item--teaser.html.twig`
  (`.product-card`), image fallback = `templates/includes/product-glyph.html.twig`
  (ISO-schematic SVG, `glyph: pump|valve|cylinder|hose|tool`).
- **Term pages**: core view `taxonomy_term` (enabled), argument plugin
  `taxonomy_index_tid` (NO depth), row = `entity:node` teaser. So a term page
  already renders our `.product-card` teasers, but only for exact-term matches,
  and with default styling around them.
- **Media**: product images are media references (bundle `image`) picked via
  entity browser `media_directories_modal`. A category image field should use
  the same widget for a consistent admin UX.
- **Pathauto**: products alias to `products/[node:title]`. No pattern for
  taxonomy terms yet.
- **Image styles** available: `thumbnail`, `medium`, `large`, `wide`,
  `carousel_hero`, `browser_thumbnail`, `media_library`.
- **psm_site module** (`web/modules/custom/psm_site`): site settings form
  (`SiteSettingsForm.php`, has a "Products page" section for head band texts),
  `psm_site.module` hooks. Custom PHP hooks that alter views queries belong
  HERE, not in the theme (themes don't get `hook_views_query_alter`).

### Dev workflow

- Boot: `docker compose up -d` (traefik, nginx, app, composer, node, db).
- Drush: `docker compose exec app drush cr` / `drush cex -y` / `drush cim -y`.
  Config sync dir is `_sync/config/`.
- Theme CSS: the `node` service watches `src/tailwind.pcss` → `dist/tailwind.css`
  (`npm run dev`, working dir is the theme). After CSS changes run
  `docker compose exec app drush cr` or the old aggregate keeps serving.
- **Preferred config workflow for this task: click it together in the admin UI,
  then `drush cex -y` and commit the exported YAML.** Do not hand-write config
  YAML unless unavoidable.
- Visual verification (no local browser): dockerized puppeteer —
  `docker run --rm --network psm-hydraulics_default --add-host psmhydraulics.local:<traefik-ip> -v /tmp/shots:/shots -v <scriptdir>:/work -e NODE_PATH=/usr/src/app/node_modules --entrypoint node zenika/alpine-chrome:with-puppeteer /work/script.js`.
  Headless chrome there reports `(hover:hover)` as false — test hover styles via
  `:focus-within` or by toggling classes in the script.

## 2. Target UX

```
/products                      ← view products/page_1 (existing page)
│  NEW: "Browse by category" card strip (top-level categories, image cards)
│       shown ONLY when no search/filters active. Existing filter+grid stays below.
│
├─ /products/specific-brand-components        ← taxonomy term page (aliased)
│    head band: crumbs Home / Products / <term>, term name, description
│    child-category cards (Pumps, Control components, …) — image cards
│    product grid: all products in this term INCLUDING descendants
│    "Refine in full catalogue →" link to /products?category[]=<tid>
│
│  └─ /products/specific-brand-components/pumps   ← leaf term page
│       crumbs Home / Products / Specific brand components / Pumps
│       no child cards; product grid of the term's products
│
└─ /products/<product-title>                  ← existing product node pages
```

Sidebar on `/products` becomes a **nested checkbox tree** (indented children,
counts rolled up to parents). Checking a parent matches its whole subtree.

## 3. Implementation plan

Work in this order; each phase is shippable on its own.

### Phase 1 — Data model (admin UI + `drush cex`) — ✅ DONE 2026-08-12

Implemented via a drush php:script instead of the admin UI (no browser in this
environment); config exported to `_sync/config/` (4 new files: field storage,
field, term form display, pathauto pattern). Steps kept below for reference.
**Still outstanding (content, not config): nest the real category tree and
upload images — see step 5.**

1. Add field to the vocabulary: *Structure → Taxonomy → Product category → Add
   field* → **Media reference**, label "Category image", machine name
   `field_category_image`, cardinality 1, target bundle `image`.
2. Form display for the term: set the widget to **Entity browser** with browser
   `media_directories_modal`, display "Rendered entity" — copy the settings the
   catalogue_item form display uses for `field_product_images`
   (`_sync/config/core.entity_form_display.node.catalogue_item.default.yml`).
3. Pathauto pattern: *Configuration → Search and metadata → URL aliases →
   Patterns → Add* → type "Taxonomy term", pattern
   `products/[term:parents:join-path]/[term:name]`, condition: vocabulary =
   Product category. (For root terms the parents token is empty; pathauto
   collapses the duplicate slash.) Bulk-generate aliases after nesting terms.
4. `docker compose exec app drush cex -y`, review diff, commit. Expected new
   config: `field.storage.taxonomy_term.field_category_image.yml`,
   `field.field.taxonomy_term.product_category.field_category_image.yml`,
   `core.entity_form_display.taxonomy_term.product_category.default.yml`,
   `pathauto.pattern.product_category.yml`.
5. Content (not config): nest the existing terms sensibly and upload images —
   or ask the user for the intended tree. Terms/images are content, so they are
   NOT exported; do this on the live/dev DB directly.

### Phase 2 — Hierarchy-aware filtering (psm_site module, PHP) — ✅ DONE 2026-08-12

Implemented in the existing `psm_site_views_query_alter()` in
`web/modules/custom/psm_site/psm_site.module` (it already handled the
manufacturer/doc filters), plus a `taxonomy_term_list:product_category` cache
tag in `psm_site_views_pre_render()` (re-parenting a term must invalidate the
listing).

**Gotcha discovered during implementation:** the exposed taxonomy filter's
ManyToOne helper does NOT produce an editable field/value condition — it writes
an opaque **formula string** (`node__field_product_category.field_product_category_target_id = :placeholder`,
operator `formula`). Expanding `$condition['value']` in place therefore does
nothing. The working approach (what the code now does): read the selected tids
from `$view->getExposedInput()['category']`, expand each with
`loadTree('product_category', $tid)` descendants, **remove** every where
condition whose field string contains `field_product_category_target_id`, and
`addWhere('psm_products', 'node__field_product_category.field_product_category_target_id', $tids, 'IN')`
(the filter already ensured that join). Exposed input itself is never mutated —
the theme preprocess reads it for checkbox/chip selected state, and only the
explicitly checked parent should show there.

Verified with a scripted test (temporary child term under Pumps, product moved
into it): parent filter matches the child's product; direct child filter works;
unrelated category excludes it; two categories at once, category+search combo,
empty input, and HTTP `GET /products?category[]=2` (200) all behave.

### Phase 3 — Hierarchical sidebar + roll-up counts (theme) — ✅ DONE, then REWORKED 2026-08-12

> **The always-expanded indented list described below was replaced by a
> collapsible tree** once real multi-level data made it obvious that a flat
> list of every category and subcategory would run to dozens of rows. Read
> "Phase 3b" immediately after this; the roll-up count logic is unchanged and
> still applies.

Three files changed:

1. `psmhydraulics.theme`, `psmhydraulics_preprocess_views_view()`: the flat
   `loadTree('product_category', 0, 1, TRUE)` is replaced by a full-depth load
   grouped into a `$tree_children` map (keyed by first parent tid, **and by tid
   inside** so a multi-parent term renders once), then a recursive closure
   emits options depth-first with `depth` + **subtree count** (own count from
   `_psmhydraulics_product_counts()` plus all descendants — cardinality 1 means
   plain summation cannot double-count). A term renders only if its subtree
   count > 0, so a parent with no direct products but stocked children still
   appears — which is exactly the "Specific brand components" case.
2. `views-view--products--page-1.html.twig`: `<label class="fcheck{{ option.depth ? ' fcheck--child' }}"`
   with `style="--fcheck-depth: N"` on nested rows only.
3. `src/tailwind.pcss` (in `@layer components`, next to `.fcheck`):
   `.fcheck--child` indents `depth * 1.125rem` and paints one hairline rail per
   ancestor level via a `repeating-linear-gradient` background sized to
   `(depth - 1) * 1.125rem + 1px` from `background-position: 7px` (the checkbox
   column). Rails on adjacent rows join into continuous vertical rules; a
   simpler single `::before` rail was tried first but left disconnected
   staircase segments at depth ≥ 2.

Chips/badges needed no change: a checked parent shows exactly one chip and its
children stay visually unchecked, because Phase 2 expands the subtree at query
level without touching exposed input.

**Tailwind gotcha (cost a debugging round, will bite again in phases 4–5):**
there is no `colors.line` token — the hairline is `theme('colors.paper.line')`
(`#E2E7EC`, same value as `colors.steel.200`). When a `theme()` lookup fails,
Tailwind **silently drops the entire rule** — including properties that
previously worked — and only prints `warn - The utility X contains an invalid
theme value and was not generated` in the watcher output. So if new CSS
mysteriously does nothing, run `docker compose logs node --tail=20` before
debugging anything else, and confirm the rule actually landed in
`dist/tailwind.css`.

Verified with a temporary two-level test tree (Pumps → Gear pumps → Internal
gear): indents 0/18/36px, roll-up counts correct at both levels, subtree
filtering correct at every depth (`?category[]=2` returned the depth-2
product), checked/badge state correct, drawer correct at 390px, and a flat tree
renders exactly as before (no `fcheck--child` markup at all). Test terms and
product re-assignments were rolled back afterwards.

### Phase 3b — Collapsible category filter — ✅ DONE 2026-08-12

Chosen by the user over drill-down, a capped flat list, and top-level-only
filtering. **Parents collapse; ticking a parent auto-ticks and locks its
subtree.**

- `pv.categories` is now a **nested** structure, not a flat list with a `depth`
  key. Each option carries `selected` (the user ticked it), `covered` (an
  ancestor is ticked, so it is already in the results) and `expanded` (this
  branch holds an active filter and opens on load), plus its `children`.
- `templates/includes/category-filter.html.twig` renders one row and **recurses
  into itself** for children. Because the markup is genuinely nested, the old
  `--fcheck-depth` inline variable and the `repeating-linear-gradient` ancestor
  rails are gone: indentation and the guide rail are now just `margin` +
  `border-left` on `.fcat__inner`, correct at any depth.
- A covered child renders `checked disabled`. Disabled inputs are not
  submitted, so the query string stays `category[]=<parent>` — exactly the one
  term, with the subtree expansion still happening server-side in
  `psm_site_views_query_alter()`. Chips and the group badge count only
  *explicit* selections, via a flat `$selected_categories` list collected during
  the recursion (`pv.category_active`).
- `products.js`: `cascadeCategory()` mirrors a ticked parent onto its subtree
  and opens the branch; `setBranch()` handles expand/collapse. **The cascade is
  called inside the existing form `change` handler, before `tidySubmit()`** —
  if it ran later (or in its own listener) the form would submit first and the
  children would land in the URL. Collapsed branches get `inert`, so a hidden
  subtree is out of the tab order rather than merely invisible; the template
  renders `inert` for the initial state and the JS flips it.

Verified by driving the real UI: collapsed on load with only parents showing,
toggle expands, ticking *Hoses* produced `?category[]=5` alone with children
ticked-and-dimmed and one "Cat Hoses" chip, unticking released the subtree and
cleaned the URL, a directly-selected child auto-expanded its parent branch on
load, and the mobile drawer cascaded without auto-submitting (batch mode
intact). Combined child+search and two-parents-at-once still return the right
products.

**Bug fixed 2026-08-12 — subcategory checkboxes did nothing.** Ticking any
child category left the results unchanged; only top-level categories filtered.
Cause: `cascadeCategory()` used
`row.querySelectorAll('.fcat__body input[type="checkbox"]')` to find a row's
descendants. A descendant combinator only requires `.fcat__body` to be *some*
ancestor of the match, **not one inside `row`** — so for a child row, its own
input matched (via the parent's `.fcat__body` further up), and the row disabled
itself. Disabled inputs are excluded from `FormData`, so the category simply
vanished from the request. Top-level rows have no `.fcat__body` ancestor, which
is exactly why they were the only ones that worked. Fixed with
`:scope > .fcat__body input[type="checkbox"]`, which anchors the body to this
row while still reaching every depth beneath it. `setBranch()` and the toggle
lookup already used `:scope >`; this was the one that did not. Re-verified at
three levels: a leaf three deep filters correctly, a mid parent locks its
grandchild, and a top parent locks both levels below it.

Minor note: the dimming of covered rows uses `.fcheck:has(input:disabled)`.
On a browser without `:has()` the rows simply won't dim — they stay disabled
and unclickable, so the degradation is cosmetic only.

### Phase 3c — AJAX filtering — ✅ DONE 2026-08-12

Every filter click used to reload the page, dumping the user back at the top of
a long listing. Filtering, sorting, paging, chips and reset now update in place.

**Why not Views' built-in AJAX:** this listing does not use the Views exposed
form at all — it is a hand-built GET form, and `manufacturer[]` / `doc` are read
straight off the request in `psm_site_views_query_alter()`. Views' AJAX
serialises `form.views-exposed-form`, so it would simply not see these inputs.

**The approach instead:** fetch the target URL, lift the already-correct
rendered region out of the response, swap it in. The whole listing is
server-rendered, so counts, chips, pager and empty state stay in exactly one
place — no rendering logic duplicated in JS.

- `[data-products-results]` (in the products template) wraps status + chips +
  grid + pager. That is the only region replaced.
- **The sidebar is deliberately never swapped.** Its counts are
  catalogue-wide, not filtered, so the user's own click already left it
  correct — and keeping it preserves scroll position, focus, expanded
  branches and the open mobile drawer. The consequence is that
  `syncSidebar()` must point the checkboxes at the URL whenever the change
  came from a *link* (chip removal, reset) rather than from the form itself.
  It accepts both `name[]` (what the form submits) and `name[0]` (what PHP
  generates for server-built links).
- Link interception distinguishes listing links from product links purely by
  pathname: `/products` is the listing, `/products/<anything>` is a product or
  a category page and is left alone.
- Anything unexpected — a non-OK response, a missing results region, no
  `DOMParser` — falls back to `window.location.assign(url)`, and with JS off
  the form still submits normally. The feature is an enhancement, never a
  dependency.
- Also handled: `popstate` (back/forward through filter states), `pushState`
  for shareable URLs, an `aria-live` announcement of the new result count
  (kept *outside* the swapped region, since a live region must exist before
  its content changes), a dimmed `.is-loading` state, and re-decorating the
  per-page `fancySelect` plus re-applying the grid/list preference after each
  swap — the template's inline view-state script does not re-run on
  innerHTML.
- URLs now omit `sort_by=newest` and `items_per_page=12`, matching the links
  the server already builds for chips and reset.

**Watch out for:** `setView` used to close over a `grid` element captured at
attach time; after a swap that reference is stale, which is why it became
`applyView(form)` doing a fresh lookup. Any future code holding a reference
into the results region has the same hazard.

Verified by driving the real UI: a `window.__alive` marker survived every
interaction and **zero document navigation requests** were made across
filtering, chip removal, sort, next page, search, reset and the mobile drawer's
apply — proving no reload. Scroll position held at 700px through a filter
change; the pager deliberately scrolls the results into view. List view and the
per-page control survive swaps, and the console stayed clean.

Known trade-off: each update fetches the full page and discards the chrome.
With this catalogue that is one cheap render; if the listing ever gets heavy,
the fix is a dedicated lightweight route returning just the region, not a
rewrite of the swap logic. Category landing pages still page with normal
loads — they have no filters, so the problem this solves does not arise there.

### Phase 3d — Catalogue mega menu — ✅ DONE 2026-08-12

The Products item in the main menu now opens a catalogue panel: one numbered
column per top-level category, its subcategories listed beneath, everything
clickable, with a foot bar showing the catalogue size and a link to the full
listing.

- Built in `psmhydraulics_preprocess_menu()`, which finds the menu item routed
  to `view.products.page_1` and hangs synthetic children off it from the
  taxonomy — **no menu links are created**, so editors never have to mirror
  the category tree by hand. `_psmhydraulics_category_menu_columns()` builds
  them from the same `_psmhydraulics_product_category_tree()` helper as the
  sidebar and the browse strip, so counts and visibility rules agree
  everywhere (categories with no published products stay out).
- The synthetic items only need `title`, `url` (a `Url` object — the template
  passes it to twig's `link()`), `below` and `in_active_trail`.
- `menu--main.html.twig` already rendered exactly this shape (numbered code,
  heading, link list), so it needed only the optional `mega_foot` block and a
  `mega--catalogue` class. The same markup is the drawer accordion on small
  screens, so mobile came for free.
- Columns: `repeat(auto-fit, minmax(180px, 1fr))` scoped to
  `.mega--catalogue`, giving exactly **5 across at full desktop width** and
  dropping a column at a time as the viewport narrows. The generic
  `.mega__cols` rule (`minmax(200px, 232px)`) is unchanged for the Segments
  and About us panels — with it, five columns overflowed the shell and wrapped
  to 4 + 1.
- A column is never left as a bare heading: more subcategories than fit
  (`PSMHYDRAULICS_MENU_LINKS`, 6) ends with a "View all (N)" link, and a
  category with no subcategories shows "N products" instead.
- Cache: the panel depends on terms and a product count, which the menu's own
  cache metadata does not cover, so `taxonomy_term_list:product_category` and
  `node_list:catalogue_item` are added.

**Motion fix made here:** `.navbar .mega__link` animated `padding-left` on
hover. With a whole catalogue in the panel, sweeping the cursor down the list
reflowed every link it passed — precisely the effect the client rejected
earlier. It is now `translate-x`, which is visually identical and does not
touch layout.

Not done, deliberately: marking the current category's column as active. It
would need a `url.path` cache context on the menu block, fragmenting its cache
per page for a small visual gain.

### Phase 3e — Product count column on the term overview — ✅ DONE 2026-08-12

`/admin/structure/taxonomy/manage/product_category/overview` now has a
**Products** column between Name and Status, so editors can see what a category
holds before renaming, re-parenting or deleting it.

- `psm_site_form_taxonomy_overview_terms_alter()` in the psm_site module —
  **not** the theme, since the admin theme is Gin and theme form hooks would
  never fire there.
- Scoped to the `product_category` vocabulary via the form's build args
  (`$form_state->getBuildInfo()['args'][0]`), which is populated both from the
  route and when the form is built directly — more reliable than the route
  match.
- Two counting queries, not one per row: `_psm_site_product_category_counts()`
  does a single grouped query, `_psm_site_product_category_subtree_counts()`
  rolls it up the tree. A parent shows `0 (2 with subcategories)` when it holds
  nothing directly, which is otherwise very misleading now that the vocabulary
  is nested. Non-zero counts link through to the filtered listing.
- **Unpublished products are counted**, unlike everywhere on the front end.
  The admin question is "is anything still filed under this term", e.g. before
  deleting it, so an unpublished product must not read as zero.
- The row array is rebuilt rather than appended to: a `#type: table` renders
  cells in child-key order, so appending would drop the count in the last
  column regardless of where the header sits.

Verified as admin in the real UI: header order Name / Products / Status /
Operations / Weight, all 11 rows still draggable with their handles and hidden
tid/parent/depth fields intact, 5 cells matching 5 headers, and a full form
save returned the normal confirmation with the nested tree unchanged.

### Phase 4 — "Browse by category" strip on /products (theme) — ✅ DONE 2026-08-12

The full listing stays below the strip — we deliberately show cards *above* the
existing catalogue instead of replacing it (dicsaes hides products at top
level; our richer listing is worth keeping visible). See open question 4.

Files changed:

1. `psmhydraulics.theme`:
   - the Phase 3 tree walker now also records `$subtree_counts[tid]`, which the
     strip reuses — no second counting pass;
   - `pv.browse` is built from the depth-0 terms with a non-zero subtree count,
     each `{label, count, url, image_url, glyph}`. `url` is
     `$term->toUrl()->toString()` so it picks up the pathauto alias, and the
     term is run through `getTranslationFromContext()` first;
   - new helper `_psmhydraulics_category_image_url(TermInterface $term)`:
     `field_category_image` → media → `field_media_image` → file → image style
     `large` (same style the product cards use), NULL when unset.
2. `templates/includes/category-card.html.twig` — **new, and Phase 5 reuses it
   as-is**. Contract: `{% include … with { card: {label, count, url, image_url,
   glyph} } only %}`. Falls back to `includes/product-glyph.html.twig` when
   `image_url` is NULL, and handles item/items pluralisation.
3. `views-view--products--page-1.html.twig` — `.products-browse` section
   between the head band and the listing form.
4. `src/tailwind.pcss` — `.products-browse*` and `.cat-card*` blocks.

**Gotcha — the pager is not exposed input.** The strip must hide once the user
is paging, but `$view->getExposedInput()['page']` is *never* set (Views handles
the pager separately), so the obvious check silently does nothing. Use
`(int) $view->getCurrentPage() === 0`. Visibility is now: hidden on search,
on any active filter chip, and on page ≥ 2; kept for sort/per-page changes,
which don't narrow the result set.

**Gotcha — hairline grid and part-filled rows.** The first cut drew the shared
hairlines by giving the grid `gap-px` over a `bg-paper-line` background. With
`auto-fill`, the empty cells of the last row then rendered as a grey slab.
Fixed by dropping the container background and having each card outline itself
(`box-shadow: 0 0 0 1px paper-line`): neighbouring shadows meet in the 1px gap
to form one line, and unfilled cells stay white.

Columns are `minmax(9.5rem, 1fr)` below 640px (2 columns on a 390px phone —
`13.75rem` alone gave one very tall column) and `minmax(13.75rem, 1fr)` above.
Hover/focus is fade-only per the client's no-motion rule: amber inset outline
and arrow fade in, background tints to paper, and the arrow reserves its space
at all times so nothing reflows.

**Operational step performed:** terms created *before* the Phase 1 pathauto
pattern existed had no alias and linked to `/taxonomy/term/N`. Ran
`drush pathauto:aliases-generate create canonical_entities:taxonomy_term`
(8 aliases). Re-run this after bulk-importing or re-parenting categories —
nested terms alias correctly as
`/products/<parent>/<child>` (verified).

**Known caching limitation:** the view carries `config:psm_site.settings` and
`taxonomy_term_list:product_category`, so term edits (including swapping a
category's image) refresh the strip. Replacing the *file* on an existing media
entity without touching the term will not, until a cache clear. The head band's
background image has the same characteristic, so this matches existing
behaviour rather than adding a new wrinkle.

Verified against a temporary tree (a top-level parent with an image, two
children with images, one without): image and glyph paths both render, counts
match the sidebar and sum to the catalogue total, aliases resolve, strip
visibility follows the rules above, 5 columns at 1440px and 2 at 390px with no
horizontal overflow, and focus state correct. Fixtures were rolled back; with
the current flat vocabulary the strip shows the 5 real categories that have
products.

### Phase 5 — Category landing pages (term pages) — ✅ DONE 2026-08-12

1. **View change:** view `taxonomy_term`'s argument is now
   `term_node_tid_depth` on `node_field_data`, plugin
   `taxonomy_index_tid_depth`, **depth 3**, so a parent category page lists
   descendant products. Applied via script (no browser here) and exported.
   Two details that matter if this is ever redone by hand: the depth plugin
   extends `ArgumentPluginBase`, not `ManyToOneArgument`, so the
   `add_table` / `require_value` / `reduce_duplicates` options of the old `tid`
   argument must be dropped, and it needs `depth` / `break_phrase` /
   `use_taxonomy_term_path` added. Entity validation (`fail: 'not found'`) was
   carried over, so bad tids still 404. Requires
   `taxonomy.settings: maintain_index_table: true` — already on.
   Other vocabularies are flat, and a `media_directories` term page was checked
   to confirm it is unaffected.

   One incidental config diff: `_sync/config/language/lv/views.view.taxonomy_term.yml`
   lost its `arguments.tid.exception.title` override ("Visi"), because the
   argument key changed. That string was never rendered — the exception has
   `title_enable: false` and the argument's `default_action` is `not found` —
   so nothing is lost; Drupal dropped it because the source key no longer
   exists.
2. **Vocabulary-specific template:** in `psmhydraulics.theme` add
   `hook_theme_suggestions_views_view_alter()`: if view id `taxonomy_term` and
   the raw term (from `$view->args[0]` → load term) is bundle
   `product_category`, add suggestion `views_view__taxonomy_term__product_category`.
   Create `templates/views/views-view--taxonomy-term--product-category.html.twig`.
3. **Preprocess** (same guard as suggestion hook — extend
   `psmhydraulics_preprocess_views_view()` with a second branch): build
   `category_view` with:
   - `head`: term label, term description, parents chain for crumbs
     (`$storage->loadAllParents($tid)` — returns term-first order, reverse it,
     drop self), each crumb = label + url; plus the term's own image as optional
     band background (mirror the `products_bg` handling, image style `wide`).
   - `children`: child terms (`$storage->loadTree('product_category', $tid, 1, TRUE)`)
     with subtree counts/images/urls — build them in the **same shape as
     `pv.browse`** (`{label, count, url, image_url, glyph}`) and render with the
     existing `templates/includes/category-card.html.twig`, which Phase 4
     already created for this purpose. `_psmhydraulics_category_image_url()` is
     the ready-made helper for `image_url`.
   - `refine_url`: `/products?category[]=<tid>`
     (`Url::fromRoute('view.products.page_1', [], ['query' => ['category' => [$tid]]])`).
   - Remember `getTranslationFromContext()` on every term, like existing code.
4. **Template structure** (reuse existing classes wherever possible):

```
<section class="products-head">            ← same band as /products
  crumbs: Home / Products(link to /products) / [parents…] / current
  eyebrow "Category" · h1 term name · term description as __sub
  counter: subtree product count (reuse .products-head__counter)
</section>
{% if children %} .site-section .products-browse with cat-cards {% endif %}
.site-section:
  h2 "Products" row + "Refine in full catalogue →" link (btn--ghost)
  {% if rows %} <div class="products-grid">{{ rows }}</div> {% else %} empty state {% endif %}
  {{ pager }}
quote-cta include (same as products page, pass quote var)
```

5. Duplicate page title: nothing to do — `block.block.psmhydraulics_page_title`
   is `status: false` site-wide, so only the band's H1 renders.
6. Breadcrumb dedup: done. `psmhydraulics_preprocess_page()` already dropped
   `page.breadcrumb` for the products listing and product nodes; product
   category term pages were added to the same condition (route
   `entity.taxonomy_term.canonical` + bundle check). Other vocabularies keep
   the system breadcrumb — verified.

**Design addition:** the section's secondary action needed a button on a light
background, and the system had none — `.btn--ghost` is white-on-dark and was
invisible. Added `.btn--outline` (steel border, ink text, amber on hover) next
to the other variants in `src/tailwind.pcss`; reuse it rather than inventing
another light-background button.

**Refactor note:** the Phase 3/4 tree walking moved out of the products branch
into two shared helpers, `_psmhydraulics_product_category_tree()` (returns
`[$children_by_parent, $subtree_counts]`) and
`_psmhydraulics_category_card($term, $count)`. Both the products page and the
category page build their cards through them, so counts can never drift apart.
`_psmhydraulics_category_image_url()` gained an image-style argument (`large`
for cards, `wide` for the band background).

Verified with a three-level fixture (parent with three children — one of them
with a grandchild — and products placed at all three depths): product counts
per level were 3 / 2 / 1 exactly as the subtree implies, the full ancestor
trail renders in the band, subcategory cards appear only where children have
products, the leaf page correctly omits that section, a category with no
products shows the empty state, "Refine in full catalogue" lands on
`/products` with the filter applied and its chip shown, and there is no
horizontal overflow at 1440px or 390px. Fixtures were rolled back.

### Phase 6 — Product page + polish — ✅ DONE 2026-08-12

- The category name is now a **link to its term page** in both places it
  appears: `.product-card__cat` on the teaser card and the `eyebrow--dark`
  label on the product detail page. Both keep a `<span>` fallback for the
  (impossible-in-practice) case of a category with no URL, and hover is
  colour-only — the amber rule before the label shifts to ink, nothing moves.
- The product detail breadcrumb now carries the **full category chain**:
  Home / Products / …ancestors… / Category / Product.
- New shared helper `_psmhydraulics_category_trail($term)` returns the trail
  root-first with the term last; the category landing page uses it too (it pops
  the last entry, since it renders itself as the current page).
- `_psmhydraulics_preprocess_product_full()` and the teaser preprocess now run
  the category term through `getTranslationFromContext()`, which they did not
  do before — category labels on product pages were previously always in the
  default language.

**Two layout fixes this forced**, both worth keeping in mind for any deep trail:

1. `.products-head__crumbs` was a non-wrapping flex row. A four-level trail
   made each crumb shrink and wrap its own text mid-word. It now wraps
   (`flex-wrap` + `gap-y`), matching the intent already documented on the light
   `.crumbs` sibling. Verified: 5 clean lines at 390px, 2 at 1440px, no
   horizontal overflow anywhere.
2. Once the trail wrapped, it filled `.product-band__in` and pushed the SKU
   reference onto its own line. `.product-band__crumbs` gained `flex-1` so the
   reference stays pinned right and vertically centred; band height at 1440px
   went back down from 105px to 80px.

**Deliberately not done:** the optional `SiteSettingsForm` fields for the
browse strip's eyebrow/title. The strings are `|t`-wrapped so they can be
handled through interface translation, and nobody has asked for them to be
editable — adding config surface on spec is not worth the schema +
config_translation churn. The pattern to follow, if it is ever wanted, is the
existing `products_eyebrow` / `products_title` pair.

## 4. CSS for `.cat-card` / `.products-browse` (design spec) — ✅ BUILT in Phase 4

Kept for reference; the implemented rules live in `src/tailwind.pcss` under
"Products listing: browse-by-category strip" and already satisfy this spec
(with the two deviations noted in Phase 4: card-level hairlines instead of a
grid background, and a smaller minimum column below 640px). Follow the
HYDROCORE system: ink `#0C1A29`, amber `#F7A21B`, paper `#F4F6F8`, Oswald for
display text, 3px radius (`rounded-brand` token), hairline borders like
`.product-card`.

- `.products-browse__grid`: `display:grid; gap: 1px; background: <hairline
  color>; border: 1px solid <hairline>;` with cells filled white —
  "engineering-drawing grid" look (cells share hairlines), columns
  `repeat(auto-fill, minmax(220px, 1fr))`.
- `.cat-card`: white bg, padding, flex column; media area fixed aspect
  (`aspect-ratio: 4/3`), image `object-fit: contain` (product photos are on
  white) with slight padding; glyph fallback in steelgray at ~56px.
- `.cat-card__name`: Oswald, uppercase, letter-spacing ~0.04em, ink.
- `.cat-card__count`: mono font (IBM Plex Mono), steelgray, small.
- `.cat-card__arrow`: amber, opacity 0 → 1 on hover/focus-within.
- **Hover: color/opacity fades only (0.2s ease, same as the rest of the site).
  No translate/scale — the client explicitly rejected layout-shifting hover
  animations.** Suggested: amber 2px inset outline or bottom rule fades in,
  name gains amber underline; keep the card itself static.
- Mobile: grid drops to 2 cols ~480px, 1 col very narrow; strip sits directly
  under the band with normal `.site-section` padding.

**Tailwind gotchas (bit us before):** runtime-injected markup and class names
*built* dynamically in twig (string concatenation, `|clean_class` suffixes) must
live OUTSIDE `@layer components` or the purge drops them. A conditional whole
token like `fcheck--child` is fine inside the layer — it appears literally in
the template, so the scanner finds it (verified in Phase 3). Also: a failed
`theme()` lookup silently deletes the whole rule — see the Phase 3 note. `[hidden]` guard already exists.
After every CSS change: `drush cr`. Test logged-in AND anonymous (contextual
links wrap blocks in `.contextual-region{position:relative}` for admins only —
has broken absolute positioning before; fix pattern is in tailwind.pcss around
`.navbar .contextual-region`).

## 5. Verification checklist (do after each phase)

1. `docker compose exec app drush cr` after any PHP/twig/CSS change.
2. `/products` anonymous: browse strip renders, cards link to aliased term
   pages, strip disappears once any filter/search/page is active.
3. Sidebar: children indented under parents; checking a parent shows
   descendants' products (Phase 2) and ONE chip; counts add up.
4. Term page of a parent: band + crumbs + child cards + products incl.
   descendants; leaf term: no child section; term with no image: glyph fallback.
5. Both languages if multilingual content exists (terms currently untranslated
   — names will show default language; see Open questions).
6. Screenshots (mobile 390px, desktop 1440px) via the dockerized puppeteer
   command; remember headless container has no `(hover:hover)`.
7. `drush cex -y` — commit config together with code.

## 6. Open questions for the user (ask before/while implementing)

1. **Term translations — now the most consequential question.** The vocabulary
   is not translatable. All the category code calls
   `getTranslationFromContext()`, so it is ready the moment translation is
   enabled (Config → Regional → Content language), but until then the Latvian
   site behaves like this:
   - pathauto stored every category alias under `en-gb`, so `/lv/products/pumps`
     **404s** while `/products/pumps` and `/lv/taxonomy/term/2` both work;
   - consequently `$term->toUrl()` emits an unprefixed `/products/pumps`, and a
     visitor on `/lv/products` who clicks a category card lands on the English
     page. Forcing the `/lv` prefix would 404, so this is the graceful option,
     not an oversight — do not "fix" it by adding a language to the URL.
   - Separately and pre-existing: `/lv/products` lists **no products at all**,
     because catalogue nodes have no Latvian translations. The browse strip
     still renders there (terms always load), which makes the gap more visible
     than it was.
   Enabling term translation and re-running the alias generation resolves the
   category half of this; the empty Latvian catalogue is a content question for
   the client.
2. **Creating brand-new categories while editing a product**: today's widget
   (`options_select`) only selects existing terms — same as before, nothing
   lost. If the client additionally wants to CREATE terms from the node form,
   the standard option is an autocomplete (tags) widget with `auto_create`,
   but that loses the visible hierarchy in the widget and creates root-level
   terms needing re-parenting. Recommend keeping the select; confirm with user.
3. **Category tree + images content entry**: who enters the actual tree
   (client vs us)? Needed before the feature looks like anything.
4. Whether `/products` should HIDE the full listing at top level (pure dicsaes
   clone) instead of showing the strip above it. Plan assumes strip + listing.
