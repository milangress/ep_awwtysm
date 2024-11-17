'use strict';

const {signal, effect} = require('@preact/signals-core');

const Stage = (() => {
  // Private instance variable
  let instance = null;

  // Private constants
  const idPrefix = 'awwStage';

  // Constructor function
  const createInstance = () => {
    // Signals
    const $isInitialized = signal(false);
    const $isVisible = signal(false);
    const $itemsOnStage = signal([]);
    const $stageDiv = signal(null);
    const $editorContainer = signal(null);
    const $outer = signal(null);
    const $inner = signal(null);

    // Setup promise for initialization
    let initPromise = null;

    const waitForInit = async () => {
      if ($isInitialized.value) return true;

      if (!initPromise) {
        initPromise = new Promise((resolve) => {
          effect(() => {
            if ($isInitialized.value) resolve(true);
          });
        });
      }

      return initPromise;
    };

    const setup = () => {
      $editorContainer.value = document.getElementById('editorcontainerbox');
      $outer.value = parent.document.querySelector('iframe[name="ace_outer"]');

      if ($outer.value) {
        $inner.value = $outer.value.contentDocument.querySelector('iframe[name="ace_inner"]');

        if ($inner.value) {
          const div = document.createElement('div');
          div.id = `${idPrefix}Stage`;
          $editorContainer.value.appendChild(div);
          $stageDiv.value = div;
          $isInitialized.value = true;
        }
      }

      return $isInitialized.value;
    };

    // Effects
    effect(async () => {
      if ($isVisible.value) {
        await waitForInit();
        $editorContainer.value.style.background = 'transparent';
        $inner.value.style.background = 'transparent';
        $inner.value.contentDocument.body.style.background = 'transparent';
      } else {
        await waitForInit();
        $editorContainer.value.style.background = 'white';
        $inner.value.style.background = 'white';
        $inner.value.contentDocument.body.style.background = 'white';
      }
    });

    const getById = async (id) => {
      await waitForInit();
      return $itemsOnStage.value.find((item) => item.id === `${idPrefix}-${id}`);
    };

    const addToStage = async (el, id) => {
      await waitForInit();
      if (!el.id.startsWith(idPrefix)) {
        el.id = `${idPrefix}-${id}`;
      }
      $itemsOnStage.value = [...$itemsOnStage.value, el];
      $stageDiv.value.prepend(el);
    };

    const removeFromStage = async (el) => {
      await waitForInit();
      $stageDiv.value.removeChild(el);
      $itemsOnStage.value = $itemsOnStage.value.filter((item) => item !== el);
    };

    return {
      isInitialized: () => $isInitialized.value,
      waitForInit,
      addToStage,
      removeFromStage,
      setup,
      getById,
      show: () => { $isVisible.value = true; },
      hide: () => { $isVisible.value = false; },
      toggle: () => { $isVisible.value = !$isVisible.value; return $isVisible.value; },

      hydraCanvas: async () => {
        await waitForInit();
        let canvas = await getById('HydraCanvas');

        if (!canvas) {
          canvas = document.createElement('canvas');
          await addToStage(canvas, 'HydraCanvas');
        }

        canvas.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: -5;
          pointer-events: none;
        `;

        return canvas;
      },
    };
  };

  return {
    getInstance: () => {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    },
  };
})();

module.exports = Stage;
