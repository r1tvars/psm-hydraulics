((Drupal, once) => {
  /**
   * Section-by-section scrolling.
   *
   * Only runs when the site setting is on and the viewport is big enough;
   * the CSS handles the snapping itself, this adds the side rail, the
   * counter and the progress bar, and keeps them pointing at the section
   * that actually fills the screen.
   */
  Drupal.behaviors.psmHydraulicsChapters = {
    attach(context) {
      once('psmHydraulicsChapters', '[data-chapters]', context).forEach((wrapper) => {
        const chapters = [...wrapper.children].filter((el) => el.nodeType === 1);
        if (chapters.length < 2) {
          return;
        }

        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const active = () => window.matchMedia('(min-width: 900px) and (min-height: 620px)').matches && !reduce;
        const headerHeight = () => {
          const header = document.querySelector('.site-header');
          return header ? header.offsetHeight : 0;
        };

        chapters.forEach((el, i) => {
          el.classList.add('chapter');
          if (!el.id) {
            el.id = `chapter-${i + 1}`;
          }
        });

        // The rail label comes from the section's own heading, so a section
        // type that never declared one still gets a sensible entry.
        const labelOf = (el, i) => {
          const source = el.dataset.chapterLabel
            || (el.querySelector('.eyebrow') || {}).textContent
            || (el.querySelector('h2, h1') || {}).textContent
            || `${i + 1}`;
          const label = source.trim().replace(/\s+/g, ' ');
          return label.length > 20 ? `${label.slice(0, 19).trimEnd()}\u2026` : label;
        };

        const rail = document.createElement('nav');
        rail.className = 'chapter-rail';
        rail.setAttribute('aria-label', Drupal.t('Sections'));
        const buttons = chapters.map((el, i) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'chapter-rail__item';
          button.dataset.go = el.id;
          button.innerHTML = '<span class="chapter-rail__label"></span><span class="chapter-rail__tick"></span>';
          button.querySelector('.chapter-rail__label').textContent = labelOf(el, i);
          button.addEventListener('click', () => {
            document.getElementById(el.id).scrollIntoView({
              behavior: reduce ? 'auto' : 'smooth',
              block: 'start',
            });
          });
          rail.append(button);
          return button;
        });

        const hud = document.createElement('div');
        hud.className = 'chapter-hud';
        hud.innerHTML = '<b data-chapter-index>01</b> / ' + String(chapters.length).padStart(2, '0');
        const hudIndex = hud.querySelector('[data-chapter-index]');

        const progress = document.createElement('div');
        progress.className = 'chapter-progress';

        document.body.append(rail, hud, progress);

        /**
         * The section with the most pixels on screen wins.
         *
         * An IntersectionObserver applied every entry it was handed, so on a
         * fast scroll both the outgoing and incoming section fired and
         * whichever came last in the array won — leaving the rail a section
         * ahead scrolling down and a section behind scrolling up. Measuring
         * visible area is unambiguous.
         */
        const dominant = () => {
          const top = headerHeight();
          let best = 0;
          let bestArea = -1;
          chapters.forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            const visible = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, top));
            if (visible > bestArea) {
              bestArea = visible;
              best = i;
            }
          });
          return best;
        };

        let current = -1;
        let pending = false;
        const sync = () => {
          if (pending) {
            return;
          }
          pending = true;
          requestAnimationFrame(() => {
            pending = false;
            document.documentElement.style.setProperty('--hdr', `${headerHeight()}px`);
            const utility = document.querySelector('.topbar');
            document.documentElement.style.setProperty('--topbar', `${utility ? utility.offsetHeight : 0}px`);
            const max = document.documentElement.scrollHeight - window.innerHeight;
            progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
            document.body.classList.toggle('has-scrolled', window.scrollY > 24);

            const i = dominant();
            if (i === current) {
              return;
            }
            current = i;
            hudIndex.textContent = String(i + 1).padStart(2, '0');
            buttons.forEach((b, n) => b.setAttribute('aria-current', String(n === i)));
            rail.classList.toggle('chapter-rail--on-light', chapters[i].matches('.history, .team, .segments-block, .partner-logos'));
          });
        };

        const applyMode = () => {
          document.documentElement.classList.toggle('chapters-on', active());
          sync();
        };

        window.addEventListener('scroll', sync, { passive: true });
        window.addEventListener('resize', applyMode);
        applyMode();
      });
    },
  };
})(Drupal, once);
