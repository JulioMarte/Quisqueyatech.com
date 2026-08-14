(() => {
  const analyticsLoader = document.createElement('script');
  analyticsLoader.src = '/umami-loader.js';
  analyticsLoader.defer = true;
  document.head.appendChild(analyticsLoader);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  if (!reduce) root.classList.add('motion-ready');

  const observeOnce = (elements, threshold = 0.18) => {
    if (reduce || !('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    }, { threshold });
    elements.forEach((el) => io.observe(el));
  };

  const sections = [...document.querySelectorAll('main > section:not(.hero-orchestration)')];
  sections.forEach((section) => {
    const head = section.querySelector('.section-head, .assessment-copy');
    if (head) head.dataset.reveal = section.classList.contains('signature-cta') ? 'mask' : 'slide';
  });

  document.querySelectorAll('.motion-reveal').forEach((el) => { el.dataset.reveal = 'slide'; });
  document.querySelectorAll('.motion-mask').forEach((el) => { el.dataset.reveal = 'mask'; });
  document.querySelectorAll('.motion-stagger').forEach((group) => {
    [...group.querySelectorAll(':scope > .motion-item')].forEach((child, index) => {
      child.dataset.staggerItem = '';
      child.style.setProperty('--stagger-x', index % 2 === 0 ? '-18px' : '18px');
      child.style.setProperty('--stagger-r', index % 2 === 0 ? '-1.5deg' : '1.5deg');
      child.style.setProperty('--stagger-delay', `${index * .11}s`);
    });
  });

  const staggerGroups = [...document.querySelectorAll('.home-grid')];
  staggerGroups.forEach((group) => {
    [...group.children].forEach((child, index) => {
      const isSolution = child.tagName === 'A';
      if (isSolution) {
        child.dataset.motionCard = '';
        child.style.setProperty('--card-x', index === 0 ? '-44px' : index === 2 ? '44px' : '0px');
        child.style.setProperty('--card-r', index === 0 ? '-2deg' : index === 2 ? '2deg' : '0deg');
        child.style.setProperty('--card-delay', `${index * .1}s`);
        if (!child.querySelector('.motion-card-glow')) child.insertAdjacentHTML('beforeend','<span class="motion-card-glow" aria-hidden="true"></span>');
      } else {
        child.dataset.staggerItem = '';
        child.style.setProperty('--stagger-x', index % 2 === 0 ? '-18px' : '18px');
        child.style.setProperty('--stagger-r', index % 2 === 0 ? '-1.5deg' : '1.5deg');
        child.style.setProperty('--stagger-delay', `${index * .11}s`);
      }
    });
  });

  const assessment = document.querySelector('.assessment-panel');
  if (assessment) [...assessment.children].forEach((el, i) => { el.dataset.reveal = 'slide'; el.style.transitionDelay = `${i * .08}s`; });
  const founder = document.querySelector('.founder');
  if (founder) [...founder.children].forEach((el, i) => { el.dataset.reveal = i === 0 ? 'scale' : 'slide'; el.style.transitionDelay = `${i * .06}s`; });
  const signature = document.querySelector('.signature-cta .container');
  if (signature) signature.dataset.reveal = 'mask';

  observeOnce([...document.querySelectorAll('[data-reveal]')], .16);
  observeOnce([...document.querySelectorAll('[data-stagger-item]')], .14);
  observeOnce([...document.querySelectorAll('[data-motion-card]')], .18);

  const cards = [...document.querySelectorAll('[data-motion-card]')];
  if (!reduce && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    cards.forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        card.style.setProperty('--tilt-x', `${(0.5 - y) * 3}deg`);
        card.style.setProperty('--tilt-y', `${(x - 0.5) * 3}deg`);
        card.style.setProperty('--spot-x', `${x * 100}%`);
        card.style.setProperty('--spot-y', `${y * 100}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--tilt-x','0deg');
        card.style.setProperty('--tilt-y','0deg');
      });
    });
  }

  const stepsGrid = document.querySelector('.steps');
  if (stepsGrid && !stepsGrid.closest('.process-flow')) {
    const flow = document.createElement('div');
    flow.className = 'process-flow';
    stepsGrid.parentNode.insertBefore(flow, stepsGrid);
    flow.appendChild(stepsGrid);
    flow.insertAdjacentHTML('afterbegin', `
      <svg class="process-flow-horizontal" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
        <path class="process-path-base" pathLength="1" d="M125 60 C230 12 270 108 375 60 S520 12 625 60 S770 108 875 60"/>
        <path class="process-path-base process-path-base-secondary" pathLength="1" d="M125 70 C230 22 270 118 375 70 S520 22 625 70 S770 118 875 70"/>
        <path class="process-path-active process-path-primary" pathLength="1" d="M125 60 C230 12 270 108 375 60 S520 12 625 60 S770 108 875 60"/>
        <path class="process-path-active process-path-secondary" pathLength="1" d="M125 70 C230 22 270 118 375 70 S520 22 625 70 S770 118 875 70"/>
      </svg>
      <svg class="process-flow-vertical" viewBox="0 0 48 1000" preserveAspectRatio="none" aria-hidden="true">
        <path class="process-path-base" pathLength="1" d="M24 30 C5 220 43 300 24 485 S5 710 24 970"/>
        <path class="process-path-base process-path-base-secondary" pathLength="1" d="M32 30 C13 220 51 300 32 485 S13 710 32 970"/>
        <path class="process-path-active process-path-primary" pathLength="1" d="M24 30 C5 220 43 300 24 485 S5 710 24 970"/>
        <path class="process-path-active process-path-secondary" pathLength="1" d="M32 30 C13 220 51 300 32 485 S13 710 32 970"/>
      </svg>`);

    const stepEls = [...stepsGrid.querySelectorAll('.step')];
    if (reduce || !('IntersectionObserver' in window)) stepEls.forEach((el) => el.classList.add('is-active'));
    else {
      const stepObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('is-active'); });
      }, { threshold: .55 });
      stepEls.forEach((el, i) => { el.style.transitionDelay = `${i * .04}s`; stepObserver.observe(el); });
    }

    if (reduce) flow.style.setProperty('--process-progress','0');
    else {
      let ticking = false;
      const update = () => {
        ticking = false;
        const rect = flow.getBoundingClientRect();
        const vh = window.innerHeight;
        const start = vh * .80;
        const end = vh * .38;
        const span = rect.height + start - end;
        const raw = (start - rect.top) / span;
        const p = Math.max(0, Math.min(1, raw));
        flow.style.setProperty('--process-progress', String(p));
        const secondary = p < .14 ? 0 : (p - .14) / .86;
        flow.style.setProperty('--process-secondary', String(Math.max(0, Math.min(1, secondary))));
        const paths = flow.querySelectorAll('.process-path-active');
        paths.forEach((path, i) => { path.style.strokeDashoffset = String(1 - (i % 2 ? secondary : p)); });
      };
      const requestUpdate = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
      addEventListener('scroll', requestUpdate, { passive:true });
      addEventListener('resize', requestUpdate, { passive:true });
      update();
    }
  }
})();
