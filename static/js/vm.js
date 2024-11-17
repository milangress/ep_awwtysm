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
const parsedTokens = signal(null);
const logs = signal([]);

forthApi.onLog((log) => {
  logs.value.push(log);

  const logsContainer = $('#awwtysmLogsList');
  const formattedLog = `[${log.level}] ${log.timestamp}<br>${log.category}: ${log.message}`;
  logsContainer.prepend(`<p class="awwtysmLog ${log.level}">${formattedLog}</p>`);
});


effect(() => {
  console.log('Last output:', lastOutput.value);
});

effect(() => {
  console.log('Last stack:', lastStack.value);
});

effect(() => {
  console.log('Last line:', lastLine.value);
});

effect(() => {
  console.log('Current dictionary:', currentDictionary.value);
});

// effect(() => {
//   console.log('Logs:', logs.value);
//   const logsContainer = $('#awwtysmLogsList');
//   logsContainer.empty();
//   logs.value.forEach((log) => {
//     const formattedLog = `${log.timestamp} [${log.level}] ${log.category}: ${log.message}`;
//     logsContainer.append(`<p>${formattedLog}</p>`);
//   });
// });

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
      parsedTokens.value = forthApi.getParsedTokens();
      logs.value = forthApi.getLogs();
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
  parsedTokens,
});

// Export a singleton instance
module.exports = vm;
