((Drupal, once) => {
  /**
   * Horizontal history branch.
   *
   * Nothing here knows how many milestones exist or where any of them sits:
   * counts, offsets, the trunk fill and the progress rail are all measured
   * from the DOM, so adding a milestone in the editor needs no code change.
   */
  Drupal.behaviors.psmHydraulicsHistoryBranch = {
    attach(context) {
      once('psmHydraulicsHistoryBranch', '.history', context).forEach((root) => {
        const scroller = root.querySelector('[data-hb-scroller]');
        const items = [...root.querySelectorAll('.history-item')];
        if (!scroller || !items.length) {
          return;
        }

        const fill = root.querySelector('[data-hb-fill]');
        const yearEl = root.querySelector('[data-hb-year]');
        const eraEl = root.querySelector('[data-hb-era]');
        const idxEl = root.querySelector('[data-hb-idx]');
        const totalEl = root.querySelector('[data-hb-total]');
        const progress = root.querySelector('[data-hb-progress]');
        const prevBtn = root.querySelector('[data-hb="prev"]');
        const nextBtn = root.querySelector('[data-hb="next"]');
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let step = -1;
        let steering = null;

        totalEl.textContent = items.length;

        const centreOf = (el) => el.offsetLeft + el.offsetWidth / 2;
        // One anchor for both reading and moving, so they can never disagree.
        const refX = () => scroller.clientWidth / 2;

        const paint = (n) => {
          const next = Math.max(0, Math.min(n, items.length - 1));
          // sync() runs on every animation frame while the strip scrolls.
          // Rewriting the year, the era and the trunk width each time meant
          // ~18 DOM writes per milestone and a fill transition that restarted
          // before it could finish — the lag that was visible on screen.
          if (next === step) {
            return;
          }
          step = next;
          items.forEach((el, i) => {
            el.classList.toggle('is-on', i <= step);
            el.classList.toggle('is-live', i === step);
          });
          const active = items[step];
          yearEl.textContent = active.dataset.year || '';
          eraEl.textContent = active.dataset.era || '';
          idxEl.textContent = step + 1;
          fill.style.width = `${centreOf(active)}px`;
          prevBtn.disabled = step === 0;
          nextBtn.disabled = step === items.length - 1;
        };

        const nearest = () => {
          let best = 0;
          let bestDist = Infinity;
          items.forEach((el, i) => {
            const dist = Math.abs(centreOf(el) - scroller.scrollLeft - refX());
            if (dist < bestDist) {
              bestDist = dist;
              best = i;
            }
          });
          return best;
        };

        const goTo = (n) => {
          const next = Math.max(0, Math.min(n, items.length - 1));
          paint(next);
          // Hold the readout on the destination until the scroll lands,
          // otherwise sync() reports every milestone passed on the way and
          // the year jumps backwards before catching up.
          window.clearTimeout(steering);
          steering = window.setTimeout(() => { steering = null; }, 700);
          scroller.scrollTo({
            left: centreOf(items[next]) - refX(),
            behavior: reduce ? 'auto' : 'smooth',
          });
        };

        // Any hands-on gesture takes the readout back immediately.
        const releaseSteering = () => {
          window.clearTimeout(steering);
          steering = null;
        };

        let queued = false;
        const sync = () => {
          if (queued) {
            return;
          }
          queued = true;
          requestAnimationFrame(() => {
            queued = false;
            if (steering === null) {
              paint(nearest());
            }
            const span = scroller.scrollWidth - scroller.clientWidth;
            progress.style.width = `${span > 0 ? (scroller.scrollLeft / span) * 100 : 100}%`;
            progress.style.transition = 'none';
          });
        };

        scroller.addEventListener('scroll', sync, { passive: true });
        window.addEventListener('resize', sync);
        prevBtn.addEventListener('click', () => goTo(step - 1));
        nextBtn.addEventListener('click', () => goTo(step + 1));
        scroller.addEventListener('keydown', (event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            goTo(step + 1);
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goTo(step - 1);
          }
        });

        // Drag to pull the branch along. Snapping is suspended mid-drag so
        // the strip follows the pointer instead of fighting it.
        let dragging = false;
        let startX = 0;
        let startLeft = 0;
        let moved = 0;

        scroller.addEventListener('pointerdown', (event) => {
          if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
          }
          releaseSteering();
          dragging = true;
          moved = 0;
          startX = event.clientX;
          startLeft = scroller.scrollLeft;
          scroller.classList.add('is-dragging');
        });

        scroller.addEventListener('pointermove', (event) => {
          if (!dragging) {
            return;
          }
          const dx = event.clientX - startX;
          moved = Math.max(moved, Math.abs(dx));
          if (moved > 4) {
            scroller.setPointerCapture(event.pointerId);
          }
          scroller.scrollLeft = startLeft - dx;
        });

        const endDrag = () => {
          if (!dragging) {
            return;
          }
          dragging = false;
          scroller.classList.remove('is-dragging');
          if (moved > 4) {
            goTo(nearest());
          }
        };

        scroller.addEventListener('pointerup', endDrag);
        scroller.addEventListener('pointercancel', endDrag);
        scroller.addEventListener('dragstart', (event) => event.preventDefault());

        paint(0);
        sync();
      });
    },
  };
})(Drupal, once);
