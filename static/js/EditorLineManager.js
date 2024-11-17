'use strict';

const {signal, computed} = require('@preact/signals-core');
const EditorLine = require('./EditorLine');

class EditorLineManager {
  constructor() {
    // Map of line numbers to EditorLine instances
    this.$lines = signal(new Map());

    // Track dirty line numbers
    this.$dirtyLines = signal(new Set());

    // Track total number of lines
    this.$totalLines = signal(0);

    // Computed value for number of processed lines
    this.$processedLines = computed(() => {
      let count = 0;
      this.$lines.value.forEach((line) => {
        if (line.$isProcessed.value) count++;
      });
      return count;
    });
  }

  getLine(lineNumber) {
    return this.$lines.value.get(lineNumber);
  }

  setLineDirty(lineNumber) {
    const line = this.getLine(lineNumber);
    if (line) {
      line.$isDirty.value = true;
      this.$dirtyLines.value = new Set([...this.$dirtyLines.value, lineNumber]);
    }
  }

  setLinesDirty(startLine, endLine) {
    const dirtyLines = new Set(this.$dirtyLines.value);
    for (let i = startLine; i <= endLine; i++) {
      dirtyLines.add(i);
      const line = this.getLine(i);
      if (line) {
        line.$isDirty.value = true;
      }
    }
    this.$dirtyLines.value = dirtyLines;
  }

  createOrUpdateLine(lineData) {
    const {lineNumber, text, domInfo} = lineData;
    const existingLine = this.getLine(lineNumber);
    const isDirty = this.$dirtyLines.value.has(lineNumber);

    // If line exists and is not dirty, just update the DOM node
    if (existingLine && !isDirty) {
      existingLine.domNode = domInfo.node;
      existingLine.updatePosition();
      return existingLine;
    }

    // If line is dirty or doesn't exist, create new instance
    const newLine = new EditorLine(domInfo.node, lineNumber, text);

    // Update lines map
    const updatedLines = new Map(this.$lines.value);
    updatedLines.set(lineNumber, newLine);
    this.$lines.value = updatedLines;

    // Remove from dirty lines if it was dirty
    if (isDirty) {
      const newDirtyLines = new Set(this.$dirtyLines.value);
      newDirtyLines.delete(lineNumber);
      this.$dirtyLines.value = newDirtyLines;
    }

    return newLine;
  }

  cleanup(lineNumber) {
    const line = this.getLine(lineNumber);
    if (line) {
      line.cleanup();
      const updatedLines = new Map(this.$lines.value);
      updatedLines.delete(lineNumber);
      this.$lines.value = updatedLines;
    }
  }

  updatePositions() {
    this.$lines.value.forEach((line) => line.updatePosition());
  }

  executeLineAndReport(lineData) {
    const line = this.createOrUpdateLine(lineData);
    return line.execute();
  }

  executeAll(linesData) {
    linesData.forEach((lineData) => this.executeLineAndReport(lineData));
  }
}

module.exports = EditorLineManager;
