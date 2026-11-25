/**
 * ChatGPT Style for Gemini — Popup Controller
 * Persists preferences in `chrome.storage.local` and broadcasts live updates
 * immediately to the active Gemini tab.
 */

(() => {
  'use strict';

  const STORAGE_KEY = 'cgfSettings';

  const DEFAULT_SETTINGS = {
    enabled: true,
    fontPreset: 'chatgpt',
    fontSize: 16,
    lineHeight: 1.68,
    polishIntensity: 'balanced'
  };

  let state = { ...DEFAULT_SETTINGS };
  let resetFeedbackTimer = 0;

  // DOM References
  const toggleEnabled = document.getElementById('toggle-enabled');
  const controlsStack = document.getElementById('controls-stack');
  const statusBar = document.getElementById('status-bar');
  const statusText = document.getElementById('status-text');
  const presetRadios = Array.from(document.querySelectorAll('input[name="fontPreset"]'));
  const sliderFontSize = document.getElementById('slider-font-size');
  const valueFontSize = document.getElementById('value-font-size');
  const sliderLineHeight = document.getElementById('slider-line-height');
  const valueLineHeight = document.getElementById('value-line-height');
  const polishButtons = Array.from(document.querySelectorAll('.seg-btn[data-polish]'));
  const btnReset = document.getElementById('btn-reset');

  /**
   * Format numeric font size cleanly (e.g., 16 -> "16px", 15.5 -> "15.5px").
   */
  function formatFontSize(val) {
    const num = Number(val);
    return `${Number.isInteger(num) ? num : num.toFixed(1)}px`;
  }

  /**
   * Render current state onto all popup controls.
   */
  function renderUI() {
    toggleEnabled.checked = state.enabled;
    controlsStack.classList.toggle('is-disabled', !state.enabled);

    for (const radio of presetRadios) {
      radio.checked = radio.value === state.fontPreset;
    }

    sliderFontSize.value = String(state.fontSize);
    valueFontSize.textContent = formatFontSize(state.fontSize);

    sliderLineHeight.value = String(state.lineHeight);
    valueLineHeight.textContent = Number(state.lineHeight).toFixed(2);

    for (const btn of polishButtons) {
      const active = btn.dataset.polish === state.polishIntensity;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    updateStatusBanner();
  }

  /**
   * Inspect active tab and display whether Gemini is currently active.
   */
  function updateStatusBanner() {
    if (!chrome.tabs || !chrome.tabs.query) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs || !tabs[0]) {
        statusBar.dataset.state = 'idle';
        statusText.textContent = 'Ready for gemini.google.com';
        return;
      }

      const url = tabs[0].url || '';
      const isGemini = url.startsWith('https://gemini.google.com/');

      if (!isGemini) {
        statusBar.dataset.state = 'idle';
        statusText.textContent = 'Open gemini.google.com to preview live';
        return;
      }

      if (!state.enabled) {
        statusBar.dataset.state = 'paused';
        statusText.textContent = 'Paused on Gemini';
        return;
      }

      statusBar.dataset.state = 'active';
      statusText.textContent = 'Active on Gemini · Live sync';
    });
  }

  /**
   * Persist state to `chrome.storage.local` and notify the active Gemini tab
   * directly for zero-latency updates.
   */
  function saveAndBroadcast(nextPartial) {
    state = { ...state, ...nextPartial };
    renderUI();

    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: state });
    }

    if (chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError || !tabs || !tabs[0]) return;
        const tab = tabs[0];
        if (!tab.id || !(tab.url || '').startsWith('https://gemini.google.com/')) return;

        chrome.tabs.sendMessage(
          tab.id,
          { type: 'CGF_APPLY_SETTINGS', settings: state },
          () => {
            // Suppress expected error if tab hasn't finished loading content script
            void chrome.runtime.lastError;
          }
        );
      });
    }
  }

  /**
   * Attach event listeners to all interactive popup controls.
   */
  function bindEvents() {
    toggleEnabled.addEventListener('change', () => {
      saveAndBroadcast({ enabled: toggleEnabled.checked });
    });

    for (const radio of presetRadios) {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          saveAndBroadcast({ fontPreset: radio.value });
        }
      });
    }

    sliderFontSize.addEventListener('input', () => {
      const size = parseFloat(sliderFontSize.value);
      saveAndBroadcast({ fontSize: size });
    });

    sliderLineHeight.addEventListener('input', () => {
      const lh = parseFloat(sliderLineHeight.value);
      saveAndBroadcast({ lineHeight: lh });
    });

    for (const btn of polishButtons) {
      btn.addEventListener('click', () => {
        saveAndBroadcast({ polishIntensity: btn.dataset.polish });
      });
    }

    btnReset.addEventListener('click', () => {
      saveAndBroadcast({ ...DEFAULT_SETTINGS });
      btnReset.textContent = 'Defaults restored';
      btnReset.classList.add('is-done');
      window.clearTimeout(resetFeedbackTimer);
      resetFeedbackTimer = window.setTimeout(() => {
        btnReset.textContent = 'Reset to defaults';
        btnReset.classList.remove('is-done');
      }, 1300);
    });
  }

  /**
   * Load persisted settings on popup open.
   */
  function init() {
    bindEvents();

    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (!chrome.runtime.lastError && result && result[STORAGE_KEY]) {
          state = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
        }
        renderUI();
      });
    } else {
      renderUI();
    }
  }

  init();
})();
