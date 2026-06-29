// script.js — OpenBalancer interactive enhancements
// IIFE pattern for encapsulation
(function () {
  'use strict';

  // ── 1. Theme Toggle ──────────────────────────────────────────────────────────
  const ICON_MOON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>`;

  const ICON_SUN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42
             M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>`;

  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var html = document.documentElement;
  var currentTheme;

  // Detect stored preference or system default
  try {
    currentTheme = localStorage.getItem('theme') ||
      (mq.matches ? 'dark' : 'light');
  } catch (_) {
    currentTheme = mq.matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    currentTheme = theme;
    html.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (_) {}

    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.innerHTML = theme === 'dark' ? ICON_SUN : ICON_MOON;
      btn.setAttribute(
        'aria-label',
        'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode'
      );
    });

    document.dispatchEvent(
      new CustomEvent('themechange', { detail: { theme: theme } })
    );
  }

  function toggleTheme() {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  // Apply theme before DOM paint to avoid flash
  applyTheme(currentTheme);

  // Bind buttons after DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', toggleTheme);
      btn.innerHTML = currentTheme === 'dark' ? ICON_SUN : ICON_MOON;
      btn.setAttribute(
        'aria-label',
        'Switch to ' + (currentTheme === 'dark' ? 'light' : 'dark') + ' mode'
      );
    });
  });

  // Follow OS preference changes only if user hasn't overridden
  mq.addEventListener('change', function (e) {
    try {
      if (!localStorage.getItem('theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    } catch (_) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });

  // ── 2. Animated Counters — IntersectionObserver + easeOutCubic ──────────────
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-target'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1200;
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var eased = easeOutCubic(progress);
      var current = Math.round(eased * target);
      el.textContent = current + suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target + suffix;
      }
    }

    requestAnimationFrame(step);
  }

  // ── 3. Scroll Reveal — IntersectionObserver ──────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Counters
    var counters = document.querySelectorAll('.counter[data-target]');
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) { counterObserver.observe(el); });

    // Scroll reveal
    var revealEls = document.querySelectorAll('[data-reveal]');
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

      revealEls.forEach(function (el) { revealObserver.observe(el); });
    } else {
      // Skip animation for reduced-motion users
      revealEls.forEach(function (el) { el.classList.add('revealed'); });
    }

    // ── 4. Header Scroll Shadow ────────────────────────────────────────────────
    var header = document.getElementById('site-header');
    if (header) {
      var lastScrollY = 0;
      var ticking = false;

      function updateHeader() {
        if (window.scrollY > 20) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
        lastScrollY = window.scrollY;
        ticking = false;
      }

      window.addEventListener('scroll', function () {
        if (!ticking) {
          requestAnimationFrame(updateHeader);
          ticking = true;
        }
      }, { passive: true });
    }

    // ── 5. Mobile Menu Toggle ──────────────────────────────────────────────────
    var mobileToggle = document.querySelector('[data-mobile-toggle]');
    var mobileNav = document.getElementById('mobile-nav');

    if (mobileToggle && mobileNav) {
      mobileToggle.addEventListener('click', function () {
        var isOpen = mobileNav.classList.contains('open');

        if (isOpen) {
          mobileNav.classList.remove('open');
          mobileNav.setAttribute('hidden', '');
          mobileToggle.setAttribute('aria-expanded', 'false');
          mobileToggle.setAttribute('aria-label', 'Open navigation menu');
        } else {
          mobileNav.classList.add('open');
          mobileNav.removeAttribute('hidden');
          mobileToggle.setAttribute('aria-expanded', 'true');
          mobileToggle.setAttribute('aria-label', 'Close navigation menu');
        }
      });

      // Close mobile nav when a link is clicked
      document.querySelectorAll('[data-mobile-nav-link]').forEach(function (link) {
        link.addEventListener('click', function () {
          mobileNav.classList.remove('open');
          mobileNav.setAttribute('hidden', '');
          mobileToggle.setAttribute('aria-expanded', 'false');
          mobileToggle.setAttribute('aria-label', 'Open navigation menu');
        });
      });

      // Close on Escape key
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
          mobileNav.classList.remove('open');
          mobileNav.setAttribute('hidden', '');
          mobileToggle.setAttribute('aria-expanded', 'false');
          mobileToggle.setAttribute('aria-label', 'Open navigation menu');
          mobileToggle.focus();
        }
      });
    }

    // ── 6. Smooth Scroll for anchor links ─────────────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var targetId = this.getAttribute('href').slice(1);
        if (!targetId) return;

        var target = document.getElementById(targetId);
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Move focus to the section for accessibility
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1');
        }
        target.focus({ preventScroll: true });
      });
    });

    // ── 7. Active nav link highlight on scroll ─────────────────────────────────
    var sections = document.querySelectorAll('section[id], div[id="hero"]');
    var navLinks = document.querySelectorAll('.site-nav .nav-link');

    if (sections.length && navLinks.length) {
      var sectionObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute('id');
            navLinks.forEach(function (link) {
              var href = link.getAttribute('href');
              if (href === '#' + id) {
                link.style.color = 'var(--color-primary)';
                link.style.background = 'var(--color-primary-light)';
              } else {
                link.style.color = '';
                link.style.background = '';
              }
            });
          }
        });
      }, { threshold: 0.35 });

      sections.forEach(function (section) { sectionObserver.observe(section); });
    }

    // ── 8. Architecture node hover accessibility ───────────────────────────────
    var archNodes = document.querySelectorAll('.arch-node');
    archNodes.forEach(function (node) {
      node.setAttribute('tabindex', '0');
      node.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          node.dispatchEvent(new MouseEvent('mouseenter'));
        }
      });
    });

    // ── 9. Table row keyboard navigation ──────────────────────────────────────
    var tableRows = document.querySelectorAll('.comparison-table tbody tr');
    tableRows.forEach(function (row) {
      row.setAttribute('tabindex', '0');
    });

  }); // end DOMContentLoaded

  // Expose minimal API
  window.OpenBalancer = {
    toggleTheme: toggleTheme,
    setTheme: applyTheme,
    getTheme: function () { return currentTheme; }
  };

})();
