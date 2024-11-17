'use strict';

const {signal, effect} = require('@preact/signals-core');
const {Aww} = require('./reherser');
const {createHydra} = require('./reherser');
const ReplModal = require('./ReplModal');

const Stage = require('./Stage');
const stage = Stage.getInstance();


let awwApi = null;


const lastOutput = signal(null);
const lastStack = signal([]);
const lastLine = signal(null);
const currentDictionary = signal(null);
const context = signal(null);
const parsedTokens = signal(null);
const logs = signal([]);
const memory = signal(null);
const awwHistory = signal([]);


(async () => {
  const canvas = await stage.hydraCanvas();
  await stage.show();

  const size = canvas.getBoundingClientRect();
  console.log('Size:', size);

  const hydraInstance = createHydra({
    width: size.width,
    height: size.height,
    // precision: 'highp',
    makeGlobal: true,
    canvas,
  });
  new Aww((api) => awwApi = api, hydraInstance);

  new ReplModal(hydraInstance);

  awwApi.onLog((log) => {
    logs.value.push(log);

    const logsContainer = $('#awwtysmLogsList');
    const formattedLog = `[${log.level}] ${log.timestamp}<br>${log.category}: ${log.message}`;
    logsContainer.prepend(`<p class="awwtysmLog ${log.level}">${formattedLog}</p>`);
  });
})();

effect(() => {
  console.log('Last output:', lastOutput.value);
});


effect(() => {
  console.log('Last stack:', lastStack.value);
  const stackContainer = $('#awwtysmStack');
  stackContainer.empty();
  stackContainer.append(`<p>${lastStack.value}</p>`);
});

effect(() => {
  console.log('Last line:', lastLine.value);
  const lastLineContainer = $('#awwtysmLastLine');
  lastLineContainer.empty();
  lastLineContainer.append(`<p>${lastLine.value}</p>`);
});

const detailsHelper = (detailsContent, summaryContent) => {
  const detailsElement = document.createElement('details');
  if (typeof detailsContent === 'string') {
    detailsElement.innerHTML = detailsContent;
  } else {
    detailsElement.appendChild(detailsContent);
  }
  const summaryElement = document.createElement('summary');
  if (typeof summaryContent === 'string') {
    summaryElement.innerHTML = summaryContent;
  } else {
    summaryElement.appendChild(summaryContent);
  }
  detailsElement.appendChild(summaryElement);
  return detailsElement;
};

const formatDictEntry = (definition, word) => {
  let formattedFunction = null;
  if (typeof definition[0] === 'function') {
    formattedFunction = definition[0].toString()
        .replace(/}/g, '}<br>')
        .replace(/;/g, ';<br>');
  } else {
    formattedFunction = JSON.stringify(definition[0], null, 2)
        .replace(/\n/g, '<br>');
  }
  const persistenceString = definition[1] ? 'Temporary' : 'Persistent';
  const detailsElement = detailsHelper(formattedFunction, `${word} - ${persistenceString}`);
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


const formatMemory = (memory) => {
  const format = (value) => {
    if (typeof value !== 'number') return value;
    return value.toString(16).padStart(4, '0').toUpperCase();
  };
  const {variables, memArray, memPointer} = memory;
  // variables is an objects with key as var_name and value as adress {var_name: adress} u
  // use object keys to get the var_name
  const varStrings = Object.keys(variables).map((varName) => {
    const adress = variables[varName];
    const formattedValue = memArray[adress];
    const formattedAdress = format(adress);
    return `${varName}(${formattedAdress}): ${formattedValue}`;
  });
  const memStrings = memArray.map((value, index) => `(${format(index)}): ${value}`);
  return {
    memPointer: format(memPointer),
    memStrings,
    varStrings,
  };
};

const attachMemoryHtml = (containerDOM, formattedMemory) => {
  containerDOM.append(`<p>Next memory pointer: ${formattedMemory.memPointer}</p>`);
  containerDOM.append('<p>Variables:</p>');
  formattedMemory.varStrings.forEach((varString) => {
    containerDOM.append(`<p>${varString}</p>`);
  });
  containerDOM.append('<p>Raw memory:</p>');
  if (formattedMemory.memStrings.length > 0) {
    formattedMemory.memStrings.forEach((memString) => {
      containerDOM.append(`<p>${memString}</p>`);
    });
  } else {
    containerDOM.append('<p>Empty memory</p>');
  }
};

effect(() => {
  if (!memory.value) return;
  console.log('Memory:', memory.value);
  const memoryContainer = $('#awwtysmMemory');
  memoryContainer.empty();
  const formattedMemory = formatMemory(memory.value);
  attachMemoryHtml(memoryContainer, formattedMemory);
});

const formatHistoryEntry = (entry) => {
  const detailsWrapper = document.createElement('div');

  // Create list items with innerHTML to properly render HTML
  const dateItem = document.createElement('p');
  dateItem.innerHTML = entry.date.toLocaleString();
  detailsWrapper.appendChild(dateItem);

  const inputItem = document.createElement('p');
  inputItem.innerHTML = `Input: ${entry.line}`;
  detailsWrapper.appendChild(inputItem);

  const parsedTokensItem = document.createElement('p');
  const parsedTokensString = entry.parsedTokens ? entry.parsedTokens.join(' ') : 'None';
  parsedTokensItem.innerHTML = `Words: ${parsedTokensString}`;
  detailsWrapper.appendChild(parsedTokensItem);

  const resultItem = document.createElement('p');
  resultItem.innerHTML = `Result: ${entry.output}`;
  detailsWrapper.appendChild(resultItem);

  const stackItem = document.createElement('p');
  stackItem.innerHTML = `Stack: ${entry.stack}`;
  detailsWrapper.appendChild(stackItem);

  const previousStackItem = document.createElement('p');
  previousStackItem.innerHTML = `Prev Stack: ${entry.previousStack}`;
  detailsWrapper.appendChild(previousStackItem);

  const memLi = document.createElement('p');
  memLi.innerHTML = 'Memory';
  detailsWrapper.appendChild(memLi);

  const justHourString = entry.date.toLocaleString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const lineShortened = entry.line.length > 15 ? `${entry.line.substring(0, 15)}...` : entry.line;
  const titleString = `${justHourString} - ${lineShortened}`;

  attachMemoryHtml($(memLi), formatMemory(entry.memory));
  const detailsElement = detailsHelper(detailsWrapper, titleString);
  return detailsElement;
};

const saveToHistory = (entry) => {
  const date = new Date();
  const historyEntry = {...entry, date};
  console.log('Saving to history:', historyEntry);
  const historyContainer = $('#awwtysmHistory');
  historyContainer.prepend(formatHistoryEntry(historyEntry));
  awwHistory.value.push(historyEntry);
};


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
    const previousStack = lastStack.value;
    lastLine.value = line;

    // Use the existing awwApi instance
    context.value = awwApi;
    awwApi.readLine(line, (output) => {
      console.log('Output:', output);
      lastOutput.value = output;
    });

    lastStack.value = awwApi.getStack();
    currentDictionary.value = awwApi.getDictionary();
    parsedTokens.value = awwApi.getParsedTokens();
    logs.value = awwApi.getLogs();
    memory.value = awwApi.getMemory();

    saveToHistory({
      line,
      output: lastOutput.value,
      stack: lastStack.value,
      previousStack,
      memory: memory.value,
      parsedTokens: parsedTokens.value,
    });

    // return lastOutput.value;
  },
  aww: awwApi,
  lastOutput,
  lastStack,
  lastLine,
  currentDictionary,
  context,
  parsedTokens,
});

// Export a singleton instance
module.exports = vm;
