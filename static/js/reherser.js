'use strict';

// Polyfill for process.hrtime
if (typeof window !== 'undefined' && !window.process) {
  window.process = {
    hrtime: (previousTimestamp) => {
      const clocktime = performance.now() * 1e-3;
      let seconds = Math.floor(clocktime);
      let nanoseconds = Math.floor((clocktime % 1) * 1e9);
      
      if (previousTimestamp) {
        seconds = seconds - previousTimestamp[0];
        nanoseconds = nanoseconds - previousTimestamp[1];
        if (nanoseconds < 0) {
          seconds--;
          nanoseconds += 1e9;
        }
      }
      return [seconds, nanoseconds];
    }
  };
}

function StackUnderflowError(name) {
  console.warn("Stack underflow in " + name);
  this.message = "Stack underflow in " + name;
}

function Stack(name) {
  var arr = [];

  return {
    push: function (item) {
      arr.push(item);
    },
    peek: function (offset) {
      offset = offset || 1;
      return arr[arr.length - offset];
    },
    pop: function () {
      if (arr.length > 0) {
        return arr.pop();
      } else {
        throw new StackUnderflowError(name);
      }
    },
    print: function () {
      return arr.join(" ") + " ← Top ";
    },

    /**
     * Gets specified number of arguments from the stack, with default values if stack underflows
     * @param {number} count - Number of arguments to get from stack
     * @param {Array<*>} defaults - Default values to use if stack underflows
     * @returns {Array<*>} Array of arguments popped from stack (or defaults if underflow)
     */
    getArgs(count, defaults) {
      console.log("getArgs() stack:", this.print(), "defaults: ", defaults);
      const args = [];
      try {
        for (let i = 0; i < count; i++) {
          args.push(this.pop());
        }
      } catch (e) {
        while (args.length < count) {
          args.push(defaults[args.length]);
        }
      }
      console.log("getArgs() args:", args);
      return args;
    },
  };
}

function Dictionary() {
  var dict = new Map();
  let redefinedWords = new Map();

  function add(name, definition, isPermanent = false) {
    if (name === null || name === undefined) {
      throw new Error("Can't add null name");
    }
    dict.set(name.toLowerCase(), [definition, isPermanent]);
  }

  function lookup(key) {
    key = key.toLowerCase();
    const seenWords = new Set();
    
    while (true) {
      if (seenWords.has(key)) {
        throw new Error("Circular definition detected for word: " + key + `\n${JSON.stringify({seenWords, key, redefinedWords}, null, 2)}`);
      }
      seenWords.add(key);

      let redefinedWord = redefinedWords.get(key);
      if (redefinedWord) {
        const [definition, _] = redefinedWord;
        if (definition === null) {
          throw new Error("Invalid definition detected for word: " + key + 'in redefined word: ' + redefinedWord + `\n${JSON.stringify({seenWords, key, redefinedWords}, null, 2)}`);
        }
        key = definition.toLowerCase();
        continue;
      }

      var item = dict.get(key);
      if (!item) {
        return null;
      }
      
      return item[0];
    }
  }

  function redefine(key, newDefinition, isPermanent) {
    key = key.toLowerCase();
    let isInDict = dict.has(key) || redefinedWords.has(key);

    if (isInDict) {
      throw new Error("Can't redefine word that is already in dictionary: " + key);
    }

    redefinedWords.set(key, [newDefinition, isPermanent]);
  }

  function isPermanent(key) {
    key = key.toLowerCase();
    let item = dict.get(key) || redefinedWords.get(key);
    
    if (!item) {
      throw new Error("Word not found in dictionary: " + key);
    }

    return item[1];
  }

  function print() {
    return {
      dict: dict,
      redefinedWords: redefinedWords,
      resolvedDict: resolvedDict()
    }
  }

  function resolvedDict() {
     // Create a new Map for the resolved dictionary
     const resolvedDict = new Map();
      
     // First add all non-redefined words from the original dictionary
     for (const [key, [definition, isPermanent]] of dict) {
       resolvedDict.set(key, [definition, isPermanent]);
     }
     
     // Resolve all redefined words
     for (const [key, [definition, isPermanent]] of redefinedWords) {
       try {
         // Use lookup to get the final resolved definition
         const resolvedDefinition = this.lookup(key);
         resolvedDict.set(key, [resolvedDefinition, isPermanent]);
       } catch (error) {
         // Skip any circular definitions or invalid references
         console.warn(`Skipping invalid redefinition for '${key}': ${error.message}`);
       }
     }
     
     return resolvedDict;
  }



  return {
    get dict() {
      return resolvedDict();
    },
    add: add,
    lookup: lookup,
    isPermanent: isPermanent,
    redefine: redefine,
    print: print
  };
}

