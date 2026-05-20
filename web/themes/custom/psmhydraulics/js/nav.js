((Drupal, once) => {
  Drupal.behaviors.psmHydraulicsNav = {
    attach(context) {
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

        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape' && header.dataset.navOpen === 'true') {
            close();
          }
        });
      });
    },
  };
})(Drupal, once);
