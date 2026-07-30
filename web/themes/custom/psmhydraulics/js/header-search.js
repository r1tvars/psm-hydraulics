((Drupal, once) => {
  const DEBOUNCE_MS = 250;

  Drupal.behaviors.psmHydraulicsHeaderSearch = {
    attach(context) {
      once('psmHydraulicsHeaderSearch', '[data-header-search]', context).forEach((form) => {
        const input = form.querySelector('[data-search-input]');
        const panel = form.querySelector('[data-search-suggestions]');
        const suggestUrl = form.dataset.suggestUrl;

        if (!input || !panel || !suggestUrl) {
          return;
        }

        const labels = {
          popular: panel.dataset.labelPopular || 'Popular searches',
          matches: panel.dataset.labelMatches || 'Matches',
          empty: panel.dataset.labelEmpty || 'No quick matches.',
          browse: panel.dataset.labelBrowse || 'Browse all products',
        };

        let debounceTimer = null;
        let abortController = null;
        let highlighted = -1;
        let options = [];

        const close = () => {
          panel.hidden = true;
          highlighted = -1;
        };

        const openPanel = () => {
          panel.hidden = false;
        };

        const highlight = (index) => {
          options.forEach((option, i) => {
            option.classList.toggle('is-highlighted', i === index);
          });
          highlighted = index;
          if (index > -1 && options[index]) {
            options[index].scrollIntoView({ block: 'nearest' });
          }
        };

        const render = (items, query) => {
          panel.textContent = '';

          const label = document.createElement('div');
          label.className = 'header-search__sugg-label';
          label.textContent = query ? labels.matches : labels.popular;
          panel.append(label);

          if (items.length) {
            items.forEach((item) => {
              const option = document.createElement('a');
              option.className = 'header-search__sugg-item';
              option.href = item.url;

              const icon = document.createElement('i');
              icon.className = 'fa-solid fa-magnifying-glass';
              icon.setAttribute('aria-hidden', 'true');

              const title = document.createElement('span');
              title.className = 'header-search__sugg-title';
              title.textContent = item.title;

              option.append(icon, title);

              if (item.category) {
                const category = document.createElement('span');
                category.className = 'header-search__sugg-cat';
                category.textContent = item.category;
                option.append(category);
              }

              panel.append(option);
            });
          }
          else {
            const empty = document.createElement('div');
            empty.className = 'header-search__sugg-empty';
            empty.textContent = labels.empty;
            panel.append(empty);
          }

          const foot = document.createElement('div');
          foot.className = 'header-search__sugg-foot';
          const browse = document.createElement('a');
          browse.href = form.action;
          const browseLabel = document.createElement('span');
          browseLabel.textContent = labels.browse;
          const arrow = document.createElement('i');
          arrow.className = 'fa-solid fa-arrow-right';
          arrow.setAttribute('aria-hidden', 'true');
          browse.append(browseLabel, arrow);
          foot.append(browse);
          panel.append(foot);

          options = Array.from(panel.querySelectorAll('.header-search__sugg-item'));
          highlighted = -1;
          openPanel();
        };

        const fetchSuggestions = () => {
          const query = input.value.trim();

          if (abortController) {
            abortController.abort();
          }
          abortController = new AbortController();

          const url = new URL(suggestUrl, window.location.origin);
          if (query) {
            url.searchParams.set('q', query);
          }

          fetch(url.toString(), { signal: abortController.signal })
            .then((response) => (response.ok ? response.json() : { items: [] }))
            .then((data) => {
              // Ignore stale responses typed over in the meantime.
              if (input.value.trim() === query) {
                render(data.items || [], query);
              }
            })
            .catch(() => {});
        };

        const scheduleFetch = () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(fetchSuggestions, DEBOUNCE_MS);
        };

        input.addEventListener('focus', fetchSuggestions);
        input.addEventListener('input', scheduleFetch);

        input.addEventListener('keydown', (event) => {
          if (panel.hidden && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            fetchSuggestions();
            return;
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault();
            highlight(options.length ? (highlighted + 1) % options.length : -1);
          }
          else if (event.key === 'ArrowUp') {
            event.preventDefault();
            highlight(options.length ? (highlighted - 1 + options.length) % options.length : -1);
          }
          else if (event.key === 'Enter') {
            if (highlighted > -1 && options[highlighted]) {
              event.preventDefault();
              window.location.assign(options[highlighted].href);
            }
            else {
              close();
            }
          }
          else if (event.key === 'Escape') {
            close();
            input.blur();
          }
        });

        form.addEventListener('submit', close);

        document.addEventListener('click', (event) => {
          if (!form.contains(event.target)) {
            close();
          }
        });
      });
    },
  };
})(Drupal, once);