var i=Symbol.for("preact-signals");function t(){if(!(s>1)){var i,t=!1;while(void 0!==h){var r=h;h=void 0;f++;while(void 0!==r){var o=r.o;r.o=void 0;r.f&=-3;if(!(8&r.f)&&c(r))try{r.c();}catch(r){if(!t){i=r;t=!0;}}r=o;}}f=0;s--;if(t)throw i}else s--;}var o=void 0;var h=void 0,s=0,f=0,v=0;function e(i){if(void 0!==o){var t=i.n;if(void 0===t||t.t!==o){t={i:0,S:i,p:o.s,n:void 0,t:o,e:void 0,x:void 0,r:t};if(void 0!==o.s)o.s.n=t;o.s=t;i.n=t;if(32&o.f)i.S(t);return t}else if(-1===t.i){t.i=0;if(void 0!==t.n){t.n.p=t.p;if(void 0!==t.p)t.p.n=t.n;t.p=o.s;t.n=void 0;o.s.n=t;o.s=t;}return t}}}function u(i){this.v=i;this.i=0;this.n=void 0;this.t=void 0;}u.prototype.brand=i;u.prototype.h=function(){return !0};u.prototype.S=function(i){if(this.t!==i&&void 0===i.e){i.x=this.t;if(void 0!==this.t)this.t.e=i;this.t=i;}};u.prototype.U=function(i){if(void 0!==this.t){var t=i.e,r=i.x;if(void 0!==t){t.x=r;i.e=void 0;}if(void 0!==r){r.e=t;i.x=void 0;}if(i===this.t)this.t=r;}};u.prototype.subscribe=function(i){var t=this;return E(function(){var r=t.value,n=o;o=void 0;try{i(r);}finally{o=n;}})};u.prototype.valueOf=function(){return this.value};u.prototype.toString=function(){return this.value+""};u.prototype.toJSON=function(){return this.value};u.prototype.peek=function(){var i=o;o=void 0;try{return this.value}finally{o=i;}};Object.defineProperty(u.prototype,"value",{get:function(){var i=e(this);if(void 0!==i)i.i=this.i;return this.v},set:function(i){if(i!==this.v){if(f>100)throw new Error("Cycle detected");this.v=i;this.i++;v++;s++;try{for(var r=this.t;void 0!==r;r=r.x)r.t.N();}finally{t();}}}});function d(i){return new u(i)}function c(i){for(var t=i.s;void 0!==t;t=t.n)if(t.S.i!==t.i||!t.S.h()||t.S.i!==t.i)return !0;return !1}function a(i){for(var t=i.s;void 0!==t;t=t.n){var r=t.S.n;if(void 0!==r)t.r=r;t.S.n=t;t.i=-1;if(void 0===t.n){i.s=t;break}}}function l(i){var t=i.s,r=void 0;while(void 0!==t){var o=t.p;if(-1===t.i){t.S.U(t);if(void 0!==o)o.n=t.n;if(void 0!==t.n)t.n.p=o;}else r=t;t.S.n=t.r;if(void 0!==t.r)t.r=void 0;t=o;}i.s=r;}function y(i){u.call(this,void 0);this.x=i;this.s=void 0;this.g=v-1;this.f=4;}(y.prototype=new u).h=function(){this.f&=-3;if(1&this.f)return !1;if(32==(36&this.f))return !0;this.f&=-5;if(this.g===v)return !0;this.g=v;this.f|=1;if(this.i>0&&!c(this)){this.f&=-2;return !0}var i=o;try{a(this);o=this;var t=this.x();if(16&this.f||this.v!==t||0===this.i){this.v=t;this.f&=-17;this.i++;}}catch(i){this.v=i;this.f|=16;this.i++;}o=i;l(this);this.f&=-2;return !0};y.prototype.S=function(i){if(void 0===this.t){this.f|=36;for(var t=this.s;void 0!==t;t=t.n)t.S.S(t);}u.prototype.S.call(this,i);};y.prototype.U=function(i){if(void 0!==this.t){u.prototype.U.call(this,i);if(void 0===this.t){this.f&=-33;for(var t=this.s;void 0!==t;t=t.n)t.S.U(t);}}};y.prototype.N=function(){if(!(2&this.f)){this.f|=6;for(var i=this.t;void 0!==i;i=i.x)i.t.N();}};Object.defineProperty(y.prototype,"value",{get:function(){if(1&this.f)throw new Error("Cycle detected");var i=e(this);this.h();if(void 0!==i)i.i=this.i;if(16&this.f)throw this.v;return this.v}});function w(i){return new y(i)}function _(i){var r=i.u;i.u=void 0;if("function"==typeof r){s++;var n=o;o=void 0;try{r();}catch(t){i.f&=-2;i.f|=8;g(i);throw t}finally{o=n;t();}}}function g(i){for(var t=i.s;void 0!==t;t=t.n)t.S.U(t);i.x=void 0;i.s=void 0;_(i);}function p(i){if(o!==this)throw new Error("Out-of-order effect");l(this);o=i;this.f&=-2;if(8&this.f)g(this);t();}function b(i){this.x=i;this.u=void 0;this.s=void 0;this.o=void 0;this.f=32;}b.prototype.c=function(){var i=this.S();try{if(8&this.f)return;if(void 0===this.x)return;var t=this.x();if("function"==typeof t)this.u=t;}finally{i();}};b.prototype.S=function(){if(1&this.f)throw new Error("Cycle detected");this.f|=1;this.f&=-9;_(this);a(this);s++;var i=o;o=this;return p.bind(this,i)};b.prototype.N=function(){if(!(2&this.f)){this.f|=2;this.o=h;h=this;}};b.prototype.d=function(){this.f|=8;if(!(1&this.f))g(this);};function E(i){var t=new b(i);try{t.c();}catch(i){t.d();throw i}return t.d.bind(t)}

function Memory() {
  const memoryBlocks = d(new Map()); // Track named memory blocks
  const memArray = d(new Array(65536).fill(0)); // Use signal for memory array
  const subscribers = new Map(); // Track memory change subscribers
  let _memPointer = 1000;

  function newMemPointer(size = 1) {
    const pointer = _memPointer;
    _memPointer += size;
    return pointer;
  }

  function allocateBlock(name, size, startAddress = null) {
    const address = startAddress || newMemPointer(size);
    memoryBlocks.value.set(name, {
      address,
      size,
      type: 'block'
    });
    return address;
  }

  function addVariable(name, size = 1) {
    const address = newMemPointer(size);
    memoryBlocks.value.set(name.toLowerCase(), {
      address,
      size,
      type: 'variable'
    });
    return address;
  }

  function getVariable(name) {
    const block = memoryBlocks.value.get(name.toLowerCase());
    return block?.address;
  }

  function setValue(address, value, size = 1) {
    // Handle multi-byte values
    if (size > 1) {
      for (let i = 0; i < size; i++) {
        const byteValue = (value >> (8 * i)) & 0xFF;
        memArray.value[address + i] = byteValue;
      }
    } else {
      memArray.value[address] = value;
    }

    // Notify subscribers
    notifySubscribers(address, value, size);
  }

  function getValue(address, size = 1) {
    if (size > 1) {
      let value = 0;
      for (let i = 0; i < size; i++) {
        value |= (memArray.value[address + i] || 0) << (8 * i);
      }
      return value;
    }
    return memArray.value[address] || 0;
  }

  function subscribe(address, callback) {
    if (!subscribers.has(address)) {
      subscribers.set(address, new Set());
    }
    subscribers.get(address).add(callback);

    // Return unsubscribe function
    return () => {
      subscribers.get(address)?.delete(callback);
    };
  }

  function notifySubscribers(address, value, size) {
    subscribers.get(address)?.forEach(callback => {
      callback(value, size);
    });
  }

  function getMemoryMap() {
    const blocks = Array.from(memoryBlocks.value.entries()).map(([name, block]) => ({
      name,
      ...block,
      value: getValue(block.address, block.size)
    }));

    return {
      blocks,
      totalSize: _memPointer,
      freeSpace: 65536 - _memPointer
    };
  }

  function print() {
    return {
      memoryMap: getMemoryMap(),
      memArray: memArray.value,
      memPointer: _memPointer
    };
  }

  return {
    addVariable,
    getVariable,
    setValue,
    getValue,
    allocateBlock,
    subscribe,
    getMemoryMap,
    print
  };
}

function Tokenizer(input) {
  var index = 0;
  var length = input.length;
  var whitespace = /\s+/;
  var validToken = /\S+/;

  var tokenBuffer = [];
  var currentToken = null;
  var processedTokenBuffer = [];

  function skipWhitespace() {
    while (whitespace.test(input[index]) && index < length) {
      index++;
    }
  }

  // Does input have these characters at this index?
  function hasCharsAtIndex(tokens, startIndex) {
    for (var i = 0; i < tokens.length; i++) {
      if (input[startIndex + i] != tokens[i]) {
        return false;
      }
    }
    return true;
  }

  function processString() {
    var value = "";
    index += 3; // skip over ." and space
    while (input[index] !== '"' && index < length) {
      value += input[index];
      index++;
    }
    index++; // skip over final "
    return value;
  }

  function processParenComment() {
    index += 2; // skip over ( and space
    while (input[index] !== ')' && index < length) {
      index++;
    }

    index++; // skip over final )
  }

  function processNormalToken() {
    var value = "";
    while (validToken.test(input[index]) && index < length) {
      value += input[index];
      index++;
    }
    return value;
  }

  function getNextToken(forward = true) {
    if (forward && currentToken) {
      processedTokenBuffer.push(currentToken);
      currentToken = null;
    }

    skipWhitespace();
    var isStringLiteral = hasCharsAtIndex('." ', index);
    var isParenComment = hasCharsAtIndex('( ', index);
    var isSlashComment = hasCharsAtIndex('\\ ', index);

    var value = "";

    if (isStringLiteral) {
      value = processString();
    } else if (isParenComment) {
      processParenComment();
      return getNextToken(); // ignore this token and return the next one
    } else if (isSlashComment) {
      value = null;
    } else {
      value = processNormalToken();
    }

    if (!value) {
      return null;
    }

    const token = {
      value: value,
      isStringLiteral: isStringLiteral
    };

    if (forward) {
      currentToken = token;
    }
    return token;
  }
  

  function peekToken(n = 1) {
    while (tokenBuffer.length < n) {
      const token = getNextToken(false);
      if (token === null) return null;
      tokenBuffer.push(token);
    }
    return tokenBuffer[n - 1];
  }

  function nextToken() {
    if (tokenBuffer.length > 0) {
      return tokenBuffer.shift();
    }
    return getNextToken();
  }

  function previousToken() {
    return processedTokenBuffer.pop();
  }

  return {
    nextToken: nextToken,
    peekToken: peekToken,
    previousToken: previousToken
  };
}

