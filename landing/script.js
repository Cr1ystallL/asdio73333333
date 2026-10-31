document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.header');
  const nav = document.querySelector('.nav');
  const burger = document.querySelector('.burger');
  const navLinks = document.querySelectorAll('.nav__link');
  const roleDialog = document.getElementById('role-dialog');
  const roleTriggers = document.querySelectorAll('[data-open-role]');
  const roleCards = document.querySelectorAll('[data-role-card]');

  // Sticky header scroll elevation
  const handleScroll = () => {
    if (header) {
      if (window.scrollY > 15) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Mobile menu toggle
  const closeMenu = () => {
    if (nav && burger && nav.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      burger.classList.remove('is-active');
      burger.setAttribute('aria-expanded', 'false');
    }
  };

  const toggleMenu = (e) => {
    e.stopPropagation();
    if (nav && burger) {
      const isOpen = nav.classList.toggle('is-open');
      burger.classList.toggle('is-active', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
    }
  };

  if (burger) {
    burger.addEventListener('click', toggleMenu);
  }

  // Close menu on click outside or Esc
  document.addEventListener('click', (e) => {
    if (nav && !nav.contains(e.target) && burger && !burger.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
    }
  });

  // Role Selection Modal (<dialog>)
  if (roleDialog) {
    roleTriggers.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        closeMenu();
        const preferredRole = btn.getAttribute('data-open-role');
        roleCards.forEach((card) => {
          const cardRole = card.getAttribute('data-role-card');
          card.classList.toggle('is-highlighted', preferredRole === cardRole);
        });
        if (!roleDialog.open) {
          roleDialog.showModal();
        }
      });
    });

    roleDialog.addEventListener('close', () => {
      roleDialog.returnValue = '';
      roleCards.forEach((card) => card.classList.remove('is-highlighted'));
    });

    // Fallback for browsers without native <dialog closedby="any"> support
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const isOutside = (e, dlg) => {
        const r = dlg.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      roleDialog.addEventListener('pointerdown', (e) => {
        if (e.target === roleDialog) {
          pressedOutside = isOutside(e, roleDialog);
        } else {
          pressedOutside = false;
        }
      });
      roleDialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && e.target === roleDialog && isOutside(e, roleDialog)) {
          roleDialog.close();
        }
        pressedOutside = false;
      });
    }
  }

  // Smooth scroll with sticky header offset for all anchor links
  const allAnchors = document.querySelectorAll('a[href^="#"]');
  allAnchors.forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        closeMenu();
        return;
      }

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const headerHeight = header ? header.offsetHeight : 70;
        const targetTop = target.getBoundingClientRect().top + window.pageYOffset - (headerHeight + 10);

        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'smooth'
        });

        if (anchor.classList.contains('nav__link')) {
          navLinks.forEach((l) => l.classList.remove('is-active'));
          anchor.classList.add('is-active');
        }

        closeMenu();
      }
    });
  });

  // Scroll spy to highlight active nav link
  const sections = [
    { id: 'hero', link: document.querySelector('.nav__link[href="#hero"]') },
    { id: 'advertisers', link: document.querySelector('.nav__link[href="#advertisers"]') },
    { id: 'clippers', link: document.querySelector('.nav__link[href="#clippers"]') },
    { id: 'how', link: document.querySelector('.nav__link[href="#how"]') },
    { id: 'contacts', link: document.querySelector('.nav__link[href="#contacts"]') }
  ].filter(item => item.link && document.getElementById(item.id));

  if ('IntersectionObserver' in window && sections.length > 0) {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const activeItem = sections.find((s) => s.id === entry.target.id);
          if (activeItem) {
            navLinks.forEach((l) => l.classList.remove('is-active'));
            activeItem.link.classList.add('is-active');
          }
        }
      });
    }, observerOptions);

    sections.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) sectionObserver.observe(el);
    });
  }
});
