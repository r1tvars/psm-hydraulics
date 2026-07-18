((Drupal, once) => {
  Drupal.behaviors.psmHydraulicsNav = {
    attach(context) {
      // Sticky header shadow once the page is scrolled.
      once('psmHydraulicsHeaderShadow', '[data-site-header]', context).forEach((header) => {
        const onScroll = () => {
          header.classList.toggle('is-scrolled', window.scrollY > 12);
        };

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
      });

      // Mobile drawer open/close.
      once('psmHydraulicsNav', '[data-nav-toggle]', context).forEach((toggle) => {
        const header = toggle.closest('.site-header');
        const drawer = header && header.querySelector('.nav-drawer');
        const backdrop = header && header.querySelector('[data-nav-backdrop]');
        const closeBtn = drawer && drawer.querySelector('[data-nav-close]');

        if (!header || !drawer) {
          return;
        }

        const open = () => {
          header.dataset.navOpen = 'true';
          toggle.setAttribute('aria-expanded', 'true');
          drawer.setAttribute('aria-hidden', 'false');
          document.body.style.overflow = 'hidden';
        };

        const close = () => {
          header.dataset.navOpen = 'false';
          toggle.setAttribute('aria-expanded', 'false');
          drawer.setAttribute('aria-hidden', 'true');
          document.body.style.overflow = '';
        };

        toggle.addEventListener('click', open);

        if (backdrop) {
          backdrop.addEventListener('click', close);
        }

        if (closeBtn) {
          closeBtn.addEventListener('click', close);
        }

        drawer.querySelectorAll('a[href]').forEach((link) => {
          link.addEventListener('click', close);
        });

        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape' && header.dataset.navOpen === 'true') {
            close();
          }
        });
      });

      // Nested menu accordions inside the drawer. The buttons are hidden on
      // desktop where the mega menu opens on hover instead.
      once('psmHydraulicsMenuAccordion', '[data-menu-toggle]', context).forEach((toggle) => {
        toggle.addEventListener('click', (event) => {
          event.preventDefault();

          const head = toggle.closest('.nav-menu__row, .mega__col-head');
          const panel = head && head.nextElementSibling;

          if (!panel || !panel.hasAttribute('data-menu-panel')) {
            return;
          }

          const isOpen = toggle.getAttribute('aria-expanded') === 'true';
          toggle.setAttribute('aria-expanded', String(!isOpen));
          panel.classList.toggle('is-open', !isOpen);
        });
      });
    },
  };
})(Drupal, once);