function addPredefinedWords(addToDictionary, readLines, next) {
  console.log("Adding predefined words...", { next }); 
  
  function controlCode(code) {
    return {
      isControlCode: true,
      code: code
    };
  }

  [
    ":", ";", "if", "else", "then", "do", "loop",
    "+loop", "begin", "until", "variable", "constant", "key"
  ].forEach(function (code) {
    addToDictionary(code, controlCode(code));
  });

  addToDictionary(".",  function (context) {
    return context.stack.pop() + " ";
  });

  addToDictionary(".s", function (context) {
    return "\n" + context.stack.print();
  });

  addToDictionary("+", function (context) {
    context.stack.push(context.stack.pop() + context.stack.pop());
  });

  addToDictionary("-", function (context) {
    var a = context.stack.pop(), b = context.stack.pop();
    context.stack.push(b - a);
  });

  addToDictionary("*", function (context) {
    context.stack.push(context.stack.pop() * context.stack.pop());
  });

  addToDictionary("/", function (context) {
    var a = context.stack.pop(), b = context.stack.pop();
    context.stack.push(Math.floor(b / a));
  });

  addToDictionary("/mod", function (context) {
    var a = context.stack.pop(), b = context.stack.pop();
    context.stack.push(Math.floor(b % a));
    context.stack.push(Math.floor(b / a));
  });

  addToDictionary("mod", function (context) {
    var a = context.stack.pop(), b = context.stack.pop();
    context.stack.push(Math.floor(b % a));
  });

  addToDictionary("=", function (context) {
    context.stack.push(context.stack.pop() === context.stack.pop() ? TRUE : FALSE);
  });

  addToDictionary("<", function (context) {
    var a = context.stack.pop(), b = context.stack.pop();
    context.stack.push(b < a ? TRUE : FALSE);
  });

  addToDictionary(">", function (context) {
    var a = context.stack.pop(), b = context.stack.pop();
    context.stack.push(b > a ? TRUE : FALSE);
  });

  addToDictionary("and", function (context) {
    var a = context.stack.pop(), b = context.stack.pop();
    context.stack.push(b & a);
  });

  addToDictionary("or", function (context) {
    var a = context.stack.pop(), b = context.stack.pop();
    context.stack.push(b | a);
  });

  addToDictionary("invert", function (context) {
    // invert is bitwise not
    context.stack.push(~context.stack.pop());
  });

  addToDictionary("i", function (context) {
    context.stack.push(context.returnStack.peek(1));
  });

  addToDictionary("j", function (context) {
    context.stack.push(context.returnStack.peek(2));
  });

  // I don't understand the difference between i and r@
  // http://www.forth.com/starting-forth/sf5/sf5.html
  addToDictionary("r@", function (context) {
    context.stack.push(context.returnStack.peek(1));
  });

  addToDictionary(">r", function (context) {
    context.returnStack.push(context.stack.pop());
  });

  addToDictionary("r>", function (context) {
    context.stack.push(context.returnStack.pop());
  });

  addToDictionary("emit", function (context) {
    return String.fromCharCode(context.stack.pop());
  });

  addToDictionary("swap", function (context) {
    var a = context.stack.pop(), b = context.stack.pop();
    context.stack.push(a);
    context.stack.push(b);
  });

  addToDictionary("dup", function (context) {
    var a = context.stack.pop();
    context.stack.push(a);
    context.stack.push(a);
  });

  addToDictionary("over", function (context) {
    var a = context.stack.pop(), b = context.stack.pop();
    context.stack.push(b);
    context.stack.push(a);
    context.stack.push(b);
  });

  addToDictionary("rot", function (context) {
    var a = context.stack.pop(), b = context.stack.pop(), c = context.stack.pop();
    context.stack.push(b);
    context.stack.push(a);
    context.stack.push(c);
  });

  addToDictionary("drop", function (context) {
    context.stack.pop();
  });

  addToDictionary("!", function (context) {
    var address = context.stack.pop();
    var value = context.stack.pop();
    context.memory.setValue(address, value);
    context.onMemoryChange && context.onMemoryChange(address, value);
  });

  addToDictionary("@", function (context) {
    var address = context.stack.pop();
    context.stack.push(context.memory.getValue(address));
  });

  addToDictionary("allot", function (context) {
    context.memory.allot(context.stack.pop());
  });

  addToDictionary("key", function (context) {
    context.pause = true;

    // set callback for when key is pressed
    context.keydown = function (keyCode) {
      context.pause = false;
      context.keydown = null;
      context.stack.push(keyCode);
      context.onContinue();
    };
  });

  addToDictionary("sleep", function (context) {
    var timeout = context.stack.pop();
    context.pause = true;

    setTimeout(function () {
      context.pause = false;
      context.onContinue();
    }, timeout);
  });

  addToDictionary("random", function (context) {
    var range = context.stack.pop();
    context.stack.push(Math.floor(Math.random() * range));
  });

  // readLines([
  //   ": cells   1 * ;",
  //   ": cr      10 emit ;",
  //   ": space   32 emit ;",
  //   ": spaces  0 do space loop ;",
  //   ": 0=      0 = ;",
  //   ": 0<      0 < ;",
  //   ": 0>      0 > ;",
  //   ": ?dup    dup if dup then ;",
  //   ": 2dup    over over ;",
  //   ": 1+      1 + ;",
  //   ": 1-      1 - ;",
  //   ": 2+      2 + ;",
  //   ": 2-      2 - ;",
  //   ": 2*      2 * ;",
  //   ": 2/      2 / ;",
  //   ": negate  -1 * ;",
  //   ": abs     dup 0< if negate then ;",
  //   ": min     2dup < if drop else swap drop then ;",
  //   ": max     2dup < if swap drop else drop then ;",
  //   ": ?       @ . ;",
  //   ": +!      dup @ rot + swap ! ;",

  //   "variable  graphics", // start of graphics memory
  //   "575 cells allot", // graphics memory takes 24 * 24 = 576 cells altogether
  //   "variable  last-key", // create last-key variable for keyboard input
  //   "drop",
  // ], next);

  addToDictionary("is", controlCode("is"));
  addToDictionary("isNow", controlCode("isNow"));
  // addToDictionary("now", controlCode("now"));
  addToDictionary("~", controlCode("~"));

  addToDictionary("define", function (context) {
    var word = context.stack.pop();
    var definition = context.stack.pop();
    context.dictionary.add(word, definition);
  });

  addToDictionary("transform", function (context) {
    var word = context.stack.pop();
    var newDefinition = context.stack.pop();
    context.dictionary.redefine(word, newDefinition);
  });

  addToDictionary("echo", function (context) {
    return context.stack.pop();
  });

  addToDictionary("key", function (context) {
    context.pause = true;

    // set callback for when key is pressed
    context.keydown = function (keyCode) {
      context.pause = false;
      context.keydown = null;
      context.stack.push(keyCode);
      context.onContinue();
    };
  });

  addToDictionary("sleep", function (context) {
    var timeout = context.stack.pop();
    context.pause = true;

    setTimeout(function () {
      context.pause = false;
      context.onContinue();
    }, timeout);
  });

  addToDictionary("random", function (context) {
    var range = context.stack.pop();
    context.stack.push(Math.floor(Math.random() * range));
  });

    // Add this to the predefined words
  addToDictionary('.s"', function(context) {
    // Get the next token which should be the string
    const nextToken = context.nextToken();
    if (!nextToken) {
      throw new Error('String literal expected after .s"');
    }
    // Put the string value on the stack
    context.stack.push('string url');
  });

addToDictionary('"', function(context) {
  // The tokenizer should provide the string content between quotes
  const stringContent = context.nextToken();
  if (!stringContent) {
    throw new Error('Unexpected end of input after quote');
  }
  context.stack.push(stringContent);
});

console.log("Finished adding predefined words, calling next/readline");  // Add this debug log


  // readLines([
  //   ": cells   1 * ;",
  //   ": cr      10 emit ;",
  //   ": space   32 emit ;",
  //   ": spaces  0 do space loop ;",
  //   ": 0=      0 = ;",
  //   ": 0<      0 < ;",
  //   ": 0>      0 > ;",
  //   ": ?dup    dup if dup then ;",
  //   ": 2dup    over over ;",
  //   ": 1+      1 + ;",
  //   ": 1-      1 - ;",
  //   ": 2+      2 + ;",
  //   ": 2-      2 - ;",
  //   ": 2*      2 * ;",
  //   ": 2/      2 / ;",
  //   ": negate  -1 * ;",
  //   ": abs     dup 0< if negate then ;",
  //   ": min     2dup < if drop else swap drop then ;",
  //   ": max     2dup < if swap drop else drop then ;",
  //   ": ?       @ . ;",
  //   ": +!      dup @ rot + swap ! ;",

  //   "variable  graphics", // start of graphics memory
  //   "575 cells allot", // graphics memory takes 24 * 24 = 576 cells altogether
  //   "variable  last-key", // create last-key variable for keyboard input
  // ], next);

  console.log("About to call readLines with basic definitions");
  readLines(
    [": cells   1 * ;", "variable  last-key"],
    {
      lineCallback: (line) => console.log("Processing line:", line),
      outputCallback: (output) => console.log("Line output:", output)
    },
    () => {
      console.log("Predefined words initialization completed");
    }
  );

  console.log("Called readLines");
}

