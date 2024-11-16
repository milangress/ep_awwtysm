'use strict';

const tags = ['left', 'center', 'justify', 'right'];

exports.aceEditorCSS = (hookName, cb) => ['/ep_awwtysm/static/css/awwtysm.css'];

const range = (start, end) => Array.from(
    Array(Math.abs(end - start) + 1),
    (_, i) => start + i
);

exports.aceRegisterBlockElements = () => tags;


// Bind the event handler to the toolbar buttons
exports.postAceInit = (hookName, context) => {
  console.log('postAceInit', context);
  $('body').on('click', '.ep_awtyysm', function () {
    const value = $(this).data('align');
    const intValue = parseInt(value, 10);
    if (!isNaN(intValue)) {
      context.ace.callWithAce((ace) => {
        ace.ace_doInsertAlign(intValue);
      }, 'insertalign', true);
    }
  });

  return;
};

// On caret position change show the current align
exports.aceEditEvent = (hook, call) => {
  // If it's not a click or a key event and the text hasn't changed then do nothing
  const cs = call.callstack;
  if (!(cs.type === 'handleClick') && !(cs.type === 'handleKeyEvent') && !(cs.docTextChanged)) {
    return false;
  }
  console.log('aceEditEvent', cs);

  // If it's an initial setup event then do nothing..
  if (cs.type === 'setBaseText' || cs.type === 'setup') return false;

  // It looks like we should check to see if this section has this attribute
  return setTimeout(() => { // avoid race condition..
    const attributeManager = call.documentAttributeManager;
    const rep = call.rep;
    const activeAttributes = {};
    // $("#align-selection").val(-2); // TODO commented this out

    const firstLine = rep.selStart[0];
    const lastLine = Math.max(firstLine, rep.selEnd[0] - ((rep.selEnd[1] === 0) ? 1 : 0));
    let totalNumberOfLines = 0;

    range(firstLine, lastLine + 1).forEach((line) => {
      totalNumberOfLines++;
      const attr = attributeManager.getAttributeOnLine(line, 'align');
      if (!activeAttributes[attr]) {
        activeAttributes[attr] = {};
        activeAttributes[attr].count = 1;
      } else {
        activeAttributes[attr].count++;
      }
    });

    $.each(activeAttributes, (k, attr) => {
      if (attr.count === totalNumberOfLines) {
        // show as active class
        // const ind = tags.indexOf(k);
        // $("#align-selection").val(ind); // TODO commnented this out
      }
    });

    return;
  }, 250);
};

// Our align attribute will result in a heaading:left.... :left class
exports.aceAttribsToClasses = (hook, context) => {
  if (context.key === 'align') {
    return [`align:${context.value}`];
  }
};

// Here we convert the class align:left into a tag
exports.aceDomLineProcessLineAttributes = (name, context) => {
  const cls = context.cls;
  const alignType = /(?:^| )align:([A-Za-z0-9]*)/.exec(cls);
  let tagIndex;
  if (alignType) tagIndex = tags.indexOf(alignType[1]);
  if (tagIndex !== undefined && tagIndex >= 0) {
    const tag = tags[tagIndex];
    const styles =
      `width:100%;margin:0 auto;list-style-position:inside;display:block;text-align:${tag}`;
    const modifier = {
      preHtml: `<${tag} style="${styles}">`,
      postHtml: `</${tag}>`,
      processedMarker: true,
    };
    return [modifier];
  }
  return [];
};


// Once ace is initialized, we set ace_doInsertAlign and bind it to the context
exports.aceInitialized = (hook, context) => {
  
  // Passing a level >= 0 will set a alignment on the selected lines, level < 0
  // will remove it
  console.log('aceInitialized', context);
  function doInsertAlign(level) {
    const rep = this.rep;
    const documentAttributeManager = this.documentAttributeManager;
    if (!(rep.selStart && rep.selEnd) || (level >= 0 && tags[level] === undefined)) {
      return;
    }

    const firstLine = rep.selStart[0];
    const lastLine = Math.max(firstLine, rep.selEnd[0] - ((rep.selEnd[1] === 0) ? 1 : 0));
    range(firstLine, lastLine).forEach((i) => {
      if (level >= 0) {
        documentAttributeManager.setAttributeOnLine(i, 'align', tags[level]);
      } else {
        documentAttributeManager.removeAttributeOnLine(i, 'align');
      }
    });
  }

  const editorInfo = context.editorInfo;
  editorInfo.ace_doInsertAlign = doInsertAlign.bind(context);

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

  return;
};

const align = (context, alignment) => {
  context.ace.callWithAce((ace) => {
    ace.ace_doInsertAlign(alignment);
    ace.ace_focus();
  }, 'insertalign', true);
};

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
    height: lineRect.height
  };
};

const pulseLine = (node, success) => {
  const outer = parent.document.querySelector('iframe[name="ace_outer"]');
  const outerDoc = outer.contentDocument;
  
  const pulseOverlay = outerDoc.createElement('div');
  pulseOverlay.className = 'line-pulse';
  
  const position = getLinePosition(node);
  
  pulseOverlay.style.cssText = `
    position: absolute;
    left: 0;
    right: 0;
    background-color: ${success ? '#4CAF50' : '#f44336'};
    opacity: 0;
    pointer-events: none;
    z-index: 999;
    height: ${position.height}px;
    top: ${position.top}px;
  `;
  
  outerDoc.body.appendChild(pulseOverlay);

  requestAnimationFrame(() => {
    pulseOverlay.animate([
      { opacity: 0.2 },
      { opacity: 0 }
    ], {
      duration: 1000,
      easing: 'ease-out'
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

const attachResultToLine = (line, result) => {
  const node = line.domInfo.node;
  const outer = parent.document.querySelector('iframe[name="ace_outer"]');
  const outerDoc = outer.contentDocument;
  
  // Remove any existing result
  const existingResult = outerDoc.querySelector(`[data-line-result="${line.key}"]`);
  if (existingResult) {
    existingResult.remove();
  }
  
  const resultSpan = outerDoc.createElement('span');
  resultSpan.className = 'line-result';
  resultSpan.setAttribute('data-line-result', line.key);
  resultSpan.textContent = `→ ${result}`;
  
  const position = getLinePosition(node);
  
  resultSpan.style.cssText = `
    position: absolute;
    right: 20px;
    color: #888;
    font-style: italic;
    pointer-events: none;
    user-select: none;
    max-width: 200px;
    z-index: 1000;
    top: ${position.top}px;
  `;
  
  outerDoc.body.appendChild(resultSpan);
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

    const result = executeLine(line);
    attachResultToLine(line, result);
    
    // Prevent default enter behavior
    context.evt.preventDefault();
    return true;
  }
  return false;
};

exports.aceSelectionChanged = (hook, context) => {
  console.log('aceSelectionChanged', context);
  return true;
};

exports.postToolbarInit = (hookName, context) => {
  const editbar = context.toolbar; // toolbar is actually editbar - http://etherpad.org/doc/v1.5.7/#index_editbar
  editbar.registerCommand('alignLeft', () => {
    align(context, 0);
  });

  editbar.registerCommand('alignCenter', () => {
    align(context, 1);
  });

  editbar.registerCommand('alignJustify', () => {
    align(context, 2);
  });

  editbar.registerCommand('alignRight', () => {
    align(context, 3);
  });

  return true;
};

