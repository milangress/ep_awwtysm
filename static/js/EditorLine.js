'use strict';

const {signal, computed, effect} = require('@preact/signals-core');

class EditorLine {
  constructor(domNode, lineNumber, text) {
    this.domNode = domNode;
    this.$lineNumber = signal(lineNumber);
    this.$text = signal(text);
    this.$result = signal(null);
    this.$isProcessed = signal(false);
    this.$position = signal(this.calculatePosition());
    this.$resultElement = signal(this.createLineResultElement());
    this.$isDirty = signal(false);

    // Computed values
    this.$isEmpty = computed(() => !this.$text.value && this.$text.value.trim());
    this.$isVisible = signal(false);

    // Setup intersection observer for this line
    this.setupIntersectionObserver();

    effect(() => console.log('position', this.$position.value));
    effect(() => {
      if (this.$resultElement.value) {
        this.$resultElement.value.innerHTML = `→ ${this.$result.value}`;
      }
    });
    effect(() => {
      if (this.$isDirty.value) {
        this.$resultElement.value.style.backgroundColor = '#ffcccc';
      }
    });
  }

  setupIntersectionObserver() {
    const outer = parent.document.querySelector('iframe[name="ace_outer"]');
    const inner = outer.contentDocument.querySelector('iframe[name="ace_inner"]');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        this.$isVisible.value = entry.isIntersecting;

        if (entry.isIntersecting && !this.$isProcessed.value && !this.$isEmpty.value) {
          this.execute();
        }
      });
    }, {
      root: inner.contentDocument.body,
      threshold: 0.5,
    });

    observer.observe(this.domNode);
  }

  calculatePosition() {
    const outer = parent.document.querySelector('iframe[name="ace_outer"]');
    const inner = outer.contentDocument.querySelector('iframe[name="ace_inner"]');
    const lineRect = this.domNode.getBoundingClientRect();
    const innerStyle = window.getComputedStyle(inner);
    const innerPaddingTop = parseInt(innerStyle.paddingTop, 10) || 0;
    const innerMarginTop = parseInt(innerStyle.marginTop, 10) || 0;

    return {
      top: lineRect.top + innerPaddingTop + innerMarginTop,
      height: lineRect.height,
    };
  }

  updatePosition() {
    console.log('updatePosition', this.$position.value, this.domNode);
    this.$position.value = this.calculatePosition();
    if (this.$resultElement.value) {
      this.$resultElement.value.style.top = `${this.$position.value.top}px`;
    }
  }

  createLineResultElement() {
    const outer = parent.document.querySelector('iframe[name="ace_outer"]');
    const outerDoc = outer.contentDocument;
    const overlay = outerDoc.getElementById('ep_awwtysm_overlay');

    const resultSpan = outerDoc.createElement('span');
    resultSpan.className = 'line-result';

    resultSpan.style.cssText = `
      position: absolute;
      right: 20px;
      color: #888;
      font-style: italic;
      top: ${this.$position.value.top}px;
    `;

    overlay.appendChild(resultSpan);
    return resultSpan;
  }

  execute() {
    console.log('Executing line:', this.$text.value);
    const success = Math.random() > 0.5; // Mock execution
    this.pulse(success);
    this.$result.value = this.$text.value; // Mock result
    this.$isProcessed.value = true;
    return this.$result.value;
  }

  pulse(success) {
    const outer = parent.document.querySelector('iframe[name="ace_outer"]');
    const outerDoc = outer.contentDocument;
    const overlay = outerDoc.getElementById('ep_awwtysm_overlay');
    const pulseOverlay = outerDoc.createElement('div');
    pulseOverlay.className = 'line-pulse';

    const position = this.$position.value;
    pulseOverlay.style.cssText = `
      position: absolute;
      width: 100vw;
      right: 0;
      background-color: ${success ? '#4CAF50' : '#f44336'};
      opacity: 0;
      pointer-events: none;
      z-index: 999;
      height: ${position.height}px;
      top: ${position.top}px;
    `;

    overlay.appendChild(pulseOverlay);
    requestAnimationFrame(() => {
      pulseOverlay.animate([
        {opacity: 0.2},
        {opacity: 0},
      ], {
        duration: 1000,
        easing: 'ease-out',
      }).onfinish = () => pulseOverlay.remove();
    });
  }

  cleanup() {
    if (this.$resultElement.value) {
      this.$resultElement.value.remove();
    }
  }

  destroy() {
    this.cleanup();
    this.domNode.remove();
  }
  get lineNumber() {
    return this.$lineNumber.value;
  }
}


module.exports = EditorLine;