/*
* compile works by first calling compileControlStructures to turn the
* flat sequence of actions into a nested arrangement of control structures.
*
* Main: one body, executed once
* Conditional: two bodies, executed conditional on top stack value
* DoLoop: one body, executed multiple times based on top stack values
*
* For example, the following input:
*
*    : foo  -1 if 10 0 do i . loop 2 then 1 ;
*
* would be transformed into the following structure:
*
*    Main {
*      body: [
*        Action { -1 },
*        Conditional {
*          consequent: [
*            Action { 10 },
*            Action { 0 },
*            DoLoop {
*              body: [ Action { i }, Action { . } ]
*            },
*            Action { 0 }
*          ]
*          alternative: []
*        },
*        Action { 1 }
*      ]
*    }
*
* Each control structure has its own execute method, which (with the help
* of executeActions) executes the appropriate child control structures.
*
*/

function UnbalancedControlStructureError() {
  this.message = "Unbalanced control structure";
}

function compile(dictionary, actions, isPermanent) {
  function executeActions(actions, context, next) {
    function nextIteration(remainingActions) {
      if (remainingActions.length === 0) { // no actions left to execute
        next();
      } else {
        remainingActions[0].execute(context, function (o) {
          context.addOutput(o);

          if (context.pause) {
            context.onContinue = function () {
              nextIteration(remainingActions.slice(1));
            };
          } else {
            nextIteration(remainingActions.slice(1));
          }
        });
      }
    }

    nextIteration(actions);
  }

  function Main(isPermanent) {
    this.body = [];
    this.isPermanent = isPermanent;

    this.execute = function (context, next) {
      executeActions(this.body, context, next);
    };
  }

  function Conditional(parentContext, parentControlStructure) {
    this.parentContext = parentContext;
    this.parentControlStructure = parentControlStructure;
    this.consequent = [];
    this.alternative = [];

    this.execute = function (context, next) {
      if (context.stack.pop() !== FALSE) {
        executeActions(this.consequent, context, next);
      } else {
        executeActions(this.alternative, context, next);
      }
    };
  }

  function DoLoop(parentContext, parentControlStructure) {
    this.parentContext = parentContext;
    this.parentControlStructure = parentControlStructure;
    this.body = [];
    this.isPlusLoop = false;

    this.execute = function (context, next) {
      var startIndex = context.stack.pop();
      var endIndex = context.stack.pop();
      var i = startIndex;

      var forwards = endIndex > startIndex;

      var nextIteration = function () {
        if ((forwards && i < endIndex) || (!forwards && i >= endIndex)) {
          context.returnStack.push(i);
          executeActions(this.body, context, function (o) {
            context.returnStack.pop();

            // +loop increments i by stack value
            if (this.isPlusLoop) {
              i += context.stack.pop();
            } else { // loop increments i by 1
              i++;
            }

            nextIteration();
          }.bind(this));
        } else {
          next();
        }
      }.bind(this);

      setTimeout(nextIteration, 0);
    };
  }

  function BeginUntil(parentContext, parentControlStructure) {
    this.parentContext = parentContext;
    this.parentControlStructure = parentControlStructure;
    this.body = [];

    this.execute = function (context, next) {
      var nextIteration = function () {
        executeActions(this.body, context, function (o) {
          if (context.stack.pop() === TRUE) {
            next();
          } else {
            nextIteration();
          }
        });
      }.bind(this);

      setTimeout(nextIteration, 0);
    };
  }

  function Action(action) {
    this.name = action._name; // expose name for easy debugging

    this.execute = function (context, next) {
      if (action.length == 2) { // has next callback
        action(context, next);
      } else {
        next(action(context));
      }
    };
  }

  // compileControlStructures converts a one-dimensional list of actions interspersed with
  // controlCodes into a nested format with Main, DoLoop, BeginUntil, and Conditional structures.
  // Every action is wrapped in an Action structure.
  function compileControlStructures(actions, isPermanent) {
    var main = new Main(isPermanent);
    var currentContext = main.body;
    var currentControlStructure = main;

    actions.forEach(function (action) {
      if (action.isControlCode) {
        switch (action.code) {
          case "if":
            currentControlStructure = new Conditional(currentContext, currentControlStructure);
            currentContext.push(currentControlStructure);
            // context is conditional consequent now
            currentContext = currentControlStructure.consequent;
            break;
          case "do":
            currentControlStructure = new DoLoop(currentContext, currentControlStructure);
            currentContext.push(currentControlStructure);
            // context is loop body now
            currentContext = currentControlStructure.body;
            break;
          case "begin":
            currentControlStructure = new BeginUntil(currentContext, currentControlStructure);
            currentContext.push(currentControlStructure);
            // context is loop body now
            currentContext = currentControlStructure.body;
            break;
          case "else":
            // context is conditional alternative now
            currentContext = currentControlStructure.alternative;
            break;
          case "+loop":
            // +loop is special case of loop
            currentControlStructure.isPlusLoop = true;
            // fallthrough
          case "then":
          case "loop":
          case "until":
            // context is parent context now
            currentContext = currentControlStructure.parentContext;
            currentControlStructure = currentControlStructure.parentControlStructure;
            break;
        }
      } else {
        currentContext.push(new Action(action));
      }
    });

    if (currentControlStructure !== main) {
      throw new UnbalancedControlStructureError();
    }

    return main;
  }

  var main = compileControlStructures(actions, isPermanent);

  return function (context, next) {
    main.execute(context, next);
  };
}

