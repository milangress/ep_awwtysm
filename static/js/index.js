'use strict';

const processedLines = new WeakSet(); // Track which lines we've already processed
// WeakMap to store line -> result element mappings
const lineResults = new WeakMap();

exports.aceEditorCSS = (hookName, cb) => ['/ep_awwtysm/static/css/awwtysm.css'];


// const range = (start, end) => Array.from(
//     Array(Math.abs(end - start) + 1),
//     (_, i) => start + i
// );


// Helper function to get accurate line position
const getLinePosition = (node) => {
  // Get all required elements
  const outer = parent.document.querySelector('iframe[name="ace_outer"]');
  const inner = outer.contentDocument.querySelector('iframe[name="ace_inner"]');

  // Get the line's position relative to inner iframe
  const lineRect = node.getBoundingClientRect();

  // Get inner iframe's padding/margin
  const innerStyle = window.getComputedStyle(inner);
  const innerPaddingTop = parseInt(innerStyle.paddingTop, 10) || 0;
  const innerMarginTop = parseInt(innerStyle.marginTop, 10) || 0;

  // Calculate top position adding the inner iframe's padding/margin
  return {
    top: lineRect.top + innerPaddingTop + innerMarginTop,
    height: lineRect.height,
  };
};

// Bind the event handler to the toolbar buttons
exports.postAceInit = (hookName, context) => {
  console.log('postAceInit', context);


  const outer = parent.document.querySelector('iframe[name="ace_outer"]');
  const outerDoc = outer.contentDocument;

  // Create overlay container if it doesn't exist
  if (!outerDoc.getElementById('ep_awwtysm_overlay')) {
    const overlay = outerDoc.createElement('div');
    overlay.id = 'ep_awwtysm_overlay';
    overlay.style.cssText = `
      position: relative;
      width: 30%;
      pointer-events: none;
      font-size: 0.9em;
      z-index: 999;
    `;
    outerDoc.body.appendChild(overlay);
  }


  return;
};

const attachResultToLine = (line, result) => {
  const node = line.domInfo.node;
  const outer = parent.document.querySelector('iframe[name="ace_outer"]');
  const outerDoc = outer.contentDocument;
  const overlay = outerDoc.getElementById('ep_awwtysm_overlay');

  // Remove any existing result
  const existingResult = lineResults.get(node);
  if (existingResult && existingResult.parentNode) {
    existingResult.remove();
  }

  const resultSpan = outerDoc.createElement('span');
  resultSpan.className = 'line-result';
  resultSpan.textContent = `→ ${result}`;

  const position = getLinePosition(node);

  resultSpan.style.cssText = `
    position: absolute;
    right: 20px;
    color: #888;
    font-style: italic;
    top: ${position.top}px;
  `;

  overlay.appendChild(resultSpan);

  // Store the mapping
  lineResults.set(node, resultSpan);
};

// Update positions in aceEditEvent
exports.aceEditEvent = (hook, call) => {
  // If it's not a click or a key event and the text hasn't changed then do nothing
  const cs = call.callstack;
  if (!(cs.type === 'handleClick') && !(cs.type === 'handleKeyEvent') && !(cs.docTextChanged)) {
    return false;
  }
  console.log('aceEditEvent', hook, call);

  // If it's an initial setup event then do nothing..
  if (cs.type === 'setBaseText' || cs.type === 'setup') return false;

  // Update positions of all results
  setTimeout(() => {
    const inner = parent.document.querySelector('iframe[name="ace_outer"]')
        .contentDocument.querySelector('iframe[name="ace_inner"]');

    // Get all lines that have results
    const lines = inner.contentDocument.querySelectorAll('div');
    lines.forEach((node) => {
      const resultSpan = lineResults.get(node);
      if (resultSpan) {
        const position = getLinePosition(node);
        resultSpan.style.top = `${position.top}px`;
      }
    });
  }, 0);

  return false;
};

// Clean up results when lines are removed
// FIXME: does not reliably work
exports.acePostWriteDomLineHTML = (hookName, args) => {
  console.log('acePostWriteDomLineHTML', args);
  const node = args.node;
  const resultSpan = lineResults.get(node);

  if (resultSpan && !node.isConnected) {
    resultSpan.remove();
    lineResults.delete(node);
  }
};


