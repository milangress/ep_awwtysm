'use strict';

const {signal, effect} = require('@preact/signals-core');
const forth = require('./reherser');


const lastOutput = signal(null);
const lastStack = signal([]);
const lastLine = signal(null);
const context = signal(null);

effect(() => {
  console.log('Last output:', lastOutput.value);
});

effect(() => {
  console.log('Last stack:', lastStack.value);
});

forth((api) => {
  // Your code here using the api
  api.readLine('5 3 + .', (output) => {
    lastOutput.value = output;
    lastStack.value = api.getStack();
  });
});

const vmWrapper = () => {
  let returnVal = null;
  return {
    readLine: (line) => {
      lastLine.value = line;
      forth((api) => {
        context.value = api;
        // Your code here using the api
        api.readLine(line, (output) => {
          lastOutput.value = output;
          lastStack.value = api.getStack();
          returnVal = output;
          return returnVal;
        });
      });
    },
    forth,
    lastOutput,
    lastStack,
    lastLine,
    returnVal,
  };
};

module.exports = vmWrapper;