const LogLevel = {
  TRACE: -1,
  DEBUG: 0,
  INFO: 1, 
  WARN: 2,
  ERROR: 3
};

function createLogger(initialLevel = LogLevel.INFO) {
  const logs = [];
  let currentLevel = initialLevel;
  let logCallback = null;

  function addLog(level, category, message, data = null) {
    if (level === LogLevel.ERROR) {
      console.error(category, message, data);
    } 
    if (level >= currentLevel) {
      const entry = {
        timestamp: new Date().toISOString(),
        level: getLevelName(level),
        category,
        message,
        data
      };
      logs.push(entry);
      
      if (logCallback) {
        logCallback(entry);
      }
    }
  }

  function getLevelName(level) {
    return Object.entries(LogLevel).find(([_, value]) => value === level)?.[0] || 'UNKNOWN';
  }

  function setLevel(level) {
    currentLevel = level;
  }

  function getLogs(level = null) {
    if (level === null) {
      return [...logs];
    }
    return logs.filter(log => LogLevel[log.level] >= level);
  }

  function clearLogs() {
    logs.length = 0;
  }

  function setLogCallback(callback) {
    logCallback = callback;
  }

  return {
    debug: (category, message, data) => addLog(LogLevel.DEBUG, category, message, data),
    info: (category, message, data) => addLog(LogLevel.INFO, category, message, data),
    warn: (category, message, data) => addLog(LogLevel.WARN, category, message, data),
    error: (category, message, data) => addLog(LogLevel.ERROR, category, message, data),
    trace: (category, message, data) => addLog(LogLevel.TRACE, category, message, data),
    setLevel,
    getLogs,
    clearLogs,
    setLogCallback
  };
}

class DeviceManager {
  constructor() {
    this.devices = d(new Map());
    this.portMap = d(new Map());
    this.nextPortAddress = d(0x1000); // Start device memory at 0x1000
  }

  registerDevice(device) {
    // Validate device
    if (!device.namespace || !device.ports) {
      throw new Error("Device must have namespace and ports defined");
    }

    // Assign port addresses
    const portAddresses = new Map();
    for (const [portName, portConfig] of Object.entries(device.ports)) {
      const address = this.nextPortAddress.value;
      portAddresses.set(portName, address);
      this.portMap.value.set(address, {
        device: device.namespace,
        port: portName,
        ...portConfig
      });
      this.nextPortAddress.value += portConfig.size || 1;
    }

    // Register device
    device.setPortAddresses(portAddresses);
    this.devices.value.set(device.namespace, device);

    return device;
  }

  unregisterDevice(namespace) {
    const device = this.devices.value.get(namespace);
    if (!device) return;

    // Remove port mappings
    for (const [address, mapping] of this.portMap.value.entries()) {
      if (mapping.device === namespace) {
        this.portMap.value.delete(address);
      }
    }

    this.devices.value.delete(namespace);
  }

  getDevice(namespace) {
    return this.devices.value.get(namespace);
  }

  getPortMapping(address) {
    return this.portMap.value.get(address);
  }

  // This method will be called by the VM to register device words
  registerDeviceWords(addWordCallback) {
    for (const device of this.devices.value.values()) {
      device.registerWords(addWordCallback);
    }
  }
}

class AwwVM {
  constructor(hydraInstance) {
    if (!(this instanceof AwwVM)) {
      console.warn("Aww called without new");
      return new AwwVM(hydraInstance);
    }

    // Signals for state management
    this.output = d("");
    this.stack = d(Stack("Argument Stack"));
    this.returnStack = d(Stack("Return Stack"));
    this.dictionary = d(Dictionary());
    this.memory = d(Memory());
    this.paused = d(false);
    this.parsedTokens = d([]);
    this.logs = d([]);
    this.currentDefinition = d(null); // For multi-line definitions

    this.logger = createLogger(LogLevel.TRACE);
    this.logger.setLogCallback((log) => {
      this.logs.value = [...this.logs.value, log]; // Add new log to the array
    });

    // Computed signal for dictionary printing (for efficiency)
    this.dictionaryString = w(() => this.dictionary.value.print());

    // Add device manager
    this.deviceManager = new DeviceManager();

    // Initialize predefined words
    addPredefinedWords(
      (name, definition, isPermanent) =>
        this.addToDictionary(name, definition, isPermanent),
      (lines) => this.readLines(lines)
    );

    // Register device words after predefined words
    this.deviceManager.registerDeviceWords(
      (name, definition, isPermanent) =>
        this.addToDictionary(name, definition, isPermanent)
    );
  }

  readLine(line) {
    this.logger.info("Input", `Processing line: ${line}`);
    const tokenizer = new Tokenizer(line);
    this.parsedTokens.value = []; // Clear parsed tokens for the new line

    // Use a loop instead of recursion
    while (true) {
      const token = tokenizer.nextToken();
      if (!token) break;
      const action = this.tokenToAction(token, tokenizer);

      if (this.currentDefinition.value) {
        this.addActionToCurrentDefinition(action, tokenizer);
      } else {
        this.executeRuntimeAction(action, tokenizer);
      }

      if (this.paused.value) {
        // Pause execution if requested by an action (like await)
        break;
      }
    }

    if (!this.currentDefinition.value) {
      this.output.value += " ok";
    }

    return {
      output: this.output.value,
      stack: this.stack.value.print(),
      parsedTokens: this.parsedTokens.value,
      memory: this.memory.value,
      dictionary: this.dictionary.value,
    };
  }

  readLines(codeLines) {
    let results = [];
    for (const line of codeLines) {
      results.push(this.readLine(line));
    }
    return results; // Return array of results for each line
  }

  tokenToAction(token, tokenizer) {
    if (!token) return null;
    if (token.value === undefined) return null;

    const word = token.value;
    const definition = this.dictionary.value.lookup(word);

    this.logger.trace(
      "tokenToAction",
      `Token: ${JSON.stringify(token)} -> Definition: ${
        definition?.name || "null"
      }`
    );

    if (token.isStringLiteral) {
      return this.createWord(word, "String", (context) => {
        context.stack.push(word);
      });
    } else if (definition !== null) {
      return definition;
    } else if (isFinite(word)) {
      return this.createWord(word, "Number", (context) => {
        context.stack.push(+word);
      });
    }

    this.logger.trace(
      "tokenToAction",
      `Token: ${JSON.stringify(token)} -> null`
    );
    return null;
  }

