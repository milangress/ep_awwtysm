'use strict';

const {signal, effect} = require('@preact/signals-core');
const {AwwVM, HydraDevice, createHydra} = require('./lib/AwwVM');
const ReplModal = require('./ReplModal');

const Stage = require('./Stage');
const stage = Stage.getInstance();

let awwApi = null;

const lastOutput = signal([]);
const lastStack = signal([]);
const lastLine = signal(null);
const currentDictionary = signal(null);
const context = signal(null);
const parsedTokens = signal(null);
const logs = signal([]);
const memory = signal(null);
const awwHistory = signal([]);
const lineBuffer = signal([]);
let getDeviceOverviewAsci = signal(null);

let repl = null;
let awwInstance = null;


(async () => {
  try {
    console.log('Starting VM initialization');


    // Create main Aww instance
    console.log('Creating main Aww instance');
    await new Promise((resolve) => {
      awwInstance = new AwwVM();
      awwApi = {
        readLine: awwInstance.readLine.bind(awwInstance),
        readLines: awwInstance.readLines.bind(awwInstance),
        getDictionary: () => awwInstance.dictionary.value,
        getStack: () => awwInstance.stack.value,
        getParsedTokens: () => awwInstance.parsedTokens.value,
        getMemory: () => awwInstance.memory.value,
      };

      awwInstance.getLogger().setLogCallback((log) => {
        console.log('Logging:', log);
        logs.value = [...logs.value, log]; // Add new log to the array
        const logsContainer = $('#awwtysmLogsList');
        const formattedLog = `[${log.level}] ${log.timestamp}<br>` +
            `${log.category}: ${log.message}`;
        logsContainer.prepend(
            `<p class="awwtysmLog ${log.level}">${formattedLog}</p>`
        );
      });
      awwInstance.getStackSignal().subscribe((stack) => {
        lastStack.value = stack;
      });
      awwInstance.getDictionarySignal().subscribe((dictionary) => {
        currentDictionary.value = dictionary;
      });
      awwInstance.getDeviceSignal().subscribe((devices) => {
        console.log('Devices:', devices);
        getDeviceOverviewAsci = awwInstance.getDeviceOverviewAsci();
      });

      resolve();
    });

    const canvas = await stage.hydraCanvas();
    await stage.show();

    const size = canvas.getBoundingClientRect();
    console.log('Size:', size);

    console.log('Creating hydra instance', createHydra);
    const hydraInstance = createHydra({
      width: size.width,
      height: size.height,
      canvas,
    });
    console.log('Hydra instance created', hydraInstance);
    const hydraDevice = new HydraDevice(hydraInstance);
    console.log('Hydra device created', hydraDevice);

    console.log('Hydra instance created');
    console.log('Attaching hydra device');
    window.setTimeout(() => {
      awwInstance.attachDevice(hydraDevice);
      console.log('Hydra device attached');
    }, 5000);

    await new Promise((resolve) => {
      // Create REPL instance
      console.log('Creating REPL instance', AwwVM);
      repl = new ReplModal(AwwVM);
      console.log('REPL instance created');
      resolve();
    });
  } catch (error) {
    console.error('Error during VM initialization:', error);
  }
})();

// effect(() => {
//   console.log('Last output:', lastOutput.value.join(' '));
// });

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
    formattedFunction = definition[0]
        .toString()
        .replace(/}/g, '}<br>')
        .replace(/;/g, ';<br>');
  } else {
    formattedFunction = JSON.stringify(definition[0], null, 2).replace(
        /\n/g,
        '<br>'
    );
  }
  const persistenceString = definition[1] ? 'Temporary' : 'Persistent';
  const detailsElement = detailsHelper(
      formattedFunction,
      `${word} - ${persistenceString}`
  );
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
  console.log('Formatting memory:', memory);
  const format = (value) => {
    if (typeof value !== 'number') return value;
    return value.toString(16).padStart(4, '0').toUpperCase();
  };

  const {blocks, totalSize, freeSpace} = memory.memoryMap;
  const memArray = memory.memArray;

  const blockStrings = blocks.map(({name, address, size, value}) => {
    const formattedAddress = format(address);
    const formattedValue = Array.isArray(value)
      ? value.map(format).join(', ')
      : format(value);
    return `${name}(${formattedAddress}): ${formattedValue} [Size: ${size}]`;
  });

  const memStrings = memArray.map(
      (value, index) => {
        if (value === undefined || value === 0 || value === '0') return '';
        return `(${format(index)}): ${value}`;
      }
  );

  return {
    memPointer: format(totalSize),
    freeSpace: format(freeSpace),
    blockStrings,
    memStrings,
  };
};

const attachMemoryHtml = (containerDOM, formattedMemory) => {
  containerDOM.append(
      `<p>Next memory pointer: ${formattedMemory.memPointer}</p>`
  );
  containerDOM.append('<p>Variables:</p>');
  if (formattedMemory.blockStrings.length > 0) {
    formattedMemory.blockStrings.forEach((blockString) => {
      containerDOM.append(`<p>${blockString}</p>`);
    });
  } else {
    containerDOM.append('<p>No blocks</p>');
  }
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
  const parsedTokensString = entry.parsedTokens
    ? entry.parsedTokens.join(' ')
    : 'None';
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
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const lineShortened =
    entry.line.length > 15 ? `${entry.line.substring(0, 15)}...` : entry.line;
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

effect(() => {
  if (!getDeviceOverviewAsci.value) return;
  console.log('Device overview subscription:', getDeviceOverviewAsci.value);
  const deviceContainer = $('#awwtysmDeviceOverview');
  deviceContainer.empty();
  deviceContainer.append(getDeviceOverviewAsci.value);
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


const addOutput = (line, output) => {
  if (output === undefined) return;
  console.log('Output:', output);
  lastOutput.value.push(output);
};

const addLine = (codeLine) => {
  lineBuffer.value.push(codeLine);
  return codeLine;
};

const vm = () => ({
  readLine: (line) => {
    const previousStack = lastStack.value ? String(lastStack.value) : undefined;
    lastLine.value = line;
    lastOutput.value = [];

    console.log('Readline:', line);
    console.log('awwApi:', awwApi);

    const codeLines = line.split('\n');

    // Process each line and collect results
    const results = awwApi.readLines(codeLines);
    console.log('Results:', results);
    memory.value = results.memory;
    parsedTokens.value = results.parsedTokens;
    lastStack.value = results.stack;

    results.forEach((result, index) => {
      const codeLine = codeLines[index];
      addLine(codeLine);
      addOutput(codeLine, result.output);

      saveToHistory({
        line,
        output: result.output,
        stack: result.stack,
        previousStack,
        memory: result.memory,
        parsedTokens: result.parsedTokens,
      });
    });


    // Update signals after processing all lines

    return results;
  },
  lastOutput,
  lastStack,
  lastLine,
  currentDictionary,
  context,
  parsedTokens,
});

// Export a singleton instance
module.exports = vm;
