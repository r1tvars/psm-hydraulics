((Drupal, once) => {
  // Space left below the hero so the next section peeks into view.
  const HERO_PEEK = 88;

  Drupal.behaviors.psmHydraulicsSplide = {
    attach(context) {
      // Only sliders configured via data-splide (hero carousel) — the product
      // gallery mounts its own Splide instances in product-gallery.js.
      once('psmHydraulicsSplide', '.splide[data-splide]', context).forEach((element) => {
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

          // On desktop, fill the visible viewport below the carousel's top
          // edge minus the peek, so the following section stays visible.
          const viewportHeight = window.innerHeight;
          const topOffset = Math.max(element.getBoundingClientRect().top, 0);
          const availableHeight = Math.max(
            viewportHeight - topOffset - HERO_PEEK,
            480,
          );

          element.style.setProperty(
            '--carousel-height',
            `${Math.round(availableHeight)}px`,
          );
        };

        const options = element.dataset.splide
          ? JSON.parse(element.dataset.splide)
          : {};
        const defaultInterval = Number(options.interval) || 10000;

        // Interval of the active slide: video slides run for the length of
        // their video, everything else uses the configured interval.
        let currentInterval = defaultInterval;
        let animationFrameId = null;
        let progressStartedAt = 0;
        let elapsedBeforePause = 0;
        let isPaused = false;

        // Defer the first sync so the DOM layout (header, etc.) is fully painted.
        requestAnimationFrame(syncCarouselHeight);
        window.addEventListener('resize', syncCarouselHeight);

        const splide = new window.Splide(element, options);
        splide.mount();

        const getSlides = () =>
          Array.from(element.querySelectorAll('.splide__slide'));

        const getSlideVideo = (slide) =>
          slide ? slide.querySelector('video[data-carousel-video]') : null;

        // Starts/stops slide videos around the active index and derives the
        // active slide's interval from its video duration when available.
        const syncSlideMedia = (activeIndex) => {
          currentInterval = defaultInterval;

          getSlides().forEach((slide, index) => {
            const video = getSlideVideo(slide);
            if (!video) {
              return;
            }

            if (index === activeIndex) {
              const applyDuration = () => {
                if (Number.isFinite(video.duration) && video.duration > 0) {
                  currentInterval = video.duration * 1000;
                }
              };

              applyDuration();
              if (currentInterval === defaultInterval) {
                video.addEventListener('loadedmetadata', applyDuration, {
                  once: true,
                });
              }

              try {
                video.currentTime = 0;
              } catch (e) {
                // Metadata not ready yet; the video starts from 0 anyway.
              }
              const played = video.play();
              if (played && typeof played.catch === 'function') {
                played.catch(() => {});
              }
            } else {
              video.pause();
            }
          });
        };

        const getActiveVideo = () =>
          getSlideVideo(element.querySelector('.splide__slide.is-active'));

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
          const progress = Math.min(elapsed / currentInterval, 1);
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
            currentInterval,
          );
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;

          const video = getActiveVideo();
          if (video) {
            video.pause();
          }
        };

        const resumeProgress = () => {
          if (!isPaused) {
            return;
          }

          isPaused = false;
          startProgress(elapsedBeforePause);

          const video = getActiveVideo();
          if (video && video.ended === false) {
            const played = video.play();
            if (played && typeof played.catch === 'function') {
              played.catch(() => {});
            }
          }
        };

        splide.on('move', (newIndex, prevIndex) => {
          if (newIndex === prevIndex) return;
          isPaused = false;
          elapsedBeforePause = 0;
          syncSlideMedia(newIndex);
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

        syncSlideMedia(splide.index);
        resetProgress();
        startProgress();
      });
    },
  };
})(Drupal, once);