  addToDictionary(name, definition, isPermanent = false) {
    this.logger.debug("Dictionary", `Adding word: ${name}`, { isPermanent });
    const newWord =
      definition instanceof AwwWord
        ? definition
        : typeof definition === "function"
        ? this.createWord(name, "UserDefined", definition)
        : definition && definition.code // Check for control code object
        ? this.controlCode(definition.code)
        : null;

    if (newWord) {
      this.dictionary.value.add(name, newWord, isPermanent);
    } else {
      throw new Error(`Invalid definition type for word: ${name}`);
    }
  }

  // compile actions into definition and add definition to dictionary
  compileAndAddToDictionary(name, actions, isPermanent = false) {
    var definition = compile(context.dictionary, actions);
    addToDictionary(name, definition, isPermanent);
  }

  createVariable(name) {
    const pointer = this.memory.value.addVariable(name);
    this.logger.debug("Memory", `Creating variable: ${name}`, { pointer });
    this.addToDictionary(name, (context) => {
      context.stack.push(pointer);
    });
  }

  createConstant(name, value) {
    this.logger.debug("Memory", `Creating constant: ${name}`, { value });
    this.addToDictionary(name, (context) => {
      context.stack.push(value);
    });
  }

  startDefinition(name, isPermanent = false) {
    this.logger.debug("Compiler", `Starting definition: ${name}`, {
      isPermanent,
    });
    this.currentDefinition.value = { name, actions: [], isPermanent };
  }

  endDefinition() {
    if (!this.currentDefinition.value) {
      throw new Error("Attempting to end a definition without starting one.");
    }
    this.logger.debug(
      "Compiler",
      `Ending definition: ${this.currentDefinition.value.name}`
    );
    const { name, actions, isPermanent } = this.currentDefinition.value;
    const definition = compile(this.dictionary.value, actions); // Pass the dictionary signal value
    this.addToDictionary(name, definition, isPermanent);
    this.currentDefinition.value = null;
  }

  addActionToCurrentDefinition(action, tokenizer) {
    if (!this.currentDefinition.value) {
      throw new Error("Trying to add action to undefined currentDefinition");
    }
    if (action.code === ";") {
      this.endDefinition();
    } else {
      this.currentDefinition.value.actions.push(action);
    }
  }

  executeRuntimeAction(action, tokenizer) {
    this.logger.debug("Runtime", `Executing action: ${action?._name}`);

    if (!action) return; // Handle null actions

    if (action?._token) {
      this.parsedTokens.value = [...this.parsedTokens.value, action._token]; // Use spread operator for immutability
    }

    if (action instanceof AwwWord) {
      action.execute({
        // Pass context as an object
        stack: this.stack.value,
        returnStack: this.returnStack.value,
        memory: this.memory.value,
        dictionary: this.dictionary.value,
        output: this.output, // Pass the output signal
        logger: this.logger,
        pause: this.paused, //  Pass the pause signal
      });
    } else if (action && action.isControlCode) {
      switch (action.code) {
        case "variable":
          this.createVariable(tokenizer.nextToken().value);
          break;
        case "constant":
          this.createConstant(
            tokenizer.nextToken().value,
            this.stack.value.pop()
          );
          break;
        case ":":
          this.startDefinition(tokenizer.nextToken().value);
          break;
        case ";":
          this.endDefinition();
          break;
        default:
          throw new Error("Unknown control code: " + action.code);
      }
    } else {
      // Handle other action types if needed
      console.error("Invalid action:", action);
      throw new Error("Invalid action encountered during execution.");
    }
  }

  createWord(name, prefix, func) {
    this.logger.trace("namedFunction", `Creating named function: ${name}`, {
      prefix,
    });

    return new AwwWord({
      name,
      prefix,
      implementation: func,
    });
  }

  controlCode(code) {
    return new AwwWord({
      name: code,
      isControlCode: true,
      code,
      implementation: () => ({ code }),
    });
  }

  attachDevice(device) {
    return this.deviceManager.registerDevice(device);
  }

  detachDevice(namespace) {
    this.deviceManager.unregisterDevice(namespace);
  }
}

class AwwWord {
  constructor({
    name,
    prefix = null,
    implementation,
    isControlCode = false,
    code = null,
  }) {
    this.name = name;
    this.prefix = prefix;
    this._implementation = implementation;
    this.isControlCode = isControlCode;
    this.code = code;
  }

  execute(context) {
    // No 'next' callback
    console.log(`AwwWord.execute() called for word: ${this.name}`);

    if (this.isControlCode) {
      console.log(`AwwWord Control code execution for: ${this.code}`);
      return { code: this.code }; // Return the control code object directly. No execution yet
    }
    this._implementation(context); // Directly call the implementation
  }

  toString() {
    console.log(`AwwWord toString for: ${this.name}`);

    if (this.isControlCode) {
      return `[Control: ${this.code}]`;
    }

    const prefixStr = this.prefix ? `${this.prefix} ` : "";
    if (!this._implementation) {
      console.warn(`No implementation for word: ${this.name}`);
      return `${prefixStr}${this.name}`;
    }

    // Avoid calling toString() on AwwWord instances
    // inifinit recursion!!!
    let funcStr;
    if (typeof this._implementation === "function") {
      funcStr = this._implementation
        .toString()
        .replace(/^\s*function\s*\([^)]*\)\s*{\s*([\s\S]*?)\s*}\s*$/, "$1") // Extract function body
        .trim()
        .split("\n")
        .map((line) => line.trim())
        .join(" ");
    } else if (this._implementation instanceof AwwWord) {
      funcStr = `<AwwWord ${this._implementation.name}>`;
    } else {
      funcStr = "[Unknown Implementation]";
    }

    return `${prefixStr}${this.name} ( ${funcStr} )`;
  }

  get _name() {
    return this.prefix ? `${this.prefix} ${this.name}` : this.name;
  }
  get _token() {
    return this.name;
  }
  get _prefix() {
    return this.prefix;
  }
}

