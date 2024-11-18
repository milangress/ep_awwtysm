// replModal.ejs is standalone Repl for testing.
'use strict';

class ReplModal {
  constructor(hydraInstance, AwwClass, id = 'awwtysmReplModal') {
    console.log('ReplModal constructor started', {
      hydraInstance: !!hydraInstance,
      AwwClass: !!AwwClass,
      id,
    });
    if (!AwwClass) {
      throw new Error('AwwClass is required');
    }
    if (!hydraInstance) {
      throw new Error('hydraInstance is required');
    }
    if (!document.getElementById(id)) {
      throw new Error(`Element with id ${id} not found`);
    }

    this.modal = document.getElementById(id);
    this.editor = this.modal.querySelector('.awwtysmEditor');
    if (!this.editor) {
      throw new Error('Editor element not found');
    }

    this.lineBuffer = ['']; // Start line buffer with blank line
    this.selectedLine = null;
    this.stack = {current: ''};
    this.dictionary = null;
    this.inputHidden = false;
    this.firstAutocompleteChoice = '';

    this.awwApi = null;

    // Initialize other DOM elements with error checking
    this.initializeDOMElements();

    // Initialize state
    this.initializeState();

    console.log('Creating new Aww instance for REPL');
    new AwwClass((api) => {
      console.log('REPL Aww callback received');
      if (!api) {
        console.error('No API received in REPL callback');
        return;
      }
      this.awwApi = api;
      console.log('Setting up REPL event listeners');
      this.setupEventListeners();
    }, hydraInstance);

    console.log('ReplModal constructor completed');
  }

  initializeDOMElements() {
    this.text = this.editor.querySelector('.awwtysmEditorText');
    this.prevLines = this.editor.querySelector('.awwtysmEditorPrevLines');
    this.input = this.editor.querySelector('.awwtysmEditorInput');
    this.stackViewer = this.editor.querySelector('.awwtysmEditorStackViewer');
    this.autocomplete = this.editor.querySelector('.awwtysmEditorAutocomplete');

    // Verify all elements exist
    if (!this.text || !this.prevLines || !this.input ||
        !this.stackViewer || !this.autocomplete) {
      throw new Error('Required DOM elements not found');
    }
  }

  initializeState() {
    this.lineBuffer = [''];
    this.selectedLine = null;
    this.stack = {current: ''};
    this.dictionary = null;
    this.inputHidden = false;
    this.firstAutocompleteChoice = '';
    this.awwApi = null;
  }


  addLine(code) {
    this.selectedLine = null;
    this.lineBuffer.push(code);

    const codeSpan = document.createElement('span');
    codeSpan.classList.add('code');
    codeSpan.textContent = code;

    const spacer = document.createTextNode(' ');

    const newLine = document.createElement('div');
    newLine.appendChild(codeSpan);
    newLine.appendChild(spacer);
    this.prevLines.appendChild(newLine);

    return newLine;
  }

  addOutput(line, output) {
    if (output === undefined) return;

    const outputSpan = document.createElement('span');
    outputSpan.classList.add('output');
    outputSpan.textContent = output;
    line.appendChild(outputSpan);
    this.adjustScroll();
  }

  updateStack() {
    if (!this.awwApi) return;
    this.stackViewer.textContent = this.awwApi.getStack() || '';
  }

  updateDictionary() {
    if (!this.awwApi) return;
    this.dictionary = [...this.awwApi.getDictionary().resolvedDict.keys()];
  }

  autocompleteAcceptMatch(newString) {
    const words = this.input.value.split(' ');
    words[words.length - 1] = newString;
    this.input.value = words.join(' ');
    this.autocomplete.innerHTML = '';
    this.input.focus();
  }

  updateAutocomplete() {
    if (!this.dictionary) return this.updateDictionary();

    const inputValue = this.input.value;
    const lastWord = inputValue.split(' ').pop(); // Get the last word being typed

    // Clear existing suggestions
    this.autocomplete.innerHTML = '';

    // Only show suggestions if we have a partial word
    if (lastWord.length > 0) {
      // Filter dictionary for matching entries (case-insensitive)
      const matches = this.dictionary
          .filter((word) => word.toLowerCase().startsWith(lastWord.toLowerCase()))
          .slice(0, 8); // Limit to top 8 matches

      if (matches.length > 0) {
        matches.forEach((match, index) => {
          if (index === 0) {
            this.firstAutocompleteChoice = match;
          }
          const suggestion = document.createElement('span');
          suggestion.classList.add('suggestion');
          suggestion.textContent = match;
          suggestion.addEventListener('click', () => {
            this.autocompleteAcceptMatch(match);
          });
          this.autocomplete.appendChild(suggestion);
        });
      }
    }
  }

  hideInput() {
    this.inputHidden = true;
    this.input.classList.add('hide');
  }

  showInput() {
    this.inputHidden = false;
    this.input.classList.remove('hide');
  }

  readInput() {
    if (!this.awwApi) return;
    const code = this.input.value;
    const codeLines = code.split('\n');

    let $line;

    this.hideInput();

    // Handle multiple lines - this will only come up when text is pasted.
    this.awwApi.readLines(codeLines, {
      lineCallback: (codeLine) => {
        $line = this.addLine(codeLine);
      },
      outputCallback: (output) => {
        this.addOutput($line, output);
      },
    }, () => {
      this.updateStack();
      this.showInput();
      this.updateDictionary();
    });

    this.input.value = '';
  }

  adjustScroll() {
    this.text.scrollTop = this.text.scrollHeight;
  }

  selectLine() {
    this.input.value = this.lineBuffer[this.selectedLine];
  }

  selectPreviousLine() {
    if (this.selectedLine == null || this.selectedLine === 0) {
      this.selectedLine = this.lineBuffer.length - 1;
    } else {
      this.selectedLine--;
    }
    this.selectLine();
  }

  selectNextLine() {
    if (this.selectedLine == null || this.selectedLine === this.lineBuffer.length - 1) {
      this.selectedLine = 0;
    } else {
      this.selectedLine++;
    }
    this.selectLine();
  }

  setupEventListeners() {
    console.log('Setting up event listeners', {awwApi: this.awwApi});
    if (!this.awwApi) {
      console.error('Aww API not initialized');
      return;
    }

    this.input.addEventListener('keydown', (e) => {
      if (this.inputHidden) {
        this.awwApi.keyDown(e.input.value);
        e.preventDefault();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.readInput();
        this.adjustScroll();
        this.autocomplete.innerHTML = ''; // Clear suggestions
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectPreviousLine();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectNextLine();
      } else if (e.key === 'Tab') {
        if (this.firstAutocompleteChoice) {
          e.preventDefault();
          this.autocompleteAcceptMatch(this.firstAutocompleteChoice);
        }
      }
    });

    // Add input event listener for autocomplete
    this.input.addEventListener('input', () => {
      this.updateAutocomplete();
    });

    this.editor.addEventListener('click', (e) => {
      if (!e.target.closest('.awwtysmEditorPrevLines')) {
        this.input.focus();
      }
    });

    // Hide autocomplete when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.awwtysmEditor')) {
        this.autocomplete.innerHTML = '';
      }
    });

    this.updateStack();
    this.updateDictionary();
  }
}


module.exports = ReplModal;