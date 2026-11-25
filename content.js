/**
 * ChatGPT Style for Gemini — Ultra-Lightweight Content Script
 *
 * Pure CSS-variable & attribute syncer (zero DOM renderers, zero subtree
 * MutationObservers, zero token-streaming overhead):
 *  1. Runs at `document_start` to apply `data-cgf-*` attributes & `--cgf-*` CSS
 *     variables on `document.documentElement` with zero FOUC.
 *  2. Observes only <html> and <body> attribute changes (`subtree: false`) to
 *     keep light/dark theme synced instantaneously.
 */

(() => {
  'use strict';

  const STORAGE_KEY = 'cgfSettings';

  const FONT_PRESETS = {
    chatgpt: {
      ui: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Helvetica, Arial, sans-serif',
      prose: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Helvetica, Arial, sans-serif'
    },
    inter: {
      ui: '"Inter", "Inter Variable", ui-sans-serif, -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      prose: '"Inter", "Inter Variable", ui-sans-serif, -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    },
    serif: {
      ui: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Helvetica, Arial, sans-serif',
      prose: '"Newsreader", "Source Serif 4", Georgia, Cambria, "Times New Roman", Times, serif'
    }
  };

  const MONO_STACK =
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

  const DEFAULT_SETTINGS = {
    enabled: true,
    fontPreset: 'chatgpt',
    fontSize: 16,
    lineHeight: 1.68,
    polishIntensity: 'balanced'
  };

  let currentSettings = { ...DEFAULT_SETTINGS };
  let themeObserver = null;
  let themeSyncRaf = 0;

  function normalizeSettings(raw) {
    const merged = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };
    merged.enabled = Boolean(merged.enabled);

    if (!Object.prototype.hasOwnProperty.call(FONT_PRESETS, merged.fontPreset)) {
      merged.fontPreset = DEFAULT_SETTINGS.fontPreset;
    }

    const size = Number(merged.fontSize);
    merged.fontSize = Number.isFinite(size) ? Math.min(20, Math.max(13, size)) : DEFAULT_SETTINGS.fontSize;

    const lh = Number(merged.lineHeight);
    merged.lineHeight = Number.isFinite(lh) ? Math.min(1.95, Math.max(1.45, lh)) : DEFAULT_SETTINGS.lineHeight;

    if (!['subtle', 'balanced', 'crisp'].includes(merged.polishIntensity)) {
      merged.polishIntensity = DEFAULT_SETTINGS.polishIntensity;
    }

    return merged;
  }

  function detectGeminiTheme() {
    const root = document.documentElement;
    const body = document.body;

    const candidates = [body, root].filter(Boolean);
    for (const el of candidates) {
      const cls = el.classList;
      if (cls.contains('dark-theme') || cls.contains('dark') || cls.contains('theme-dark')) {
        return 'dark';
      }
      if (cls.contains('light-theme') || cls.contains('light') || cls.contains('theme-light')) {
        return 'light';
      }

      const dataTheme =
        el.getAttribute('data-theme') ||
        el.getAttribute('data-color-scheme') ||
        el.getAttribute('theme');

      if (dataTheme) {
        const lower = dataTheme.toLowerCase();
        if (lower.includes('dark')) return 'dark';
        if (lower.includes('light')) return 'light';
      }
    }

    const surfaceEls = [
      body,
      document.querySelector('chat-app'),
      document.querySelector('bard-sidenav-container')
    ].filter(Boolean);

    for (const el of surfaceEls) {
      const bg = window.getComputedStyle(el).backgroundColor;
      const match = bg && bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
      if (match) {
        const alpha = match[4] !== undefined ? parseFloat(match[4]) : 1;
        if (alpha > 0.1) {
          const r = parseInt(match[1], 10);
          const g = parseInt(match[2], 10);
          const b = parseInt(match[3], 10);
          const luma = r * 0.299 + g * 0.587 + b * 0.114;
          return luma < 128 ? 'dark' : 'light';
        }
      }
    }

    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function syncThemeAttribute() {
    const root = document.documentElement;
    if (!root) return;
    const theme = detectGeminiTheme();
    if (root.getAttribute('data-cgf-theme') !== theme) {
      root.setAttribute('data-cgf-theme', theme);
    }
  }

  function scheduleThemeSync() {
    if (themeSyncRaf) return;
    themeSyncRaf = window.requestAnimationFrame(() => {
      themeSyncRaf = 0;
      syncThemeAttribute();
    });
  }

  function applySettings(settings) {
    currentSettings = normalizeSettings(settings);
    const root = document.documentElement;
    if (!root) return;

    root.setAttribute('data-cgf-enabled', currentSettings.enabled ? 'true' : 'false');
    root.setAttribute('data-cgf-preset', currentSettings.fontPreset);
    root.setAttribute('data-cgf-polish', currentSettings.polishIntensity);
    syncThemeAttribute();

    if (!currentSettings.enabled) {
      root.style.removeProperty('--cgf-font-ui');
      root.style.removeProperty('--cgf-font-prose');
      root.style.removeProperty('--cgf-font-mono');
      root.style.removeProperty('--cgf-font-size');
      root.style.removeProperty('--cgf-line-height');
      return;
    }

    const preset = FONT_PRESETS[currentSettings.fontPreset] || FONT_PRESETS.chatgpt;
    root.style.setProperty('--cgf-font-ui', preset.ui);
    root.style.setProperty('--cgf-font-prose', preset.prose);
    root.style.setProperty('--cgf-font-mono', MONO_STACK);
    root.style.setProperty('--cgf-font-size', `${currentSettings.fontSize}px`);
    root.style.setProperty('--cgf-line-height', String(currentSettings.lineHeight));
  }

  function attachLightweightObservers() {
    if (themeObserver) themeObserver.disconnect();

    const attrFilter = ['class', 'data-theme', 'data-color-scheme', 'theme', 'style'];
    themeObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.target === document.documentElement && m.attributeName === 'data-cgf-enabled') {
          continue;
        }
        if (
          m.target === document.documentElement &&
          !document.documentElement.hasAttribute('data-cgf-enabled')
        ) {
          applySettings(currentSettings);
          return;
        }
        scheduleThemeSync();
      }
    });

    if (document.documentElement) {
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [...attrFilter, 'data-cgf-enabled']
      });
    }

    if (document.body) {
      themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: attrFilter
      });
      syncThemeAttribute();
    } else {
      window.addEventListener(
        'DOMContentLoaded',
        () => {
          if (document.body && themeObserver) {
            themeObserver.observe(document.body, {
              attributes: true,
              attributeFilter: attrFilter
            });
          }
          syncThemeAttribute();
        },
        { once: true, passive: true }
      );
    }
  }

  function init() {
    applySettings(DEFAULT_SETTINGS);
    attachLightweightObservers();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (chrome.runtime && chrome.runtime.lastError) return;
        applySettings(result && result[STORAGE_KEY] ? result[STORAGE_KEY] : DEFAULT_SETTINGS);
      });

      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes[STORAGE_KEY]) {
          applySettings(changes[STORAGE_KEY].newValue || DEFAULT_SETTINGS);
        }
      });
    }

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (!message || typeof message !== 'object') return false;

        if (message.type === 'CGF_APPLY_SETTINGS') {
          applySettings(message.settings);
          sendResponse({ ok: true });
          return false;
        }

        if (message.type === 'CGF_PING') {
          sendResponse({ ok: true, enabled: currentSettings.enabled });
          return false;
        }

        return false;
      });
    }

    if (window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const onMediaChange = () => scheduleThemeSync();
      if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', onMediaChange, { passive: true });
      }
    }

    window.addEventListener('popstate', scheduleThemeSync, { passive: true });
  }

  init();
})();