class GraphicsDevice extends Device {
  constructor($canvas) {
    super("graphics");

    if (!$canvas.length) {
      return null;
    }

    this.canvas = $canvas[0];
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.widthInBlocks = 24;
    this.heightInBlocks = 24;
    this.blockSize = this.width / this.widthInBlocks;

    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawPixel(offset, value) {
    var x = offset % this.widthInBlocks;
    var y = Math.floor(offset / this.widthInBlocks);

    var color = value ? 'white' : 'black';
    this.ctx.fillStyle = color;

    this.ctx.fillRect(x * this.blockSize, y * this.blockSize, this.blockSize, this.blockSize);
  } 
}

let Device$1 = class Device {
  constructor(namespace) {
    this.namespace = namespace;
    this.ports = {}; // Will be defined by child classes
    this.portAddresses = null; // Will be set by DeviceManager
    this.portSubscriptions = new Map();
  }

  setPortAddresses(addresses) {
    this.portAddresses = addresses;
  }

  getPortAddress(portName) {
    return this.portAddresses?.get(portName);
  }

  // Helper methods for port value handling
  setPortValue(portName, value) {
    const address = this.getPortAddress(portName);
    const portConfig = this.ports[portName];
    
    if (!address || !portConfig) {
      throw new Error(`Invalid port: ${portName}`);
    }

    if (portConfig.access === 'read') {
      throw new Error(`Port ${portName} is read-only`);
    }

    this.context.memory.setValue(address, value, portConfig.size || 1);
  }

  getPortValue(portName) {
    const address = this.getPortAddress(portName);
    const portConfig = this.ports[portName];
    
    if (!address || !portConfig) {
      throw new Error(`Invalid port: ${portName}`);
    }

    return this.context.memory.getValue(address, portConfig.size || 1);
  }

  // Subscribe to port changes
  subscribeToPort(portName, callback) {
    const address = this.getPortAddress(portName);
    const portConfig = this.ports[portName];
    
    if (!address || !portConfig) {
      throw new Error(`Invalid port: ${portName}`);
    }

    const unsubscribe = this.context.memory.subscribe(address, (value) => {
      callback(value, portConfig);
    });

    this.portSubscriptions.set(portName, unsubscribe);
    return unsubscribe;
  }

  // Clean up subscriptions
  cleanup() {
    for (const unsubscribe of this.portSubscriptions.values()) {
      unsubscribe();
    }
    this.portSubscriptions.clear();
  }

  // Override these in child classes
  registerWords(addWordCallback) {}
  initialize(context) {
    this.context = context;
  }
};

class MouseDevice extends Device$1 {
  constructor() {
    super("mouse");

    // Define ports
    this.ports = {
      "x": { size: 2, access: "read", description: "Mouse X position" },
      "y": { size: 2, access: "read", description: "Mouse Y position" },
      "scrollx": { size: 2, access: "read", description: "Horizontal scroll position" },
      "scrolly": { size: 2, access: "read", description: "Vertical scroll position" },
      "state": { size: 1, access: "read", description: "Mouse button state" }
    };

    // Initial values
    this.mouseState = {
      x: 0,
      y: 0,
      scrollx: 0,
      scrolly: 0,
      state: 0
    };
  }

  initialize(context) {
    super.initialize(context);

    // Set initial values
    this.updateMousePorts();

    // Add event listeners for mouse events
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('mousedown', this.handleMouseDown.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    window.addEventListener('wheel', this.handleMouseWheel.bind(this));
  }

  updateMousePorts() {
    this.setPortValue("x", this.mouseState.x);
    this.setPortValue("y", this.mouseState.y);
    this.setPortValue("scrollx", this.mouseState.scrollx);
    this.setPortValue("scrolly", this.mouseState.scrolly);
    this.setPortValue("state", this.mouseState.state);
  }

  handleMouseMove(event) {
    this.mouseState.x = event.clientX;
    this.mouseState.y = event.clientY;
    this.updateMousePorts();
  }

  handleMouseDown(event) {
    this.mouseState.state = 1; // Example: 1 for button down
    this.updateMousePorts();
  }

  handleMouseUp(event) {
    this.mouseState.state = 0; // Example: 0 for button up
    this.updateMousePorts();
  }

  handleMouseWheel(event) {
    this.mouseState.scrollx += event.deltaX;
    this.mouseState.scrolly += event.deltaY;
    this.updateMousePorts();
  }
}

class TimeDevice extends Device$1 {
  constructor() {
    super("time");

    // Define ports
    this.ports = {
      "year": { size: 2, access: "read", description: "Current year" },
      "month": { size: 1, access: "read", description: "Current month" },
      "day": { size: 1, access: "read", description: "Current day" },
      "hour": { size: 1, access: "read", description: "Current hour" },
      "minute": { size: 1, access: "read", description: "Current minute" },
      "second": { size: 1, access: "read", description: "Current second" },
      "dotw": { size: 1, access: "read", description: "Day of the week" }
    };
  }

  initialize(context) {
    super.initialize(context);

    // Set initial values
    this.updateTimePorts();

    // Update time every second
    setInterval(() => this.updateTimePorts(), 1000);
  }

  updateTimePorts() {
    const now = new Date();
    this.setPortValue("year", now.getFullYear());
    this.setPortValue("month", now.getMonth() + 1); // Months are 0-indexed
    this.setPortValue("day", now.getDate());
    this.setPortValue("hour", now.getHours());
    this.setPortValue("minute", now.getMinutes());
    this.setPortValue("second", now.getSeconds());
    this.setPortValue("dotw", now.getDay()); // Sunday is 0, Saturday is 6
  }
}

class SimpleAudioSynth extends Device$1 {
  constructor() {
    super("simpleAudioSynth");

    // Define ports for different frequencies
    this.ports = {
      "sine": { size: 1, access: "readwrite", description: "Sine wave toggle" },
      "square": { size: 1, access: "readwrite", description: "Square wave toggle" },
      "sawtooth": { size: 1, access: "readwrite", description: "Sawtooth wave toggle" },
      "triangle": { size: 1, access: "readwrite", description: "Triangle wave toggle" }
    };

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.oscillators = {};
  }

  initialize(context) {
    super.initialize(context);

    // Subscribe to port changes
    this.subscribeToPort("sine", (value) => this.toggleOscillator("sine", value));
    this.subscribeToPort("square", (value) => this.toggleOscillator("square", value));
    this.subscribeToPort("sawtooth", (value) => this.toggleOscillator("sawtooth", value));
    this.subscribeToPort("triangle", (value) => this.toggleOscillator("triangle", value));
  }

  toggleOscillator(type, value) {
    if (value === 1) {
      this.startOscillator(type);
    } else {
      this.stopOscillator(type);
    }
  }

  startOscillator(type) {
    if (!this.oscillators[type]) {
      const oscillator = this.audioContext.createOscillator();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime); // A4 frequency
      oscillator.connect(this.audioContext.destination);
      oscillator.start();
      this.oscillators[type] = oscillator;
    }
  }

  stopOscillator(type) {
    if (this.oscillators[type]) {
      this.oscillators[type].stop();
      this.oscillators[type].disconnect();
      delete this.oscillators[type];
    }
  }
}

class HydraDevice extends Device$1 {
  constructor(hydraInstance) {
    super("hydra");
    
    this.hydra = hydraInstance;

    this.currentChain = null;
    
    // Define ports
    this.ports = {
      "width": { size: 2, access: "read", description: "Canvas width" },
      "height": { size: 2, access: "read", description: "Canvas height" },
      "brightness": { 
        size: 1, 
        access: "readwrite", 
        description: "Output brightness",
        min: 0,
        max: 255
      }
    };
  }

  initialize(context) {
    super.initialize(context);
    
    if (!this.hydra) {
      throw new Error("Hydra instance required");
    }

    // Set initial values
    this.setPortValue("width", this.hydra.canvas.width);
    this.setPortValue("height", this.hydra.canvas.height);
    this.setPortValue("brightness", 255);

    // Subscribe to brightness changes
    this.subscribeToPort("brightness", (value) => {
      this.hydra.setBrightness(value / 255);
    });

    const hydra = new Hydra({ 
        makeGlobal: false,  // Important: we don't want to pollute global scope
        detectAudio: false,
        ...options
    });
    console.log('hydra Initialized', hydra);

    this.hydra = hydra;
    this.synth = hydra.synth;
  }


