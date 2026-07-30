/**
 * @file
 * Product detail gallery: main Splide slider synced to a thumbnail slider.
 * The hero carousel is handled separately by splide-init.js (data-splide).
 */
(function (Drupal, once) {
  'use strict';

  Drupal.behaviors.psmProductGallery = {
    attach(context) {
      once('psm-product-gallery', '[data-product-gallery]', context).forEach((main) => {
        if (typeof window.Splide !== 'function') {
          return;
        }

        const wrap = main.closest('[data-product-gallery-wrap]') || document;
        const thumbsEl = wrap.querySelector('[data-product-gallery-thumbs]');
        const slideCount = main.querySelectorAll('.splide__slide').length;

        const mainSplide = new Splide(main, {
          type: 'fade',
          rewind: true,
          speed: 250,
          pagination: false,
          arrows: slideCount > 1,
          drag: slideCount > 1,
        });

        if (thumbsEl) {
          const thumbs = new Splide(thumbsEl, {
            isNavigation: true,
            rewind: true,
            gap: 10,
            fixedWidth: 84,
            fixedHeight: 64,
            pagination: false,
            arrows: false,
          });
          mainSplide.sync(thumbs);
          mainSplide.mount();
          thumbs.mount();
        }
        else {
          mainSplide.mount();
        }
      });
    },
  };
})(Drupal, once);
