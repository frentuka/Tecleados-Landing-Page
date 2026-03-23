/**
 * Tecleados View Engine
 * Single-page transformation system — no scrolling, only view transitions.
 * Supports rapid navigation (no transition lock).
 */

const TRANSITION_DURATION = 300;
const WHEEL_DEBOUNCE = 900;
const SWIPE_THRESHOLD = 50;

class ViewEngine {
  private views: HTMLElement[];
  private navKeys: HTMLElement[];
  private currentIndex = 0;
  private pendingCleanup: ReturnType<typeof setTimeout> | null = null;
  private pendingFromView: HTMLElement | null = null;
  private entranceTimers: ReturnType<typeof setTimeout>[] = [];
  private lastWheelTime = 0;
  private touchStartY = 0;
  private touchStartX = 0;
  private reducedMotion: boolean;

  constructor() {
    this.views = Array.from(document.querySelectorAll<HTMLElement>('.view'));
    this.navKeys = Array.from(document.querySelectorAll<HTMLElement>('[data-view-index]'));
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Determine initial view from URL hash
    const hash = window.location.hash.slice(1);
    const hashIndex = this.views.findIndex(v => v.id === hash);
    this.currentIndex = hashIndex >= 0 ? hashIndex : 0;

    // Set initial state
    this.views.forEach(view => {
      view.classList.remove('view--active', 'view--exiting');
      view.classList.add('view--hidden');
    });
    const activeView = this.views[this.currentIndex];
    activeView.classList.remove('view--hidden');
    activeView.classList.add('view--active');
    this.updateNav();

    const t = setTimeout(() => this.animateEntrance(activeView), 150);
    this.entranceTimers.push(t);

    this.bindEvents();
  }

  private bindEvents() {
    // Nav key clicks
    this.navKeys.forEach(key => {
      key.addEventListener('click', () => {
        const index = parseInt(key.dataset.viewIndex || '0', 10);
        this.navigateTo(index);
      });
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          this.next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.prev();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.views[this.currentIndex].dispatchEvent(
            new CustomEvent('view:internal-prev', { bubbles: false })
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.views[this.currentIndex].dispatchEvent(
            new CustomEvent('view:internal-next', { bubbles: false })
          );
          break;
        default: {
          const num = parseInt(e.key, 10);
          if (num >= 1 && num <= this.views.length) {
            this.navigateTo(num - 1);
          }
        }
      }
    });

    // Wheel navigation (debounced)
    document.addEventListener('wheel', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-scroll-container]')) return;
      const now = Date.now();
      if (now - this.lastWheelTime < WHEEL_DEBOUNCE) return;
      if (Math.abs(e.deltaY) < 30) return;
      this.lastWheelTime = now;
      if (e.deltaY > 0) this.next();
      else this.prev();
    }, { passive: true });

    // Touch swipe
    document.addEventListener('touchstart', (e) => {
      this.touchStartY = e.touches[0].clientY;
      this.touchStartX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const dy = this.touchStartY - e.changedTouches[0].clientY;
      const dx = this.touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(dy) > SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx) * 1.5) {
        if (dy > 0) this.next();
        else this.prev();
      }
    }, { passive: true });

    // Hash change
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1);
      const index = this.views.findIndex(v => v.id === hash);
      if (index >= 0 && index !== this.currentIndex) {
        this.navigateTo(index);
      }
    });
  }

  navigateTo(index: number) {
    if (index === this.currentIndex) return;
    if (index < 0 || index >= this.views.length) return;

    // Finalize any pending transition immediately
    if (this.pendingCleanup !== null) {
      clearTimeout(this.pendingCleanup);
      this.finalizePending();
    }

    // Cancel any ongoing entrance animations
    this.entranceTimers.forEach(t => clearTimeout(t));
    this.entranceTimers = [];

    const duration = this.reducedMotion ? 10 : TRANSITION_DURATION;
    const fromView = this.views[this.currentIndex];
    const toView = this.views[index];

    // Reset entrance elements on target before showing
    this.resetEntrance(toView);

    // Exit current view
    fromView.classList.remove('view--active');
    fromView.classList.add('view--exiting');
    this.resetEntrance(fromView);

    // Enter new view
    toView.classList.remove('view--hidden');
    void toView.offsetHeight;
    toView.classList.add('view--active');

    // Update state
    this.currentIndex = index;
    this.updateNav();
    history.replaceState(null, '', `#${toView.id}`);

    // Start entrance animation simultaneously with view fade-in
    this.animateEntrance(toView);

    // Schedule cleanup of the exited view
    this.pendingFromView = fromView;
    this.pendingCleanup = setTimeout(() => {
      this.finalizePending();
    }, duration);
  }

  private finalizePending() {
    if (this.pendingFromView) {
      this.pendingFromView.classList.remove('view--exiting');
      this.pendingFromView.classList.add('view--hidden');
      this.pendingFromView = null;
    }
    this.pendingCleanup = null;
  }

  next() {
    if (this.currentIndex < this.views.length - 1) {
      this.navigateTo(this.currentIndex + 1);
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.navigateTo(this.currentIndex - 1);
    }
  }

  private updateNav() {
    this.navKeys.forEach((key, i) => {
      const isActive = i === this.currentIndex;
      key.classList.toggle('nav-key--active', isActive);
      key.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  private resetEntrance(view: HTMLElement) {
    view.querySelectorAll<HTMLElement>('[data-enter]').forEach(el => {
      el.classList.remove('enter-active');
      el.style.transition = '';
      el.style.opacity = '';
      el.style.transform = '';
      el.style.animation = '';
      el.style.filter = '';
      el.style.clipPath = '';
      el.style.animationDelay = '';
    });
  }

  private animateEntrance(view: HTMLElement) {
    if (this.reducedMotion) {
      view.querySelectorAll<HTMLElement>('[data-enter]').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.animation = 'none';
        el.style.filter = 'none';
        el.style.clipPath = 'none';
      });
      return;
    }

    const elements = view.querySelectorAll<HTMLElement>('[data-enter]');
    elements.forEach((el, i) => {
      const timer = setTimeout(() => {
        const animName = el.dataset.anim;
        const duration = el.dataset.animDuration || '0.6s';
        if (animName) {
          // Element has a specific named animation — apply inline
          el.style.animation = `${animName} ${duration} ease both`;
        } else {
          // Fall back to per-view CSS class animation
          el.classList.add('enter-active');
        }
      }, 80 + i * 60);
      this.entranceTimers.push(timer);
    });
  }
}

function initDevMode() {
  document.querySelectorAll('[data-dev-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.documentElement.toggleAttribute('data-dev-mode');
    });
  });
}

function initThemeToggle() {
  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tecleados-theme', next);
  });
}

export function initViewEngine() {
  new ViewEngine();
  initDevMode();
  initThemeToggle();
}