  registerWords(addWord) {  

    addWord(`osc`, (context) => {
        const [freq = 60, sync = 0.1, offset = 0] = context.stack.getArgs(3, [60, 0.1, 0]);
        console.log("osc() freq:", freq, "sync:", sync, "offset:", offset);
        this.currentChain = this.synth.osc(freq, sync, offset);
    });

    addWord(`solid`, (context) => {
        const [r = 0, g = 0, b = 0, a = 1] = context.stack.getArgs(4, [0, 0, 0, 1]);
        this.currentChain = this.synth.solid(r, g, b, a);
    });

    addWord(`noise`, (context) => {
        const [scale = 10, offset = 0.1] = context.stack.getArgs(2, [10, 0.1]);
        this.currentChain = this.synth.noise(scale, offset);
    });

        addWord(`voronoi`, (context) => {
        const [scale = 5, speed = 0.3, blending = 0.3] = context.stack.getArgs(3, [5, 0.3, 0.3]);
        this.currentChain = this.synth.voronoi(scale, speed, blending);
    });

    addWord(`shape`, (context) => {
        const [sides = 3, radius = 0.3, smoothing = 0.01] = context.stack.getArgs(3, [3, 0.3, 0.01]);
        this.currentChain = this.synth.shape(sides, radius, smoothing);
    });

    // Geometry
    addWord(`rotate`, (context) => {
        const [angle = 10, speed = 0] = context.stack.getArgs(2, [10, 0]);
        if (!this.currentChain) throw new Error("No active hydra chain");
        this.currentChain = this.currentChain.rotate(angle, speed);
    });

    addWord(`scale`, (context) => {
        const [amount = 1.5] = context.stack.getArgs(1, [1.5]);
        if (!this.currentChain) throw new Error("No active hydra chain");
        this.currentChain = this.currentChain.scale(amount);
    });

    addWord(`pixelate`, (context) => {
        const [pixelX = 20, pixelY = 20] = context.stack.getArgs(2, [20, 20]);
        if (!this.currentChain) throw new Error("No active hydra chain");
        this.currentChain = this.currentChain.pixelate(pixelX, pixelY);
    });

    addWord(`kaleid`, (context) => {
        const [nSides = 4] = context.stack.getArgs(1, [4]);
        if (!this.currentChain) throw new Error("No active hydra chain");
        this.currentChain = this.currentChain.kaleid(nSides);
    });

    // Color
    addWord(`colorama`, (context) => {
        const [amount = 0.005] = context.stack.getArgs(1, [0.005]);
        if (!this.currentChain) throw new Error("No active hydra chain");
        this.currentChain = this.currentChain.colorama(amount);
    });

    addWord(`contrast`, (context) => {
        const [amount = 1.6] = context.stack.getArgs(1, [1.6]);
        if (!this.currentChain) throw new Error("No active hydra chain");
        this.currentChain = this.currentChain.contrast(amount);
    });

    addWord(`brightness`, (context) => {
        const [amount = 0.4] = context.stack.getArgs(1, [0.4]);
        if (!this.currentChain) throw new Error("No active hydra chain");
        this.currentChain = this.currentChain.brightness(amount);
    });

    addWord(`posterize`, (context) => {
        const [bins = 3, gamma = 0.6] = context.stack.getArgs(2, [3, 0.6]);
        if (!this.currentChain) throw new Error("No active hydra chain");
        this.currentChain = this.currentChain.posterize(bins, gamma);
    });

    // Blend modes
    addWord(`blend`, (context) => {
        const [texture, amount = 0.5] = context.stack.getArgs(2, [null, 0.5]);
        if (!this.currentChain) throw new Error("No active hydra chain");
        this.currentChain = this.currentChain.blend(texture, amount);
    });

    addWord(`diff`, (context) => {
        const [texture] = context.stack.getArgs(1, [null]);
        if (!this.currentChain) throw new Error("No active hydra chain");
        this.currentChain = this.currentChain.diff(texture);
    });

    addWord(`mult`, (context) => {
        const [texture, amount = 1] = context.stack.getArgs(2, [null, 1]);
        if (!this.currentChain) throw new Error("No active hydra chain");
        this.currentChain = this.currentChain.mult(texture, amount);
    });

    addWord(`add`, (context) => {
        const [texture, amount = 0.5] = context.stack.getArgs(2, [null, 0.5]);
        if (!this.currentChain) throw new Error("No active hydra chain");
        this.currentChain = this.currentChain.add(texture, amount);
    });

    // Modulate
    addWord(`modulate`, (context) => {
        const [texture, amount = 0.1] = context.stack.getArgs(2, [null, 0.1]);
        if (!this.currentChain) throw new Error("No active hydra chain");
        this.currentChain = this.currentChain.modulate(texture, amount);
    });

    addWord(`modulateScale`, (context) => {
        const [texture, multiple = 1, offset = 1] = context.stack.getArgs(3, [null, 1, 1]);
        if (!this.currentChain) throw new Error("No active hydra chain");
        this.currentChain = this.currentChain.modulateScale(texture, multiple, offset);
    });

    addWord(`modulatePixelate`, (context) => {
        const [texture, multiple = 10, offset = 3] = context.stack.getArgs(3, [null, 10, 3]);
        if (!this.currentChain) throw new Error("No active hydra chain");
        this.currentChain = this.currentChain.modulatePixelate(texture, multiple, offset);
    });

    // Output functions
    addWord(`out`, (context) => {
        const [buffer = 0] = context.stack.getArgs(1, [0]);
        console.log("out() currentChain:", this.currentChain);
        if (!this.currentChain) throw new Error("No active hydra chain");
        this.currentChain.out(buffer);
    });

    // Final evaluation word
    addWord(`hydra`, (context) => {
        if (!this.currentChain) throw new Error("No hydra chain to evaluate");
        console.log("hydra() currentChain:", this.currentChain);
        // Reset chain after evaluation
        this.currentChain = null;
    });

    // Buffer management
    addWord(`src`, (context) => {
        const [buffer = 0] = context.stack.getArgs(1, [0]);
        this.currentChain = this.synth.src(buffer);
    });

    addWord(`vid`, (context) => {
        const [url = "wrong-side.mp4"] = context.stack.getArgs(1, ["wrong-side.mp4"]);
        let videoUrl = url;
        if (!videoUrl.startsWith('http') && !videoUrl.startsWith('www')) {
            videoUrl = 'https://files.milan.place/' + videoUrl;
        }
        context.logger.info('hydra', 'vid() videoUrl:', videoUrl);
        const video = this.synth.s0.initVideo(videoUrl);
        context.logger.info('hydra', 'vid() video:', video);
        this.currentChain = this.synth.src(this.synth.s0).out();        
    });

    addWord(`file`, (context) => {
        const [filename = "example.png"] = context.stack.getArgs(1, [""]);
        if (!filename) throw new Error("No filename provided for file");
        context.stack.push('https://files.milan.place/' + filename);
    });
    // Render management
    addWord(`render`, (context) => {
        const [buffer = 0] = context.stack.getArgs(1, [0]);
        this.hydra.render(buffer);
    });
  }
}

exports.AwwVM = AwwVM;
exports.HydraDevice = HydraDevice;
exports.MouseDevice = MouseDevice;
exports.SimpleAudioSynth = SimpleAudioSynth;
exports.TimeDevice = TimeDevice;
