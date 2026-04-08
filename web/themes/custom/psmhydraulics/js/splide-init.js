((Drupal, once) => {
  Drupal.behaviors.psmHydraulicsSplide = {
    attach(context) {
      once('psmHydraulicsSplide', '.splide', context).forEach((element) => {
        if (typeof window.Splide !== 'function') {
          return;
        }

        const options = element.dataset.splide
          ? JSON.parse(element.dataset.splide)
          : {};

        const splide = new window.Splide(element, options);
        splide.mount();
      });
    },
  };
})(Drupal, once);
