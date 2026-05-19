((Drupal, once) => {
  Drupal.behaviors.psmHydraulicsSplide = {
    attach(context) {
      once('psmHydraulicsSplide', '.splide', context).forEach((element) => {
        if (typeof window.Splide !== 'function') {
          return;
        }

        const desktopMediaQuery = window.matchMedia('(min-width: 768px)');

        const syncCarouselHeight = () => {
          // On mobile the CSS svh fallback handles height — no JS needed.
          // Removing the property lets CSS take control immediately, avoiding
          // jank from rapid resize events (address bar show/hide on mobile).
          if (!desktopMediaQuery.matches) {
            element.style.removeProperty('--carousel-height');
            return;
          }

          // On desktop, fill the visible viewport below the carousel's top edge.
          const viewportHeight = window.innerHeight;
          const topOffset = Math.max(element.getBoundingClientRect().top, 0);
          const availableHeight = Math.max(viewportHeight - topOffset, 520);

          element.style.setProperty(
            '--carousel-height',
            `${Math.round(availableHeight)}px`,
          );
        };

        const options = element.dataset.splide
          ? JSON.parse(element.dataset.splide)
          : {};
        const interval = Number(options.interval) || 10000;
        let animationFrameId = null;
        let progressStartedAt = 0;
        let elapsedBeforePause = 0;
        let isPaused = false;

        // Defer the first sync so the DOM layout (header, etc.) is fully painted.
        requestAnimationFrame(syncCarouselHeight);
        window.addEventListener('resize', syncCarouselHeight);

        const splide = new window.Splide(element, options);
        splide.mount();

        const getPaginationPages = () =>
          Array.from(
            element.querySelectorAll('.splide__pagination__page'),
          );

        const resetProgress = () => {
          getPaginationPages().forEach((page) => {
            page.style.setProperty('--carousel-progress', '0');
          });
        };

        const updateProgress = () => {
          const activePage = element.querySelector(
            '.splide__pagination__page.is-active',
          );

          if (!activePage) {
            return;
          }

          const elapsed = elapsedBeforePause + (Date.now() - progressStartedAt);
          const progress = Math.min(elapsed / interval, 1);
          activePage.style.setProperty('--carousel-progress', String(progress));

          if (progress >= 1) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            elapsedBeforePause = 0;
            resetProgress();
            splide.go('>');
            return;
          }

          animationFrameId = requestAnimationFrame(updateProgress);
        };

        const startProgress = (elapsed = 0) => {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
          elapsedBeforePause = elapsed;
          progressStartedAt = Date.now();
          updateProgress();
        };

        const pauseProgress = () => {
          if (!desktopMediaQuery.matches || isPaused) {
            return;
          }

          isPaused = true;
          elapsedBeforePause = Math.min(
            elapsedBeforePause + (Date.now() - progressStartedAt),
            interval,
          );
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        };

        const resumeProgress = () => {
          if (!isPaused) {
            return;
          }

          isPaused = false;
          startProgress(elapsedBeforePause);
        };

        splide.on('move', (newIndex, prevIndex) => {
          if (newIndex === prevIndex) return;
          isPaused = false;
          elapsedBeforePause = 0;
          resetProgress();
          startProgress();
        });

        splide.on('drag', () => {
          pauseProgress();
        });

        splide.on('dragged', () => {
          resumeProgress();
        });

        element
          .querySelectorAll('[data-carousel-pause-trigger] a')
          .forEach((link) => {
            link.addEventListener('mouseenter', () => {
              pauseProgress();
            });

            link.addEventListener('mouseleave', () => {
              resumeProgress();
            });
          });

        const handleViewportModeChange = () => {
          // Sync or clear height whenever the breakpoint crosses 768px.
          syncCarouselHeight();
          if (!desktopMediaQuery.matches && isPaused) {
            resumeProgress();
          }
        };

        if (typeof desktopMediaQuery.addEventListener === 'function') {
          desktopMediaQuery.addEventListener('change', handleViewportModeChange);
        } else if (typeof desktopMediaQuery.addListener === 'function') {
          desktopMediaQuery.addListener(handleViewportModeChange);
        }

        resetProgress();
        startProgress();
      });
    },
  };
})(Drupal, once);
