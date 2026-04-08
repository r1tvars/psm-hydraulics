((Drupal, once) => {
  Drupal.behaviors.psmHydraulicsLanguageSwitcher = {
    attach(context) {
      once('psmHydraulicsLanguageSwitcher', '[data-language-switcher]', context)
        .forEach((switcher) => {
          const trigger = switcher.querySelector('[data-language-switcher-trigger]');
          const panel = switcher.querySelector('[data-language-switcher-panel]');

          if (!trigger || !panel) {
            return;
          }

          const close = () => {
            switcher.dataset.open = 'false';
            trigger.setAttribute('aria-expanded', 'false');
            panel.classList.add('hidden');
          };

          const open = () => {
            switcher.dataset.open = 'true';
            trigger.setAttribute('aria-expanded', 'true');
            panel.classList.remove('hidden');
          };

          trigger.addEventListener('click', (event) => {
            event.preventDefault();

            if (switcher.dataset.open === 'true') {
              close();
            }
            else {
              open();
            }
          });

          document.addEventListener('click', (event) => {
            if (!switcher.contains(event.target)) {
              close();
            }
          });

          document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
              close();
            }
          });
        });
    },
  };
})(Drupal, once);
