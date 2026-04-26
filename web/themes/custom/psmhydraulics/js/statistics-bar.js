((Drupal, once) => {
  const DURATION = 1800;

  const parseCounterValue = (value) => {
    const trimmed = value.trim();
    const match = trimmed.match(/^([^0-9]*)(\d+(?:[.,]\d+)?)(.*)$/);

    if (!match) {
      return null;
    }

    const [, prefix, rawNumber, suffix] = match;
    const normalizedNumber = rawNumber.replace(',', '.');
    const target = Number.parseFloat(normalizedNumber);

    if (Number.isNaN(target)) {
      return null;
    }

    const decimalPart = normalizedNumber.split('.')[1] || '';

    return {
      prefix,
      suffix,
      target,
      decimals: decimalPart.length,
    };
  };

  const formatCounterValue = ({ prefix, suffix, decimals }, value) => {
    const formatted = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
    return `${prefix}${formatted}${suffix}`;
  };

  const animateCounter = (element) => {
    const targetValue = element.dataset.statisticsCounterTarget || element.textContent || '';
    const parsedValue = parseCounterValue(targetValue);

    if (!parsedValue) {
      return;
    }

    const startTime = performance.now();

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      const currentValue = parsedValue.target * easedProgress;

      element.textContent = formatCounterValue(parsedValue, currentValue);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
      else {
        element.textContent = targetValue;
      }
    };

    requestAnimationFrame(step);
  };

  Drupal.behaviors.psmHydraulicsStatisticsBar = {
    attach(context) {
      const counters = once('psmHydraulicsStatisticsBar', '[data-statistics-counter]', context);

      if (!counters.length) {
        return;
      }

      if (typeof window.IntersectionObserver !== 'function') {
        counters.forEach((counter) => {
          animateCounter(counter);
        });
        return;
      }

      const observer = new window.IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            animateCounter(entry.target);
            observer.unobserve(entry.target);
          });
        },
        {
          threshold: 0.35,
        },
      );

      counters.forEach((counter) => {
        observer.observe(counter);
      });
    },
  };
})(Drupal, once);
