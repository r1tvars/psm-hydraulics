/**
 * @file
 * Products listing behaviours: auto-submitting filters, accordion groups,
 * off-canvas filter drawer, grid/list toggle, manufacturer mini-search.
 */
(function (Drupal, once) {
  'use strict';

  const DESKTOP = window.matchMedia('(min-width: 1024px)');
  const VIEW_KEY = 'psmProductsView';
  const GROUPS_KEY = 'psmProductsGroups';

  /**
   * Strips empty inputs so submitted URLs stay clean.
   */
  function tidySubmit(form) {
    form.querySelectorAll('input[type="search"], input[type="text"]').forEach((input) => {
      if (input.name && input.value.trim() === '') {
        input.disabled = true;
      }
    });
    form.requestSubmit();
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
        const grid = form.querySelector('[data-products-grid]');

        // Styled dropdowns for sort + per-page.
        form.querySelectorAll('select[data-fancy]').forEach(fancySelect);

        // Any filter/sort change re-queries the view. In drawer mode the
        // user batches changes and applies them with the submit button.
        form.addEventListener('change', (event) => {
          const target = event.target;
          if (target.matches('[data-manufacturer-search]')) {
            return;
          }
          if (target.matches('input[type="checkbox"]') && !DESKTOP.matches) {
            return;
          }
          if (target.matches('input[type="checkbox"], select')) {
            tidySubmit(form);
          }
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
            tidySubmit(form);
          });
        }

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

        // Grid / list toggle, persisted across reloads.
        const viewButtons = form.querySelectorAll('[data-products-view]');
        const setView = (view) => {
          if (grid) {
            grid.classList.toggle('is-list', view === 'list');
          }
          viewButtons.forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.productsView === view));
          });
          try {
            localStorage.setItem(VIEW_KEY, view);
          }
          catch (e) {}
        };
        let storedView = 'grid';
        try {
          storedView = localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
        }
        catch (e) {}
        if (storedView === 'list') {
          setView('list');
        }
        viewButtons.forEach((button) => {
          button.addEventListener('click', () => setView(button.dataset.productsView));
        });
      });
    },
  };
})(Drupal, once);
