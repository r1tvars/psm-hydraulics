/**
 * @file
 * Products listing behaviours: AJAX filtering, accordion groups, off-canvas
 * filter drawer, grid/list toggle, manufacturer mini-search.
 */
(function (Drupal, once) {
  'use strict';

  const DESKTOP = window.matchMedia('(min-width: 1024px)');
  const VIEW_KEY = 'psmProductsView';
  const GROUPS_KEY = 'psmProductsGroups';
  const RESULTS = '[data-products-results]';
  // Omitted from URLs when unchanged, so links stay readable and match the
  // ones the server builds for chips and reset.
  const DEFAULTS = { sort_by: 'newest', items_per_page: '12' };

  /**
   * Builds the listing URL for the form's current state.
   *
   * Empty inputs and default sort/paging are dropped, and `page` is left out
   * entirely so changing a filter always returns to the first page.
   */
  function formUrl(form) {
    const params = new URLSearchParams();
    new FormData(form).forEach((value, key) => {
      const clean = typeof value === 'string' ? value.trim() : value;
      if (clean !== '' && DEFAULTS[key] !== clean) {
        params.append(key, clean);
      }
    });
    const query = params.toString();
    return form.action + (query ? '?' + query : '');
  }

  /**
   * Reads a repeated query parameter, accepting both the `name[]` the form
   * submits and the `name[0]` PHP generates for server-built links.
   */
  function paramValues(params, name) {
    const values = [];
    params.forEach((value, key) => {
      if (key.startsWith(name + '[')) {
        values.push(value);
      }
    });
    return values;
  }

  /**
   * Points the sidebar at a URL's filters.
   *
   * Needed because the sidebar is never swapped: when the user removes a chip
   * or hits reset, the checkboxes have to follow the link's state.
   */
  function syncSidebar(form, url) {
    const params = new URLSearchParams(new URL(url, window.location.origin).search);

    ['category', 'manufacturer', 'availability'].forEach((name) => {
      const values = paramValues(params, name);
      form.querySelectorAll(`input[name="${name}[]"]`).forEach((input) => {
        input.disabled = false;
        input.checked = values.includes(input.value);
      });
    });

    const doc = form.querySelector('input[name="doc"]');
    if (doc) {
      doc.checked = params.get('doc') === '1';
    }

    const search = form.querySelector('input[name="search"]');
    const clear = form.querySelector('[data-products-clear-search]');
    if (search) {
      search.value = params.get('search') || '';
      if (clear) {
        clear.hidden = search.value === '';
      }
    }

    // Re-apply parent → subtree locking for whatever ended up ticked.
    form.querySelectorAll('input[name="category[]"]:checked').forEach(cascadeCategory);
  }

  /**
   * Mirrors a ticked category onto its whole subtree.
   *
   * The view already matches descendants of a ticked category, so they are
   * shown ticked and disabled — which also keeps them out of the submitted
   * query, leaving just the one category in the URL. Unticking releases them.
   */
  function cascadeCategory(input) {
    const row = input.closest('[data-cat]');
    if (!row) {
      return;
    }
    // `:scope >` is load-bearing: without it the descendant combinator also
    // matches this row's own input via an ancestor .fcat__body higher up the
    // tree, so a subcategory would disable itself and drop out of the query.
    row.querySelectorAll(':scope > .fcat__body input[type="checkbox"]').forEach((descendant) => {
      descendant.checked = input.checked;
      descendant.disabled = input.checked;
    });
    // Open the branch so the effect of ticking a parent is visible.
    if (input.checked) {
      const toggle = row.querySelector(':scope > .fcat__row [data-cat-toggle]');
      if (toggle) {
        setBranch(row, toggle, true);
      }
    }
  }

  /**
   * Opens or closes one branch of the category tree.
   */
  function setBranch(row, toggle, open) {
    row.toggleAttribute('data-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    const body = row.querySelector(':scope > .fcat__body');
    if (body) {
      body.toggleAttribute('inert', !open);
    }
  }

  /**
   * Re-applies the stored grid/list preference to a freshly swapped grid.
   *
   * The inline script in the template only covers the initial page load;
   * markup inserted via innerHTML never runs its scripts.
   */
  function applyView(form) {
    let view = 'grid';
    try {
      view = window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
    }
    catch (e) {}
    const grid = form.querySelector('[data-products-grid]');
    if (grid) {
      grid.classList.toggle('is-list', view === 'list');
    }
    form.querySelectorAll('[data-products-view]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.productsView === view));
    });
  }

  /**
   * Matches the browse-by-category strip to the response.
   *
   * It sits outside the form (it is a sibling section, not part of the
   * results region) and only shows on the unfiltered first page.
   */
  function syncBrowse(form, doc) {
    const fresh = doc.querySelector('.products-browse');
    const current = document.querySelector('.products-browse');
    if (fresh && current) {
      current.replaceWith(fresh);
    }
    else if (fresh) {
      const anchor = form.closest('.site-section');
      if (anchor) {
        anchor.parentNode.insertBefore(fresh, anchor);
      }
    }
    else if (current) {
      current.remove();
    }
  }

  /**
   * Swaps in a freshly rendered result set without leaving the page.
   *
   * The listing is entirely server-rendered, so the response for the target
   * URL already holds the right grid, chips, count and pager — this just
   * lifts that region across. The sidebar is deliberately left in place: its
   * counts are catalogue-wide rather than filtered, so it is already correct,
   * and keeping it preserves scroll position, focus, expanded branches and
   * the open drawer. Any failure falls back to a normal page load.
   */
  function loadResults(form, url, options) {
    const settings = options || {};
    const results = document.querySelector(RESULTS);
    if (!results || !window.DOMParser) {
      window.location.assign(url);
      return;
    }

    results.classList.add('is-loading');

    window.fetch(url, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        return response.text();
      })
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const fresh = doc.querySelector(RESULTS);
        if (!fresh) {
          throw new Error('no results region in response');
        }

        Drupal.detachBehaviors(results);
        results.innerHTML = fresh.innerHTML;
        syncBrowse(form, doc);
        applyView(form);
        // The per-page control is inside the swapped region, so it needs
        // re-decorating; these nodes are new, so there is nothing to undo.
        results.querySelectorAll('select[data-fancy]').forEach(fancySelect);
        Drupal.attachBehaviors(results);
        results.classList.remove('is-loading');

        if (settings.push !== false) {
          window.history.pushState({ psmProducts: true }, '', url);
        }

        const announce = form.querySelector('[data-products-announce]');
        const count = results.querySelector('.products-status__count');
        if (announce && count) {
          announce.textContent = count.textContent.trim();
        }

        if (settings.scroll) {
          const main = form.querySelector('.products-main');
          if (main) {
            main.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      })
      .catch(() => {
        window.location.assign(url);
      });
  }

  /**
   * Replaces a native select with a styled listbox. The select stays in the
   * DOM (visually hidden) and keeps submitting the form; picking an option
   * updates it and fires a change event, so the auto-submit above kicks in.
   */
  function fancySelect(select) {
    const wrap = document.createElement('div');
    wrap.className = 'fselect' + (select.dataset.fancy === 'up' ? ' fselect--up' : '');
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.classList.add('fselect__native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    const label = select.id ? document.querySelector(`label[for="${select.id}"]`) : null;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fselect__btn';
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    if (label) {
      button.setAttribute('aria-label', label.textContent.trim());
    }
    button.innerHTML = '<span class="fselect__value"></span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
    const value = button.querySelector('.fselect__value');

    const panel = document.createElement('ul');
    panel.className = 'fselect__panel';
    panel.setAttribute('role', 'listbox');
    panel.hidden = true;

    const options = [...select.options].map((option, index) => {
      const item = document.createElement('li');
      item.className = 'fselect__option';
      item.id = `${select.id || select.name}-opt-${index}`;
      item.setAttribute('role', 'option');
      item.dataset.value = option.value;
      item.innerHTML = `<span></span><i class="fa-solid fa-check" aria-hidden="true"></i>`;
      item.querySelector('span').textContent = option.textContent;
      panel.appendChild(item);
      return item;
    });

    wrap.appendChild(button);
    wrap.appendChild(panel);

    let activeIndex = select.selectedIndex;

    const render = () => {
      value.textContent = select.options[select.selectedIndex]?.textContent ?? '';
      options.forEach((item, index) => {
        item.setAttribute('aria-selected', String(index === select.selectedIndex));
        item.classList.toggle('is-active', index === activeIndex);
      });
      button.setAttribute('aria-activedescendant', options[activeIndex] ? options[activeIndex].id : '');
    };

    const setOpen = (open) => {
      wrap.classList.toggle('is-open', open);
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      if (open) {
        activeIndex = select.selectedIndex;
        render();
      }
    };

    const commit = (index) => {
      if (index !== select.selectedIndex) {
        select.selectedIndex = index;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      setOpen(false);
      render();
    };

    button.addEventListener('click', () => setOpen(panel.hidden));
    button.addEventListener('keydown', (event) => {
      const open = !panel.hidden;
      const max = options.length - 1;
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp':
          event.preventDefault();
          if (!open) {
            setOpen(true);
          }
          else {
            activeIndex = event.key === 'ArrowDown' ? Math.min(activeIndex + 1, max) : Math.max(activeIndex - 1, 0);
            render();
          }
          break;
        case 'Home':
        case 'End':
          if (open) {
            event.preventDefault();
            activeIndex = event.key === 'Home' ? 0 : max;
            render();
          }
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          open ? commit(activeIndex) : setOpen(true);
          break;
        case 'Escape':
          setOpen(false);
          break;
        case 'Tab':
          setOpen(false);
          break;
      }
    });
    options.forEach((item, index) => {
      item.addEventListener('click', () => commit(index));
      item.addEventListener('mousemove', () => {
        if (activeIndex !== index) {
          activeIndex = index;
          render();
        }
      });
    });
    document.addEventListener('pointerdown', (event) => {
      if (!panel.hidden && !wrap.contains(event.target)) {
        setOpen(false);
      }
    });
    // A <label for> click focuses the hidden select — hand it to the button.
    select.addEventListener('focus', () => button.focus());

    render();
  }

  Drupal.behaviors.psmProducts = {
    attach(context) {
      once('psm-products', '[data-products-form]', context).forEach((form) => {
        const side = form.querySelector('[data-products-side]');

        // Styled dropdowns for sort + per-page.
        form.querySelectorAll('select[data-fancy]').forEach(fancySelect);

        // Any filter/sort change re-queries the view. In drawer mode the
        // user batches changes and applies them with the submit button.
        form.addEventListener('change', (event) => {
          const target = event.target;
          if (target.matches('[data-manufacturer-search]')) {
            return;
          }
          // Must run before the request below, so the subtree is disabled and
          // only the ticked ancestor ends up in the query string.
          if (target.matches('input[name="category[]"]')) {
            cascadeCategory(target);
          }
          if (target.matches('input[type="checkbox"]') && !DESKTOP.matches) {
            return;
          }
          if (target.matches('input[type="checkbox"], select')) {
            loadResults(form, formUrl(form));
          }
        });

        // Enter in the search box, or the drawer's "Show products" button.
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          setDrawer(false);
          loadResults(form, formUrl(form));
        });

        // Pager, chips, reset — every listing link lives inside the form, and
        // they all point at the listing path, which is what separates them
        // from the product links in the grid.
        const listingPath = new URL(form.action, window.location.origin).pathname;
        form.addEventListener('click', (event) => {
          const link = event.target.closest('a');
          if (!link || !link.href || event.metaKey || event.ctrlKey || event.shiftKey) {
            return;
          }
          const target = new URL(link.href, window.location.origin);
          if (target.origin !== window.location.origin || target.pathname !== listingPath) {
            return;
          }
          event.preventDefault();
          syncSidebar(form, target.href);
          loadResults(form, target.href, { scroll: link.closest('.products-pager') !== null });
        });

        // Search: clear button.
        const search = form.querySelector('.products-toolbar__search input[name="search"]');
        const clear = form.querySelector('[data-products-clear-search]');
        if (search && clear) {
          search.addEventListener('input', () => {
            clear.hidden = search.value === '';
          });
          clear.addEventListener('click', () => {
            search.value = '';
            loadResults(form, formUrl(form));
          });
        }

        // Back / forward through filter states.
        window.addEventListener('popstate', () => {
          syncSidebar(form, window.location.href);
          loadResults(form, window.location.href, { push: false });
        });

        // Accordion groups, collapse state kept per session.
        let closedGroups = [];
        try {
          closedGroups = JSON.parse(sessionStorage.getItem(GROUPS_KEY) || '[]');
        }
        catch (e) {}
        form.querySelectorAll('.fgroup').forEach((group) => {
          const name = group.dataset.fgroup;
          const head = group.querySelector('.fgroup__head');
          if (closedGroups.includes(name)) {
            group.removeAttribute('data-open');
            head.setAttribute('aria-expanded', 'false');
          }
          head.addEventListener('click', () => {
            const open = group.hasAttribute('data-open');
            group.toggleAttribute('data-open', !open);
            head.setAttribute('aria-expanded', String(!open));
            closedGroups = closedGroups.filter((item) => item !== name);
            if (open) {
              closedGroups.push(name);
            }
            try {
              sessionStorage.setItem(GROUPS_KEY, JSON.stringify(closedGroups));
            }
            catch (e) {}
          });
        });

        // Category tree: expand / collapse a branch.
        form.querySelectorAll('[data-cat-toggle]').forEach((toggle) => {
          toggle.addEventListener('click', () => {
            const row = toggle.closest('[data-cat]');
            setBranch(row, toggle, !row.hasAttribute('data-open'));
          });
        });

        // Manufacturer mini-search filters its checkbox list client-side.
        const manufacturerSearch = form.querySelector('[data-manufacturer-search]');
        if (manufacturerSearch) {
          const options = manufacturerSearch.closest('.fgroup__inner').querySelectorAll('.fcheck');
          manufacturerSearch.addEventListener('input', () => {
            const needle = manufacturerSearch.value.trim().toLowerCase();
            options.forEach((option) => {
              const label = option.querySelector('.fcheck__label').textContent.toLowerCase();
              option.hidden = needle !== '' && !label.includes(needle);
            });
          });
        }

        // Off-canvas drawer (below lg).
        const setDrawer = (open) => {
          document.body.classList.toggle('products-drawer-open', open);
          side.setAttribute('aria-hidden', String(!open && !DESKTOP.matches));
        };
        form.querySelectorAll('[data-products-drawer-open]').forEach((button) => {
          button.addEventListener('click', () => setDrawer(true));
        });
        form.querySelectorAll('[data-products-drawer-close]').forEach((element) => {
          element.addEventListener('click', () => setDrawer(false));
        });
        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            setDrawer(false);
          }
        });
        DESKTOP.addEventListener('change', () => setDrawer(false));

        // Grid / list toggle, persisted across reloads. The grid element is
        // looked up on demand, since AJAX swaps replace it.
        form.querySelectorAll('[data-products-view]').forEach((button) => {
          button.addEventListener('click', () => {
            try {
              localStorage.setItem(VIEW_KEY, button.dataset.productsView);
            }
            catch (e) {}
            applyView(form);
          });
        });
        applyView(form);
      });
    },
  };
})(Drupal, once);
