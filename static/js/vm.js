'use strict';

const {signal, effect} = require('@preact/signals-core');
const forth = require('./reherser');

// Create a single instance and store its API
let forthApi = null;
forth((api) => {
  forthApi = api;
});

const lastOutput = signal(null);
const lastStack = signal([]);
const lastLine = signal(null);
const currentDictionary = signal(null);
const context = signal(null);

effect(() => {
  console.log('Last output:', lastOutput.value);
});

effect(() => {
  console.log('Last stack:', lastStack.value);
});

const vm = () => ({
  readLine: (line) => {
    lastLine.value = line;
    let returnVal = null;

    // Use the existing forthApi instance
    context.value = forthApi;
    forthApi.readLine(line, (output) => {
      lastOutput.value = output;
      lastStack.value = forthApi.getStack();
      currentDictionary.value = forthApi.getDictionary();
      returnVal = output;
    });

    return returnVal;
  },
  forth,
  lastOutput,
  lastStack,
  lastLine,
  currentDictionary,
  context,
});

// Export a singleton instance
module.exports = vm;