const pulseLine = (node, success) => {
  const outer = parent.document.querySelector('iframe[name="ace_outer"]');
  const outerDoc = outer.contentDocument;
  const overlay = outerDoc.getElementById('ep_awwtysm_overlay');

  const pulseOverlay = outerDoc.createElement('div');
  pulseOverlay.className = 'line-pulse';

  const position = getLinePosition(node);

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
    }).onfinish = () => {
      pulseOverlay.remove();
    };
  });
};

const executeLine = (line) => {
  console.log('Executing line:', line.text);
  // For now, just return the line text as the result
  // and randomly succeed/fail for testing
  const success = Math.random() > 0.5;
  pulseLine(line.domInfo.node, success);
  return line.text;
};

const executeLineAndReport = (line) => {
  const result = executeLine(line);
  attachResultToLine(line, result);
};

exports.aceKeyEvent = (hook, context) => {
  // Check if it's an enter key press with option/alt key
  if (context.evt.type === 'keydown' &&
      context.evt.keyCode === 13 && // Enter key
      context.evt.altKey) { // Option/Alt key
    // Get the current line number
    const rep = context.rep;
    const currentLine = rep.selStart[0];

    // Get the line content
    const line = rep.lines.atIndex(currentLine);

    console.log('Current line:', currentLine);
    console.log('Line content:', line.text, line);

    executeLineAndReport(line);

    // Prevent default enter behavior
    context.evt.preventDefault();
    return true;
  }
  return false;
};

// Once ace is initialized, we set ace_doInsertAlign and bind it to the context
exports.aceInitialized = (hook, context) => {
  // Passing a level >= 0 will set a alignment on the selected lines, level < 0
  // will remove it
  console.log('aceInitialized', context);

  // Add CSS to the inner iframe
  const innerDoc = context.editorInfo.ace_getDocument();
  const style = innerDoc.createElement('style');
  style.textContent = `
    .line-result {
      z-index: 1000;
      font-size: 12px;
      line-height: 16px;
    }
    
    body {
      position: relative;
    }

    .line-pulse {
      animation: pulse 1s ease-out;
    }

    @keyframes pulse {
      0% { opacity: 0.2; }
      100% { opacity: 0; }
    }
  `;
  innerDoc.head.appendChild(style);


  // Setup Intersection Observer for the inner iframe
  setTimeout(() => {
    const outer = parent.document.querySelector('iframe[name="ace_outer"]');
    const inner = outer.contentDocument.querySelector('iframe[name="ace_inner"]');

    // Create observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const lineDiv = entry.target;

          // Skip if we've already processed this line
          if (processedLines.has(lineDiv)) return;

          // Get the line object
          const lineNumber = Array.from(lineDiv.parentNode.children).indexOf(lineDiv);
          const line = context.rep.lines.atIndex(lineNumber);

          if (line && line.text.trim()) { // Only process non-empty lines
            processedLines.add(lineDiv);
            executeLineAndReport(line);
          }
        }
      });
    }, {
      root: inner.contentDocument.body,
      threshold: 0.5, // Line must be 50% visible
    });

    // Observe all existing lines
    const observeLines = () => {
      const lines = inner.contentDocument.querySelectorAll('div');
      lines.forEach((line) => observer.observe(line));
    };

    // Initial observation
    observeLines();

    // Setup mutation observer to watch for new lines
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'DIV') {
            observer.observe(node);
          }
        });
      });
    });

    mutationObserver.observe(inner.contentDocument.body, {
      childList: true,
      subtree: true,
    });
  }, 1000); //

  return;
};

exports.aceSelectionChanged = (hook, context) => {
  console.log('aceSelectionChanged', context);
  return true;
};


exports.postToolbarInit = (hookName, context) => {
  const editbar = context.toolbar; // toolbar is actually editbar - http://etherpad.org/doc/v1.5.7/#index_editbar
  editbar.registerCommand('run', () => {
    const rep = context.rep;
    const currentLine = rep.selStart[0];
    const line = rep.lines.atIndex(currentLine);
    executeLineAndReport(line);
  });
  editbar.registerCommand('run-all', () => {
    const rep = context.rep;
    rep.lines.forEach((line) => executeLineAndReport(line));
  });

  return true;
};
