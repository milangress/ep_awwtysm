'use strict';

const {signal, computed, effect} = require('@preact/signals-core');
const vm = require('./vm');

class EditorLine {
  constructor(domNode, lineNumber, text) {
    this.domNode = domNode;
    this.$lineNumber = signal(lineNumber);
    this.$text = signal(text);
    this.$result = signal(null);
    this.$parsedTokens = signal([]);
    this.$resultString = computed(() => {
      const tokens = this.$parsedTokens.value;
      const tokensString = tokens ? `(${tokens.join(' ')}) <br>` : '';
      return `${tokensString}${this.$result.value}`;
    });
    this.$resultTimestamp = signal(new Date().getTime());
    this.$currentTimestamp = signal(new Date().getTime());
    this.interval = null;

    this.$resultTimeAgo = computed(() => {
      const duration = this.$currentTimestamp.value - this.$resultTimestamp.value;
      const timeAgo = this.formatTimeAgo(duration);
      return timeAgo;
    });

    this.$isProcessed = signal(false);
    this.$position = signal(this.calculatePosition());
    this.$resultElement = signal(this.createLineResultElement());
    this.$isDirty = signal(false);

    // Computed values
    this.$isEmpty = computed(() => !this.$text.value && this.$text.value.trim());
    this.$isVisible = signal(false);

    // Setup intersection observer for this line
    this.setupIntersectionObserver();

    // effect(() => console.log('position', this.$position.value));

    effect(() => {
      if (this.$resultElement.value && this.$resultString.value) {
        const result = this.$resultString.value;
        this.$resultElement.value.message.innerHTML = `→ ${result}`;
        this.$resultElement.value.div.style.top = `${this.$position.value.top}px`;
      }
    });
    effect(() => {
      if (this.$resultElement.value) {
        this.$resultElement.value.timeAgo.innerHTML = this.$resultTimeAgo.value;
      }
    });
    effect(() => {
      if (this.$isDirty.value) {
        this.$resultElement.value.div.style.opacity = '0.5';
      } else {
        this.$resultElement.value.div.style.opacity = '1';
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
    if (this.$isDirty.value) return;
    // console.log('updatePosition', this.$position.value, this.domNode);
    const newPosition = this.calculatePosition();
    if (newPosition.height > 0) {
      this.$position.value = newPosition;
    } else {
      this.$isDirty.value = true;
      console.log('height is 0', this.domNode);
    }
  }

  createLineResultElement() {
    const outer = parent.document.querySelector('iframe[name="ace_outer"]');
    const outerDoc = outer.contentDocument;
    const overlay = outerDoc.getElementById('ep_awwtysm_overlay');

    const resultDiv = outerDoc.createElement('div');
    resultDiv.className = 'line-result';

    resultDiv.style.cssText = `
      position: absolute;
      right: 20px;
      color: #888;
      font-style: italic;
      text-align: right;
      top: ${this.$position.value.top}px;
    `;

    overlay.appendChild(resultDiv);

    const timeAgo = outerDoc.createElement('p');
    timeAgo.className = 'time-ago';
    timeAgo.style.cssText = `
      font-size: 0.8em;
      text-align: right;
      opacity: 0.8;
    `;
    resultDiv.appendChild(timeAgo);

    const resultSpan = outerDoc.createElement('p');
    resultSpan.className = 'result';
    resultDiv.appendChild(resultSpan);
    return {
      div: resultDiv,
      message: resultSpan,
      timeAgo,
    };
  }

  execute() {
    // console.log('Executing line:', this.$text.value);

    let result = null;
    let error = false;
    try {
      result = vm().readLine(this.$text.value);
      console.log('Result:', result);
      console.log('VM:', vm());
    } catch (e) {
      console.error('Error executing line:', e);
      error = e;
    }
    this.$parsedTokens.value = vm().parsedTokens.value;

    if (result) {
      this.$result.value = result;
    }
    this.$result.value += ` ${vm().lastStack.value}`;


    if (error) {
      this.$result.value += `\n${error}`;
    }

    this.pulse(!error);

    this.$isProcessed.value = true;

    this.$resultTimestamp.value = new Date().getTime();
    this.interval = setInterval(() => {
      this.$currentTimestamp.value = new Date().getTime();
    }, 1000);
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
      this.$resultElement.value.div.remove();
    }
  }

  destroy() {
    this.cleanup();
    this.domNode.remove();
  }
  checkIfDirty() {
    // console.log('checkIfDirty', this.domNode.id);
    const isDirty = !this.domNode.id.startsWith('magicdomid');
    this.$isDirty.value = isDirty;
    return isDirty;
  }

  get lineNumber() {
    return this.$lineNumber.value;
  }

  formatTimeAgo(ms) {
    if (ms < 1000) return 'just now';

    const rtf = new Intl.RelativeTimeFormat('en', {numeric: 'auto', style: 'narrow'});
    const seconds = Math.floor(ms / 1000);

    if (seconds < 60) {
      return rtf.format(-seconds, 'second');
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return rtf.format(-minutes, 'minute');
    }
    const hours = Math.floor(minutes / 60);
    return rtf.format(-hours, 'hour');
  }
}


module.exports = EditorLine;
