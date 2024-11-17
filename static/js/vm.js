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
  const stackContainer = $('#awwtysmStack');
  stackContainer.empty();
  stackContainer.append(`<p>${lastStack.value} ←</p>`);
});

effect(() => {
  console.log('Last line:', lastLine.value);
  const lastLineContainer = $('#awwtysmLastLine');
  lastLineContainer.empty();
  lastLineContainer.append(`<p>${lastLine.value}</p>`);
});


const formatDictEntry = (definition, word) => {
  console.log('Definition:', definition[0]);
  const def = definition[0];
  let formattedFunction = null;
  if (typeof def === 'function') {
    formattedFunction = def.toString()
        .replace(/}/g, '}<br>')
        .replace(/;/g, ';<br>');
  } else {
    formattedFunction = JSON.stringify(def, null, 2)
        .replace(/\n/g, '<br>');
  }
  const persistenceString = definition[1] ? 'Temporary' : 'Persistent';
  const detailsElement = document.createElement('details');
  detailsElement.innerHTML = formattedFunction;
  const summaryElement = document.createElement('summary');
  summaryElement.innerHTML = `${word} - ${persistenceString}`;
  detailsElement.appendChild(summaryElement);
  return detailsElement;
};

effect(() => {
  console.log('Current dictionary:', currentDictionary.value);
  if (currentDictionary.value && currentDictionary.value.resolvedDict) {
    const dictionaryContainer = $('#awwtysmDictionary');
    dictionaryContainer.empty();
    currentDictionary.value.resolvedDict.forEach((definition, word) => {
      dictionaryContainer.append(formatDictEntry(definition, word));
    });
  }
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
