'use strict';

const EditorLineManager = require('./EditorLineManager');

// Create a single instance of the manager
const lineManager = new EditorLineManager();

// Update the executeLineAndReport function
const executeLineAndReport = (lineData) => {
  console.log('executeLineAndReport', lineData);
  return lineManager.executeLineAndReport(lineData);
};

// Update aceEditEvent
exports.aceEditEvent = (hook, call) => {
  const cs = call.callstack;
  if (!(cs.type === 'handleClick') && !(cs.type === 'handleKeyEvent') && !(cs.docTextChanged)) {
    return false;
  }

  if (cs.type === 'setBaseText' || cs.type === 'setup') return false;

  console.log('aceEditEvent', call);

  const startLine = call.rep.selStart[0];
  const endLine = call.rep.selEnd[0];

  // Mark affected lines as dirty
  lineManager.setLinesDirty(startLine, endLine);

  // Update positions of all lines
  setTimeout(() => {
    lineManager.updatePositions();
  }, 0);

  return false;
};

// Update acePostWriteDomLineHTML
exports.acePostWriteDomLineHTML = (hookName, args) => {
  const lineNumber = args.row;

  if (!args.node.isConnected) {
    lineManager.cleanup(lineNumber);
  }
};

exports.aceEditorCSS = (hookName, cb) => ['/ep_awwtysm/static/css/awwtysm.css'];

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

  return;
};

exports.aceSelectionChanged = (hook, context) => {
  console.log('aceSelectionChanged', context);
  return true;
};

exports.postToolbarInit = (hookName, context) => {
  const editbar = context.toolbar; // toolbar is actually editbar - http://etherpad.org/doc/v1.5.7/#index_editbar
  editbar.registerCommand('awwtysm_run', () => {
    const rep = context.rep;
    const currentLine = rep.selStart[0];
    const line = rep.lines.atIndex(currentLine);
    lineManager.executeLineAndReport(line);
  });
  editbar.registerCommand('awwtysm_run_all', () => {
    lineManager.executeAll(context.rep.lines);
  });

  return true;
};
