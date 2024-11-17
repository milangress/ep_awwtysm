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
        console.warn("Stack underflow in " + name);
        throw new StackUnderflowError();
      }
    },
    print: function () {
      return arr.join(" ") + " ← Top ";
    }
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
        throw new Error("Circular definition detected for word: " + key);
      }
      seenWords.add(key);

      let redefinedWord = redefinedWords.get(key);
      if (redefinedWord) {
        const [definition, _] = redefinedWord;
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

function Memory() {
  var variables = Object.create(null);
  var memArray = [];
  var _memPointer = 1000;

  function newMemPointer() {
    return _memPointer++;
  }

  function addVariable(name) {
    console.log("Adding variable to memory: ", name);
    var address = newMemPointer();
    variables[name.toLowerCase()] = address;
    memArray[address];
    return getVariable(name);
  }

  function getVariable(name) {
    return variables[name.toLowerCase()];
  }

  function setValue(address, value) {
    memArray[address] = value;
  }

  function getValue(address) {
    return memArray[address] || 0;
  }

  function allot(cells) {
    _memPointer += cells;
  }

  function print() {
    return {
      variables: variables,
      memArray: memArray,
      memPointer: _memPointer
    }
  }

  return {
    addVariable: addVariable,
    getVariable: getVariable,
    setValue: setValue,
    getValue: getValue,
    allot: allot,
    print: print
  };
}

function Tokenizer(input) {
  var index = 0;
  var length = input.length;
  var whitespace = /\s+/;
  var validToken = /\S+/;

  var tokenBuffer = [];

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

  function getNextToken() {
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

    return {
      value: value,
      isStringLiteral: isStringLiteral
    };
  }

  function peekToken(n = 1) {
    while (tokenBuffer.length < n) {
      const token = getNextToken();
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

  return {
    nextToken: nextToken,
    peekToken: peekToken
  };
}

function addPredefinedWords(addToDictionary, readLines, next) {
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
  addToDictionary("now", controlCode("now"));
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

  readLines([
    ": cells   1 * ;",
    ": cr      10 emit ;",
    ": space   32 emit ;",
    ": spaces  0 do space loop ;",
    ": 0=      0 = ;",
    ": 0<      0 < ;",
    ": 0>      0 > ;",
    ": ?dup    dup if dup then ;",
    ": 2dup    over over ;",
    ": 1+      1 + ;",
    ": 1-      1 - ;",
    ": 2+      2 + ;",
    ": 2-      2 - ;",
    ": 2*      2 * ;",
    ": 2/      2 / ;",
    ": negate  -1 * ;",
    ": abs     dup 0< if negate then ;",
    ": min     2dup < if drop else swap drop then ;",
    ": max     2dup < if swap drop else drop then ;",
    ": ?       @ . ;",
    ": +!      dup @ rot + swap ! ;",

    "variable  graphics", // start of graphics memory
    "575 cells allot", // graphics memory takes 24 * 24 = 576 cells altogether
    "variable  last-key", // create last-key variable for keyboard input
    "drop",
  ], next);
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

//const transforms = require('./glsl-transforms.js')

var Output = function ({ regl, precision, label = "", width, height}) {
  this.regl = regl;
  this.precision = precision;
  this.label = label;
  this.positionBuffer = this.regl.buffer([
    [-2, 0],
    [0, -2],
    [2, 2]
  ]);

  this.draw = () => {};
  this.init();
  this.pingPongIndex = 0;

  // for each output, create two fbos for pingponging
  this.fbos = (Array(2)).fill().map(() => this.regl.framebuffer({
    color: this.regl.texture({
      mag: 'nearest',
      width: width,
      height: height,
      format: 'rgba'
    }),
    depthStencil: false
  }));

  // array containing render passes
//  this.passes = []
};

Output.prototype.resize = function(width, height) {
  this.fbos.forEach((fbo) => {
    fbo.resize(width, height);
  });
//  console.log(this)
};


Output.prototype.getCurrent = function () {
  return this.fbos[this.pingPongIndex]
};

Output.prototype.getTexture = function () {
   var index = this.pingPongIndex ? 0 : 1;
  return this.fbos[index]
};

Output.prototype.init = function () {
//  console.log('clearing')
  this.transformIndex = 0;
  this.fragHeader = `
  precision ${this.precision} float;

  uniform float time;
  varying vec2 uv;
  `;

  this.fragBody = ``;

  this.vert = `
  precision ${this.precision} float;
  attribute vec2 position;
  varying vec2 uv;

  void main () {
    uv = position;
    gl_Position = vec4(2.0 * position - 1.0, 0, 1);
  }`;

  this.attributes = {
    position: this.positionBuffer
  };
  this.uniforms = {
    time: this.regl.prop('time'),
    resolution: this.regl.prop('resolution')
  };

  this.frag = `
       ${this.fragHeader}

      void main () {
        vec4 c = vec4(0, 0, 0, 0);
        vec2 st = uv;
        ${this.fragBody}
        gl_FragColor = c;
      }
  `;
  return this
};


Output.prototype.render = function (passes) {
  let pass = passes[0];
  //console.log('pass', pass, this.pingPongIndex)
  var self = this;
      var uniforms = Object.assign(pass.uniforms, { prevBuffer:  () =>  {
             //var index = this.pingPongIndex ? 0 : 1
          //   var index = self.pingPong[(passIndex+1)%2]
          //  console.log('ping pong', self.pingPongIndex)
            return self.fbos[self.pingPongIndex]
          }
        });

  self.draw = self.regl({
    frag: pass.frag,
    vert: self.vert,
    attributes: self.attributes,
    uniforms: uniforms,
    count: 3,
    framebuffer: () => {
      self.pingPongIndex = self.pingPongIndex ? 0 : 1;
      return self.fbos[self.pingPongIndex]
    }
  });
};


Output.prototype.tick = function (props) {
//  console.log(props)
  this.draw(props);
};

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var inherits_browser = {exports: {}};

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  inherits_browser.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    }
  };
} else {
  // old school shim for old browsers
  inherits_browser.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      var TempCtor = function () {};
      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    }
  };
}

var inherits_browserExports = inherits_browser.exports;

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter$1() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
var events = EventEmitter$1;

// Backwards-compat with node 0.10.x
EventEmitter$1.EventEmitter = EventEmitter$1;

EventEmitter$1.prototype._events = undefined;
EventEmitter$1.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter$1.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter$1.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter$1.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter$1.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter$1.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter$1.prototype.on = EventEmitter$1.prototype.addListener;

EventEmitter$1.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter$1.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter$1.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter$1.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter$1.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter$1.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

var browser =
  commonjsGlobal.performance &&
  commonjsGlobal.performance.now ? function now() {
    return performance.now()
  } : Date.now || function now() {
    return +new Date
  };

var raf$2 = {exports: {}};

var performanceNow = {exports: {}};

// Generated by CoffeeScript 1.12.2
(function() {
  var getNanoSeconds, hrtime, loadTime, moduleLoadTime, nodeLoadTime, upTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    performanceNow.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    performanceNow.exports = function() {
      return (getNanoSeconds() - nodeLoadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    moduleLoadTime = getNanoSeconds();
    upTime = process.uptime() * 1e9;
    nodeLoadTime = moduleLoadTime - upTime;
  } else if (Date.now) {
    performanceNow.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    performanceNow.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(commonjsGlobal);



var performanceNowExports = performanceNow.exports;

var now$1 = performanceNowExports
  , root = typeof window === 'undefined' ? commonjsGlobal : window
  , vendors = ['moz', 'webkit']
  , suffix = 'AnimationFrame'
  , raf$1 = root['request' + suffix]
  , caf = root['cancel' + suffix] || root['cancelRequest' + suffix];

for(var i = 0; !raf$1 && i < vendors.length; i++) {
  raf$1 = root[vendors[i] + 'Request' + suffix];
  caf = root[vendors[i] + 'Cancel' + suffix]
      || root[vendors[i] + 'CancelRequest' + suffix];
}

// Some versions of FF have rAF but not cAF
if(!raf$1 || !caf) {
  var last = 0
    , id = 0
    , queue = []
    , frameDuration = 1000 / 60;

  raf$1 = function(callback) {
    if(queue.length === 0) {
      var _now = now$1()
        , next = Math.max(0, frameDuration - (_now - last));
      last = next + _now;
      setTimeout(function() {
        var cp = queue.slice(0);
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        queue.length = 0;
        for(var i = 0; i < cp.length; i++) {
          if(!cp[i].cancelled) {
            try{
              cp[i].callback(last);
            } catch(e) {
              setTimeout(function() { throw e }, 0);
            }
          }
        }
      }, Math.round(next));
    }
    queue.push({
      handle: ++id,
      callback: callback,
      cancelled: false
    });
    return id
  };

  caf = function(handle) {
    for(var i = 0; i < queue.length; i++) {
      if(queue[i].handle === handle) {
        queue[i].cancelled = true;
      }
    }
  };
}

raf$2.exports = function(fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  return raf$1.call(root, fn)
};
raf$2.exports.cancel = function() {
  caf.apply(root, arguments);
};
raf$2.exports.polyfill = function(object) {
  if (!object) {
    object = root;
  }
  object.requestAnimationFrame = raf$1;
  object.cancelAnimationFrame = caf;
};

var rafExports = raf$2.exports;

var inherits = inherits_browserExports;
var EventEmitter = events.EventEmitter;
var now = browser;
var raf = rafExports;

var rafLoop = Engine;
function Engine(fn) {
    if (!(this instanceof Engine)) 
        return new Engine(fn)
    this.running = false;
    this.last = now();
    this._frame = 0;
    this._tick = this.tick.bind(this);

    if (fn)
        this.on('tick', fn);
}

inherits(Engine, EventEmitter);

Engine.prototype.start = function() {
    if (this.running) 
        return
    this.running = true;
    this.last = now();
    this._frame = raf(this._tick);
    return this
};

Engine.prototype.stop = function() {
    this.running = false;
    if (this._frame !== 0)
        raf.cancel(this._frame);
    this._frame = 0;
    return this
};

Engine.prototype.tick = function() {
    this._frame = raf(this._tick);
    var time = now();
    var dt = time - this.last;
    this.emit('tick', dt);
    this.last = time;
};

var loop = /*@__PURE__*/getDefaultExportFromCjs(rafLoop);

//const enumerateDevices = require('enumerate-devices')

function Webcam (deviceId) {
  return navigator.mediaDevices.enumerateDevices()
    .then(devices => devices.filter(devices => devices.kind === 'videoinput'))
    .then(cameras => {
      let constraints = { audio: false, video: true};
      if (cameras[deviceId]) {
        constraints['video'] = {
          deviceId: { exact: cameras[deviceId].deviceId }
        };
      }
    //  console.log(cameras)
      return window.navigator.mediaDevices.getUserMedia(constraints)
    })
    .then(stream => {
      const video = document.createElement('video');
      video.setAttribute('autoplay', '');
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      //  video.src = window.URL.createObjectURL(stream)
      video.srcObject = stream;
      return new Promise((resolve, reject) => {
        video.addEventListener('loadedmetadata', () => {
          video.play().then(() => resolve({video: video}));
        });
      })
    })
    .catch(console.log.bind(console))
}

function Screen (options) {
  return new Promise(function(resolve, reject) {
    //  async function startCapture(displayMediaOptions) {
    navigator.mediaDevices.getDisplayMedia(options).then((stream) => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.addEventListener('loadedmetadata', () => {
        video.play();
        resolve({video: video});
      });
    }).catch((err) => reject(err));
  })
}

class HydraSource {
  constructor ({ regl, width, height, pb, label = ""}) {
    this.label = label;
    this.regl = regl;
    this.src = null;
    this.dynamic = true;
    this.width = width;
    this.height = height;
    this.tex = this.regl.texture({
      //  shape: [width, height]
      shape: [ 1, 1 ]
    });
    this.pb = pb;
  }

  init (opts, params) {
    if ('src' in opts) {
      this.src = opts.src;
      this.tex = this.regl.texture({ data: this.src, ...params });
    }
    if ('dynamic' in opts) this.dynamic = opts.dynamic;
  }

  initCam (index, params) {
    const self = this;
    Webcam(index)
      .then(response => {
        self.src = response.video;
        self.dynamic = true;
        self.tex = self.regl.texture({ data: self.src, ...params });
      })
      .catch(err => console.log('could not get camera', err));
  }

  initVideo (url = '', params) {
    // const self = this
    const vid = document.createElement('video');
    vid.crossOrigin = 'anonymous';
    vid.autoplay = true;
    vid.loop = true;
    vid.muted = true; // mute in order to load without user interaction
    vid.addEventListener('loadeddata', () => {
      this.src = vid;
      vid.play();
      this.tex = this.regl.texture({ data: this.src, ...params});
      this.dynamic = true;
    });
    vid.src = url;
  }

  initImage (url = '', params) {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      this.src = img;
      this.dynamic = false;
      this.tex = this.regl.texture({ data: this.src, ...params});
    };
  }

  initStream (streamName, params) {
    //  console.log("initing stream!", streamName)
    let self = this;
    if (streamName && this.pb) {
      this.pb.initSource(streamName);

      this.pb.on('got video', function (nick, video) {
        if (nick === streamName) {
          self.src = video;
          self.dynamic = true;
          self.tex = self.regl.texture({ data: self.src, ...params});
        }
      });
    }
  }

  // index only relevant in atom-hydra + desktop apps
  initScreen (index = 0, params) {
    const self = this;
    Screen()
      .then(function (response) {
        self.src = response.video;
        self.tex = self.regl.texture({ data: self.src, ...params});
        self.dynamic = true;
        //  console.log("received screen input")
      })
      .catch(err => console.log('could not get screen', err));
  }

  resize (width, height) {
    this.width = width;
    this.height = height;
  }

  clear () {
    if (this.src && this.src.srcObject) {
      if (this.src.srcObject.getTracks) {
        this.src.srcObject.getTracks().forEach(track => track.stop());
      }
    }
    this.src = null;
    this.tex = this.regl.texture({ shape: [ 1, 1 ] });
  }

  tick (time) {
    //  console.log(this.src, this.tex.width, this.tex.height)
    if (this.src !== null && this.dynamic === true) {
      if (this.src.videoWidth && this.src.videoWidth !== this.tex.width) {
        console.log(
          this.src.videoWidth,
          this.src.videoHeight,
          this.tex.width,
          this.tex.height
        );
        this.tex.resize(this.src.videoWidth, this.src.videoHeight);
      }

      if (this.src.width && this.src.width !== this.tex.width) {
        this.tex.resize(this.src.width, this.src.height);
      }

      this.tex.subimage(this.src);
    }
  }

  getTexture () {
    return this.tex
  }
}

// https://github.com/mikolalysenko/mouse-event

const mouse = {};

function mouseButtons(ev) {
  if(typeof ev === 'object') {
    if('buttons' in ev) {
      return ev.buttons
    } else if('which' in ev) {
      var b = ev.which;
      if(b === 2) {
        return 4
      } else if(b === 3) {
        return 2
      } else if(b > 0) {
        return 1<<(b-1)
      }
    } else if('button' in ev) {
      var b = ev.button;
      if(b === 1) {
        return 4
      } else if(b === 2) {
        return 2
      } else if(b >= 0) {
        return 1<<b
      }
    }
  }
  return 0
}
mouse.buttons = mouseButtons;

function mouseElement(ev) {
  return ev.target || ev.srcElement || window
}
mouse.element = mouseElement;

function mouseRelativeX(ev) {
  if(typeof ev === 'object') {
    if('pageX' in ev) {
      return ev.pageX
    }
  }
  return 0
}
mouse.x = mouseRelativeX;

function mouseRelativeY(ev) {
  if(typeof ev === 'object') {
    if('pageY' in ev) {
      return ev.pageY
    }
  }
  return 0
}
mouse.y = mouseRelativeY;

// based on https://github.com/mikolalysenko/mouse-change


function mouseListen (element, callback) {
  if (!callback) {
    callback = element;
    element = window;
  }

  var buttonState = 0;
  var x = 0;
  var y = 0;
  var mods = {
    shift: false,
    alt: false,
    control: false,
    meta: false
  };
  var attached = false;

  function updateMods (ev) {
    var changed = false;
    if ('altKey' in ev) {
      changed = changed || ev.altKey !== mods.alt;
      mods.alt = !!ev.altKey;
    }
    if ('shiftKey' in ev) {
      changed = changed || ev.shiftKey !== mods.shift;
      mods.shift = !!ev.shiftKey;
    }
    if ('ctrlKey' in ev) {
      changed = changed || ev.ctrlKey !== mods.control;
      mods.control = !!ev.ctrlKey;
    }
    if ('metaKey' in ev) {
      changed = changed || ev.metaKey !== mods.meta;
      mods.meta = !!ev.metaKey;
    }
    return changed
  }

  function handleEvent (nextButtons, ev) {
    var nextX = mouse.x(ev);
    var nextY = mouse.y(ev);
    if ('buttons' in ev) {
      nextButtons = ev.buttons | 0;
    }
    if (nextButtons !== buttonState ||
      nextX !== x ||
      nextY !== y ||
      updateMods(ev)) {
      buttonState = nextButtons | 0;
      x = nextX || 0;
      y = nextY || 0;
      callback && callback(buttonState, x, y, mods);
    }
  }

  function clearState (ev) {
    handleEvent(0, ev);
  }

  function handleBlur () {
    if (buttonState ||
      x ||
      y ||
      mods.shift ||
      mods.alt ||
      mods.meta ||
      mods.control) {
      x = y = 0;
      buttonState = 0;
      mods.shift = mods.alt = mods.control = mods.meta = false;
      callback && callback(0, 0, 0, mods);
    }
  }

  function handleMods (ev) {
    if (updateMods(ev)) {
      callback && callback(buttonState, x, y, mods);
    }
  }

  function handleMouseMove (ev) {
    if (mouse.buttons(ev) === 0) {
      handleEvent(0, ev);
    } else {
      handleEvent(buttonState, ev);
    }
  }

  function handleMouseDown (ev) {
    handleEvent(buttonState | mouse.buttons(ev), ev);
  }

  function handleMouseUp (ev) {
    handleEvent(buttonState & ~mouse.buttons(ev), ev);
  }

  function attachListeners () {
    if (attached) {
      return
    }
    attached = true;

    element.addEventListener('mousemove', handleMouseMove);

    element.addEventListener('mousedown', handleMouseDown);

    element.addEventListener('mouseup', handleMouseUp);

    element.addEventListener('mouseleave', clearState);
    element.addEventListener('mouseenter', clearState);
    element.addEventListener('mouseout', clearState);
    element.addEventListener('mouseover', clearState);

    element.addEventListener('blur', handleBlur);

    element.addEventListener('keyup', handleMods);
    element.addEventListener('keydown', handleMods);
    element.addEventListener('keypress', handleMods);

    if (element !== window) {
      window.addEventListener('blur', handleBlur);

      window.addEventListener('keyup', handleMods);
      window.addEventListener('keydown', handleMods);
      window.addEventListener('keypress', handleMods);
    }
  }

  function detachListeners () {
    if (!attached) {
      return
    }
    attached = false;

    element.removeEventListener('mousemove', handleMouseMove);

    element.removeEventListener('mousedown', handleMouseDown);

    element.removeEventListener('mouseup', handleMouseUp);

    element.removeEventListener('mouseleave', clearState);
    element.removeEventListener('mouseenter', clearState);
    element.removeEventListener('mouseout', clearState);
    element.removeEventListener('mouseover', clearState);

    element.removeEventListener('blur', handleBlur);

    element.removeEventListener('keyup', handleMods);
    element.removeEventListener('keydown', handleMods);
    element.removeEventListener('keypress', handleMods);

    if (element !== window) {
      window.removeEventListener('blur', handleBlur);

      window.removeEventListener('keyup', handleMods);
      window.removeEventListener('keydown', handleMods);
      window.removeEventListener('keypress', handleMods);
    }
  }

  // Attach listeners
  attachListeners();

  var result = {
    element: element
  };

  Object.defineProperties(result, {
    enabled: {
      get: function () { return attached },
      set: function (f) {
        if (f) {
          attachListeners();
        } else {
          detachListeners();
        }
      },
      enumerable: true
    },
    buttons: {
      get: function () { return buttonState },
      enumerable: true
    },
    x: {
      get: function () { return x },
      enumerable: true
    },
    y: {
      get: function () { return y },
      enumerable: true
    },
    mods: {
      get: function () { return mods },
      enumerable: true
    }
  });

  return result
}

var meyda_min = {exports: {}};

(function (module, exports) {
	!function(r,t){module.exports=t();}(commonjsGlobal,(function(){function r(r,t,e){for(var a,n=0,o=t.length;n<o;n++)!a&&n in t||(a||(a=Array.prototype.slice.call(t,0,n)),a[n]=t[n]);return r.concat(a||Array.prototype.slice.call(t))}var t=Object.freeze({__proto__:null,blackman:function(r){for(var t=new Float32Array(r),e=2*Math.PI/(r-1),a=2*e,n=0;n<r/2;n++)t[n]=.42-.5*Math.cos(n*e)+.08*Math.cos(n*a);for(n=Math.ceil(r/2);n>0;n--)t[r-n]=t[n-1];return t},hamming:function(r){for(var t=new Float32Array(r),e=0;e<r;e++)t[e]=.54-.46*Math.cos(2*Math.PI*(e/r-1));return t},hanning:function(r){for(var t=new Float32Array(r),e=0;e<r;e++)t[e]=.5-.5*Math.cos(2*Math.PI*e/(r-1));return t},sine:function(r){for(var t=Math.PI/(r-1),e=new Float32Array(r),a=0;a<r;a++)e[a]=Math.sin(t*a);return e}}),e={};function a(r){for(;r%2==0&&r>1;)r/=2;return 1===r}function n(r,a){if("rect"!==a){if(""!==a&&a||(a="hanning"),e[a]||(e[a]={}),!e[a][r.length])try{e[a][r.length]=t[a](r.length);}catch(r){throw new Error("Invalid windowing function")}r=function(r,t){for(var e=[],a=0;a<Math.min(r.length,t.length);a++)e[a]=r[a]*t[a];return e}(r,e[a][r.length]);}return r}function o(r,t,e){for(var a=new Float32Array(r),n=0;n<a.length;n++)a[n]=n*t/e,a[n]=13*Math.atan(a[n]/1315.8)+3.5*Math.atan(Math.pow(a[n]/7518,2));return a}function i(r){return Float32Array.from(r)}function u(r){return 1125*Math.log(1+r/700)}function f(r,t,e){for(var a,n=new Float32Array(r+2),o=new Float32Array(r+2),i=t/2,f=u(0),c=(u(i)-f)/(r+1),l=new Array(r+2),s=0;s<n.length;s++)n[s]=s*c,o[s]=(a=n[s],700*(Math.exp(a/1125)-1)),l[s]=Math.floor((e+1)*o[s]/t);for(var m=new Array(r),p=0;p<m.length;p++){m[p]=new Array(e/2+1).fill(0);for(s=l[p];s<l[p+1];s++)m[p][s]=(s-l[p])/(l[p+1]-l[p]);for(s=l[p+1];s<l[p+2];s++)m[p][s]=(l[p+2]-s)/(l[p+2]-l[p+1]);}return m}function c(t,e,a,n,o,i,u){void 0===n&&(n=5),void 0===o&&(o=2),void 0===i&&(i=!0),void 0===u&&(u=440);var f=Math.floor(a/2)+1,c=new Array(a).fill(0).map((function(r,n){return t*function(r,t){return Math.log2(16*r/t)}(e*n/a,u)}));c[0]=c[1]-1.5*t;var l,s,m,p=c.slice(1).map((function(r,t){return Math.max(r-c[t])}),1).concat([1]),h=Math.round(t/2),g=new Array(t).fill(0).map((function(r,e){return c.map((function(r){return (10*t+h+r-e)%t-h}))})),w=g.map((function(r,t){return r.map((function(r,e){return Math.exp(-.5*Math.pow(2*g[t][e]/p[e],2))}))}));if(s=(l=w)[0].map((function(){return 0})),m=l.reduce((function(r,t){return t.forEach((function(t,e){r[e]+=Math.pow(t,2);})),r}),s).map(Math.sqrt),w=l.map((function(r,t){return r.map((function(r,t){return r/(m[t]||1)}))})),o){var v=c.map((function(r){return Math.exp(-.5*Math.pow((r/t-n)/o,2))}));w=w.map((function(r){return r.map((function(r,t){return r*v[t]}))}));}return i&&(w=r(r([],w.slice(3),!0),w.slice(0,3))),w.map((function(r){return r.slice(0,f)}))}function l(r,t){for(var e=0,a=0,n=0;n<t.length;n++)e+=Math.pow(n,r)*Math.abs(t[n]),a+=t[n];return e/a}function s(r){var t=r.ampSpectrum,e=r.barkScale,a=r.numberOfBarkBands,n=void 0===a?24:a;if("object"!=typeof t||"object"!=typeof e)throw new TypeError;var o=n,i=new Float32Array(o),u=0,f=t,c=new Int32Array(o+1);c[0]=0;for(var l=e[f.length-1]/o,s=1,m=0;m<f.length;m++)for(;e[m]>l;)c[s++]=m,l=s*e[f.length-1]/o;c[o]=f.length-1;for(m=0;m<o;m++){for(var p=0,h=c[m];h<c[m+1];h++)p+=f[h];i[m]=Math.pow(p,.23);}for(m=0;m<i.length;m++)u+=i[m];return {specific:i,total:u}}function m(r){var t=r.ampSpectrum;if("object"!=typeof t)throw new TypeError;for(var e=new Float32Array(t.length),a=0;a<e.length;a++)e[a]=Math.pow(t[a],2);return e}function p(r){var t=r.ampSpectrum,e=r.melFilterBank,a=r.bufferSize;if("object"!=typeof t)throw new TypeError("Valid ampSpectrum is required to generate melBands");if("object"!=typeof e)throw new TypeError("Valid melFilterBank is required to generate melBands");for(var n=m({ampSpectrum:t}),o=e.length,i=Array(o),u=new Float32Array(o),f=0;f<u.length;f++){i[f]=new Float32Array(a/2),u[f]=0;for(var c=0;c<a/2;c++)i[f][c]=e[f][c]*n[c],u[f]+=i[f][c];u[f]=Math.log(u[f]+1);}return Array.prototype.slice.call(u)}function h(r){return r&&r.__esModule&&Object.prototype.hasOwnProperty.call(r,"default")?r.default:r}var g=null;var w=h((function(r,t){var e=r.length;return t=t||2,g&&g[e]||function(r){(g=g||{})[r]=new Array(r*r);for(var t=Math.PI/r,e=0;e<r;e++)for(var a=0;a<r;a++)g[r][a+e*r]=Math.cos(t*(a+.5)*e);}(e),r.map((function(){return 0})).map((function(a,n){return t*r.reduce((function(r,t,a,o){return r+t*g[e][a+n*e]}),0)}))}));var v=Object.freeze({__proto__:null,amplitudeSpectrum:function(r){return r.ampSpectrum},buffer:function(r){return r.signal},chroma:function(r){var t=r.ampSpectrum,e=r.chromaFilterBank;if("object"!=typeof t)throw new TypeError("Valid ampSpectrum is required to generate chroma");if("object"!=typeof e)throw new TypeError("Valid chromaFilterBank is required to generate chroma");var a=e.map((function(r,e){return t.reduce((function(t,e,a){return t+e*r[a]}),0)})),n=Math.max.apply(Math,a);return n?a.map((function(r){return r/n})):a},complexSpectrum:function(r){return r.complexSpectrum},energy:function(r){var t=r.signal;if("object"!=typeof t)throw new TypeError;for(var e=0,a=0;a<t.length;a++)e+=Math.pow(Math.abs(t[a]),2);return e},loudness:s,melBands:p,mfcc:function(r){var t=r.ampSpectrum,e=r.melFilterBank,a=r.numberOfMFCCCoefficients,n=r.bufferSize,o=Math.min(40,Math.max(1,a||13));if(e.length<o)throw new Error("Insufficient filter bank for requested number of coefficients");var i=p({ampSpectrum:t,melFilterBank:e,bufferSize:n});return w(i).slice(0,o)},perceptualSharpness:function(r){for(var t=s({ampSpectrum:r.ampSpectrum,barkScale:r.barkScale}),e=t.specific,a=0,n=0;n<e.length;n++)a+=n<15?(n+1)*e[n+1]:.066*Math.exp(.171*(n+1));return a*=.11/t.total},perceptualSpread:function(r){for(var t=s({ampSpectrum:r.ampSpectrum,barkScale:r.barkScale}),e=0,a=0;a<t.specific.length;a++)t.specific[a]>e&&(e=t.specific[a]);return Math.pow((t.total-e)/t.total,2)},powerSpectrum:m,rms:function(r){var t=r.signal;if("object"!=typeof t)throw new TypeError;for(var e=0,a=0;a<t.length;a++)e+=Math.pow(t[a],2);return e/=t.length,e=Math.sqrt(e)},spectralCentroid:function(r){var t=r.ampSpectrum;if("object"!=typeof t)throw new TypeError;return l(1,t)},spectralCrest:function(r){var t=r.ampSpectrum;if("object"!=typeof t)throw new TypeError;var e=0,a=-1/0;return t.forEach((function(r){e+=Math.pow(r,2),a=r>a?r:a;})),e/=t.length,e=Math.sqrt(e),a/e},spectralFlatness:function(r){var t=r.ampSpectrum;if("object"!=typeof t)throw new TypeError;for(var e=0,a=0,n=0;n<t.length;n++)e+=Math.log(t[n]),a+=t[n];return Math.exp(e/t.length)*t.length/a},spectralFlux:function(r){var t=r.signal,e=r.previousSignal,a=r.bufferSize;if("object"!=typeof t||"object"!=typeof e)throw new TypeError;for(var n=0,o=-a/2;o<t.length/2-1;o++)x=Math.abs(t[o])-Math.abs(e[o]),n+=(x+Math.abs(x))/2;return n},spectralKurtosis:function(r){var t=r.ampSpectrum;if("object"!=typeof t)throw new TypeError;var e=t,a=l(1,e),n=l(2,e),o=l(3,e),i=l(4,e);return (-3*Math.pow(a,4)+6*a*n-4*a*o+i)/Math.pow(Math.sqrt(n-Math.pow(a,2)),4)},spectralRolloff:function(r){var t=r.ampSpectrum,e=r.sampleRate;if("object"!=typeof t)throw new TypeError;for(var a=t,n=e/(2*(a.length-1)),o=0,i=0;i<a.length;i++)o+=a[i];for(var u=.99*o,f=a.length-1;o>u&&f>=0;)o-=a[f],--f;return (f+1)*n},spectralSkewness:function(r){var t=r.ampSpectrum;if("object"!=typeof t)throw new TypeError;var e=l(1,t),a=l(2,t),n=l(3,t);return (2*Math.pow(e,3)-3*e*a+n)/Math.pow(Math.sqrt(a-Math.pow(e,2)),3)},spectralSlope:function(r){var t=r.ampSpectrum,e=r.sampleRate,a=r.bufferSize;if("object"!=typeof t)throw new TypeError;for(var n=0,o=0,i=new Float32Array(t.length),u=0,f=0,c=0;c<t.length;c++){n+=t[c];var l=c*e/a;i[c]=l,u+=l*l,o+=l,f+=l*t[c];}return (t.length*f-o*n)/(n*(u-Math.pow(o,2)))},spectralSpread:function(r){var t=r.ampSpectrum;if("object"!=typeof t)throw new TypeError;return Math.sqrt(l(2,t)-Math.pow(l(1,t),2))},zcr:function(r){var t=r.signal;if("object"!=typeof t)throw new TypeError;for(var e=0,a=1;a<t.length;a++)(t[a-1]>=0&&t[a]<0||t[a-1]<0&&t[a]>=0)&&e++;return e}});function d(r){if(Array.isArray(r)){for(var t=0,e=Array(r.length);t<r.length;t++)e[t]=r[t];return e}return Array.from(r)}var y={},S={},_={bitReverseArray:function(r){if(void 0===y[r]){for(var t=(r-1).toString(2).length,e="0".repeat(t),a={},n=0;n<r;n++){var o=n.toString(2);o=e.substr(o.length)+o,o=[].concat(d(o)).reverse().join(""),a[n]=parseInt(o,2);}y[r]=a;}return y[r]},multiply:function(r,t){return {real:r.real*t.real-r.imag*t.imag,imag:r.real*t.imag+r.imag*t.real}},add:function(r,t){return {real:r.real+t.real,imag:r.imag+t.imag}},subtract:function(r,t){return {real:r.real-t.real,imag:r.imag-t.imag}},euler:function(r,t){var e=-2*Math.PI*r/t;return {real:Math.cos(e),imag:Math.sin(e)}},conj:function(r){return r.imag*=-1,r},constructComplexArray:function(r){var t={};t.real=void 0===r.real?r.slice():r.real.slice();var e=t.real.length;return void 0===S[e]&&(S[e]=Array.apply(null,Array(e)).map(Number.prototype.valueOf,0)),t.imag=S[e].slice(),t}},b=function(r){var t={};void 0===r.real||void 0===r.imag?t=_.constructComplexArray(r):(t.real=r.real.slice(),t.imag=r.imag.slice());var e=t.real.length,a=Math.log2(e);if(Math.round(a)!=a)throw new Error("Input size must be a power of 2.");if(t.real.length!=t.imag.length)throw new Error("Real and imaginary components must have the same length.");for(var n=_.bitReverseArray(e),o={real:[],imag:[]},i=0;i<e;i++)o.real[n[i]]=t.real[i],o.imag[n[i]]=t.imag[i];for(var u=0;u<e;u++)t.real[u]=o.real[u],t.imag[u]=o.imag[u];for(var f=1;f<=a;f++)for(var c=Math.pow(2,f),l=0;l<c/2;l++)for(var s=_.euler(l,c),m=0;m<e/c;m++){var p=c*m+l,h=c*m+l+c/2,g={real:t.real[p],imag:t.imag[p]},w={real:t.real[h],imag:t.imag[h]},v=_.multiply(s,w),d=_.subtract(g,v);t.real[h]=d.real,t.imag[h]=d.imag;var y=_.add(v,g);t.real[p]=y.real,t.imag[p]=y.imag;}return t},M=b,F=function(){function r(r,t){var e=this;if(this._m=t,!r.audioContext)throw this._m.errors.noAC;if(r.bufferSize&&!a(r.bufferSize))throw this._m._errors.notPow2;if(!r.source)throw this._m._errors.noSource;this._m.audioContext=r.audioContext,this._m.bufferSize=r.bufferSize||this._m.bufferSize||256,this._m.hopSize=r.hopSize||this._m.hopSize||this._m.bufferSize,this._m.sampleRate=r.sampleRate||this._m.audioContext.sampleRate||44100,this._m.callback=r.callback,this._m.windowingFunction=r.windowingFunction||"hanning",this._m.featureExtractors=v,this._m.EXTRACTION_STARTED=r.startImmediately||!1,this._m.channel="number"==typeof r.channel?r.channel:0,this._m.inputs=r.inputs||1,this._m.outputs=r.outputs||1,this._m.numberOfMFCCCoefficients=r.numberOfMFCCCoefficients||this._m.numberOfMFCCCoefficients||13,this._m.numberOfBarkBands=r.numberOfBarkBands||this._m.numberOfBarkBands||24,this._m.spn=this._m.audioContext.createScriptProcessor(this._m.bufferSize,this._m.inputs,this._m.outputs),this._m.spn.connect(this._m.audioContext.destination),this._m._featuresToExtract=r.featureExtractors||[],this._m.barkScale=o(this._m.bufferSize,this._m.sampleRate,this._m.bufferSize),this._m.melFilterBank=f(Math.max(this._m.melBands,this._m.numberOfMFCCCoefficients),this._m.sampleRate,this._m.bufferSize),this._m.inputData=null,this._m.previousInputData=null,this._m.frame=null,this._m.previousFrame=null,this.setSource(r.source),this._m.spn.onaudioprocess=function(r){var t;null!==e._m.inputData&&(e._m.previousInputData=e._m.inputData),e._m.inputData=r.inputBuffer.getChannelData(e._m.channel),e._m.previousInputData?((t=new Float32Array(e._m.previousInputData.length+e._m.inputData.length-e._m.hopSize)).set(e._m.previousInputData.slice(e._m.hopSize)),t.set(e._m.inputData,e._m.previousInputData.length-e._m.hopSize)):t=e._m.inputData;var a=function(r,t,e){if(r.length<t)throw new Error("Buffer is too short for frame length");if(e<1)throw new Error("Hop length cannot be less that 1");if(t<1)throw new Error("Frame length cannot be less that 1");var a=1+Math.floor((r.length-t)/e);return new Array(a).fill(0).map((function(a,n){return r.slice(n*e,n*e+t)}))}(t,e._m.bufferSize,e._m.hopSize);a.forEach((function(r){e._m.frame=r;var t=e._m.extract(e._m._featuresToExtract,e._m.frame,e._m.previousFrame);"function"==typeof e._m.callback&&e._m.EXTRACTION_STARTED&&e._m.callback(t),e._m.previousFrame=e._m.frame;}));};}return r.prototype.start=function(r){this._m._featuresToExtract=r||this._m._featuresToExtract,this._m.EXTRACTION_STARTED=!0;},r.prototype.stop=function(){this._m.EXTRACTION_STARTED=!1;},r.prototype.setSource=function(r){this._m.source&&this._m.source.disconnect(this._m.spn),this._m.source=r,this._m.source.connect(this._m.spn);},r.prototype.setChannel=function(r){r<=this._m.inputs?this._m.channel=r:console.error("Channel ".concat(r," does not exist. Make sure you've provided a value for 'inputs' that is greater than ").concat(r," when instantiating the MeydaAnalyzer"));},r.prototype.get=function(r){return this._m.inputData?this._m.extract(r||this._m._featuresToExtract,this._m.inputData,this._m.previousInputData):null},r}(),A={audioContext:null,spn:null,bufferSize:512,sampleRate:44100,melBands:26,chromaBands:12,callback:null,windowingFunction:"hanning",featureExtractors:v,EXTRACTION_STARTED:!1,numberOfMFCCCoefficients:13,numberOfBarkBands:24,_featuresToExtract:[],windowing:n,_errors:{notPow2:new Error("Meyda: Buffer size must be a power of 2, e.g. 64 or 512"),featureUndef:new Error("Meyda: No features defined."),invalidFeatureFmt:new Error("Meyda: Invalid feature format"),invalidInput:new Error("Meyda: Invalid input."),noAC:new Error("Meyda: No AudioContext specified."),noSource:new Error("Meyda: No source node specified.")},createMeydaAnalyzer:function(r){return new F(r,Object.assign({},A))},listAvailableFeatureExtractors:function(){return Object.keys(this.featureExtractors)},extract:function(r,t,e){var n=this;if(!t)throw this._errors.invalidInput;if("object"!=typeof t)throw this._errors.invalidInput;if(!r)throw this._errors.featureUndef;if(!a(t.length))throw this._errors.notPow2;void 0!==this.barkScale&&this.barkScale.length==this.bufferSize||(this.barkScale=o(this.bufferSize,this.sampleRate,this.bufferSize)),void 0!==this.melFilterBank&&this.barkScale.length==this.bufferSize&&this.melFilterBank.length==this.melBands||(this.melFilterBank=f(Math.max(this.melBands,this.numberOfMFCCCoefficients),this.sampleRate,this.bufferSize)),void 0!==this.chromaFilterBank&&this.chromaFilterBank.length==this.chromaBands||(this.chromaFilterBank=c(this.chromaBands,this.sampleRate,this.bufferSize)),"buffer"in t&&void 0===t.buffer?this.signal=i(t):this.signal=t;var u=E(t,this.windowingFunction,this.bufferSize);if(this.signal=u.windowedSignal,this.complexSpectrum=u.complexSpectrum,this.ampSpectrum=u.ampSpectrum,e){var l=E(e,this.windowingFunction,this.bufferSize);this.previousSignal=l.windowedSignal,this.previousComplexSpectrum=l.complexSpectrum,this.previousAmpSpectrum=l.ampSpectrum;}var s=function(r){return n.featureExtractors[r]({ampSpectrum:n.ampSpectrum,chromaFilterBank:n.chromaFilterBank,complexSpectrum:n.complexSpectrum,signal:n.signal,bufferSize:n.bufferSize,sampleRate:n.sampleRate,barkScale:n.barkScale,melFilterBank:n.melFilterBank,previousSignal:n.previousSignal,previousAmpSpectrum:n.previousAmpSpectrum,previousComplexSpectrum:n.previousComplexSpectrum,numberOfMFCCCoefficients:n.numberOfMFCCCoefficients,numberOfBarkBands:n.numberOfBarkBands})};if("object"==typeof r)return r.reduce((function(r,t){var e;return Object.assign({},r,((e={})[t]=s(t),e))}),{});if("string"==typeof r)return s(r);throw this._errors.invalidFeatureFmt}},E=function(r,t,e){var a={};void 0===r.buffer?a.signal=i(r):a.signal=r,a.windowedSignal=n(a.signal,t),a.complexSpectrum=M(a.windowedSignal),a.ampSpectrum=new Float32Array(e/2);for(var o=0;o<e/2;o++)a.ampSpectrum[o]=Math.sqrt(Math.pow(a.complexSpectrum.real[o],2)+Math.pow(a.complexSpectrum.imag[o],2));return a};return "undefined"!=typeof window&&(window.Meyda=A),A}));
	
} (meyda_min));

var meyda_minExports = meyda_min.exports;
var Meyda = /*@__PURE__*/getDefaultExportFromCjs(meyda_minExports);

class Audio {
  constructor ({
    numBins = 4,
    cutoff = 2,
    smooth = 0.4,
    max = 15,
    scale = 10,
    isDrawing = false,
    parentEl = document.body
  }) {
    this.vol = 0;
    this.scale = scale;
    this.max = max;
    this.cutoff = cutoff;
    this.smooth = smooth;
    this.setBins(numBins);

    // beat detection from: https://github.com/therewasaguy/p5-music-viz/blob/gh-pages/demos/01d_beat_detect_amplitude/sketch.js
    this.beat = {
      holdFrames: 20,
      threshold: 40,
      _cutoff: 0, // adaptive based on sound state
      decay: 0.98,
      _framesSinceBeat: 0 // keeps track of frames
    };

    this.onBeat = () => {
    //  console.log("beat")
    };

    this.canvas = document.createElement('canvas');
    this.canvas.width = 100;
    this.canvas.height = 80;
    this.canvas.style.width = "100px";
    this.canvas.style.height = "80px";
    this.canvas.style.position = 'absolute';
    this.canvas.style.right = '0px';
    this.canvas.style.bottom = '0px';
    parentEl.appendChild(this.canvas);

    this.isDrawing = isDrawing;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.fillStyle="#DFFFFF";
    this.ctx.strokeStyle="#0ff";
    this.ctx.lineWidth=0.5;
    if(window.navigator.mediaDevices) {
    window.navigator.mediaDevices.getUserMedia({video: false, audio: true})
      .then((stream) => {
      //  console.log('got mic stream', stream)
        this.stream = stream;
        this.context = new AudioContext();
        //  this.context = new AudioContext()
        let audio_stream = this.context.createMediaStreamSource(stream);

      //  console.log(this.context)
        this.meyda = Meyda.createMeydaAnalyzer({
          audioContext: this.context,
          source: audio_stream,
          featureExtractors: [
            'loudness',
            //  'perceptualSpread',
            //  'perceptualSharpness',
            //  'spectralCentroid'
          ]
        });
      })
      .catch((err) => console.log('ERROR', err));
    }
  }

  detectBeat (level) {
    //console.log(level,   this.beat._cutoff)
    if (level > this.beat._cutoff && level > this.beat.threshold) {
      this.onBeat();
      this.beat._cutoff = level *1.2;
      this.beat._framesSinceBeat = 0;
    } else {
      if (this.beat._framesSinceBeat <= this.beat.holdFrames){
        this.beat._framesSinceBeat ++;
      } else {
        this.beat._cutoff *= this.beat.decay;
        this.beat._cutoff = Math.max(  this.beat._cutoff, this.beat.threshold);
      }
    }
  }

  tick() {
   if(this.meyda){
     var features = this.meyda.get();
     if(features && features !== null){
       this.vol = features.loudness.total;
       this.detectBeat(this.vol);
       // reduce loudness array to number of bins
       const reducer = (accumulator, currentValue) => accumulator + currentValue;
       let spacing = Math.floor(features.loudness.specific.length/this.bins.length);
       this.prevBins = this.bins.slice(0);
       this.bins = this.bins.map((bin, index) => {
         return features.loudness.specific.slice(index * spacing, (index + 1)*spacing).reduce(reducer)
       }).map((bin, index) => {
         // map to specified range

        // return (bin * (1.0 - this.smooth) + this.prevBins[index] * this.smooth)
          return (bin * (1.0 - this.settings[index].smooth) + this.prevBins[index] * this.settings[index].smooth)
       });
       // var y = this.canvas.height - scale*this.settings[index].cutoff
       // this.ctx.beginPath()
       // this.ctx.moveTo(index*spacing, y)
       // this.ctx.lineTo((index+1)*spacing, y)
       // this.ctx.stroke()
       //
       // var yMax = this.canvas.height - scale*(this.settings[index].scale + this.settings[index].cutoff)
       this.fft = this.bins.map((bin, index) => (
        // Math.max(0, (bin - this.cutoff) / (this.max - this.cutoff))
         Math.max(0, (bin - this.settings[index].cutoff)/this.settings[index].scale)
       ));
       if(this.isDrawing) this.draw();
     }
   }
  }

  setCutoff (cutoff) {
    this.cutoff = cutoff;
    this.settings = this.settings.map((el) => {
      el.cutoff = cutoff;
      return el
    });
  }

  setSmooth (smooth) {
    this.smooth = smooth;
    this.settings = this.settings.map((el) => {
      el.smooth = smooth;
      return el
    });
  }

  setBins (numBins) {
    this.bins = Array(numBins).fill(0);
    this.prevBins = Array(numBins).fill(0);
    this.fft = Array(numBins).fill(0);
    this.settings = Array(numBins).fill(0).map(() => ({
      cutoff: this.cutoff,
      scale: this.scale,
      smooth: this.smooth
    }));
    // to do: what to do in non-global mode?
    this.bins.forEach((bin, index) => {
      window['a' + index] = (scale = 1, offset = 0) => () => (a.fft[index] * scale + offset);
    });
  //  console.log(this.settings)
  }

  setScale(scale){
    this.scale = scale;
    this.settings = this.settings.map((el) => {
      el.scale = scale;
      return el
    });
  }

  setMax(max) {
    this.max = max;
    console.log('set max is deprecated');
  }
  hide() {
    this.isDrawing = false;
    this.canvas.style.display = 'none';
  }

  show() {
    this.isDrawing = true;
    this.canvas.style.display = 'block';

  }

  draw () {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    var spacing = this.canvas.width / this.bins.length;
    var scale = this.canvas.height / (this.max * 2);
  //  console.log(this.bins)
    this.bins.forEach((bin, index) => {

      var height = bin * scale;

     this.ctx.fillRect(index * spacing, this.canvas.height - height, spacing, height);

  //   console.log(this.settings[index])
     var y = this.canvas.height - scale*this.settings[index].cutoff;
     this.ctx.beginPath();
     this.ctx.moveTo(index*spacing, y);
     this.ctx.lineTo((index+1)*spacing, y);
     this.ctx.stroke();

     var yMax = this.canvas.height - scale*(this.settings[index].scale + this.settings[index].cutoff);
     this.ctx.beginPath();
     this.ctx.moveTo(index*spacing, yMax);
     this.ctx.lineTo((index+1)*spacing, yMax);
     this.ctx.stroke();
    });


    /*var y = this.canvas.height - scale*this.cutoff
    this.ctx.beginPath()
    this.ctx.moveTo(0, y)
    this.ctx.lineTo(this.canvas.width, y)
    this.ctx.stroke()
    var yMax = this.canvas.height - scale*this.max
    this.ctx.beginPath()
    this.ctx.moveTo(0, yMax)
    this.ctx.lineTo(this.canvas.width, yMax)
    this.ctx.stroke()*/
  }
}

class VideoRecorder {
  constructor(stream) {
    this.mediaSource = new MediaSource();
    this.stream = stream;

    // testing using a recording as input
    this.output = document.createElement('video');
    this.output.autoplay = true;
    this.output.loop = true;

    let self = this;
    this.mediaSource.addEventListener('sourceopen', () => {
      console.log('MediaSource opened');
      self.sourceBuffer = self.mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
      console.log('Source buffer: ', sourceBuffer);
    });
  }

  start() {
  //  let options = {mimeType: 'video/webm'};

//   let options = {mimeType: 'video/webm;codecs=h264'};
   let options = {mimeType: 'video/webm;codecs=vp9'};

    this.recordedBlobs = [];
    try {
     this.mediaRecorder = new MediaRecorder(this.stream, options);
    } catch (e0) {
     console.log('Unable to create MediaRecorder with options Object: ', e0);
     try {
       options = {mimeType: 'video/webm,codecs=vp9'};
       this.mediaRecorder = new MediaRecorder(this.stream, options);
     } catch (e1) {
       console.log('Unable to create MediaRecorder with options Object: ', e1);
       try {
         options = 'video/vp8'; // Chrome 47
         this.mediaRecorder = new MediaRecorder(this.stream, options);
       } catch (e2) {
         alert('MediaRecorder is not supported by this browser.\n\n' +
           'Try Firefox 29 or later, or Chrome 47 or later, ' +
           'with Enable experimental Web Platform features enabled from chrome://flags.');
         console.error('Exception while creating MediaRecorder:', e2);
         return
       }
     }
   }
   console.log('Created MediaRecorder', this.mediaRecorder, 'with options', options);
   this.mediaRecorder.onstop = this._handleStop.bind(this);
   this.mediaRecorder.ondataavailable = this._handleDataAvailable.bind(this);
   this.mediaRecorder.start(100); // collect 100ms of data
   console.log('MediaRecorder started', this.mediaRecorder);
 }

  
   stop(){
     this.mediaRecorder.stop();
   }

 _handleStop() {
   //const superBuffer = new Blob(recordedBlobs, {type: 'video/webm'})
   // const blob = new Blob(this.recordedBlobs, {type: 'video/webm;codecs=h264'})
  const blob = new Blob(this.recordedBlobs, {type: this.mediaRecorder.mimeType});
   const url = window.URL.createObjectURL(blob);
   this.output.src = url;

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    let d = new Date();
    a.download = `hydra-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${d.getHours()}.${d.getMinutes()}.${d.getSeconds()}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 300);
  }

  _handleDataAvailable(event) {
    if (event.data && event.data.size > 0) {
      this.recordedBlobs.push(event.data);
    }
  }
}

// from https://gist.github.com/gre/1650294

var easing = {
  // no easing, no acceleration
  linear: function (t) { return t },
  // accelerating from zero velocity
  easeInQuad: function (t) { return t*t },
  // decelerating to zero velocity
  easeOutQuad: function (t) { return t*(2-t) },
  // acceleration until halfway, then deceleration
  easeInOutQuad: function (t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t },
  // accelerating from zero velocity
  easeInCubic: function (t) { return t*t*t },
  // decelerating to zero velocity
  easeOutCubic: function (t) { return (--t)*t*t+1 },
  // acceleration until halfway, then deceleration
  easeInOutCubic: function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 },
  // accelerating from zero velocity
  easeInQuart: function (t) { return t*t*t*t },
  // decelerating to zero velocity
  easeOutQuart: function (t) { return 1-(--t)*t*t*t },
  // acceleration until halfway, then deceleration
  easeInOutQuart: function (t) { return t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t },
  // accelerating from zero velocity
  easeInQuint: function (t) { return t*t*t*t*t },
  // decelerating to zero velocity
  easeOutQuint: function (t) { return 1+(--t)*t*t*t*t },
  // acceleration until halfway, then deceleration
  easeInOutQuint: function (t) { return t<.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t },
  // sin shape
  sin: function (t) { return (1 + Math.sin(Math.PI*t-Math.PI/2))/2 }
};

// WIP utils for working with arrays
// Possibly should be integrated with lfo extension, etc.
// to do: transform time rather than array values, similar to working with coordinates in hydra


var map = (num, in_min, in_max, out_min, out_max) => {
  return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
};

var ArrayUtils = {
  init: () => {

    Array.prototype.fast = function(speed = 1) {
      this._speed = speed;
      return this
    };

    Array.prototype.smooth = function(smooth = 1) {
      this._smooth = smooth;
      return this
    };

    Array.prototype.ease = function(ease = 'linear') {
      if (typeof ease == 'function') {
        this._smooth = 1;
        this._ease = ease;
      }
      else if (easing[ease]){
        this._smooth = 1;
        this._ease = easing[ease];
      }
      return this
    };

    Array.prototype.offset = function(offset = 0.5) {
      this._offset = offset%1.0;
      return this
    };

    // Array.prototype.bounce = function() {
    //   this.modifiers.bounce = true
    //   return this
    // }

    Array.prototype.fit = function(low = 0, high =1) {
      let lowest = Math.min(...this);
      let highest =  Math.max(...this);
      var newArr = this.map((num) => map(num, lowest, highest, low, high));
      newArr._speed = this._speed;
      newArr._smooth = this._smooth;
      newArr._ease = this._ease;
      return newArr
    };
  },

  getValue: (arr = []) => ({time, bpm}) =>{
    let speed = arr._speed ? arr._speed : 1;
    let smooth = arr._smooth ? arr._smooth : 0;
    let index = time * speed * (bpm / 60) + (arr._offset || 0);

    if (smooth!==0) {
      let ease = arr._ease ? arr._ease : easing['linear'];
      let _index = index - (smooth / 2);
      let currValue = arr[Math.floor(_index % (arr.length))];
      let nextValue = arr[Math.floor((_index + 1) % (arr.length))];
      let t = Math.min((_index%1)/smooth,1);
      return ease(t) * (nextValue - currValue) + currValue
    }
    else {
      arr[Math.floor(index % (arr.length))];
      return arr[Math.floor(index % (arr.length))]
    }
  }
};

// attempt custom evaluation sandbox for hydra functions
// for now, just avoids polluting the global namespace
// should probably be replaced with an abstract syntax tree

var Sandbox = (parent) => {
  var initialCode = ``;

  var sandbox = createSandbox(initialCode);

  var addToContext = (name, object) => {
    initialCode += `
      var ${name} = ${object}
    `;
    sandbox = createSandbox(initialCode);
  };


  return {
    addToContext: addToContext,
    eval: (code) => sandbox.eval(code)
  }

  function createSandbox (initial) {
    globalThis.eval(initial);
    // optional params
    var localEval = function (code)  {
      globalThis.eval(code);
    };

    // API/data for end-user
    return {
      eval: localEval
    }
  }
};

// handles code evaluation and attaching relevant objects to global and evaluation contexts


class EvalSandbox {
  constructor(parent, makeGlobal, userProps = []) {
    this.makeGlobal = makeGlobal;
    this.sandbox = Sandbox();
    this.parent = parent;
    var properties = Object.keys(parent);
    properties.forEach((property) => this.add(property));
    this.userProps = userProps;
  }

  add(name) {
    if(this.makeGlobal) window[name] = this.parent[name];
    // this.sandbox.addToContext(name, `parent.${name}`)
  }

// sets on window as well as synth object if global (not needed for objects, which can be set directly)

  set(property, value) {
    if(this.makeGlobal) {
      window[property] = value;
    }
    this.parent[property] = value;
  }

  tick() {
    if(this.makeGlobal) {
      this.userProps.forEach((property) => {
        this.parent[property] = window[property];
      });
      //  this.parent.speed = window.speed
    }
  }

  eval(code) {
    this.sandbox.eval(code);
  }
}

// [WIP] how to treat different dimensions (?)
const DEFAULT_CONVERSIONS = {
  float: {
    'vec4': { name: 'sum', args: [[1, 1, 1, 1]] },
    'vec2': { name: 'sum', args: [[1, 1]] }
  }
};

const ensure_decimal_dot = (val) => {
  val = val.toString();
  if (val.indexOf('.') < 0) {
    val += '.';
  }
  return val
};



function formatArguments(transform, startIndex, synthContext) {
  const defaultArgs = transform.transform.inputs;
  const userArgs = transform.userArgs;
  const { generators } = transform.synth;
  const { src } = generators; // depends on synth having src() function
  return defaultArgs.map((input, index) => {
    const typedArg = {
      value: input.default,
      type: input.type, //
      isUniform: false,
      name: input.name,
      vecLen: 0
      //  generateGlsl: null // function for creating glsl
    };

    if (typedArg.type === 'float') typedArg.value = ensure_decimal_dot(input.default);
    if (input.type.startsWith('vec')) {
      try {
        typedArg.vecLen = Number.parseInt(input.type.substr(3));
      } catch (e) {
        console.log(`Error determining length of vector input type ${input.type} (${input.name})`);
      }
    }

    // if user has input something for this argument
    if (userArgs.length > index) {
      typedArg.value = userArgs[index];
      // do something if a composite or transform

      if (typeof userArgs[index] === 'function') {
        // if (typedArg.vecLen > 0) { // expected input is a vector, not a scalar
        //    typedArg.value = (context, props, batchId) => (fillArrayWithDefaults(userArgs[index](props), typedArg.vecLen))
        // } else {
        typedArg.value = (context, props, batchId) => {
          try {
            const val = userArgs[index](props);
            if(typeof val === 'number') {
              return val
            } else {
              console.warn('function does not return a number', userArgs[index]);
            }
            return input.default
          } catch (e) {
            console.warn('ERROR', e);
            return input.default
          }
        };
        //  }

        typedArg.isUniform = true;
      } else if (userArgs[index].constructor === Array) {
        //   if (typedArg.vecLen > 0) { // expected input is a vector, not a scalar
        //     typedArg.isUniform = true
        //     typedArg.value = fillArrayWithDefaults(typedArg.value, typedArg.vecLen)
        //  } else {
        //  console.log("is Array")
        // filter out values that are not a number
       // const filteredArray = userArgs[index].filter((val) => typeof val === 'number')
       // typedArg.value = (context, props, batchId) => arrayUtils.getValue(filteredArray)(props)
       typedArg.value = (context, props, batchId) => ArrayUtils.getValue(userArgs[index])(props);
       typedArg.isUniform = true;
        // }
      } 
    }

    if (startIndex < 0) ; else {
      if (typedArg.value && typedArg.value.transforms) {
        const final_transform = typedArg.value.transforms[typedArg.value.transforms.length - 1];

        if (final_transform.transform.glsl_return_type !== input.type) {
          const defaults = DEFAULT_CONVERSIONS[input.type];
          if (typeof defaults !== 'undefined') {
            const default_def = defaults[final_transform.transform.glsl_return_type];
            if (typeof default_def !== 'undefined') {
              const { name, args } = default_def;
              typedArg.value = typedArg.value[name](...args);
            }
          }
        }

        typedArg.isUniform = false;
      } else if (typedArg.type === 'float' && typeof typedArg.value === 'number') {
        typedArg.value = ensure_decimal_dot(typedArg.value);
      } else if (typedArg.type.startsWith('vec') && typeof typedArg.value === 'object' && Array.isArray(typedArg.value)) {
        typedArg.isUniform = false;
        typedArg.value = `${typedArg.type}(${typedArg.value.map(ensure_decimal_dot).join(', ')})`;
      } else if (input.type === 'sampler2D') {
        // typedArg.tex = typedArg.value
        var x = typedArg.value;
        typedArg.value = () => (x.getTexture());
        typedArg.isUniform = true;
      } else {
        // if passing in a texture reference, when function asks for vec4, convert to vec4
        if (typedArg.value.getTexture && input.type === 'vec4') {
          var x1 = typedArg.value;
          typedArg.value = src(x1);
          typedArg.isUniform = false;
        }
      }

      // add tp uniform array if is a function that will pass in a different value on each render frame,
      // or a texture/ external source

      if (typedArg.isUniform) {
        typedArg.name += startIndex;
        //  shaderParams.uniforms.push(typedArg)
      }
    }
    return typedArg
  })
}

// converts a tree of javascript functions to a shader
function generateGlsl (transforms) {
    var shaderParams = {
      uniforms: [], // list of uniforms used in shader
      glslFunctions: [], // list of functions used in shader
      fragColor: ''
    };

    var gen = generateGlsl$1(transforms, shaderParams)('st');
    shaderParams.fragColor = gen;
    // remove uniforms with duplicate names
    let uniforms = {};
    shaderParams.uniforms.forEach((uniform) => uniforms[uniform.name] = uniform);
    shaderParams.uniforms = Object.values(uniforms);
    return shaderParams

}


// recursive function for generating shader string from object containing functions and user arguments. Order of functions in string depends on type of function
// to do: improve variable names
function generateGlsl$1 (transforms, shaderParams) {
  // transform function that outputs a shader string corresponding to gl_FragColor
  var fragColor = () => '';
  // var uniforms = []
  // var glslFunctions = []
  transforms.forEach((transform) => {
    var inputs = formatArguments(transform, shaderParams.uniforms.length);
    inputs.forEach((input) => {
      if(input.isUniform) shaderParams.uniforms.push(input);
    });

    // add new glsl function to running list of functions
    if(!contains(transform, shaderParams.glslFunctions)) shaderParams.glslFunctions.push(transform);

    // current function for generating frag color shader code
    var f0 = fragColor;
    if (transform.transform.type === 'src') {
      fragColor = (uv) => `${shaderString(uv, transform.name, inputs, shaderParams)}`;
    } else if (transform.transform.type === 'coord') {
      fragColor = (uv) => `${f0(`${shaderString(uv, transform.name, inputs, shaderParams)}`)}`;
    } else if (transform.transform.type === 'color') {
      fragColor = (uv) =>  `${shaderString(`${f0(uv)}`, transform.name, inputs, shaderParams)}`;
    } else if (transform.transform.type === 'combine') {
      // combining two generated shader strings (i.e. for blend, mult, add funtions)
      var f1 = inputs[0].value && inputs[0].value.transforms ?
      (uv) => `${generateGlsl$1(inputs[0].value.transforms, shaderParams)(uv)}` :
      (inputs[0].isUniform ? () => inputs[0].name : () => inputs[0].value);
      fragColor = (uv) => `${shaderString(`${f0(uv)}, ${f1(uv)}`, transform.name, inputs.slice(1), shaderParams)}`;
    } else if (transform.transform.type === 'combineCoord') {
      // combining two generated shader strings (i.e. for modulate functions)
      var f1 = inputs[0].value && inputs[0].value.transforms ?
      (uv) => `${generateGlsl$1(inputs[0].value.transforms, shaderParams)(uv)}` :
      (inputs[0].isUniform ? () => inputs[0].name : () => inputs[0].value);
      fragColor = (uv) => `${f0(`${shaderString(`${uv}, ${f1(uv)}`, transform.name, inputs.slice(1), shaderParams)}`)}`;


    }
  });
//  console.log(fragColor)
  //  break;
  return fragColor
}

// assembles a shader string containing the arguments and the function name, i.e. 'osc(uv, frequency)'
function shaderString (uv, method, inputs, shaderParams) {
  const str = inputs.map((input) => {
    if (input.isUniform) {
      return input.name
    } else if (input.value && input.value.transforms) {
      // this by definition needs to be a generator, hence we start with 'st' as the initial value for generating the glsl fragment
      return `${generateGlsl$1(input.value.transforms, shaderParams)('st')}`
    }
    return input.value
  }).reduce((p, c) => `${p}, ${c}`, '');

  return `${method}(${uv}${str})`
}

// check whether array
function contains(object, arr) {
  for(var i = 0; i < arr.length; i++){
    if(object.name == arr[i].name) return true
  }
  return false
}

// functions that are only used within other functions

var utilityGlsl = {
  _luminance: {
    type: 'util',
    glsl: `float _luminance(vec3 rgb){
      const vec3 W = vec3(0.2125, 0.7154, 0.0721);
      return dot(rgb, W);
    }`
  },
  _noise: {
    type: 'util',
    glsl: `
    //	Simplex 3D Noise
    //	by Ian McEwan, Ashima Arts
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

  float _noise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

  // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    //  x0 = x0 - 0. + 0.0 * C
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1. + 3.0 * C.xxx;

  // Permutations
    i = mod(i, 289.0 );
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients
  // ( N*N points uniformly over a square, mapped onto an octahedron.)
    float n_ = 1.0/7.0; // N=7
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

  //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

  // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }
    `
  },


  _rgbToHsv: {
    type: 'util',
    glsl: `vec3 _rgbToHsv(vec3 c){
            vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
            vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
            vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

            float d = q.x - min(q.w, q.y);
            float e = 1.0e-10;
            return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }`
  },
  _hsvToRgb: {
    type: 'util',
    glsl: `vec3 _hsvToRgb(vec3 c){
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }`
  }
};

var GlslSource = function (obj) {
  this.transforms = [];
  this.transforms.push(obj);
  this.defaultOutput = obj.defaultOutput;
  this.synth = obj.synth;
  this.type = 'GlslSource';
  this.defaultUniforms = obj.defaultUniforms;
  return this
};

GlslSource.prototype.addTransform = function (obj)  {
    this.transforms.push(obj);
};

GlslSource.prototype.out = function (_output) {
  var output = _output || this.defaultOutput;
  var glsl = this.glsl(output);
  this.synth.currentFunctions = [];
 // output.renderPasses(glsl)
  if(output) try{
    output.render(glsl);
  } catch (error) {
    console.log('shader could not compile', error);
  }
};

GlslSource.prototype.glsl = function () {
  // uniforms included in all shaders
//  this.defaultUniforms = output.uniforms
  var passes = [];
  var transforms = [];
//  console.log('output', output)
  this.transforms.forEach((transform) => {
    if(transform.transform.type === 'renderpass'){
      // if (transforms.length > 0) passes.push(this.compile(transforms, output))
      // transforms = []
      // var uniforms = {}
      // const inputs = formatArguments(transform, -1)
      // inputs.forEach((uniform) => { uniforms[uniform.name] = uniform.value })
      //
      // passes.push({
      //   frag: transform.transform.frag,
      //   uniforms: Object.assign({}, self.defaultUniforms, uniforms)
      // })
      // transforms.push({name: 'prev', transform:  glslTransforms['prev'], synth: this.synth})
      console.warn('no support for renderpass');
    } else {
      transforms.push(transform);
    }
  });

  if (transforms.length > 0) passes.push(this.compile(transforms));

  return passes
};

GlslSource.prototype.compile = function (transforms) {
  var shaderInfo = generateGlsl(transforms, this.synth);
  var uniforms = {};
  shaderInfo.uniforms.forEach((uniform) => { uniforms[uniform.name] = uniform.value; });

  var frag = `
  precision ${this.defaultOutput.precision} float;
  ${Object.values(shaderInfo.uniforms).map((uniform) => {
    let type = uniform.type;
    switch (uniform.type) {
      case 'texture':
        type = 'sampler2D';
        break
    }
    return `
      uniform ${type} ${uniform.name};`
  }).join('')}
  uniform float time;
  uniform vec2 resolution;
  varying vec2 uv;
  uniform sampler2D prevBuffer;

  ${Object.values(utilityGlsl).map((transform) => {
  //  console.log(transform.glsl)
    return `
            ${transform.glsl}
          `
  }).join('')}

  ${shaderInfo.glslFunctions.map((transform) => {
    return `
            ${transform.transform.glsl}
          `
  }).join('')}

  void main () {
    vec4 c = vec4(1, 0, 0, 1);
    vec2 st = gl_FragCoord.xy/resolution.xy;
    gl_FragColor = ${shaderInfo.fragColor};
  }
  `;

  return {
    frag: frag,
    uniforms: Object.assign({}, this.defaultUniforms, uniforms)
  }

};

/*
Format for adding functions to hydra. For each entry in this file, hydra automatically generates a glsl function and javascript function with the same name. You can also ass functions dynamically using setFunction(object).

{
  name: 'osc', // name that will be used to access function in js as well as in glsl
  type: 'src', // can be 'src', 'color', 'combine', 'combineCoords'. see below for more info
  inputs: [
    {
      name: 'freq',
      type: 'float',
      default: 0.2
    },
    {
      name: 'sync',
      type: 'float',
      default: 0.1
    },
    {
      name: 'offset',
      type: 'float',
      default: 0.0
    }
  ],
    glsl: `
      vec2 st = _st;
      float r = sin((st.x-offset*2/freq+time*sync)*freq)*0.5  + 0.5;
      float g = sin((st.x+time*sync)*freq)*0.5 + 0.5;
      float b = sin((st.x+offset/freq+time*sync)*freq)*0.5  + 0.5;
      return vec4(r, g, b, 1.0);
   `
}

// The above code generates the glsl function:
`vec4 osc(vec2 _st, float freq, float sync, float offset){
 vec2 st = _st;
 float r = sin((st.x-offset*2/freq+time*sync)*freq)*0.5  + 0.5;
 float g = sin((st.x+time*sync)*freq)*0.5 + 0.5;
 float b = sin((st.x+offset/freq+time*sync)*freq)*0.5  + 0.5;
 return vec4(r, g, b, 1.0);
}`


Types and default arguments for hydra functions.
The value in the 'type' field lets the parser know which type the function will be returned as well as default arguments.

const types = {
  'src': {
    returnType: 'vec4',
    args: ['vec2 _st']
  },
  'coord': {
    returnType: 'vec2',
    args: ['vec2 _st']
  },
  'color': {
    returnType: 'vec4',
    args: ['vec4 _c0']
  },
  'combine': {
    returnType: 'vec4',
    args: ['vec4 _c0', 'vec4 _c1']
  },
  'combineCoord': {
    returnType: 'vec2',
    args: ['vec2 _st', 'vec4 _c0']
  }
}

*/

var glslFunctions = () => [
  {
  name: 'noise',
  type: 'src',
  inputs: [
    {
      type: 'float',
      name: 'scale',
      default: 10,
    },
{
      type: 'float',
      name: 'offset',
      default: 0.1,
    }
  ],
  glsl:
`   return vec4(vec3(_noise(vec3(_st*scale, offset*time))), 1.0);`
},
{
  name: 'voronoi',
  type: 'src',
  inputs: [
    {
      type: 'float',
      name: 'scale',
      default: 5,
    },
{
      type: 'float',
      name: 'speed',
      default: 0.3,
    },
{
      type: 'float',
      name: 'blending',
      default: 0.3,
    }
  ],
  glsl:
`   vec3 color = vec3(.0);
   // Scale
   _st *= scale;
   // Tile the space
   vec2 i_st = floor(_st);
   vec2 f_st = fract(_st);
   float m_dist = 10.;  // minimun distance
   vec2 m_point;        // minimum point
   for (int j=-1; j<=1; j++ ) {
   for (int i=-1; i<=1; i++ ) {
   vec2 neighbor = vec2(float(i),float(j));
   vec2 p = i_st + neighbor;
   vec2 point = fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
   point = 0.5 + 0.5*sin(time*speed + 6.2831*point);
   vec2 diff = neighbor + point - f_st;
   float dist = length(diff);
   if( dist < m_dist ) {
   m_dist = dist;
   m_point = point;
   }
   }
   }
   // Assign a color using the closest point position
   color += dot(m_point,vec2(.3,.6));
   color *= 1.0 - blending*m_dist;
   return vec4(color, 1.0);`
},
{
  name: 'osc',
  type: 'src',
  inputs: [
    {
      type: 'float',
      name: 'frequency',
      default: 60,
    },
{
      type: 'float',
      name: 'sync',
      default: 0.1,
    },
{
      type: 'float',
      name: 'offset',
      default: 0,
    }
  ],
  glsl:
`   vec2 st = _st;
   float r = sin((st.x-offset/frequency+time*sync)*frequency)*0.5  + 0.5;
   float g = sin((st.x+time*sync)*frequency)*0.5 + 0.5;
   float b = sin((st.x+offset/frequency+time*sync)*frequency)*0.5  + 0.5;
   return vec4(r, g, b, 1.0);`
},
{
  name: 'shape',
  type: 'src',
  inputs: [
    {
      type: 'float',
      name: 'sides',
      default: 3,
    },
{
      type: 'float',
      name: 'radius',
      default: 0.3,
    },
{
      type: 'float',
      name: 'smoothing',
      default: 0.01,
    }
  ],
  glsl:
`   vec2 st = _st * 2. - 1.;
   // Angle and radius from the current pixel
   float a = atan(st.x,st.y)+3.1416;
   float r = (2.*3.1416)/sides;
   float d = cos(floor(.5+a/r)*r-a)*length(st);
   return vec4(vec3(1.0-smoothstep(radius,radius + smoothing + 0.0000001,d)), 1.0);`
},
{
  name: 'gradient',
  type: 'src',
  inputs: [
    {
      type: 'float',
      name: 'speed',
      default: 0,
    }
  ],
  glsl:
`   return vec4(_st, sin(time*speed), 1.0);`
},
{
  name: 'src',
  type: 'src',
  inputs: [
    {
      type: 'sampler2D',
      name: 'tex',
      default: NaN,
    }
  ],
  glsl:
`   //  vec2 uv = gl_FragCoord.xy/vec2(1280., 720.);
   return texture2D(tex, fract(_st));`
},
{
  name: 'solid',
  type: 'src',
  inputs: [
    {
      type: 'float',
      name: 'r',
      default: 0,
    },
{
      type: 'float',
      name: 'g',
      default: 0,
    },
{
      type: 'float',
      name: 'b',
      default: 0,
    },
{
      type: 'float',
      name: 'a',
      default: 1,
    }
  ],
  glsl:
`   return vec4(r, g, b, a);`
},
{
  name: 'rotate',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'angle',
      default: 10,
    },
{
      type: 'float',
      name: 'speed',
      default: 0,
    }
  ],
  glsl:
`   vec2 xy = _st - vec2(0.5);
   float ang = angle + speed *time;
   xy = mat2(cos(ang),-sin(ang), sin(ang),cos(ang))*xy;
   xy += 0.5;
   return xy;`
},
{
  name: 'scale',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 1.5,
    },
{
      type: 'float',
      name: 'xMult',
      default: 1,
    },
{
      type: 'float',
      name: 'yMult',
      default: 1,
    },
{
      type: 'float',
      name: 'offsetX',
      default: 0.5,
    },
{
      type: 'float',
      name: 'offsetY',
      default: 0.5,
    }
  ],
  glsl:
`   vec2 xy = _st - vec2(offsetX, offsetY);
   xy*=(1.0/vec2(amount*xMult, amount*yMult));
   xy+=vec2(offsetX, offsetY);
   return xy;
   `
},
{
  name: 'pixelate',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'pixelX',
      default: 20,
    },
{
      type: 'float',
      name: 'pixelY',
      default: 20,
    }
  ],
  glsl:
`   vec2 xy = vec2(pixelX, pixelY);
   return (floor(_st * xy) + 0.5)/xy;`
},
{
  name: 'posterize',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'bins',
      default: 3,
    },
{
      type: 'float',
      name: 'gamma',
      default: 0.6,
    }
  ],
  glsl:
`   vec4 c2 = pow(_c0, vec4(gamma));
   c2 *= vec4(bins);
   c2 = floor(c2);
   c2/= vec4(bins);
   c2 = pow(c2, vec4(1.0/gamma));
   return vec4(c2.xyz, _c0.a);`
},
{
  name: 'shift',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'r',
      default: 0.5,
    },
{
      type: 'float',
      name: 'g',
      default: 0,
    },
{
      type: 'float',
      name: 'b',
      default: 0,
    },
{
      type: 'float',
      name: 'a',
      default: 0,
    }
  ],
  glsl:
`   vec4 c2 = vec4(_c0);
   c2.r = fract(c2.r + r);
   c2.g = fract(c2.g + g);
   c2.b = fract(c2.b + b);
   c2.a = fract(c2.a + a);
   return vec4(c2.rgba);`
},
{
  name: 'repeat',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'repeatX',
      default: 3,
    },
{
      type: 'float',
      name: 'repeatY',
      default: 3,
    },
{
      type: 'float',
      name: 'offsetX',
      default: 0,
    },
{
      type: 'float',
      name: 'offsetY',
      default: 0,
    }
  ],
  glsl:
`   vec2 st = _st * vec2(repeatX, repeatY);
   st.x += step(1., mod(st.y,2.0)) * offsetX;
   st.y += step(1., mod(st.x,2.0)) * offsetY;
   return fract(st);`
},
{
  name: 'modulateRepeat',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'repeatX',
      default: 3,
    },
{
      type: 'float',
      name: 'repeatY',
      default: 3,
    },
{
      type: 'float',
      name: 'offsetX',
      default: 0.5,
    },
{
      type: 'float',
      name: 'offsetY',
      default: 0.5,
    }
  ],
  glsl:
`   vec2 st = _st * vec2(repeatX, repeatY);
   st.x += step(1., mod(st.y,2.0)) + _c0.r * offsetX;
   st.y += step(1., mod(st.x,2.0)) + _c0.g * offsetY;
   return fract(st);`
},
{
  name: 'repeatX',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'reps',
      default: 3,
    },
{
      type: 'float',
      name: 'offset',
      default: 0,
    }
  ],
  glsl:
`   vec2 st = _st * vec2(reps, 1.0);
   //  float f =  mod(_st.y,2.0);
   st.y += step(1., mod(st.x,2.0))* offset;
   return fract(st);`
},
{
  name: 'modulateRepeatX',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'reps',
      default: 3,
    },
{
      type: 'float',
      name: 'offset',
      default: 0.5,
    }
  ],
  glsl:
`   vec2 st = _st * vec2(reps, 1.0);
   //  float f =  mod(_st.y,2.0);
   st.y += step(1., mod(st.x,2.0)) + _c0.r * offset;
   return fract(st);`
},
{
  name: 'repeatY',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'reps',
      default: 3,
    },
{
      type: 'float',
      name: 'offset',
      default: 0,
    }
  ],
  glsl:
`   vec2 st = _st * vec2(1.0, reps);
   //  float f =  mod(_st.y,2.0);
   st.x += step(1., mod(st.y,2.0))* offset;
   return fract(st);`
},
{
  name: 'modulateRepeatY',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'reps',
      default: 3,
    },
{
      type: 'float',
      name: 'offset',
      default: 0.5,
    }
  ],
  glsl:
`   vec2 st = _st * vec2(reps, 1.0);
   //  float f =  mod(_st.y,2.0);
   st.x += step(1., mod(st.y,2.0)) + _c0.r * offset;
   return fract(st);`
},
{
  name: 'kaleid',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'nSides',
      default: 4,
    }
  ],
  glsl:
`   vec2 st = _st;
   st -= 0.5;
   float r = length(st);
   float a = atan(st.y, st.x);
   float pi = 2.*3.1416;
   a = mod(a,pi/nSides);
   a = abs(a-pi/nSides/2.);
   return r*vec2(cos(a), sin(a));`
},
{
  name: 'modulateKaleid',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'nSides',
      default: 4,
    }
  ],
  glsl:
`   vec2 st = _st - 0.5;
   float r = length(st);
   float a = atan(st.y, st.x);
   float pi = 2.*3.1416;
   a = mod(a,pi/nSides);
   a = abs(a-pi/nSides/2.);
   return (_c0.r+r)*vec2(cos(a), sin(a));`
},
{
  name: 'scroll',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'scrollX',
      default: 0.5,
    },
{
      type: 'float',
      name: 'scrollY',
      default: 0.5,
    },
{
      type: 'float',
      name: 'speedX',
      default: 0,
    },
{
      type: 'float',
      name: 'speedY',
      default: 0,
    }
  ],
  glsl:
`
   _st.x += scrollX + time*speedX;
   _st.y += scrollY + time*speedY;
   return fract(_st);`
},
{
  name: 'scrollX',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'scrollX',
      default: 0.5,
    },
{
      type: 'float',
      name: 'speed',
      default: 0,
    }
  ],
  glsl:
`   _st.x += scrollX + time*speed;
   return fract(_st);`
},
{
  name: 'modulateScrollX',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'scrollX',
      default: 0.5,
    },
{
      type: 'float',
      name: 'speed',
      default: 0,
    }
  ],
  glsl:
`   _st.x += _c0.r*scrollX + time*speed;
   return fract(_st);`
},
{
  name: 'scrollY',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'scrollY',
      default: 0.5,
    },
{
      type: 'float',
      name: 'speed',
      default: 0,
    }
  ],
  glsl:
`   _st.y += scrollY + time*speed;
   return fract(_st);`
},
{
  name: 'modulateScrollY',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'scrollY',
      default: 0.5,
    },
{
      type: 'float',
      name: 'speed',
      default: 0,
    }
  ],
  glsl:
`   _st.y += _c0.r*scrollY + time*speed;
   return fract(_st);`
},
{
  name: 'add',
  type: 'combine',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 1,
    }
  ],
  glsl:
`   return (_c0+_c1)*amount + _c0*(1.0-amount);`
},
{
  name: 'sub',
  type: 'combine',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 1,
    }
  ],
  glsl:
`   return (_c0-_c1)*amount + _c0*(1.0-amount);`
},
{
  name: 'layer',
  type: 'combine',
  inputs: [

  ],
  glsl:
`   return vec4(mix(_c0.rgb, _c1.rgb, _c1.a), clamp(_c0.a + _c1.a, 0.0, 1.0));`
},
{
  name: 'blend',
  type: 'combine',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 0.5,
    }
  ],
  glsl:
`   return _c0*(1.0-amount)+_c1*amount;`
},
{
  name: 'mult',
  type: 'combine',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 1,
    }
  ],
  glsl:
`   return _c0*(1.0-amount)+(_c0*_c1)*amount;`
},
{
  name: 'diff',
  type: 'combine',
  inputs: [

  ],
  glsl:
`   return vec4(abs(_c0.rgb-_c1.rgb), max(_c0.a, _c1.a));`
},
{
  name: 'modulate',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 0.1,
    }
  ],
  glsl:
`   //  return fract(st+(_c0.xy-0.5)*amount);
   return _st + _c0.xy*amount;`
},
{
  name: 'modulateScale',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'multiple',
      default: 1,
    },
{
      type: 'float',
      name: 'offset',
      default: 1,
    }
  ],
  glsl:
`   vec2 xy = _st - vec2(0.5);
   xy*=(1.0/vec2(offset + multiple*_c0.r, offset + multiple*_c0.g));
   xy+=vec2(0.5);
   return xy;`
},
{
  name: 'modulatePixelate',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'multiple',
      default: 10,
    },
{
      type: 'float',
      name: 'offset',
      default: 3,
    }
  ],
  glsl:
`   vec2 xy = vec2(offset + _c0.x*multiple, offset + _c0.y*multiple);
   return (floor(_st * xy) + 0.5)/xy;`
},
{
  name: 'modulateRotate',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'multiple',
      default: 1,
    },
{
      type: 'float',
      name: 'offset',
      default: 0,
    }
  ],
  glsl:
`   vec2 xy = _st - vec2(0.5);
   float angle = offset + _c0.x * multiple;
   xy = mat2(cos(angle),-sin(angle), sin(angle),cos(angle))*xy;
   xy += 0.5;
   return xy;`
},
{
  name: 'modulateHue',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 1,
    }
  ],
  glsl:
`   return _st + (vec2(_c0.g - _c0.r, _c0.b - _c0.g) * amount * 1.0/resolution);`
},
{
  name: 'invert',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 1,
    }
  ],
  glsl:
`   return vec4((1.0-_c0.rgb)*amount + _c0.rgb*(1.0-amount), _c0.a);`
},
{
  name: 'contrast',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 1.6,
    }
  ],
  glsl:
`   vec4 c = (_c0-vec4(0.5))*vec4(amount) + vec4(0.5);
   return vec4(c.rgb, _c0.a);`
},
{
  name: 'brightness',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 0.4,
    }
  ],
  glsl:
`   return vec4(_c0.rgb + vec3(amount), _c0.a);`
},
{
  name: 'mask',
  type: 'combine',
  inputs: [

  ],
  glsl:
  `   float a = _luminance(_c1.rgb);
  return vec4(_c0.rgb*a, a*_c0.a);`
},

{
  name: 'luma',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'threshold',
      default: 0.5,
    },
{
      type: 'float',
      name: 'tolerance',
      default: 0.1,
    }
  ],
  glsl:
`   float a = smoothstep(threshold-(tolerance+0.0000001), threshold+(tolerance+0.0000001), _luminance(_c0.rgb));
   return vec4(_c0.rgb*a, a);`
},
{
  name: 'thresh',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'threshold',
      default: 0.5,
    },
{
      type: 'float',
      name: 'tolerance',
      default: 0.04,
    }
  ],
  glsl:
`   return vec4(vec3(smoothstep(threshold-(tolerance+0.0000001), threshold+(tolerance+0.0000001), _luminance(_c0.rgb))), _c0.a);`
},
{
  name: 'color',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'r',
      default: 1,
    },
{
      type: 'float',
      name: 'g',
      default: 1,
    },
{
      type: 'float',
      name: 'b',
      default: 1,
    },
{
      type: 'float',
      name: 'a',
      default: 1,
    }
  ],
  glsl:
`   vec4 c = vec4(r, g, b, a);
   vec4 pos = step(0.0, c); // detect whether negative
   // if > 0, return r * _c0
   // if < 0 return (1.0-r) * _c0
   return vec4(mix((1.0-_c0)*abs(c), c*_c0, pos));`
},
{
  name: 'saturate',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 2,
    }
  ],
  glsl:
`   const vec3 W = vec3(0.2125, 0.7154, 0.0721);
   vec3 intensity = vec3(dot(_c0.rgb, W));
   return vec4(mix(intensity, _c0.rgb, amount), _c0.a);`
},
{
  name: 'hue',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'hue',
      default: 0.4,
    }
  ],
  glsl:
`   vec3 c = _rgbToHsv(_c0.rgb);
   c.r += hue;
   //  c.r = fract(c.r);
   return vec4(_hsvToRgb(c), _c0.a);`
},
{
  name: 'colorama',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 0.005,
    }
  ],
  glsl:
`   vec3 c = _rgbToHsv(_c0.rgb);
   c += vec3(amount);
   c = _hsvToRgb(c);
   c = fract(c);
   return vec4(c, _c0.a);`
},
{
  name: 'prev',
  type: 'src',
  inputs: [

  ],
  glsl:
`   return texture2D(prevBuffer, fract(_st));`
},
{
  name: 'sum',
  type: 'color',
  inputs: [
    {
      type: 'vec4',
      name: 'scale',
      default: 1,
    }
  ],
  glsl:
`   vec4 v = _c0 * s;
   return v.r + v.g + v.b + v.a;
   }
   float sum(vec2 _st, vec4 s) { // vec4 is not a typo, because argument type is not overloaded
   vec2 v = _st.xy * s.xy;
   return v.x + v.y;`
},
{
  name: 'r',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'scale',
      default: 1,
    },
{
      type: 'float',
      name: 'offset',
      default: 0,
    }
  ],
  glsl:
`   return vec4(_c0.r * scale + offset);`
},
{
  name: 'g',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'scale',
      default: 1,
    },
{
      type: 'float',
      name: 'offset',
      default: 0,
    }
  ],
  glsl:
`   return vec4(_c0.g * scale + offset);`
},
{
  name: 'b',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'scale',
      default: 1,
    },
{
      type: 'float',
      name: 'offset',
      default: 0,
    }
  ],
  glsl:
`   return vec4(_c0.b * scale + offset);`
},
{
  name: 'a',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'scale',
      default: 1,
    },
{
      type: 'float',
      name: 'offset',
      default: 0,
    }
  ],
  glsl:
`   return vec4(_c0.a * scale + offset);`
}
];

class GeneratorFactory {
  constructor ({
      defaultUniforms,
      defaultOutput,
      extendTransforms = [],
      changeListener = (() => {})
    } = {}
    ) {
    this.defaultOutput = defaultOutput;
    this.defaultUniforms = defaultUniforms;
    this.changeListener = changeListener;
    this.extendTransforms = extendTransforms;
    this.generators = {};
    this.init();
  }
  init () {
    const functions = glslFunctions();
    this.glslTransforms = {};
    this.generators = Object.entries(this.generators).reduce((prev, [method, transform]) => {
      this.changeListener({type: 'remove', synth: this, method});
      return prev
    }, {});

    this.sourceClass = (() => {
      return class extends GlslSource {
      }
    })();

    

    // add user definied transforms
    if (Array.isArray(this.extendTransforms)) {
      functions.concat(this.extendTransforms);
    } else if (typeof this.extendTransforms === 'object' && this.extendTransforms.type) {
      functions.push(this.extendTransforms);
    }

    return functions.map((transform) => this.setFunction(transform))
 }

 _addMethod (method, transform) {
    const self = this;
    this.glslTransforms[method] = transform;
    if (transform.type === 'src') {
      const func = (...args) => new this.sourceClass({
        name: method,
        transform: transform,
        userArgs: args,
        defaultOutput: this.defaultOutput,
        defaultUniforms: this.defaultUniforms,
        synth: self
      });
      this.generators[method] = func;
      this.changeListener({type: 'add', synth: this, method});
      return func
    } else  {
      this.sourceClass.prototype[method] = function (...args) {
        this.transforms.push({name: method, transform: transform, userArgs: args, synth: self});
        return this
      };
    }
    return undefined
  }

  setFunction(obj) {
    var processedGlsl = processGlsl(obj);
    if(processedGlsl) this._addMethod(obj.name, processedGlsl);
  }
}

const typeLookup = {
  'src': {
    returnType: 'vec4',
    args: ['vec2 _st']
  },
  'coord': {
    returnType: 'vec2',
    args: ['vec2 _st']
  },
  'color': {
    returnType: 'vec4',
    args: ['vec4 _c0']
  },
  'combine': {
    returnType: 'vec4',
    args: ['vec4 _c0', 'vec4 _c1']
  },
  'combineCoord': {
    returnType: 'vec2',
    args: ['vec2 _st', 'vec4 _c0']
  }
};
// expects glsl of format
// {
//   name: 'osc', // name that will be used to access function as well as within glsl
//   type: 'src', // can be src: vec4(vec2 _st), coord: vec2(vec2 _st), color: vec4(vec4 _c0), combine: vec4(vec4 _c0, vec4 _c1), combineCoord: vec2(vec2 _st, vec4 _c0)
//   inputs: [
//     {
//       name: 'freq',
//       type: 'float', // 'float'   //, 'texture', 'vec4'
//       default: 0.2
//     },
//     {
//           name: 'sync',
//           type: 'float',
//           default: 0.1
//         },
//         {
//           name: 'offset',
//           type: 'float',
//           default: 0.0
//         }
//   ],
   //  glsl: `
   //    vec2 st = _st;
   //    float r = sin((st.x-offset*2/freq+time*sync)*freq)*0.5  + 0.5;
   //    float g = sin((st.x+time*sync)*freq)*0.5 + 0.5;
   //    float b = sin((st.x+offset/freq+time*sync)*freq)*0.5  + 0.5;
   //    return vec4(r, g, b, 1.0);
   // `
// }

// // generates glsl function:
// `vec4 osc(vec2 _st, float freq, float sync, float offset){
//  vec2 st = _st;
//  float r = sin((st.x-offset*2/freq+time*sync)*freq)*0.5  + 0.5;
//  float g = sin((st.x+time*sync)*freq)*0.5 + 0.5;
//  float b = sin((st.x+offset/freq+time*sync)*freq)*0.5  + 0.5;
//  return vec4(r, g, b, 1.0);
// }`

function processGlsl(obj) {
  let t = typeLookup[obj.type];
  if(t) {
  let baseArgs = t.args.map((arg) => arg).join(", ");
  // @todo: make sure this works for all input types, add validation
  let customArgs = obj.inputs.map((input) => `${input.type} ${input.name}`).join(', ');
  let args = `${baseArgs}${customArgs.length > 0 ? ', '+ customArgs: ''}`;
//  console.log('args are ', args)

    let glslFunction =
`
  ${t.returnType} ${obj.name}(${args}) {
      ${obj.glsl}
  }
`;

  // add extra input to beginning for backward combatibility @todo update compiler so this is no longer necessary
    if(obj.type === 'combine' || obj.type === 'combineCoord') obj.inputs.unshift({
        name: 'color',
        type: 'vec4'
      });
    return Object.assign({}, obj, { glsl: glslFunction})
  } else {
    console.warn(`type ${obj.type} not recognized`, obj);
  }

}

var regl$1 = {exports: {}};

(function (module, exports) {
	(function (global, factory) {
	    module.exports = factory() ;
	}(commonjsGlobal, (function () {
	var isTypedArray = function (x) {
	  return (
	    x instanceof Uint8Array ||
	    x instanceof Uint16Array ||
	    x instanceof Uint32Array ||
	    x instanceof Int8Array ||
	    x instanceof Int16Array ||
	    x instanceof Int32Array ||
	    x instanceof Float32Array ||
	    x instanceof Float64Array ||
	    x instanceof Uint8ClampedArray
	  )
	};

	var extend = function (base, opts) {
	  var keys = Object.keys(opts);
	  for (var i = 0; i < keys.length; ++i) {
	    base[keys[i]] = opts[keys[i]];
	  }
	  return base
	};

	// Error checking and parameter validation.
	//
	// Statements for the form `check.someProcedure(...)` get removed by
	// a browserify transform for optimized/minified bundles.
	//
	/* globals atob */
	var endl = '\n';

	// only used for extracting shader names.  if atob not present, then errors
	// will be slightly crappier
	function decodeB64 (str) {
	  if (typeof atob !== 'undefined') {
	    return atob(str)
	  }
	  return 'base64:' + str
	}

	function raise (message) {
	  var error = new Error('(regl) ' + message);
	  console.error(error);
	  throw error
	}

	function check (pred, message) {
	  if (!pred) {
	    raise(message);
	  }
	}

	function encolon (message) {
	  if (message) {
	    return ': ' + message
	  }
	  return ''
	}

	function checkParameter (param, possibilities, message) {
	  if (!(param in possibilities)) {
	    raise('unknown parameter (' + param + ')' + encolon(message) +
	          '. possible values: ' + Object.keys(possibilities).join());
	  }
	}

	function checkIsTypedArray (data, message) {
	  if (!isTypedArray(data)) {
	    raise(
	      'invalid parameter type' + encolon(message) +
	      '. must be a typed array');
	  }
	}

	function standardTypeEh (value, type) {
	  switch (type) {
	    case 'number': return typeof value === 'number'
	    case 'object': return typeof value === 'object'
	    case 'string': return typeof value === 'string'
	    case 'boolean': return typeof value === 'boolean'
	    case 'function': return typeof value === 'function'
	    case 'undefined': return typeof value === 'undefined'
	    case 'symbol': return typeof value === 'symbol'
	  }
	}

	function checkTypeOf (value, type, message) {
	  if (!standardTypeEh(value, type)) {
	    raise(
	      'invalid parameter type' + encolon(message) +
	      '. expected ' + type + ', got ' + (typeof value));
	  }
	}

	function checkNonNegativeInt (value, message) {
	  if (!((value >= 0) &&
	        ((value | 0) === value))) {
	    raise('invalid parameter type, (' + value + ')' + encolon(message) +
	          '. must be a nonnegative integer');
	  }
	}

	function checkOneOf (value, list, message) {
	  if (list.indexOf(value) < 0) {
	    raise('invalid value' + encolon(message) + '. must be one of: ' + list);
	  }
	}

	var constructorKeys = [
	  'gl',
	  'canvas',
	  'container',
	  'attributes',
	  'pixelRatio',
	  'extensions',
	  'optionalExtensions',
	  'profile',
	  'onDone'
	];

	function checkConstructor (obj) {
	  Object.keys(obj).forEach(function (key) {
	    if (constructorKeys.indexOf(key) < 0) {
	      raise('invalid regl constructor argument "' + key + '". must be one of ' + constructorKeys);
	    }
	  });
	}

	function leftPad (str, n) {
	  str = str + '';
	  while (str.length < n) {
	    str = ' ' + str;
	  }
	  return str
	}

	function ShaderFile () {
	  this.name = 'unknown';
	  this.lines = [];
	  this.index = {};
	  this.hasErrors = false;
	}

	function ShaderLine (number, line) {
	  this.number = number;
	  this.line = line;
	  this.errors = [];
	}

	function ShaderError (fileNumber, lineNumber, message) {
	  this.file = fileNumber;
	  this.line = lineNumber;
	  this.message = message;
	}

	function guessCommand () {
	  var error = new Error();
	  var stack = (error.stack || error).toString();
	  var pat = /compileProcedure.*\n\s*at.*\((.*)\)/.exec(stack);
	  if (pat) {
	    return pat[1]
	  }
	  var pat2 = /compileProcedure.*\n\s*at\s+(.*)(\n|$)/.exec(stack);
	  if (pat2) {
	    return pat2[1]
	  }
	  return 'unknown'
	}

	function guessCallSite () {
	  var error = new Error();
	  var stack = (error.stack || error).toString();
	  var pat = /at REGLCommand.*\n\s+at.*\((.*)\)/.exec(stack);
	  if (pat) {
	    return pat[1]
	  }
	  var pat2 = /at REGLCommand.*\n\s+at\s+(.*)\n/.exec(stack);
	  if (pat2) {
	    return pat2[1]
	  }
	  return 'unknown'
	}

	function parseSource (source, command) {
	  var lines = source.split('\n');
	  var lineNumber = 1;
	  var fileNumber = 0;
	  var files = {
	    unknown: new ShaderFile(),
	    0: new ShaderFile()
	  };
	  files.unknown.name = files[0].name = command || guessCommand();
	  files.unknown.lines.push(new ShaderLine(0, ''));
	  for (var i = 0; i < lines.length; ++i) {
	    var line = lines[i];
	    var parts = /^\s*#\s*(\w+)\s+(.+)\s*$/.exec(line);
	    if (parts) {
	      switch (parts[1]) {
	        case 'line':
	          var lineNumberInfo = /(\d+)(\s+\d+)?/.exec(parts[2]);
	          if (lineNumberInfo) {
	            lineNumber = lineNumberInfo[1] | 0;
	            if (lineNumberInfo[2]) {
	              fileNumber = lineNumberInfo[2] | 0;
	              if (!(fileNumber in files)) {
	                files[fileNumber] = new ShaderFile();
	              }
	            }
	          }
	          break
	        case 'define':
	          var nameInfo = /SHADER_NAME(_B64)?\s+(.*)$/.exec(parts[2]);
	          if (nameInfo) {
	            files[fileNumber].name = (nameInfo[1]
	              ? decodeB64(nameInfo[2])
	              : nameInfo[2]);
	          }
	          break
	      }
	    }
	    files[fileNumber].lines.push(new ShaderLine(lineNumber++, line));
	  }
	  Object.keys(files).forEach(function (fileNumber) {
	    var file = files[fileNumber];
	    file.lines.forEach(function (line) {
	      file.index[line.number] = line;
	    });
	  });
	  return files
	}

	function parseErrorLog (errLog) {
	  var result = [];
	  errLog.split('\n').forEach(function (errMsg) {
	    if (errMsg.length < 5) {
	      return
	    }
	    var parts = /^ERROR:\s+(\d+):(\d+):\s*(.*)$/.exec(errMsg);
	    if (parts) {
	      result.push(new ShaderError(
	        parts[1] | 0,
	        parts[2] | 0,
	        parts[3].trim()));
	    } else if (errMsg.length > 0) {
	      result.push(new ShaderError('unknown', 0, errMsg));
	    }
	  });
	  return result
	}

	function annotateFiles (files, errors) {
	  errors.forEach(function (error) {
	    var file = files[error.file];
	    if (file) {
	      var line = file.index[error.line];
	      if (line) {
	        line.errors.push(error);
	        file.hasErrors = true;
	        return
	      }
	    }
	    files.unknown.hasErrors = true;
	    files.unknown.lines[0].errors.push(error);
	  });
	}

	function checkShaderError (gl, shader, source, type, command) {
	  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
	    var errLog = gl.getShaderInfoLog(shader);
	    var typeName = type === gl.FRAGMENT_SHADER ? 'fragment' : 'vertex';
	    checkCommandType(source, 'string', typeName + ' shader source must be a string', command);
	    var files = parseSource(source, command);
	    var errors = parseErrorLog(errLog);
	    annotateFiles(files, errors);

	    Object.keys(files).forEach(function (fileNumber) {
	      var file = files[fileNumber];
	      if (!file.hasErrors) {
	        return
	      }

	      var strings = [''];
	      var styles = [''];

	      function push (str, style) {
	        strings.push(str);
	        styles.push(style || '');
	      }

	      push('file number ' + fileNumber + ': ' + file.name + '\n', 'color:red;text-decoration:underline;font-weight:bold');

	      file.lines.forEach(function (line) {
	        if (line.errors.length > 0) {
	          push(leftPad(line.number, 4) + '|  ', 'background-color:yellow; font-weight:bold');
	          push(line.line + endl, 'color:red; background-color:yellow; font-weight:bold');

	          // try to guess token
	          var offset = 0;
	          line.errors.forEach(function (error) {
	            var message = error.message;
	            var token = /^\s*'(.*)'\s*:\s*(.*)$/.exec(message);
	            if (token) {
	              var tokenPat = token[1];
	              message = token[2];
	              switch (tokenPat) {
	                case 'assign':
	                  tokenPat = '=';
	                  break
	              }
	              offset = Math.max(line.line.indexOf(tokenPat, offset), 0);
	            } else {
	              offset = 0;
	            }

	            push(leftPad('| ', 6));
	            push(leftPad('^^^', offset + 3) + endl, 'font-weight:bold');
	            push(leftPad('| ', 6));
	            push(message + endl, 'font-weight:bold');
	          });
	          push(leftPad('| ', 6) + endl);
	        } else {
	          push(leftPad(line.number, 4) + '|  ');
	          push(line.line + endl, 'color:red');
	        }
	      });
	      if (typeof document !== 'undefined' && !window.chrome) {
	        styles[0] = strings.join('%c');
	        console.log.apply(console, styles);
	      } else {
	        console.log(strings.join(''));
	      }
	    });

	    check.raise('Error compiling ' + typeName + ' shader, ' + files[0].name);
	  }
	}

	function checkLinkError (gl, program, fragShader, vertShader, command) {
	  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
	    var errLog = gl.getProgramInfoLog(program);
	    var fragParse = parseSource(fragShader, command);
	    var vertParse = parseSource(vertShader, command);

	    var header = 'Error linking program with vertex shader, "' +
	      vertParse[0].name + '", and fragment shader "' + fragParse[0].name + '"';

	    if (typeof document !== 'undefined') {
	      console.log('%c' + header + endl + '%c' + errLog,
	        'color:red;text-decoration:underline;font-weight:bold',
	        'color:red');
	    } else {
	      console.log(header + endl + errLog);
	    }
	    check.raise(header);
	  }
	}

	function saveCommandRef (object) {
	  object._commandRef = guessCommand();
	}

	function saveDrawCommandInfo (opts, uniforms, attributes, stringStore) {
	  saveCommandRef(opts);

	  function id (str) {
	    if (str) {
	      return stringStore.id(str)
	    }
	    return 0
	  }
	  opts._fragId = id(opts.static.frag);
	  opts._vertId = id(opts.static.vert);

	  function addProps (dict, set) {
	    Object.keys(set).forEach(function (u) {
	      dict[stringStore.id(u)] = true;
	    });
	  }

	  var uniformSet = opts._uniformSet = {};
	  addProps(uniformSet, uniforms.static);
	  addProps(uniformSet, uniforms.dynamic);

	  var attributeSet = opts._attributeSet = {};
	  addProps(attributeSet, attributes.static);
	  addProps(attributeSet, attributes.dynamic);

	  opts._hasCount = (
	    'count' in opts.static ||
	    'count' in opts.dynamic ||
	    'elements' in opts.static ||
	    'elements' in opts.dynamic);
	}

	function commandRaise (message, command) {
	  var callSite = guessCallSite();
	  raise(message +
	    ' in command ' + (command || guessCommand()) +
	    (callSite === 'unknown' ? '' : ' called from ' + callSite));
	}

	function checkCommand (pred, message, command) {
	  if (!pred) {
	    commandRaise(message, command || guessCommand());
	  }
	}

	function checkParameterCommand (param, possibilities, message, command) {
	  if (!(param in possibilities)) {
	    commandRaise(
	      'unknown parameter (' + param + ')' + encolon(message) +
	      '. possible values: ' + Object.keys(possibilities).join(),
	      command || guessCommand());
	  }
	}

	function checkCommandType (value, type, message, command) {
	  if (!standardTypeEh(value, type)) {
	    commandRaise(
	      'invalid parameter type' + encolon(message) +
	      '. expected ' + type + ', got ' + (typeof value),
	      command || guessCommand());
	  }
	}

	function checkOptional (block) {
	  block();
	}

	function checkFramebufferFormat (attachment, texFormats, rbFormats) {
	  if (attachment.texture) {
	    checkOneOf(
	      attachment.texture._texture.internalformat,
	      texFormats,
	      'unsupported texture format for attachment');
	  } else {
	    checkOneOf(
	      attachment.renderbuffer._renderbuffer.format,
	      rbFormats,
	      'unsupported renderbuffer format for attachment');
	  }
	}

	var GL_CLAMP_TO_EDGE = 0x812F;

	var GL_NEAREST = 0x2600;
	var GL_NEAREST_MIPMAP_NEAREST = 0x2700;
	var GL_LINEAR_MIPMAP_NEAREST = 0x2701;
	var GL_NEAREST_MIPMAP_LINEAR = 0x2702;
	var GL_LINEAR_MIPMAP_LINEAR = 0x2703;

	var GL_BYTE = 5120;
	var GL_UNSIGNED_BYTE = 5121;
	var GL_SHORT = 5122;
	var GL_UNSIGNED_SHORT = 5123;
	var GL_INT = 5124;
	var GL_UNSIGNED_INT = 5125;
	var GL_FLOAT = 5126;

	var GL_UNSIGNED_SHORT_4_4_4_4 = 0x8033;
	var GL_UNSIGNED_SHORT_5_5_5_1 = 0x8034;
	var GL_UNSIGNED_SHORT_5_6_5 = 0x8363;
	var GL_UNSIGNED_INT_24_8_WEBGL = 0x84FA;

	var GL_HALF_FLOAT_OES = 0x8D61;

	var TYPE_SIZE = {};

	TYPE_SIZE[GL_BYTE] =
	TYPE_SIZE[GL_UNSIGNED_BYTE] = 1;

	TYPE_SIZE[GL_SHORT] =
	TYPE_SIZE[GL_UNSIGNED_SHORT] =
	TYPE_SIZE[GL_HALF_FLOAT_OES] =
	TYPE_SIZE[GL_UNSIGNED_SHORT_5_6_5] =
	TYPE_SIZE[GL_UNSIGNED_SHORT_4_4_4_4] =
	TYPE_SIZE[GL_UNSIGNED_SHORT_5_5_5_1] = 2;

	TYPE_SIZE[GL_INT] =
	TYPE_SIZE[GL_UNSIGNED_INT] =
	TYPE_SIZE[GL_FLOAT] =
	TYPE_SIZE[GL_UNSIGNED_INT_24_8_WEBGL] = 4;

	function pixelSize (type, channels) {
	  if (type === GL_UNSIGNED_SHORT_5_5_5_1 ||
	      type === GL_UNSIGNED_SHORT_4_4_4_4 ||
	      type === GL_UNSIGNED_SHORT_5_6_5) {
	    return 2
	  } else if (type === GL_UNSIGNED_INT_24_8_WEBGL) {
	    return 4
	  } else {
	    return TYPE_SIZE[type] * channels
	  }
	}

	function isPow2 (v) {
	  return !(v & (v - 1)) && (!!v)
	}

	function checkTexture2D (info, mipData, limits) {
	  var i;
	  var w = mipData.width;
	  var h = mipData.height;
	  var c = mipData.channels;

	  // Check texture shape
	  check(w > 0 && w <= limits.maxTextureSize &&
	        h > 0 && h <= limits.maxTextureSize,
	  'invalid texture shape');

	  // check wrap mode
	  if (info.wrapS !== GL_CLAMP_TO_EDGE || info.wrapT !== GL_CLAMP_TO_EDGE) {
	    check(isPow2(w) && isPow2(h),
	      'incompatible wrap mode for texture, both width and height must be power of 2');
	  }

	  if (mipData.mipmask === 1) {
	    if (w !== 1 && h !== 1) {
	      check(
	        info.minFilter !== GL_NEAREST_MIPMAP_NEAREST &&
	        info.minFilter !== GL_NEAREST_MIPMAP_LINEAR &&
	        info.minFilter !== GL_LINEAR_MIPMAP_NEAREST &&
	        info.minFilter !== GL_LINEAR_MIPMAP_LINEAR,
	        'min filter requires mipmap');
	    }
	  } else {
	    // texture must be power of 2
	    check(isPow2(w) && isPow2(h),
	      'texture must be a square power of 2 to support mipmapping');
	    check(mipData.mipmask === (w << 1) - 1,
	      'missing or incomplete mipmap data');
	  }

	  if (mipData.type === GL_FLOAT) {
	    if (limits.extensions.indexOf('oes_texture_float_linear') < 0) {
	      check(info.minFilter === GL_NEAREST && info.magFilter === GL_NEAREST,
	        'filter not supported, must enable oes_texture_float_linear');
	    }
	    check(!info.genMipmaps,
	      'mipmap generation not supported with float textures');
	  }

	  // check image complete
	  var mipimages = mipData.images;
	  for (i = 0; i < 16; ++i) {
	    if (mipimages[i]) {
	      var mw = w >> i;
	      var mh = h >> i;
	      check(mipData.mipmask & (1 << i), 'missing mipmap data');

	      var img = mipimages[i];

	      check(
	        img.width === mw &&
	        img.height === mh,
	        'invalid shape for mip images');

	      check(
	        img.format === mipData.format &&
	        img.internalformat === mipData.internalformat &&
	        img.type === mipData.type,
	        'incompatible type for mip image');

	      if (img.compressed) ; else if (img.data) {
	        // check(img.data.byteLength === mw * mh *
	        // Math.max(pixelSize(img.type, c), img.unpackAlignment),
	        var rowSize = Math.ceil(pixelSize(img.type, c) * mw / img.unpackAlignment) * img.unpackAlignment;
	        check(img.data.byteLength === rowSize * mh,
	          'invalid data for image, buffer size is inconsistent with image format');
	      } else if (img.element) ; else if (img.copy) ;
	    } else if (!info.genMipmaps) {
	      check((mipData.mipmask & (1 << i)) === 0, 'extra mipmap data');
	    }
	  }

	  if (mipData.compressed) {
	    check(!info.genMipmaps,
	      'mipmap generation for compressed images not supported');
	  }
	}

	function checkTextureCube (texture, info, faces, limits) {
	  var w = texture.width;
	  var h = texture.height;
	  var c = texture.channels;

	  // Check texture shape
	  check(
	    w > 0 && w <= limits.maxTextureSize && h > 0 && h <= limits.maxTextureSize,
	    'invalid texture shape');
	  check(
	    w === h,
	    'cube map must be square');
	  check(
	    info.wrapS === GL_CLAMP_TO_EDGE && info.wrapT === GL_CLAMP_TO_EDGE,
	    'wrap mode not supported by cube map');

	  for (var i = 0; i < faces.length; ++i) {
	    var face = faces[i];
	    check(
	      face.width === w && face.height === h,
	      'inconsistent cube map face shape');

	    if (info.genMipmaps) {
	      check(!face.compressed,
	        'can not generate mipmap for compressed textures');
	      check(face.mipmask === 1,
	        'can not specify mipmaps and generate mipmaps');
	    }

	    var mipmaps = face.images;
	    for (var j = 0; j < 16; ++j) {
	      var img = mipmaps[j];
	      if (img) {
	        var mw = w >> j;
	        var mh = h >> j;
	        check(face.mipmask & (1 << j), 'missing mipmap data');
	        check(
	          img.width === mw &&
	          img.height === mh,
	          'invalid shape for mip images');
	        check(
	          img.format === texture.format &&
	          img.internalformat === texture.internalformat &&
	          img.type === texture.type,
	          'incompatible type for mip image');

	        if (img.compressed) ; else if (img.data) {
	          check(img.data.byteLength === mw * mh *
	            Math.max(pixelSize(img.type, c), img.unpackAlignment),
	          'invalid data for image, buffer size is inconsistent with image format');
	        } else if (img.element) ; else if (img.copy) ;
	      }
	    }
	  }
	}

	var check$1 = extend(check, {
	  optional: checkOptional,
	  raise: raise,
	  commandRaise: commandRaise,
	  command: checkCommand,
	  parameter: checkParameter,
	  commandParameter: checkParameterCommand,
	  constructor: checkConstructor,
	  type: checkTypeOf,
	  commandType: checkCommandType,
	  isTypedArray: checkIsTypedArray,
	  nni: checkNonNegativeInt,
	  oneOf: checkOneOf,
	  shaderError: checkShaderError,
	  linkError: checkLinkError,
	  callSite: guessCallSite,
	  saveCommandRef: saveCommandRef,
	  saveDrawInfo: saveDrawCommandInfo,
	  framebufferFormat: checkFramebufferFormat,
	  guessCommand: guessCommand,
	  texture2D: checkTexture2D,
	  textureCube: checkTextureCube
	});

	var VARIABLE_COUNTER = 0;

	var DYN_FUNC = 0;
	var DYN_CONSTANT = 5;
	var DYN_ARRAY = 6;

	function DynamicVariable (type, data) {
	  this.id = (VARIABLE_COUNTER++);
	  this.type = type;
	  this.data = data;
	}

	function escapeStr (str) {
	  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
	}

	function splitParts (str) {
	  if (str.length === 0) {
	    return []
	  }

	  var firstChar = str.charAt(0);
	  var lastChar = str.charAt(str.length - 1);

	  if (str.length > 1 &&
	      firstChar === lastChar &&
	      (firstChar === '"' || firstChar === "'")) {
	    return ['"' + escapeStr(str.substr(1, str.length - 2)) + '"']
	  }

	  var parts = /\[(false|true|null|\d+|'[^']*'|"[^"]*")\]/.exec(str);
	  if (parts) {
	    return (
	      splitParts(str.substr(0, parts.index))
	        .concat(splitParts(parts[1]))
	        .concat(splitParts(str.substr(parts.index + parts[0].length)))
	    )
	  }

	  var subparts = str.split('.');
	  if (subparts.length === 1) {
	    return ['"' + escapeStr(str) + '"']
	  }

	  var result = [];
	  for (var i = 0; i < subparts.length; ++i) {
	    result = result.concat(splitParts(subparts[i]));
	  }
	  return result
	}

	function toAccessorString (str) {
	  return '[' + splitParts(str).join('][') + ']'
	}

	function defineDynamic (type, data) {
	  return new DynamicVariable(type, toAccessorString(data + ''))
	}

	function isDynamic (x) {
	  return (typeof x === 'function' && !x._reglType) || (x instanceof DynamicVariable)
	}

	function unbox (x, path) {
	  if (typeof x === 'function') {
	    return new DynamicVariable(DYN_FUNC, x)
	  } else if (typeof x === 'number' || typeof x === 'boolean') {
	    return new DynamicVariable(DYN_CONSTANT, x)
	  } else if (Array.isArray(x)) {
	    return new DynamicVariable(DYN_ARRAY, x.map((y, i) => unbox(y, path + '[' + i + ']')))
	  } else if (x instanceof DynamicVariable) {
	    return x
	  }
	  check$1(false, 'invalid option type in uniform ' + path);
	}

	var dynamic = {
	  DynamicVariable: DynamicVariable,
	  define: defineDynamic,
	  isDynamic: isDynamic,
	  unbox: unbox,
	  accessor: toAccessorString
	};

	/* globals requestAnimationFrame, cancelAnimationFrame */
	var raf = {
	  next: typeof requestAnimationFrame === 'function'
	    ? function (cb) { return requestAnimationFrame(cb) }
	    : function (cb) { return setTimeout(cb, 16) },
	  cancel: typeof cancelAnimationFrame === 'function'
	    ? function (raf) { return cancelAnimationFrame(raf) }
	    : clearTimeout
	};

	/* globals performance */
	var clock = (typeof performance !== 'undefined' && performance.now)
	    ? function () { return performance.now() }
	    : function () { return +(new Date()) };

	function createStringStore () {
	  var stringIds = { '': 0 };
	  var stringValues = [''];
	  return {
	    id: function (str) {
	      var result = stringIds[str];
	      if (result) {
	        return result
	      }
	      result = stringIds[str] = stringValues.length;
	      stringValues.push(str);
	      return result
	    },

	    str: function (id) {
	      return stringValues[id]
	    }
	  }
	}

	// Context and canvas creation helper functions
	function createCanvas (element, onDone, pixelRatio) {
	  var canvas = document.createElement('canvas');
	  extend(canvas.style, {
	    border: 0,
	    margin: 0,
	    padding: 0,
	    top: 0,
	    left: 0
	  });
	  element.appendChild(canvas);

	  if (element === document.body) {
	    canvas.style.position = 'absolute';
	    extend(element.style, {
	      margin: 0,
	      padding: 0
	    });
	  }

	  function resize () {
	    var w = window.innerWidth;
	    var h = window.innerHeight;
	    if (element !== document.body) {
	      var bounds = element.getBoundingClientRect();
	      w = bounds.right - bounds.left;
	      h = bounds.bottom - bounds.top;
	    }
	    canvas.width = pixelRatio * w;
	    canvas.height = pixelRatio * h;
	    extend(canvas.style, {
	      width: w + 'px',
	      height: h + 'px'
	    });
	  }

	  var resizeObserver;
	  if (element !== document.body && typeof ResizeObserver === 'function') {
	    // ignore 'ResizeObserver' is not defined
	    // eslint-disable-next-line
	    resizeObserver = new ResizeObserver(function () {
	      // setTimeout to avoid flicker
	      setTimeout(resize);
	    });
	    resizeObserver.observe(element);
	  } else {
	    window.addEventListener('resize', resize, false);
	  }

	  function onDestroy () {
	    if (resizeObserver) {
	      resizeObserver.disconnect();
	    } else {
	      window.removeEventListener('resize', resize);
	    }
	    element.removeChild(canvas);
	  }

	  resize();

	  return {
	    canvas: canvas,
	    onDestroy: onDestroy
	  }
	}

	function createContext (canvas, contextAttributes) {
	  function get (name) {
	    try {
	      return canvas.getContext(name, contextAttributes)
	    } catch (e) {
	      return null
	    }
	  }
	  return (
	    get('webgl') ||
	    get('experimental-webgl') ||
	    get('webgl-experimental')
	  )
	}

	function isHTMLElement (obj) {
	  return (
	    typeof obj.nodeName === 'string' &&
	    typeof obj.appendChild === 'function' &&
	    typeof obj.getBoundingClientRect === 'function'
	  )
	}

	function isWebGLContext (obj) {
	  return (
	    typeof obj.drawArrays === 'function' ||
	    typeof obj.drawElements === 'function'
	  )
	}

	function parseExtensions (input) {
	  if (typeof input === 'string') {
	    return input.split()
	  }
	  check$1(Array.isArray(input), 'invalid extension array');
	  return input
	}

	function getElement (desc) {
	  if (typeof desc === 'string') {
	    check$1(typeof document !== 'undefined', 'not supported outside of DOM');
	    return document.querySelector(desc)
	  }
	  return desc
	}

	function parseArgs (args_) {
	  var args = args_ || {};
	  var element, container, canvas, gl;
	  var contextAttributes = {};
	  var extensions = [];
	  var optionalExtensions = [];
	  var pixelRatio = (typeof window === 'undefined' ? 1 : window.devicePixelRatio);
	  var profile = false;
	  var onDone = function (err) {
	    if (err) {
	      check$1.raise(err);
	    }
	  };
	  var onDestroy = function () {};
	  if (typeof args === 'string') {
	    check$1(
	      typeof document !== 'undefined',
	      'selector queries only supported in DOM enviroments');
	    element = document.querySelector(args);
	    check$1(element, 'invalid query string for element');
	  } else if (typeof args === 'object') {
	    if (isHTMLElement(args)) {
	      element = args;
	    } else if (isWebGLContext(args)) {
	      gl = args;
	      canvas = gl.canvas;
	    } else {
	      check$1.constructor(args);
	      if ('gl' in args) {
	        gl = args.gl;
	      } else if ('canvas' in args) {
	        canvas = getElement(args.canvas);
	      } else if ('container' in args) {
	        container = getElement(args.container);
	      }
	      if ('attributes' in args) {
	        contextAttributes = args.attributes;
	        check$1.type(contextAttributes, 'object', 'invalid context attributes');
	      }
	      if ('extensions' in args) {
	        extensions = parseExtensions(args.extensions);
	      }
	      if ('optionalExtensions' in args) {
	        optionalExtensions = parseExtensions(args.optionalExtensions);
	      }
	      if ('onDone' in args) {
	        check$1.type(
	          args.onDone, 'function',
	          'invalid or missing onDone callback');
	        onDone = args.onDone;
	      }
	      if ('profile' in args) {
	        profile = !!args.profile;
	      }
	      if ('pixelRatio' in args) {
	        pixelRatio = +args.pixelRatio;
	        check$1(pixelRatio > 0, 'invalid pixel ratio');
	      }
	    }
	  } else {
	    check$1.raise('invalid arguments to regl');
	  }

	  if (element) {
	    if (element.nodeName.toLowerCase() === 'canvas') {
	      canvas = element;
	    } else {
	      container = element;
	    }
	  }

	  if (!gl) {
	    if (!canvas) {
	      check$1(
	        typeof document !== 'undefined',
	        'must manually specify webgl context outside of DOM environments');
	      var result = createCanvas(container || document.body, onDone, pixelRatio);
	      if (!result) {
	        return null
	      }
	      canvas = result.canvas;
	      onDestroy = result.onDestroy;
	    }
	    // workaround for chromium bug, premultiplied alpha value is platform dependent
	    if (contextAttributes.premultipliedAlpha === undefined) contextAttributes.premultipliedAlpha = true;
	    gl = createContext(canvas, contextAttributes);
	  }

	  if (!gl) {
	    onDestroy();
	    onDone('webgl not supported, try upgrading your browser or graphics drivers http://get.webgl.org');
	    return null
	  }

	  return {
	    gl: gl,
	    canvas: canvas,
	    container: container,
	    extensions: extensions,
	    optionalExtensions: optionalExtensions,
	    pixelRatio: pixelRatio,
	    profile: profile,
	    onDone: onDone,
	    onDestroy: onDestroy
	  }
	}

	function createExtensionCache (gl, config) {
	  var extensions = {};

	  function tryLoadExtension (name_) {
	    check$1.type(name_, 'string', 'extension name must be string');
	    var name = name_.toLowerCase();
	    var ext;
	    try {
	      ext = extensions[name] = gl.getExtension(name);
	    } catch (e) {}
	    return !!ext
	  }

	  for (var i = 0; i < config.extensions.length; ++i) {
	    var name = config.extensions[i];
	    if (!tryLoadExtension(name)) {
	      config.onDestroy();
	      config.onDone('"' + name + '" extension is not supported by the current WebGL context, try upgrading your system or a different browser');
	      return null
	    }
	  }

	  config.optionalExtensions.forEach(tryLoadExtension);

	  return {
	    extensions: extensions,
	    restore: function () {
	      Object.keys(extensions).forEach(function (name) {
	        if (extensions[name] && !tryLoadExtension(name)) {
	          throw new Error('(regl): error restoring extension ' + name)
	        }
	      });
	    }
	  }
	}

	function loop (n, f) {
	  var result = Array(n);
	  for (var i = 0; i < n; ++i) {
	    result[i] = f(i);
	  }
	  return result
	}

	var GL_BYTE$1 = 5120;
	var GL_UNSIGNED_BYTE$2 = 5121;
	var GL_SHORT$1 = 5122;
	var GL_UNSIGNED_SHORT$1 = 5123;
	var GL_INT$1 = 5124;
	var GL_UNSIGNED_INT$1 = 5125;
	var GL_FLOAT$2 = 5126;

	function nextPow16 (v) {
	  for (var i = 16; i <= (1 << 28); i *= 16) {
	    if (v <= i) {
	      return i
	    }
	  }
	  return 0
	}

	function log2 (v) {
	  var r, shift;
	  r = (v > 0xFFFF) << 4;
	  v >>>= r;
	  shift = (v > 0xFF) << 3;
	  v >>>= shift; r |= shift;
	  shift = (v > 0xF) << 2;
	  v >>>= shift; r |= shift;
	  shift = (v > 0x3) << 1;
	  v >>>= shift; r |= shift;
	  return r | (v >> 1)
	}

	function createPool () {
	  var bufferPool = loop(8, function () {
	    return []
	  });

	  function alloc (n) {
	    var sz = nextPow16(n);
	    var bin = bufferPool[log2(sz) >> 2];
	    if (bin.length > 0) {
	      return bin.pop()
	    }
	    return new ArrayBuffer(sz)
	  }

	  function free (buf) {
	    bufferPool[log2(buf.byteLength) >> 2].push(buf);
	  }

	  function allocType (type, n) {
	    var result = null;
	    switch (type) {
	      case GL_BYTE$1:
	        result = new Int8Array(alloc(n), 0, n);
	        break
	      case GL_UNSIGNED_BYTE$2:
	        result = new Uint8Array(alloc(n), 0, n);
	        break
	      case GL_SHORT$1:
	        result = new Int16Array(alloc(2 * n), 0, n);
	        break
	      case GL_UNSIGNED_SHORT$1:
	        result = new Uint16Array(alloc(2 * n), 0, n);
	        break
	      case GL_INT$1:
	        result = new Int32Array(alloc(4 * n), 0, n);
	        break
	      case GL_UNSIGNED_INT$1:
	        result = new Uint32Array(alloc(4 * n), 0, n);
	        break
	      case GL_FLOAT$2:
	        result = new Float32Array(alloc(4 * n), 0, n);
	        break
	      default:
	        return null
	    }
	    if (result.length !== n) {
	      return result.subarray(0, n)
	    }
	    return result
	  }

	  function freeType (array) {
	    free(array.buffer);
	  }

	  return {
	    alloc: alloc,
	    free: free,
	    allocType: allocType,
	    freeType: freeType
	  }
	}

	var pool = createPool();

	// zero pool for initial zero data
	pool.zero = createPool();

	var GL_SUBPIXEL_BITS = 0x0D50;
	var GL_RED_BITS = 0x0D52;
	var GL_GREEN_BITS = 0x0D53;
	var GL_BLUE_BITS = 0x0D54;
	var GL_ALPHA_BITS = 0x0D55;
	var GL_DEPTH_BITS = 0x0D56;
	var GL_STENCIL_BITS = 0x0D57;

	var GL_ALIASED_POINT_SIZE_RANGE = 0x846D;
	var GL_ALIASED_LINE_WIDTH_RANGE = 0x846E;

	var GL_MAX_TEXTURE_SIZE = 0x0D33;
	var GL_MAX_VIEWPORT_DIMS = 0x0D3A;
	var GL_MAX_VERTEX_ATTRIBS = 0x8869;
	var GL_MAX_VERTEX_UNIFORM_VECTORS = 0x8DFB;
	var GL_MAX_VARYING_VECTORS = 0x8DFC;
	var GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS = 0x8B4D;
	var GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS = 0x8B4C;
	var GL_MAX_TEXTURE_IMAGE_UNITS = 0x8872;
	var GL_MAX_FRAGMENT_UNIFORM_VECTORS = 0x8DFD;
	var GL_MAX_CUBE_MAP_TEXTURE_SIZE = 0x851C;
	var GL_MAX_RENDERBUFFER_SIZE = 0x84E8;

	var GL_VENDOR = 0x1F00;
	var GL_RENDERER = 0x1F01;
	var GL_VERSION = 0x1F02;
	var GL_SHADING_LANGUAGE_VERSION = 0x8B8C;

	var GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT = 0x84FF;

	var GL_MAX_COLOR_ATTACHMENTS_WEBGL = 0x8CDF;
	var GL_MAX_DRAW_BUFFERS_WEBGL = 0x8824;

	var GL_TEXTURE_2D = 0x0DE1;
	var GL_TEXTURE_CUBE_MAP = 0x8513;
	var GL_TEXTURE_CUBE_MAP_POSITIVE_X = 0x8515;
	var GL_TEXTURE0 = 0x84C0;
	var GL_RGBA = 0x1908;
	var GL_FLOAT$1 = 0x1406;
	var GL_UNSIGNED_BYTE$1 = 0x1401;
	var GL_FRAMEBUFFER = 0x8D40;
	var GL_FRAMEBUFFER_COMPLETE = 0x8CD5;
	var GL_COLOR_ATTACHMENT0 = 0x8CE0;
	var GL_COLOR_BUFFER_BIT$1 = 0x4000;

	var wrapLimits = function (gl, extensions) {
	  var maxAnisotropic = 1;
	  if (extensions.ext_texture_filter_anisotropic) {
	    maxAnisotropic = gl.getParameter(GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT);
	  }

	  var maxDrawbuffers = 1;
	  var maxColorAttachments = 1;
	  if (extensions.webgl_draw_buffers) {
	    maxDrawbuffers = gl.getParameter(GL_MAX_DRAW_BUFFERS_WEBGL);
	    maxColorAttachments = gl.getParameter(GL_MAX_COLOR_ATTACHMENTS_WEBGL);
	  }

	  // detect if reading float textures is available (Safari doesn't support)
	  var readFloat = !!extensions.oes_texture_float;
	  if (readFloat) {
	    var readFloatTexture = gl.createTexture();
	    gl.bindTexture(GL_TEXTURE_2D, readFloatTexture);
	    gl.texImage2D(GL_TEXTURE_2D, 0, GL_RGBA, 1, 1, 0, GL_RGBA, GL_FLOAT$1, null);

	    var fbo = gl.createFramebuffer();
	    gl.bindFramebuffer(GL_FRAMEBUFFER, fbo);
	    gl.framebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, readFloatTexture, 0);
	    gl.bindTexture(GL_TEXTURE_2D, null);

	    if (gl.checkFramebufferStatus(GL_FRAMEBUFFER) !== GL_FRAMEBUFFER_COMPLETE) readFloat = false;

	    else {
	      gl.viewport(0, 0, 1, 1);
	      gl.clearColor(1.0, 0.0, 0.0, 1.0);
	      gl.clear(GL_COLOR_BUFFER_BIT$1);
	      var pixels = pool.allocType(GL_FLOAT$1, 4);
	      gl.readPixels(0, 0, 1, 1, GL_RGBA, GL_FLOAT$1, pixels);

	      if (gl.getError()) readFloat = false;
	      else {
	        gl.deleteFramebuffer(fbo);
	        gl.deleteTexture(readFloatTexture);

	        readFloat = pixels[0] === 1.0;
	      }

	      pool.freeType(pixels);
	    }
	  }

	  // detect non power of two cube textures support (IE doesn't support)
	  var isIE = typeof navigator !== 'undefined' && (/MSIE/.test(navigator.userAgent) || /Trident\//.test(navigator.appVersion) || /Edge/.test(navigator.userAgent));

	  var npotTextureCube = true;

	  if (!isIE) {
	    var cubeTexture = gl.createTexture();
	    var data = pool.allocType(GL_UNSIGNED_BYTE$1, 36);
	    gl.activeTexture(GL_TEXTURE0);
	    gl.bindTexture(GL_TEXTURE_CUBE_MAP, cubeTexture);
	    gl.texImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_X, 0, GL_RGBA, 3, 3, 0, GL_RGBA, GL_UNSIGNED_BYTE$1, data);
	    pool.freeType(data);
	    gl.bindTexture(GL_TEXTURE_CUBE_MAP, null);
	    gl.deleteTexture(cubeTexture);
	    npotTextureCube = !gl.getError();
	  }

	  return {
	    // drawing buffer bit depth
	    colorBits: [
	      gl.getParameter(GL_RED_BITS),
	      gl.getParameter(GL_GREEN_BITS),
	      gl.getParameter(GL_BLUE_BITS),
	      gl.getParameter(GL_ALPHA_BITS)
	    ],
	    depthBits: gl.getParameter(GL_DEPTH_BITS),
	    stencilBits: gl.getParameter(GL_STENCIL_BITS),
	    subpixelBits: gl.getParameter(GL_SUBPIXEL_BITS),

	    // supported extensions
	    extensions: Object.keys(extensions).filter(function (ext) {
	      return !!extensions[ext]
	    }),

	    // max aniso samples
	    maxAnisotropic: maxAnisotropic,

	    // max draw buffers
	    maxDrawbuffers: maxDrawbuffers,
	    maxColorAttachments: maxColorAttachments,

	    // point and line size ranges
	    pointSizeDims: gl.getParameter(GL_ALIASED_POINT_SIZE_RANGE),
	    lineWidthDims: gl.getParameter(GL_ALIASED_LINE_WIDTH_RANGE),
	    maxViewportDims: gl.getParameter(GL_MAX_VIEWPORT_DIMS),
	    maxCombinedTextureUnits: gl.getParameter(GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS),
	    maxCubeMapSize: gl.getParameter(GL_MAX_CUBE_MAP_TEXTURE_SIZE),
	    maxRenderbufferSize: gl.getParameter(GL_MAX_RENDERBUFFER_SIZE),
	    maxTextureUnits: gl.getParameter(GL_MAX_TEXTURE_IMAGE_UNITS),
	    maxTextureSize: gl.getParameter(GL_MAX_TEXTURE_SIZE),
	    maxAttributes: gl.getParameter(GL_MAX_VERTEX_ATTRIBS),
	    maxVertexUniforms: gl.getParameter(GL_MAX_VERTEX_UNIFORM_VECTORS),
	    maxVertexTextureUnits: gl.getParameter(GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS),
	    maxVaryingVectors: gl.getParameter(GL_MAX_VARYING_VECTORS),
	    maxFragmentUniforms: gl.getParameter(GL_MAX_FRAGMENT_UNIFORM_VECTORS),

	    // vendor info
	    glsl: gl.getParameter(GL_SHADING_LANGUAGE_VERSION),
	    renderer: gl.getParameter(GL_RENDERER),
	    vendor: gl.getParameter(GL_VENDOR),
	    version: gl.getParameter(GL_VERSION),

	    // quirks
	    readFloat: readFloat,
	    npotTextureCube: npotTextureCube
	  }
	};

	function isNDArrayLike (obj) {
	  return (
	    !!obj &&
	    typeof obj === 'object' &&
	    Array.isArray(obj.shape) &&
	    Array.isArray(obj.stride) &&
	    typeof obj.offset === 'number' &&
	    obj.shape.length === obj.stride.length &&
	    (Array.isArray(obj.data) ||
	      isTypedArray(obj.data)))
	}

	var values = function (obj) {
	  return Object.keys(obj).map(function (key) { return obj[key] })
	};

	var flattenUtils = {
	  shape: arrayShape$1,
	  flatten: flattenArray
	};

	function flatten1D (array, nx, out) {
	  for (var i = 0; i < nx; ++i) {
	    out[i] = array[i];
	  }
	}

	function flatten2D (array, nx, ny, out) {
	  var ptr = 0;
	  for (var i = 0; i < nx; ++i) {
	    var row = array[i];
	    for (var j = 0; j < ny; ++j) {
	      out[ptr++] = row[j];
	    }
	  }
	}

	function flatten3D (array, nx, ny, nz, out, ptr_) {
	  var ptr = ptr_;
	  for (var i = 0; i < nx; ++i) {
	    var row = array[i];
	    for (var j = 0; j < ny; ++j) {
	      var col = row[j];
	      for (var k = 0; k < nz; ++k) {
	        out[ptr++] = col[k];
	      }
	    }
	  }
	}

	function flattenRec (array, shape, level, out, ptr) {
	  var stride = 1;
	  for (var i = level + 1; i < shape.length; ++i) {
	    stride *= shape[i];
	  }
	  var n = shape[level];
	  if (shape.length - level === 4) {
	    var nx = shape[level + 1];
	    var ny = shape[level + 2];
	    var nz = shape[level + 3];
	    for (i = 0; i < n; ++i) {
	      flatten3D(array[i], nx, ny, nz, out, ptr);
	      ptr += stride;
	    }
	  } else {
	    for (i = 0; i < n; ++i) {
	      flattenRec(array[i], shape, level + 1, out, ptr);
	      ptr += stride;
	    }
	  }
	}

	function flattenArray (array, shape, type, out_) {
	  var sz = 1;
	  if (shape.length) {
	    for (var i = 0; i < shape.length; ++i) {
	      sz *= shape[i];
	    }
	  } else {
	    sz = 0;
	  }
	  var out = out_ || pool.allocType(type, sz);
	  switch (shape.length) {
	    case 0:
	      break
	    case 1:
	      flatten1D(array, shape[0], out);
	      break
	    case 2:
	      flatten2D(array, shape[0], shape[1], out);
	      break
	    case 3:
	      flatten3D(array, shape[0], shape[1], shape[2], out, 0);
	      break
	    default:
	      flattenRec(array, shape, 0, out, 0);
	  }
	  return out
	}

	function arrayShape$1 (array_) {
	  var shape = [];
	  for (var array = array_; array.length; array = array[0]) {
	    shape.push(array.length);
	  }
	  return shape
	}

	var arrayTypes =  {
		"[object Int8Array]": 5120,
		"[object Int16Array]": 5122,
		"[object Int32Array]": 5124,
		"[object Uint8Array]": 5121,
		"[object Uint8ClampedArray]": 5121,
		"[object Uint16Array]": 5123,
		"[object Uint32Array]": 5125,
		"[object Float32Array]": 5126,
		"[object Float64Array]": 5121,
		"[object ArrayBuffer]": 5121
	};

	var int8 = 5120;
	var int16 = 5122;
	var int32 = 5124;
	var uint8 = 5121;
	var uint16 = 5123;
	var uint32 = 5125;
	var float = 5126;
	var float32 = 5126;
	var glTypes = {
		int8: int8,
		int16: int16,
		int32: int32,
		uint8: uint8,
		uint16: uint16,
		uint32: uint32,
		float: float,
		float32: float32
	};

	var dynamic$1 = 35048;
	var stream = 35040;
	var usageTypes = {
		dynamic: dynamic$1,
		stream: stream,
		"static": 35044
	};

	var arrayFlatten = flattenUtils.flatten;
	var arrayShape = flattenUtils.shape;

	var GL_STATIC_DRAW = 0x88E4;
	var GL_STREAM_DRAW = 0x88E0;

	var GL_UNSIGNED_BYTE$3 = 5121;
	var GL_FLOAT$3 = 5126;

	var DTYPES_SIZES = [];
	DTYPES_SIZES[5120] = 1; // int8
	DTYPES_SIZES[5122] = 2; // int16
	DTYPES_SIZES[5124] = 4; // int32
	DTYPES_SIZES[5121] = 1; // uint8
	DTYPES_SIZES[5123] = 2; // uint16
	DTYPES_SIZES[5125] = 4; // uint32
	DTYPES_SIZES[5126] = 4; // float32

	function typedArrayCode (data) {
	  return arrayTypes[Object.prototype.toString.call(data)] | 0
	}

	function copyArray (out, inp) {
	  for (var i = 0; i < inp.length; ++i) {
	    out[i] = inp[i];
	  }
	}

	function transpose (
	  result, data, shapeX, shapeY, strideX, strideY, offset) {
	  var ptr = 0;
	  for (var i = 0; i < shapeX; ++i) {
	    for (var j = 0; j < shapeY; ++j) {
	      result[ptr++] = data[strideX * i + strideY * j + offset];
	    }
	  }
	}

	function wrapBufferState (gl, stats, config, destroyBuffer) {
	  var bufferCount = 0;
	  var bufferSet = {};

	  function REGLBuffer (type) {
	    this.id = bufferCount++;
	    this.buffer = gl.createBuffer();
	    this.type = type;
	    this.usage = GL_STATIC_DRAW;
	    this.byteLength = 0;
	    this.dimension = 1;
	    this.dtype = GL_UNSIGNED_BYTE$3;

	    this.persistentData = null;

	    if (config.profile) {
	      this.stats = { size: 0 };
	    }
	  }

	  REGLBuffer.prototype.bind = function () {
	    gl.bindBuffer(this.type, this.buffer);
	  };

	  REGLBuffer.prototype.destroy = function () {
	    destroy(this);
	  };

	  var streamPool = [];

	  function createStream (type, data) {
	    var buffer = streamPool.pop();
	    if (!buffer) {
	      buffer = new REGLBuffer(type);
	    }
	    buffer.bind();
	    initBufferFromData(buffer, data, GL_STREAM_DRAW, 0, 1, false);
	    return buffer
	  }

	  function destroyStream (stream$$1) {
	    streamPool.push(stream$$1);
	  }

	  function initBufferFromTypedArray (buffer, data, usage) {
	    buffer.byteLength = data.byteLength;
	    gl.bufferData(buffer.type, data, usage);
	  }

	  function initBufferFromData (buffer, data, usage, dtype, dimension, persist) {
	    var shape;
	    buffer.usage = usage;
	    if (Array.isArray(data)) {
	      buffer.dtype = dtype || GL_FLOAT$3;
	      if (data.length > 0) {
	        var flatData;
	        if (Array.isArray(data[0])) {
	          shape = arrayShape(data);
	          var dim = 1;
	          for (var i = 1; i < shape.length; ++i) {
	            dim *= shape[i];
	          }
	          buffer.dimension = dim;
	          flatData = arrayFlatten(data, shape, buffer.dtype);
	          initBufferFromTypedArray(buffer, flatData, usage);
	          if (persist) {
	            buffer.persistentData = flatData;
	          } else {
	            pool.freeType(flatData);
	          }
	        } else if (typeof data[0] === 'number') {
	          buffer.dimension = dimension;
	          var typedData = pool.allocType(buffer.dtype, data.length);
	          copyArray(typedData, data);
	          initBufferFromTypedArray(buffer, typedData, usage);
	          if (persist) {
	            buffer.persistentData = typedData;
	          } else {
	            pool.freeType(typedData);
	          }
	        } else if (isTypedArray(data[0])) {
	          buffer.dimension = data[0].length;
	          buffer.dtype = dtype || typedArrayCode(data[0]) || GL_FLOAT$3;
	          flatData = arrayFlatten(
	            data,
	            [data.length, data[0].length],
	            buffer.dtype);
	          initBufferFromTypedArray(buffer, flatData, usage);
	          if (persist) {
	            buffer.persistentData = flatData;
	          } else {
	            pool.freeType(flatData);
	          }
	        } else {
	          check$1.raise('invalid buffer data');
	        }
	      }
	    } else if (isTypedArray(data)) {
	      buffer.dtype = dtype || typedArrayCode(data);
	      buffer.dimension = dimension;
	      initBufferFromTypedArray(buffer, data, usage);
	      if (persist) {
	        buffer.persistentData = new Uint8Array(new Uint8Array(data.buffer));
	      }
	    } else if (isNDArrayLike(data)) {
	      shape = data.shape;
	      var stride = data.stride;
	      var offset = data.offset;

	      var shapeX = 0;
	      var shapeY = 0;
	      var strideX = 0;
	      var strideY = 0;
	      if (shape.length === 1) {
	        shapeX = shape[0];
	        shapeY = 1;
	        strideX = stride[0];
	        strideY = 0;
	      } else if (shape.length === 2) {
	        shapeX = shape[0];
	        shapeY = shape[1];
	        strideX = stride[0];
	        strideY = stride[1];
	      } else {
	        check$1.raise('invalid shape');
	      }

	      buffer.dtype = dtype || typedArrayCode(data.data) || GL_FLOAT$3;
	      buffer.dimension = shapeY;

	      var transposeData = pool.allocType(buffer.dtype, shapeX * shapeY);
	      transpose(transposeData,
	        data.data,
	        shapeX, shapeY,
	        strideX, strideY,
	        offset);
	      initBufferFromTypedArray(buffer, transposeData, usage);
	      if (persist) {
	        buffer.persistentData = transposeData;
	      } else {
	        pool.freeType(transposeData);
	      }
	    } else if (data instanceof ArrayBuffer) {
	      buffer.dtype = GL_UNSIGNED_BYTE$3;
	      buffer.dimension = dimension;
	      initBufferFromTypedArray(buffer, data, usage);
	      if (persist) {
	        buffer.persistentData = new Uint8Array(new Uint8Array(data));
	      }
	    } else {
	      check$1.raise('invalid buffer data');
	    }
	  }

	  function destroy (buffer) {
	    stats.bufferCount--;

	    // remove attribute link
	    destroyBuffer(buffer);

	    var handle = buffer.buffer;
	    check$1(handle, 'buffer must not be deleted already');
	    gl.deleteBuffer(handle);
	    buffer.buffer = null;
	    delete bufferSet[buffer.id];
	  }

	  function createBuffer (options, type, deferInit, persistent) {
	    stats.bufferCount++;

	    var buffer = new REGLBuffer(type);
	    bufferSet[buffer.id] = buffer;

	    function reglBuffer (options) {
	      var usage = GL_STATIC_DRAW;
	      var data = null;
	      var byteLength = 0;
	      var dtype = 0;
	      var dimension = 1;
	      if (Array.isArray(options) ||
	          isTypedArray(options) ||
	          isNDArrayLike(options) ||
	          options instanceof ArrayBuffer) {
	        data = options;
	      } else if (typeof options === 'number') {
	        byteLength = options | 0;
	      } else if (options) {
	        check$1.type(
	          options, 'object',
	          'buffer arguments must be an object, a number or an array');

	        if ('data' in options) {
	          check$1(
	            data === null ||
	            Array.isArray(data) ||
	            isTypedArray(data) ||
	            isNDArrayLike(data),
	            'invalid data for buffer');
	          data = options.data;
	        }

	        if ('usage' in options) {
	          check$1.parameter(options.usage, usageTypes, 'invalid buffer usage');
	          usage = usageTypes[options.usage];
	        }

	        if ('type' in options) {
	          check$1.parameter(options.type, glTypes, 'invalid buffer type');
	          dtype = glTypes[options.type];
	        }

	        if ('dimension' in options) {
	          check$1.type(options.dimension, 'number', 'invalid dimension');
	          dimension = options.dimension | 0;
	        }

	        if ('length' in options) {
	          check$1.nni(byteLength, 'buffer length must be a nonnegative integer');
	          byteLength = options.length | 0;
	        }
	      }

	      buffer.bind();
	      if (!data) {
	        // #475
	        if (byteLength) gl.bufferData(buffer.type, byteLength, usage);
	        buffer.dtype = dtype || GL_UNSIGNED_BYTE$3;
	        buffer.usage = usage;
	        buffer.dimension = dimension;
	        buffer.byteLength = byteLength;
	      } else {
	        initBufferFromData(buffer, data, usage, dtype, dimension, persistent);
	      }

	      if (config.profile) {
	        buffer.stats.size = buffer.byteLength * DTYPES_SIZES[buffer.dtype];
	      }

	      return reglBuffer
	    }

	    function setSubData (data, offset) {
	      check$1(offset + data.byteLength <= buffer.byteLength,
	        'invalid buffer subdata call, buffer is too small. ' + ' Can\'t write data of size ' + data.byteLength + ' starting from offset ' + offset + ' to a buffer of size ' + buffer.byteLength);

	      gl.bufferSubData(buffer.type, offset, data);
	    }

	    function subdata (data, offset_) {
	      var offset = (offset_ || 0) | 0;
	      var shape;
	      buffer.bind();
	      if (isTypedArray(data) || data instanceof ArrayBuffer) {
	        setSubData(data, offset);
	      } else if (Array.isArray(data)) {
	        if (data.length > 0) {
	          if (typeof data[0] === 'number') {
	            var converted = pool.allocType(buffer.dtype, data.length);
	            copyArray(converted, data);
	            setSubData(converted, offset);
	            pool.freeType(converted);
	          } else if (Array.isArray(data[0]) || isTypedArray(data[0])) {
	            shape = arrayShape(data);
	            var flatData = arrayFlatten(data, shape, buffer.dtype);
	            setSubData(flatData, offset);
	            pool.freeType(flatData);
	          } else {
	            check$1.raise('invalid buffer data');
	          }
	        }
	      } else if (isNDArrayLike(data)) {
	        shape = data.shape;
	        var stride = data.stride;

	        var shapeX = 0;
	        var shapeY = 0;
	        var strideX = 0;
	        var strideY = 0;
	        if (shape.length === 1) {
	          shapeX = shape[0];
	          shapeY = 1;
	          strideX = stride[0];
	          strideY = 0;
	        } else if (shape.length === 2) {
	          shapeX = shape[0];
	          shapeY = shape[1];
	          strideX = stride[0];
	          strideY = stride[1];
	        } else {
	          check$1.raise('invalid shape');
	        }
	        var dtype = Array.isArray(data.data)
	          ? buffer.dtype
	          : typedArrayCode(data.data);

	        var transposeData = pool.allocType(dtype, shapeX * shapeY);
	        transpose(transposeData,
	          data.data,
	          shapeX, shapeY,
	          strideX, strideY,
	          data.offset);
	        setSubData(transposeData, offset);
	        pool.freeType(transposeData);
	      } else {
	        check$1.raise('invalid data for buffer subdata');
	      }
	      return reglBuffer
	    }

	    if (!deferInit) {
	      reglBuffer(options);
	    }

	    reglBuffer._reglType = 'buffer';
	    reglBuffer._buffer = buffer;
	    reglBuffer.subdata = subdata;
	    if (config.profile) {
	      reglBuffer.stats = buffer.stats;
	    }
	    reglBuffer.destroy = function () { destroy(buffer); };

	    return reglBuffer
	  }

	  function restoreBuffers () {
	    values(bufferSet).forEach(function (buffer) {
	      buffer.buffer = gl.createBuffer();
	      gl.bindBuffer(buffer.type, buffer.buffer);
	      gl.bufferData(
	        buffer.type, buffer.persistentData || buffer.byteLength, buffer.usage);
	    });
	  }

	  if (config.profile) {
	    stats.getTotalBufferSize = function () {
	      var total = 0;
	      // TODO: Right now, the streams are not part of the total count.
	      Object.keys(bufferSet).forEach(function (key) {
	        total += bufferSet[key].stats.size;
	      });
	      return total
	    };
	  }

	  return {
	    create: createBuffer,

	    createStream: createStream,
	    destroyStream: destroyStream,

	    clear: function () {
	      values(bufferSet).forEach(destroy);
	      streamPool.forEach(destroy);
	    },

	    getBuffer: function (wrapper) {
	      if (wrapper && wrapper._buffer instanceof REGLBuffer) {
	        return wrapper._buffer
	      }
	      return null
	    },

	    restore: restoreBuffers,

	    _initBuffer: initBufferFromData
	  }
	}

	var points = 0;
	var point = 0;
	var lines = 1;
	var line = 1;
	var triangles = 4;
	var triangle = 4;
	var primTypes = {
		points: points,
		point: point,
		lines: lines,
		line: line,
		triangles: triangles,
		triangle: triangle,
		"line loop": 2,
		"line strip": 3,
		"triangle strip": 5,
		"triangle fan": 6
	};

	var GL_POINTS = 0;
	var GL_LINES = 1;
	var GL_TRIANGLES = 4;

	var GL_BYTE$2 = 5120;
	var GL_UNSIGNED_BYTE$4 = 5121;
	var GL_SHORT$2 = 5122;
	var GL_UNSIGNED_SHORT$2 = 5123;
	var GL_INT$2 = 5124;
	var GL_UNSIGNED_INT$2 = 5125;

	var GL_ELEMENT_ARRAY_BUFFER = 34963;

	var GL_STREAM_DRAW$1 = 0x88E0;
	var GL_STATIC_DRAW$1 = 0x88E4;

	function wrapElementsState (gl, extensions, bufferState, stats) {
	  var elementSet = {};
	  var elementCount = 0;

	  var elementTypes = {
	    'uint8': GL_UNSIGNED_BYTE$4,
	    'uint16': GL_UNSIGNED_SHORT$2
	  };

	  if (extensions.oes_element_index_uint) {
	    elementTypes.uint32 = GL_UNSIGNED_INT$2;
	  }

	  function REGLElementBuffer (buffer) {
	    this.id = elementCount++;
	    elementSet[this.id] = this;
	    this.buffer = buffer;
	    this.primType = GL_TRIANGLES;
	    this.vertCount = 0;
	    this.type = 0;
	  }

	  REGLElementBuffer.prototype.bind = function () {
	    this.buffer.bind();
	  };

	  var bufferPool = [];

	  function createElementStream (data) {
	    var result = bufferPool.pop();
	    if (!result) {
	      result = new REGLElementBuffer(bufferState.create(
	        null,
	        GL_ELEMENT_ARRAY_BUFFER,
	        true,
	        false)._buffer);
	    }
	    initElements(result, data, GL_STREAM_DRAW$1, -1, -1, 0, 0);
	    return result
	  }

	  function destroyElementStream (elements) {
	    bufferPool.push(elements);
	  }

	  function initElements (
	    elements,
	    data,
	    usage,
	    prim,
	    count,
	    byteLength,
	    type) {
	    elements.buffer.bind();
	    var dtype;
	    if (data) {
	      var predictedType = type;
	      if (!type && (
	        !isTypedArray(data) ||
	         (isNDArrayLike(data) && !isTypedArray(data.data)))) {
	        predictedType = extensions.oes_element_index_uint
	          ? GL_UNSIGNED_INT$2
	          : GL_UNSIGNED_SHORT$2;
	      }
	      bufferState._initBuffer(
	        elements.buffer,
	        data,
	        usage,
	        predictedType,
	        3);
	    } else {
	      gl.bufferData(GL_ELEMENT_ARRAY_BUFFER, byteLength, usage);
	      elements.buffer.dtype = dtype || GL_UNSIGNED_BYTE$4;
	      elements.buffer.usage = usage;
	      elements.buffer.dimension = 3;
	      elements.buffer.byteLength = byteLength;
	    }

	    dtype = type;
	    if (!type) {
	      switch (elements.buffer.dtype) {
	        case GL_UNSIGNED_BYTE$4:
	        case GL_BYTE$2:
	          dtype = GL_UNSIGNED_BYTE$4;
	          break

	        case GL_UNSIGNED_SHORT$2:
	        case GL_SHORT$2:
	          dtype = GL_UNSIGNED_SHORT$2;
	          break

	        case GL_UNSIGNED_INT$2:
	        case GL_INT$2:
	          dtype = GL_UNSIGNED_INT$2;
	          break

	        default:
	          check$1.raise('unsupported type for element array');
	      }
	      elements.buffer.dtype = dtype;
	    }
	    elements.type = dtype;

	    // Check oes_element_index_uint extension
	    check$1(
	      dtype !== GL_UNSIGNED_INT$2 ||
	      !!extensions.oes_element_index_uint,
	      '32 bit element buffers not supported, enable oes_element_index_uint first');

	    // try to guess default primitive type and arguments
	    var vertCount = count;
	    if (vertCount < 0) {
	      vertCount = elements.buffer.byteLength;
	      if (dtype === GL_UNSIGNED_SHORT$2) {
	        vertCount >>= 1;
	      } else if (dtype === GL_UNSIGNED_INT$2) {
	        vertCount >>= 2;
	      }
	    }
	    elements.vertCount = vertCount;

	    // try to guess primitive type from cell dimension
	    var primType = prim;
	    if (prim < 0) {
	      primType = GL_TRIANGLES;
	      var dimension = elements.buffer.dimension;
	      if (dimension === 1) primType = GL_POINTS;
	      if (dimension === 2) primType = GL_LINES;
	      if (dimension === 3) primType = GL_TRIANGLES;
	    }
	    elements.primType = primType;
	  }

	  function destroyElements (elements) {
	    stats.elementsCount--;

	    check$1(elements.buffer !== null, 'must not double destroy elements');
	    delete elementSet[elements.id];
	    elements.buffer.destroy();
	    elements.buffer = null;
	  }

	  function createElements (options, persistent) {
	    var buffer = bufferState.create(null, GL_ELEMENT_ARRAY_BUFFER, true);
	    var elements = new REGLElementBuffer(buffer._buffer);
	    stats.elementsCount++;

	    function reglElements (options) {
	      if (!options) {
	        buffer();
	        elements.primType = GL_TRIANGLES;
	        elements.vertCount = 0;
	        elements.type = GL_UNSIGNED_BYTE$4;
	      } else if (typeof options === 'number') {
	        buffer(options);
	        elements.primType = GL_TRIANGLES;
	        elements.vertCount = options | 0;
	        elements.type = GL_UNSIGNED_BYTE$4;
	      } else {
	        var data = null;
	        var usage = GL_STATIC_DRAW$1;
	        var primType = -1;
	        var vertCount = -1;
	        var byteLength = 0;
	        var dtype = 0;
	        if (Array.isArray(options) ||
	            isTypedArray(options) ||
	            isNDArrayLike(options)) {
	          data = options;
	        } else {
	          check$1.type(options, 'object', 'invalid arguments for elements');
	          if ('data' in options) {
	            data = options.data;
	            check$1(
	              Array.isArray(data) ||
	                isTypedArray(data) ||
	                isNDArrayLike(data),
	              'invalid data for element buffer');
	          }
	          if ('usage' in options) {
	            check$1.parameter(
	              options.usage,
	              usageTypes,
	              'invalid element buffer usage');
	            usage = usageTypes[options.usage];
	          }
	          if ('primitive' in options) {
	            check$1.parameter(
	              options.primitive,
	              primTypes,
	              'invalid element buffer primitive');
	            primType = primTypes[options.primitive];
	          }
	          if ('count' in options) {
	            check$1(
	              typeof options.count === 'number' && options.count >= 0,
	              'invalid vertex count for elements');
	            vertCount = options.count | 0;
	          }
	          if ('type' in options) {
	            check$1.parameter(
	              options.type,
	              elementTypes,
	              'invalid buffer type');
	            dtype = elementTypes[options.type];
	          }
	          if ('length' in options) {
	            byteLength = options.length | 0;
	          } else {
	            byteLength = vertCount;
	            if (dtype === GL_UNSIGNED_SHORT$2 || dtype === GL_SHORT$2) {
	              byteLength *= 2;
	            } else if (dtype === GL_UNSIGNED_INT$2 || dtype === GL_INT$2) {
	              byteLength *= 4;
	            }
	          }
	        }
	        initElements(
	          elements,
	          data,
	          usage,
	          primType,
	          vertCount,
	          byteLength,
	          dtype);
	      }

	      return reglElements
	    }

	    reglElements(options);

	    reglElements._reglType = 'elements';
	    reglElements._elements = elements;
	    reglElements.subdata = function (data, offset) {
	      buffer.subdata(data, offset);
	      return reglElements
	    };
	    reglElements.destroy = function () {
	      destroyElements(elements);
	    };

	    return reglElements
	  }

	  return {
	    create: createElements,
	    createStream: createElementStream,
	    destroyStream: destroyElementStream,
	    getElements: function (elements) {
	      if (typeof elements === 'function' &&
	          elements._elements instanceof REGLElementBuffer) {
	        return elements._elements
	      }
	      return null
	    },
	    clear: function () {
	      values(elementSet).forEach(destroyElements);
	    }
	  }
	}

	var FLOAT = new Float32Array(1);
	var INT = new Uint32Array(FLOAT.buffer);

	var GL_UNSIGNED_SHORT$4 = 5123;

	function convertToHalfFloat (array) {
	  var ushorts = pool.allocType(GL_UNSIGNED_SHORT$4, array.length);

	  for (var i = 0; i < array.length; ++i) {
	    if (isNaN(array[i])) {
	      ushorts[i] = 0xffff;
	    } else if (array[i] === Infinity) {
	      ushorts[i] = 0x7c00;
	    } else if (array[i] === -Infinity) {
	      ushorts[i] = 0xfc00;
	    } else {
	      FLOAT[0] = array[i];
	      var x = INT[0];

	      var sgn = (x >>> 31) << 15;
	      var exp = ((x << 1) >>> 24) - 127;
	      var frac = (x >> 13) & ((1 << 10) - 1);

	      if (exp < -24) {
	        // round non-representable denormals to 0
	        ushorts[i] = sgn;
	      } else if (exp < -14) {
	        // handle denormals
	        var s = -14 - exp;
	        ushorts[i] = sgn + ((frac + (1 << 10)) >> s);
	      } else if (exp > 15) {
	        // round overflow to +/- Infinity
	        ushorts[i] = sgn + 0x7c00;
	      } else {
	        // otherwise convert directly
	        ushorts[i] = sgn + ((exp + 15) << 10) + frac;
	      }
	    }
	  }

	  return ushorts
	}

	function isArrayLike (s) {
	  return Array.isArray(s) || isTypedArray(s)
	}

	var isPow2$1 = function (v) {
	  return !(v & (v - 1)) && (!!v)
	};

	var GL_COMPRESSED_TEXTURE_FORMATS = 0x86A3;

	var GL_TEXTURE_2D$1 = 0x0DE1;
	var GL_TEXTURE_CUBE_MAP$1 = 0x8513;
	var GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 = 0x8515;

	var GL_RGBA$1 = 0x1908;
	var GL_ALPHA = 0x1906;
	var GL_RGB = 0x1907;
	var GL_LUMINANCE = 0x1909;
	var GL_LUMINANCE_ALPHA = 0x190A;

	var GL_RGBA4 = 0x8056;
	var GL_RGB5_A1 = 0x8057;
	var GL_RGB565 = 0x8D62;

	var GL_UNSIGNED_SHORT_4_4_4_4$1 = 0x8033;
	var GL_UNSIGNED_SHORT_5_5_5_1$1 = 0x8034;
	var GL_UNSIGNED_SHORT_5_6_5$1 = 0x8363;
	var GL_UNSIGNED_INT_24_8_WEBGL$1 = 0x84FA;

	var GL_DEPTH_COMPONENT = 0x1902;
	var GL_DEPTH_STENCIL = 0x84F9;

	var GL_SRGB_EXT = 0x8C40;
	var GL_SRGB_ALPHA_EXT = 0x8C42;

	var GL_HALF_FLOAT_OES$1 = 0x8D61;

	var GL_COMPRESSED_RGB_S3TC_DXT1_EXT = 0x83F0;
	var GL_COMPRESSED_RGBA_S3TC_DXT1_EXT = 0x83F1;
	var GL_COMPRESSED_RGBA_S3TC_DXT3_EXT = 0x83F2;
	var GL_COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83F3;

	var GL_COMPRESSED_RGB_ATC_WEBGL = 0x8C92;
	var GL_COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL = 0x8C93;
	var GL_COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL = 0x87EE;

	var GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG = 0x8C00;
	var GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG = 0x8C01;
	var GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG = 0x8C02;
	var GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG = 0x8C03;

	var GL_COMPRESSED_RGB_ETC1_WEBGL = 0x8D64;

	var GL_UNSIGNED_BYTE$5 = 0x1401;
	var GL_UNSIGNED_SHORT$3 = 0x1403;
	var GL_UNSIGNED_INT$3 = 0x1405;
	var GL_FLOAT$4 = 0x1406;

	var GL_TEXTURE_WRAP_S = 0x2802;
	var GL_TEXTURE_WRAP_T = 0x2803;

	var GL_REPEAT = 0x2901;
	var GL_CLAMP_TO_EDGE$1 = 0x812F;
	var GL_MIRRORED_REPEAT = 0x8370;

	var GL_TEXTURE_MAG_FILTER = 0x2800;
	var GL_TEXTURE_MIN_FILTER = 0x2801;

	var GL_NEAREST$1 = 0x2600;
	var GL_LINEAR = 0x2601;
	var GL_NEAREST_MIPMAP_NEAREST$1 = 0x2700;
	var GL_LINEAR_MIPMAP_NEAREST$1 = 0x2701;
	var GL_NEAREST_MIPMAP_LINEAR$1 = 0x2702;
	var GL_LINEAR_MIPMAP_LINEAR$1 = 0x2703;

	var GL_GENERATE_MIPMAP_HINT = 0x8192;
	var GL_DONT_CARE = 0x1100;
	var GL_FASTEST = 0x1101;
	var GL_NICEST = 0x1102;

	var GL_TEXTURE_MAX_ANISOTROPY_EXT = 0x84FE;

	var GL_UNPACK_ALIGNMENT = 0x0CF5;
	var GL_UNPACK_FLIP_Y_WEBGL = 0x9240;
	var GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL = 0x9241;
	var GL_UNPACK_COLORSPACE_CONVERSION_WEBGL = 0x9243;

	var GL_BROWSER_DEFAULT_WEBGL = 0x9244;

	var GL_TEXTURE0$1 = 0x84C0;

	var MIPMAP_FILTERS = [
	  GL_NEAREST_MIPMAP_NEAREST$1,
	  GL_NEAREST_MIPMAP_LINEAR$1,
	  GL_LINEAR_MIPMAP_NEAREST$1,
	  GL_LINEAR_MIPMAP_LINEAR$1
	];

	var CHANNELS_FORMAT = [
	  0,
	  GL_LUMINANCE,
	  GL_LUMINANCE_ALPHA,
	  GL_RGB,
	  GL_RGBA$1
	];

	var FORMAT_CHANNELS = {};
	FORMAT_CHANNELS[GL_LUMINANCE] =
	FORMAT_CHANNELS[GL_ALPHA] =
	FORMAT_CHANNELS[GL_DEPTH_COMPONENT] = 1;
	FORMAT_CHANNELS[GL_DEPTH_STENCIL] =
	FORMAT_CHANNELS[GL_LUMINANCE_ALPHA] = 2;
	FORMAT_CHANNELS[GL_RGB] =
	FORMAT_CHANNELS[GL_SRGB_EXT] = 3;
	FORMAT_CHANNELS[GL_RGBA$1] =
	FORMAT_CHANNELS[GL_SRGB_ALPHA_EXT] = 4;

	function objectName (str) {
	  return '[object ' + str + ']'
	}

	var CANVAS_CLASS = objectName('HTMLCanvasElement');
	var OFFSCREENCANVAS_CLASS = objectName('OffscreenCanvas');
	var CONTEXT2D_CLASS = objectName('CanvasRenderingContext2D');
	var BITMAP_CLASS = objectName('ImageBitmap');
	var IMAGE_CLASS = objectName('HTMLImageElement');
	var VIDEO_CLASS = objectName('HTMLVideoElement');

	var PIXEL_CLASSES = Object.keys(arrayTypes).concat([
	  CANVAS_CLASS,
	  OFFSCREENCANVAS_CLASS,
	  CONTEXT2D_CLASS,
	  BITMAP_CLASS,
	  IMAGE_CLASS,
	  VIDEO_CLASS
	]);

	// for every texture type, store
	// the size in bytes.
	var TYPE_SIZES = [];
	TYPE_SIZES[GL_UNSIGNED_BYTE$5] = 1;
	TYPE_SIZES[GL_FLOAT$4] = 4;
	TYPE_SIZES[GL_HALF_FLOAT_OES$1] = 2;

	TYPE_SIZES[GL_UNSIGNED_SHORT$3] = 2;
	TYPE_SIZES[GL_UNSIGNED_INT$3] = 4;

	var FORMAT_SIZES_SPECIAL = [];
	FORMAT_SIZES_SPECIAL[GL_RGBA4] = 2;
	FORMAT_SIZES_SPECIAL[GL_RGB5_A1] = 2;
	FORMAT_SIZES_SPECIAL[GL_RGB565] = 2;
	FORMAT_SIZES_SPECIAL[GL_DEPTH_STENCIL] = 4;

	FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_S3TC_DXT1_EXT] = 0.5;
	FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_S3TC_DXT1_EXT] = 0.5;
	FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_S3TC_DXT3_EXT] = 1;
	FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_S3TC_DXT5_EXT] = 1;

	FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_ATC_WEBGL] = 0.5;
	FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL] = 1;
	FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL] = 1;

	FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG] = 0.5;
	FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG] = 0.25;
	FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG] = 0.5;
	FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG] = 0.25;

	FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_ETC1_WEBGL] = 0.5;

	function isNumericArray (arr) {
	  return (
	    Array.isArray(arr) &&
	    (arr.length === 0 ||
	    typeof arr[0] === 'number'))
	}

	function isRectArray (arr) {
	  if (!Array.isArray(arr)) {
	    return false
	  }
	  var width = arr.length;
	  if (width === 0 || !isArrayLike(arr[0])) {
	    return false
	  }
	  return true
	}

	function classString (x) {
	  return Object.prototype.toString.call(x)
	}

	function isCanvasElement (object) {
	  return classString(object) === CANVAS_CLASS
	}

	function isOffscreenCanvas (object) {
	  return classString(object) === OFFSCREENCANVAS_CLASS
	}

	function isContext2D (object) {
	  return classString(object) === CONTEXT2D_CLASS
	}

	function isBitmap (object) {
	  return classString(object) === BITMAP_CLASS
	}

	function isImageElement (object) {
	  return classString(object) === IMAGE_CLASS
	}

	function isVideoElement (object) {
	  return classString(object) === VIDEO_CLASS
	}

	function isPixelData (object) {
	  if (!object) {
	    return false
	  }
	  var className = classString(object);
	  if (PIXEL_CLASSES.indexOf(className) >= 0) {
	    return true
	  }
	  return (
	    isNumericArray(object) ||
	    isRectArray(object) ||
	    isNDArrayLike(object))
	}

	function typedArrayCode$1 (data) {
	  return arrayTypes[Object.prototype.toString.call(data)] | 0
	}

	function convertData (result, data) {
	  var n = data.length;
	  switch (result.type) {
	    case GL_UNSIGNED_BYTE$5:
	    case GL_UNSIGNED_SHORT$3:
	    case GL_UNSIGNED_INT$3:
	    case GL_FLOAT$4:
	      var converted = pool.allocType(result.type, n);
	      converted.set(data);
	      result.data = converted;
	      break

	    case GL_HALF_FLOAT_OES$1:
	      result.data = convertToHalfFloat(data);
	      break

	    default:
	      check$1.raise('unsupported texture type, must specify a typed array');
	  }
	}

	function preConvert (image, n) {
	  return pool.allocType(
	    image.type === GL_HALF_FLOAT_OES$1
	      ? GL_FLOAT$4
	      : image.type, n)
	}

	function postConvert (image, data) {
	  if (image.type === GL_HALF_FLOAT_OES$1) {
	    image.data = convertToHalfFloat(data);
	    pool.freeType(data);
	  } else {
	    image.data = data;
	  }
	}

	function transposeData (image, array, strideX, strideY, strideC, offset) {
	  var w = image.width;
	  var h = image.height;
	  var c = image.channels;
	  var n = w * h * c;
	  var data = preConvert(image, n);

	  var p = 0;
	  for (var i = 0; i < h; ++i) {
	    for (var j = 0; j < w; ++j) {
	      for (var k = 0; k < c; ++k) {
	        data[p++] = array[strideX * j + strideY * i + strideC * k + offset];
	      }
	    }
	  }

	  postConvert(image, data);
	}

	function getTextureSize (format, type, width, height, isMipmap, isCube) {
	  var s;
	  if (typeof FORMAT_SIZES_SPECIAL[format] !== 'undefined') {
	    // we have a special array for dealing with weird color formats such as RGB5A1
	    s = FORMAT_SIZES_SPECIAL[format];
	  } else {
	    s = FORMAT_CHANNELS[format] * TYPE_SIZES[type];
	  }

	  if (isCube) {
	    s *= 6;
	  }

	  if (isMipmap) {
	    // compute the total size of all the mipmaps.
	    var total = 0;

	    var w = width;
	    while (w >= 1) {
	      // we can only use mipmaps on a square image,
	      // so we can simply use the width and ignore the height:
	      total += s * w * w;
	      w /= 2;
	    }
	    return total
	  } else {
	    return s * width * height
	  }
	}

	function createTextureSet (
	  gl, extensions, limits, reglPoll, contextState, stats, config) {
	  // -------------------------------------------------------
	  // Initialize constants and parameter tables here
	  // -------------------------------------------------------
	  var mipmapHint = {
	    "don't care": GL_DONT_CARE,
	    'dont care': GL_DONT_CARE,
	    'nice': GL_NICEST,
	    'fast': GL_FASTEST
	  };

	  var wrapModes = {
	    'repeat': GL_REPEAT,
	    'clamp': GL_CLAMP_TO_EDGE$1,
	    'mirror': GL_MIRRORED_REPEAT
	  };

	  var magFilters = {
	    'nearest': GL_NEAREST$1,
	    'linear': GL_LINEAR
	  };

	  var minFilters = extend({
	    'mipmap': GL_LINEAR_MIPMAP_LINEAR$1,
	    'nearest mipmap nearest': GL_NEAREST_MIPMAP_NEAREST$1,
	    'linear mipmap nearest': GL_LINEAR_MIPMAP_NEAREST$1,
	    'nearest mipmap linear': GL_NEAREST_MIPMAP_LINEAR$1,
	    'linear mipmap linear': GL_LINEAR_MIPMAP_LINEAR$1
	  }, magFilters);

	  var colorSpace = {
	    'none': 0,
	    'browser': GL_BROWSER_DEFAULT_WEBGL
	  };

	  var textureTypes = {
	    'uint8': GL_UNSIGNED_BYTE$5,
	    'rgba4': GL_UNSIGNED_SHORT_4_4_4_4$1,
	    'rgb565': GL_UNSIGNED_SHORT_5_6_5$1,
	    'rgb5 a1': GL_UNSIGNED_SHORT_5_5_5_1$1
	  };

	  var textureFormats = {
	    'alpha': GL_ALPHA,
	    'luminance': GL_LUMINANCE,
	    'luminance alpha': GL_LUMINANCE_ALPHA,
	    'rgb': GL_RGB,
	    'rgba': GL_RGBA$1,
	    'rgba4': GL_RGBA4,
	    'rgb5 a1': GL_RGB5_A1,
	    'rgb565': GL_RGB565
	  };

	  var compressedTextureFormats = {};

	  if (extensions.ext_srgb) {
	    textureFormats.srgb = GL_SRGB_EXT;
	    textureFormats.srgba = GL_SRGB_ALPHA_EXT;
	  }

	  if (extensions.oes_texture_float) {
	    textureTypes.float32 = textureTypes.float = GL_FLOAT$4;
	  }

	  if (extensions.oes_texture_half_float) {
	    textureTypes['float16'] = textureTypes['half float'] = GL_HALF_FLOAT_OES$1;
	  }

	  if (extensions.webgl_depth_texture) {
	    extend(textureFormats, {
	      'depth': GL_DEPTH_COMPONENT,
	      'depth stencil': GL_DEPTH_STENCIL
	    });

	    extend(textureTypes, {
	      'uint16': GL_UNSIGNED_SHORT$3,
	      'uint32': GL_UNSIGNED_INT$3,
	      'depth stencil': GL_UNSIGNED_INT_24_8_WEBGL$1
	    });
	  }

	  if (extensions.webgl_compressed_texture_s3tc) {
	    extend(compressedTextureFormats, {
	      'rgb s3tc dxt1': GL_COMPRESSED_RGB_S3TC_DXT1_EXT,
	      'rgba s3tc dxt1': GL_COMPRESSED_RGBA_S3TC_DXT1_EXT,
	      'rgba s3tc dxt3': GL_COMPRESSED_RGBA_S3TC_DXT3_EXT,
	      'rgba s3tc dxt5': GL_COMPRESSED_RGBA_S3TC_DXT5_EXT
	    });
	  }

	  if (extensions.webgl_compressed_texture_atc) {
	    extend(compressedTextureFormats, {
	      'rgb atc': GL_COMPRESSED_RGB_ATC_WEBGL,
	      'rgba atc explicit alpha': GL_COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL,
	      'rgba atc interpolated alpha': GL_COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL
	    });
	  }

	  if (extensions.webgl_compressed_texture_pvrtc) {
	    extend(compressedTextureFormats, {
	      'rgb pvrtc 4bppv1': GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG,
	      'rgb pvrtc 2bppv1': GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG,
	      'rgba pvrtc 4bppv1': GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG,
	      'rgba pvrtc 2bppv1': GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG
	    });
	  }

	  if (extensions.webgl_compressed_texture_etc1) {
	    compressedTextureFormats['rgb etc1'] = GL_COMPRESSED_RGB_ETC1_WEBGL;
	  }

	  // Copy over all texture formats
	  var supportedCompressedFormats = Array.prototype.slice.call(
	    gl.getParameter(GL_COMPRESSED_TEXTURE_FORMATS));
	  Object.keys(compressedTextureFormats).forEach(function (name) {
	    var format = compressedTextureFormats[name];
	    if (supportedCompressedFormats.indexOf(format) >= 0) {
	      textureFormats[name] = format;
	    }
	  });

	  var supportedFormats = Object.keys(textureFormats);
	  limits.textureFormats = supportedFormats;

	  // associate with every format string its
	  // corresponding GL-value.
	  var textureFormatsInvert = [];
	  Object.keys(textureFormats).forEach(function (key) {
	    var val = textureFormats[key];
	    textureFormatsInvert[val] = key;
	  });

	  // associate with every type string its
	  // corresponding GL-value.
	  var textureTypesInvert = [];
	  Object.keys(textureTypes).forEach(function (key) {
	    var val = textureTypes[key];
	    textureTypesInvert[val] = key;
	  });

	  var magFiltersInvert = [];
	  Object.keys(magFilters).forEach(function (key) {
	    var val = magFilters[key];
	    magFiltersInvert[val] = key;
	  });

	  var minFiltersInvert = [];
	  Object.keys(minFilters).forEach(function (key) {
	    var val = minFilters[key];
	    minFiltersInvert[val] = key;
	  });

	  var wrapModesInvert = [];
	  Object.keys(wrapModes).forEach(function (key) {
	    var val = wrapModes[key];
	    wrapModesInvert[val] = key;
	  });

	  // colorFormats[] gives the format (channels) associated to an
	  // internalformat
	  var colorFormats = supportedFormats.reduce(function (color, key) {
	    var glenum = textureFormats[key];
	    if (glenum === GL_LUMINANCE ||
	        glenum === GL_ALPHA ||
	        glenum === GL_LUMINANCE ||
	        glenum === GL_LUMINANCE_ALPHA ||
	        glenum === GL_DEPTH_COMPONENT ||
	        glenum === GL_DEPTH_STENCIL ||
	        (extensions.ext_srgb &&
	                (glenum === GL_SRGB_EXT ||
	                 glenum === GL_SRGB_ALPHA_EXT))) {
	      color[glenum] = glenum;
	    } else if (glenum === GL_RGB5_A1 || key.indexOf('rgba') >= 0) {
	      color[glenum] = GL_RGBA$1;
	    } else {
	      color[glenum] = GL_RGB;
	    }
	    return color
	  }, {});

	  function TexFlags () {
	    // format info
	    this.internalformat = GL_RGBA$1;
	    this.format = GL_RGBA$1;
	    this.type = GL_UNSIGNED_BYTE$5;
	    this.compressed = false;

	    // pixel storage
	    this.premultiplyAlpha = false;
	    this.flipY = false;
	    this.unpackAlignment = 1;
	    this.colorSpace = GL_BROWSER_DEFAULT_WEBGL;

	    // shape info
	    this.width = 0;
	    this.height = 0;
	    this.channels = 0;
	  }

	  function copyFlags (result, other) {
	    result.internalformat = other.internalformat;
	    result.format = other.format;
	    result.type = other.type;
	    result.compressed = other.compressed;

	    result.premultiplyAlpha = other.premultiplyAlpha;
	    result.flipY = other.flipY;
	    result.unpackAlignment = other.unpackAlignment;
	    result.colorSpace = other.colorSpace;

	    result.width = other.width;
	    result.height = other.height;
	    result.channels = other.channels;
	  }

	  function parseFlags (flags, options) {
	    if (typeof options !== 'object' || !options) {
	      return
	    }

	    if ('premultiplyAlpha' in options) {
	      check$1.type(options.premultiplyAlpha, 'boolean',
	        'invalid premultiplyAlpha');
	      flags.premultiplyAlpha = options.premultiplyAlpha;
	    }

	    if ('flipY' in options) {
	      check$1.type(options.flipY, 'boolean',
	        'invalid texture flip');
	      flags.flipY = options.flipY;
	    }

	    if ('alignment' in options) {
	      check$1.oneOf(options.alignment, [1, 2, 4, 8],
	        'invalid texture unpack alignment');
	      flags.unpackAlignment = options.alignment;
	    }

	    if ('colorSpace' in options) {
	      check$1.parameter(options.colorSpace, colorSpace,
	        'invalid colorSpace');
	      flags.colorSpace = colorSpace[options.colorSpace];
	    }

	    if ('type' in options) {
	      var type = options.type;
	      check$1(extensions.oes_texture_float ||
	        !(type === 'float' || type === 'float32'),
	      'you must enable the OES_texture_float extension in order to use floating point textures.');
	      check$1(extensions.oes_texture_half_float ||
	        !(type === 'half float' || type === 'float16'),
	      'you must enable the OES_texture_half_float extension in order to use 16-bit floating point textures.');
	      check$1(extensions.webgl_depth_texture ||
	        !(type === 'uint16' || type === 'uint32' || type === 'depth stencil'),
	      'you must enable the WEBGL_depth_texture extension in order to use depth/stencil textures.');
	      check$1.parameter(type, textureTypes,
	        'invalid texture type');
	      flags.type = textureTypes[type];
	    }

	    var w = flags.width;
	    var h = flags.height;
	    var c = flags.channels;
	    var hasChannels = false;
	    if ('shape' in options) {
	      check$1(Array.isArray(options.shape) && options.shape.length >= 2,
	        'shape must be an array');
	      w = options.shape[0];
	      h = options.shape[1];
	      if (options.shape.length === 3) {
	        c = options.shape[2];
	        check$1(c > 0 && c <= 4, 'invalid number of channels');
	        hasChannels = true;
	      }
	      check$1(w >= 0 && w <= limits.maxTextureSize, 'invalid width');
	      check$1(h >= 0 && h <= limits.maxTextureSize, 'invalid height');
	    } else {
	      if ('radius' in options) {
	        w = h = options.radius;
	        check$1(w >= 0 && w <= limits.maxTextureSize, 'invalid radius');
	      }
	      if ('width' in options) {
	        w = options.width;
	        check$1(w >= 0 && w <= limits.maxTextureSize, 'invalid width');
	      }
	      if ('height' in options) {
	        h = options.height;
	        check$1(h >= 0 && h <= limits.maxTextureSize, 'invalid height');
	      }
	      if ('channels' in options) {
	        c = options.channels;
	        check$1(c > 0 && c <= 4, 'invalid number of channels');
	        hasChannels = true;
	      }
	    }
	    flags.width = w | 0;
	    flags.height = h | 0;
	    flags.channels = c | 0;

	    var hasFormat = false;
	    if ('format' in options) {
	      var formatStr = options.format;
	      check$1(extensions.webgl_depth_texture ||
	        !(formatStr === 'depth' || formatStr === 'depth stencil'),
	      'you must enable the WEBGL_depth_texture extension in order to use depth/stencil textures.');
	      check$1.parameter(formatStr, textureFormats,
	        'invalid texture format');
	      var internalformat = flags.internalformat = textureFormats[formatStr];
	      flags.format = colorFormats[internalformat];
	      if (formatStr in textureTypes) {
	        if (!('type' in options)) {
	          flags.type = textureTypes[formatStr];
	        }
	      }
	      if (formatStr in compressedTextureFormats) {
	        flags.compressed = true;
	      }
	      hasFormat = true;
	    }

	    // Reconcile channels and format
	    if (!hasChannels && hasFormat) {
	      flags.channels = FORMAT_CHANNELS[flags.format];
	    } else if (hasChannels && !hasFormat) {
	      if (flags.channels !== CHANNELS_FORMAT[flags.format]) {
	        flags.format = flags.internalformat = CHANNELS_FORMAT[flags.channels];
	      }
	    } else if (hasFormat && hasChannels) {
	      check$1(
	        flags.channels === FORMAT_CHANNELS[flags.format],
	        'number of channels inconsistent with specified format');
	    }
	  }

	  function setFlags (flags) {
	    gl.pixelStorei(GL_UNPACK_FLIP_Y_WEBGL, flags.flipY);
	    gl.pixelStorei(GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL, flags.premultiplyAlpha);
	    gl.pixelStorei(GL_UNPACK_COLORSPACE_CONVERSION_WEBGL, flags.colorSpace);
	    gl.pixelStorei(GL_UNPACK_ALIGNMENT, flags.unpackAlignment);
	  }

	  // -------------------------------------------------------
	  // Tex image data
	  // -------------------------------------------------------
	  function TexImage () {
	    TexFlags.call(this);

	    this.xOffset = 0;
	    this.yOffset = 0;

	    // data
	    this.data = null;
	    this.needsFree = false;

	    // html element
	    this.element = null;

	    // copyTexImage info
	    this.needsCopy = false;
	  }

	  function parseImage (image, options) {
	    var data = null;
	    if (isPixelData(options)) {
	      data = options;
	    } else if (options) {
	      check$1.type(options, 'object', 'invalid pixel data type');
	      parseFlags(image, options);
	      if ('x' in options) {
	        image.xOffset = options.x | 0;
	      }
	      if ('y' in options) {
	        image.yOffset = options.y | 0;
	      }
	      if (isPixelData(options.data)) {
	        data = options.data;
	      }
	    }

	    check$1(
	      !image.compressed ||
	      data instanceof Uint8Array,
	      'compressed texture data must be stored in a uint8array');

	    if (options.copy) {
	      check$1(!data, 'can not specify copy and data field for the same texture');
	      var viewW = contextState.viewportWidth;
	      var viewH = contextState.viewportHeight;
	      image.width = image.width || (viewW - image.xOffset);
	      image.height = image.height || (viewH - image.yOffset);
	      image.needsCopy = true;
	      check$1(image.xOffset >= 0 && image.xOffset < viewW &&
	            image.yOffset >= 0 && image.yOffset < viewH &&
	            image.width > 0 && image.width <= viewW &&
	            image.height > 0 && image.height <= viewH,
	      'copy texture read out of bounds');
	    } else if (!data) {
	      image.width = image.width || 1;
	      image.height = image.height || 1;
	      image.channels = image.channels || 4;
	    } else if (isTypedArray(data)) {
	      image.channels = image.channels || 4;
	      image.data = data;
	      if (!('type' in options) && image.type === GL_UNSIGNED_BYTE$5) {
	        image.type = typedArrayCode$1(data);
	      }
	    } else if (isNumericArray(data)) {
	      image.channels = image.channels || 4;
	      convertData(image, data);
	      image.alignment = 1;
	      image.needsFree = true;
	    } else if (isNDArrayLike(data)) {
	      var array = data.data;
	      if (!Array.isArray(array) && image.type === GL_UNSIGNED_BYTE$5) {
	        image.type = typedArrayCode$1(array);
	      }
	      var shape = data.shape;
	      var stride = data.stride;
	      var shapeX, shapeY, shapeC, strideX, strideY, strideC;
	      if (shape.length === 3) {
	        shapeC = shape[2];
	        strideC = stride[2];
	      } else {
	        check$1(shape.length === 2, 'invalid ndarray pixel data, must be 2 or 3D');
	        shapeC = 1;
	        strideC = 1;
	      }
	      shapeX = shape[0];
	      shapeY = shape[1];
	      strideX = stride[0];
	      strideY = stride[1];
	      image.alignment = 1;
	      image.width = shapeX;
	      image.height = shapeY;
	      image.channels = shapeC;
	      image.format = image.internalformat = CHANNELS_FORMAT[shapeC];
	      image.needsFree = true;
	      transposeData(image, array, strideX, strideY, strideC, data.offset);
	    } else if (isCanvasElement(data) || isOffscreenCanvas(data) || isContext2D(data)) {
	      if (isCanvasElement(data) || isOffscreenCanvas(data)) {
	        image.element = data;
	      } else {
	        image.element = data.canvas;
	      }
	      image.width = image.element.width;
	      image.height = image.element.height;
	      image.channels = 4;
	    } else if (isBitmap(data)) {
	      image.element = data;
	      image.width = data.width;
	      image.height = data.height;
	      image.channels = 4;
	    } else if (isImageElement(data)) {
	      image.element = data;
	      image.width = data.naturalWidth;
	      image.height = data.naturalHeight;
	      image.channels = 4;
	    } else if (isVideoElement(data)) {
	      image.element = data;
	      image.width = data.videoWidth;
	      image.height = data.videoHeight;
	      image.channels = 4;
	    } else if (isRectArray(data)) {
	      var w = image.width || data[0].length;
	      var h = image.height || data.length;
	      var c = image.channels;
	      if (isArrayLike(data[0][0])) {
	        c = c || data[0][0].length;
	      } else {
	        c = c || 1;
	      }
	      var arrayShape = flattenUtils.shape(data);
	      var n = 1;
	      for (var dd = 0; dd < arrayShape.length; ++dd) {
	        n *= arrayShape[dd];
	      }
	      var allocData = preConvert(image, n);
	      flattenUtils.flatten(data, arrayShape, '', allocData);
	      postConvert(image, allocData);
	      image.alignment = 1;
	      image.width = w;
	      image.height = h;
	      image.channels = c;
	      image.format = image.internalformat = CHANNELS_FORMAT[c];
	      image.needsFree = true;
	    }

	    if (image.type === GL_FLOAT$4) {
	      check$1(limits.extensions.indexOf('oes_texture_float') >= 0,
	        'oes_texture_float extension not enabled');
	    } else if (image.type === GL_HALF_FLOAT_OES$1) {
	      check$1(limits.extensions.indexOf('oes_texture_half_float') >= 0,
	        'oes_texture_half_float extension not enabled');
	    }

	    // do compressed texture  validation here.
	  }

	  function setImage (info, target, miplevel) {
	    var element = info.element;
	    var data = info.data;
	    var internalformat = info.internalformat;
	    var format = info.format;
	    var type = info.type;
	    var width = info.width;
	    var height = info.height;

	    setFlags(info);

	    if (element) {
	      gl.texImage2D(target, miplevel, format, format, type, element);
	    } else if (info.compressed) {
	      gl.compressedTexImage2D(target, miplevel, internalformat, width, height, 0, data);
	    } else if (info.needsCopy) {
	      reglPoll();
	      gl.copyTexImage2D(
	        target, miplevel, format, info.xOffset, info.yOffset, width, height, 0);
	    } else {
	      gl.texImage2D(target, miplevel, format, width, height, 0, format, type, data || null);
	    }
	  }

	  function setSubImage (info, target, x, y, miplevel) {
	    var element = info.element;
	    var data = info.data;
	    var internalformat = info.internalformat;
	    var format = info.format;
	    var type = info.type;
	    var width = info.width;
	    var height = info.height;

	    setFlags(info);

	    if (element) {
	      gl.texSubImage2D(
	        target, miplevel, x, y, format, type, element);
	    } else if (info.compressed) {
	      gl.compressedTexSubImage2D(
	        target, miplevel, x, y, internalformat, width, height, data);
	    } else if (info.needsCopy) {
	      reglPoll();
	      gl.copyTexSubImage2D(
	        target, miplevel, x, y, info.xOffset, info.yOffset, width, height);
	    } else {
	      gl.texSubImage2D(
	        target, miplevel, x, y, width, height, format, type, data);
	    }
	  }

	  // texImage pool
	  var imagePool = [];

	  function allocImage () {
	    return imagePool.pop() || new TexImage()
	  }

	  function freeImage (image) {
	    if (image.needsFree) {
	      pool.freeType(image.data);
	    }
	    TexImage.call(image);
	    imagePool.push(image);
	  }

	  // -------------------------------------------------------
	  // Mip map
	  // -------------------------------------------------------
	  function MipMap () {
	    TexFlags.call(this);

	    this.genMipmaps = false;
	    this.mipmapHint = GL_DONT_CARE;
	    this.mipmask = 0;
	    this.images = Array(16);
	  }

	  function parseMipMapFromShape (mipmap, width, height) {
	    var img = mipmap.images[0] = allocImage();
	    mipmap.mipmask = 1;
	    img.width = mipmap.width = width;
	    img.height = mipmap.height = height;
	    img.channels = mipmap.channels = 4;
	  }

	  function parseMipMapFromObject (mipmap, options) {
	    var imgData = null;
	    if (isPixelData(options)) {
	      imgData = mipmap.images[0] = allocImage();
	      copyFlags(imgData, mipmap);
	      parseImage(imgData, options);
	      mipmap.mipmask = 1;
	    } else {
	      parseFlags(mipmap, options);
	      if (Array.isArray(options.mipmap)) {
	        var mipData = options.mipmap;
	        for (var i = 0; i < mipData.length; ++i) {
	          imgData = mipmap.images[i] = allocImage();
	          copyFlags(imgData, mipmap);
	          imgData.width >>= i;
	          imgData.height >>= i;
	          parseImage(imgData, mipData[i]);
	          mipmap.mipmask |= (1 << i);
	        }
	      } else {
	        imgData = mipmap.images[0] = allocImage();
	        copyFlags(imgData, mipmap);
	        parseImage(imgData, options);
	        mipmap.mipmask = 1;
	      }
	    }
	    copyFlags(mipmap, mipmap.images[0]);

	    // For textures of the compressed format WEBGL_compressed_texture_s3tc
	    // we must have that
	    //
	    // "When level equals zero width and height must be a multiple of 4.
	    // When level is greater than 0 width and height must be 0, 1, 2 or a multiple of 4. "
	    //
	    // but we do not yet support having multiple mipmap levels for compressed textures,
	    // so we only test for level zero.

	    if (
	      mipmap.compressed &&
	      (
	        mipmap.internalformat === GL_COMPRESSED_RGB_S3TC_DXT1_EXT ||
	        mipmap.internalformat === GL_COMPRESSED_RGBA_S3TC_DXT1_EXT ||
	        mipmap.internalformat === GL_COMPRESSED_RGBA_S3TC_DXT3_EXT ||
	        mipmap.internalformat === GL_COMPRESSED_RGBA_S3TC_DXT5_EXT
	      )
	    ) {
	      check$1(mipmap.width % 4 === 0 && mipmap.height % 4 === 0,
	        'for compressed texture formats, mipmap level 0 must have width and height that are a multiple of 4');
	    }
	  }

	  function setMipMap (mipmap, target) {
	    var images = mipmap.images;
	    for (var i = 0; i < images.length; ++i) {
	      if (!images[i]) {
	        return
	      }
	      setImage(images[i], target, i);
	    }
	  }

	  var mipPool = [];

	  function allocMipMap () {
	    var result = mipPool.pop() || new MipMap();
	    TexFlags.call(result);
	    result.mipmask = 0;
	    for (var i = 0; i < 16; ++i) {
	      result.images[i] = null;
	    }
	    return result
	  }

	  function freeMipMap (mipmap) {
	    var images = mipmap.images;
	    for (var i = 0; i < images.length; ++i) {
	      if (images[i]) {
	        freeImage(images[i]);
	      }
	      images[i] = null;
	    }
	    mipPool.push(mipmap);
	  }

	  // -------------------------------------------------------
	  // Tex info
	  // -------------------------------------------------------
	  function TexInfo () {
	    this.minFilter = GL_NEAREST$1;
	    this.magFilter = GL_NEAREST$1;

	    this.wrapS = GL_CLAMP_TO_EDGE$1;
	    this.wrapT = GL_CLAMP_TO_EDGE$1;

	    this.anisotropic = 1;

	    this.genMipmaps = false;
	    this.mipmapHint = GL_DONT_CARE;
	  }

	  function parseTexInfo (info, options) {
	    if ('min' in options) {
	      var minFilter = options.min;
	      check$1.parameter(minFilter, minFilters);
	      info.minFilter = minFilters[minFilter];
	      if (MIPMAP_FILTERS.indexOf(info.minFilter) >= 0 && !('faces' in options)) {
	        info.genMipmaps = true;
	      }
	    }

	    if ('mag' in options) {
	      var magFilter = options.mag;
	      check$1.parameter(magFilter, magFilters);
	      info.magFilter = magFilters[magFilter];
	    }

	    var wrapS = info.wrapS;
	    var wrapT = info.wrapT;
	    if ('wrap' in options) {
	      var wrap = options.wrap;
	      if (typeof wrap === 'string') {
	        check$1.parameter(wrap, wrapModes);
	        wrapS = wrapT = wrapModes[wrap];
	      } else if (Array.isArray(wrap)) {
	        check$1.parameter(wrap[0], wrapModes);
	        check$1.parameter(wrap[1], wrapModes);
	        wrapS = wrapModes[wrap[0]];
	        wrapT = wrapModes[wrap[1]];
	      }
	    } else {
	      if ('wrapS' in options) {
	        var optWrapS = options.wrapS;
	        check$1.parameter(optWrapS, wrapModes);
	        wrapS = wrapModes[optWrapS];
	      }
	      if ('wrapT' in options) {
	        var optWrapT = options.wrapT;
	        check$1.parameter(optWrapT, wrapModes);
	        wrapT = wrapModes[optWrapT];
	      }
	    }
	    info.wrapS = wrapS;
	    info.wrapT = wrapT;

	    if ('anisotropic' in options) {
	      var anisotropic = options.anisotropic;
	      check$1(typeof anisotropic === 'number' &&
	         anisotropic >= 1 && anisotropic <= limits.maxAnisotropic,
	      'aniso samples must be between 1 and ');
	      info.anisotropic = options.anisotropic;
	    }

	    if ('mipmap' in options) {
	      var hasMipMap = false;
	      switch (typeof options.mipmap) {
	        case 'string':
	          check$1.parameter(options.mipmap, mipmapHint,
	            'invalid mipmap hint');
	          info.mipmapHint = mipmapHint[options.mipmap];
	          info.genMipmaps = true;
	          hasMipMap = true;
	          break

	        case 'boolean':
	          hasMipMap = info.genMipmaps = options.mipmap;
	          break

	        case 'object':
	          check$1(Array.isArray(options.mipmap), 'invalid mipmap type');
	          info.genMipmaps = false;
	          hasMipMap = true;
	          break

	        default:
	          check$1.raise('invalid mipmap type');
	      }
	      if (hasMipMap && !('min' in options)) {
	        info.minFilter = GL_NEAREST_MIPMAP_NEAREST$1;
	      }
	    }
	  }

	  function setTexInfo (info, target) {
	    gl.texParameteri(target, GL_TEXTURE_MIN_FILTER, info.minFilter);
	    gl.texParameteri(target, GL_TEXTURE_MAG_FILTER, info.magFilter);
	    gl.texParameteri(target, GL_TEXTURE_WRAP_S, info.wrapS);
	    gl.texParameteri(target, GL_TEXTURE_WRAP_T, info.wrapT);
	    if (extensions.ext_texture_filter_anisotropic) {
	      gl.texParameteri(target, GL_TEXTURE_MAX_ANISOTROPY_EXT, info.anisotropic);
	    }
	    if (info.genMipmaps) {
	      gl.hint(GL_GENERATE_MIPMAP_HINT, info.mipmapHint);
	      gl.generateMipmap(target);
	    }
	  }

	  // -------------------------------------------------------
	  // Full texture object
	  // -------------------------------------------------------
	  var textureCount = 0;
	  var textureSet = {};
	  var numTexUnits = limits.maxTextureUnits;
	  var textureUnits = Array(numTexUnits).map(function () {
	    return null
	  });

	  function REGLTexture (target) {
	    TexFlags.call(this);
	    this.mipmask = 0;
	    this.internalformat = GL_RGBA$1;

	    this.id = textureCount++;

	    this.refCount = 1;

	    this.target = target;
	    this.texture = gl.createTexture();

	    this.unit = -1;
	    this.bindCount = 0;

	    this.texInfo = new TexInfo();

	    if (config.profile) {
	      this.stats = { size: 0 };
	    }
	  }

	  function tempBind (texture) {
	    gl.activeTexture(GL_TEXTURE0$1);
	    gl.bindTexture(texture.target, texture.texture);
	  }

	  function tempRestore () {
	    var prev = textureUnits[0];
	    if (prev) {
	      gl.bindTexture(prev.target, prev.texture);
	    } else {
	      gl.bindTexture(GL_TEXTURE_2D$1, null);
	    }
	  }

	  function destroy (texture) {
	    var handle = texture.texture;
	    check$1(handle, 'must not double destroy texture');
	    var unit = texture.unit;
	    var target = texture.target;
	    if (unit >= 0) {
	      gl.activeTexture(GL_TEXTURE0$1 + unit);
	      gl.bindTexture(target, null);
	      textureUnits[unit] = null;
	    }
	    gl.deleteTexture(handle);
	    texture.texture = null;
	    texture.params = null;
	    texture.pixels = null;
	    texture.refCount = 0;
	    delete textureSet[texture.id];
	    stats.textureCount--;
	  }

	  extend(REGLTexture.prototype, {
	    bind: function () {
	      var texture = this;
	      texture.bindCount += 1;
	      var unit = texture.unit;
	      if (unit < 0) {
	        for (var i = 0; i < numTexUnits; ++i) {
	          var other = textureUnits[i];
	          if (other) {
	            if (other.bindCount > 0) {
	              continue
	            }
	            other.unit = -1;
	          }
	          textureUnits[i] = texture;
	          unit = i;
	          break
	        }
	        if (unit >= numTexUnits) {
	          check$1.raise('insufficient number of texture units');
	        }
	        if (config.profile && stats.maxTextureUnits < (unit + 1)) {
	          stats.maxTextureUnits = unit + 1; // +1, since the units are zero-based
	        }
	        texture.unit = unit;
	        gl.activeTexture(GL_TEXTURE0$1 + unit);
	        gl.bindTexture(texture.target, texture.texture);
	      }
	      return unit
	    },

	    unbind: function () {
	      this.bindCount -= 1;
	    },

	    decRef: function () {
	      if (--this.refCount <= 0) {
	        destroy(this);
	      }
	    }
	  });

	  function createTexture2D (a, b) {
	    var texture = new REGLTexture(GL_TEXTURE_2D$1);
	    textureSet[texture.id] = texture;
	    stats.textureCount++;

	    function reglTexture2D (a, b) {
	      var texInfo = texture.texInfo;
	      TexInfo.call(texInfo);
	      var mipData = allocMipMap();

	      if (typeof a === 'number') {
	        if (typeof b === 'number') {
	          parseMipMapFromShape(mipData, a | 0, b | 0);
	        } else {
	          parseMipMapFromShape(mipData, a | 0, a | 0);
	        }
	      } else if (a) {
	        check$1.type(a, 'object', 'invalid arguments to regl.texture');
	        parseTexInfo(texInfo, a);
	        parseMipMapFromObject(mipData, a);
	      } else {
	        // empty textures get assigned a default shape of 1x1
	        parseMipMapFromShape(mipData, 1, 1);
	      }

	      if (texInfo.genMipmaps) {
	        mipData.mipmask = (mipData.width << 1) - 1;
	      }
	      texture.mipmask = mipData.mipmask;

	      copyFlags(texture, mipData);

	      check$1.texture2D(texInfo, mipData, limits);
	      texture.internalformat = mipData.internalformat;

	      reglTexture2D.width = mipData.width;
	      reglTexture2D.height = mipData.height;

	      tempBind(texture);
	      setMipMap(mipData, GL_TEXTURE_2D$1);
	      setTexInfo(texInfo, GL_TEXTURE_2D$1);
	      tempRestore();

	      freeMipMap(mipData);

	      if (config.profile) {
	        texture.stats.size = getTextureSize(
	          texture.internalformat,
	          texture.type,
	          mipData.width,
	          mipData.height,
	          texInfo.genMipmaps,
	          false);
	      }
	      reglTexture2D.format = textureFormatsInvert[texture.internalformat];
	      reglTexture2D.type = textureTypesInvert[texture.type];

	      reglTexture2D.mag = magFiltersInvert[texInfo.magFilter];
	      reglTexture2D.min = minFiltersInvert[texInfo.minFilter];

	      reglTexture2D.wrapS = wrapModesInvert[texInfo.wrapS];
	      reglTexture2D.wrapT = wrapModesInvert[texInfo.wrapT];

	      return reglTexture2D
	    }

	    function subimage (image, x_, y_, level_) {
	      check$1(!!image, 'must specify image data');

	      var x = x_ | 0;
	      var y = y_ | 0;
	      var level = level_ | 0;

	      var imageData = allocImage();
	      copyFlags(imageData, texture);
	      imageData.width = 0;
	      imageData.height = 0;
	      parseImage(imageData, image);
	      imageData.width = imageData.width || ((texture.width >> level) - x);
	      imageData.height = imageData.height || ((texture.height >> level) - y);

	      check$1(
	        texture.type === imageData.type &&
	        texture.format === imageData.format &&
	        texture.internalformat === imageData.internalformat,
	        'incompatible format for texture.subimage');
	      check$1(
	        x >= 0 && y >= 0 &&
	        x + imageData.width <= texture.width &&
	        y + imageData.height <= texture.height,
	        'texture.subimage write out of bounds');
	      check$1(
	        texture.mipmask & (1 << level),
	        'missing mipmap data');
	      check$1(
	        imageData.data || imageData.element || imageData.needsCopy,
	        'missing image data');

	      tempBind(texture);
	      setSubImage(imageData, GL_TEXTURE_2D$1, x, y, level);
	      tempRestore();

	      freeImage(imageData);

	      return reglTexture2D
	    }

	    function resize (w_, h_) {
	      var w = w_ | 0;
	      var h = (h_ | 0) || w;
	      if (w === texture.width && h === texture.height) {
	        return reglTexture2D
	      }

	      reglTexture2D.width = texture.width = w;
	      reglTexture2D.height = texture.height = h;

	      tempBind(texture);

	      for (var i = 0; texture.mipmask >> i; ++i) {
	        var _w = w >> i;
	        var _h = h >> i;
	        if (!_w || !_h) break
	        gl.texImage2D(
	          GL_TEXTURE_2D$1,
	          i,
	          texture.format,
	          _w,
	          _h,
	          0,
	          texture.format,
	          texture.type,
	          null);
	      }
	      tempRestore();

	      // also, recompute the texture size.
	      if (config.profile) {
	        texture.stats.size = getTextureSize(
	          texture.internalformat,
	          texture.type,
	          w,
	          h,
	          false,
	          false);
	      }

	      return reglTexture2D
	    }

	    reglTexture2D(a, b);

	    reglTexture2D.subimage = subimage;
	    reglTexture2D.resize = resize;
	    reglTexture2D._reglType = 'texture2d';
	    reglTexture2D._texture = texture;
	    if (config.profile) {
	      reglTexture2D.stats = texture.stats;
	    }
	    reglTexture2D.destroy = function () {
	      texture.decRef();
	    };

	    return reglTexture2D
	  }

	  function createTextureCube (a0, a1, a2, a3, a4, a5) {
	    var texture = new REGLTexture(GL_TEXTURE_CUBE_MAP$1);
	    textureSet[texture.id] = texture;
	    stats.cubeCount++;

	    var faces = new Array(6);

	    function reglTextureCube (a0, a1, a2, a3, a4, a5) {
	      var i;
	      var texInfo = texture.texInfo;
	      TexInfo.call(texInfo);
	      for (i = 0; i < 6; ++i) {
	        faces[i] = allocMipMap();
	      }

	      if (typeof a0 === 'number' || !a0) {
	        var s = (a0 | 0) || 1;
	        for (i = 0; i < 6; ++i) {
	          parseMipMapFromShape(faces[i], s, s);
	        }
	      } else if (typeof a0 === 'object') {
	        if (a1) {
	          parseMipMapFromObject(faces[0], a0);
	          parseMipMapFromObject(faces[1], a1);
	          parseMipMapFromObject(faces[2], a2);
	          parseMipMapFromObject(faces[3], a3);
	          parseMipMapFromObject(faces[4], a4);
	          parseMipMapFromObject(faces[5], a5);
	        } else {
	          parseTexInfo(texInfo, a0);
	          parseFlags(texture, a0);
	          if ('faces' in a0) {
	            var faceInput = a0.faces;
	            check$1(Array.isArray(faceInput) && faceInput.length === 6,
	              'cube faces must be a length 6 array');
	            for (i = 0; i < 6; ++i) {
	              check$1(typeof faceInput[i] === 'object' && !!faceInput[i],
	                'invalid input for cube map face');
	              copyFlags(faces[i], texture);
	              parseMipMapFromObject(faces[i], faceInput[i]);
	            }
	          } else {
	            for (i = 0; i < 6; ++i) {
	              parseMipMapFromObject(faces[i], a0);
	            }
	          }
	        }
	      } else {
	        check$1.raise('invalid arguments to cube map');
	      }

	      copyFlags(texture, faces[0]);

	      if (!limits.npotTextureCube) {
	        check$1(isPow2$1(texture.width) && isPow2$1(texture.height), 'your browser does not support non power or two texture dimensions');
	      }

	      if (texInfo.genMipmaps) {
	        texture.mipmask = (faces[0].width << 1) - 1;
	      } else {
	        texture.mipmask = faces[0].mipmask;
	      }

	      check$1.textureCube(texture, texInfo, faces, limits);
	      texture.internalformat = faces[0].internalformat;

	      reglTextureCube.width = faces[0].width;
	      reglTextureCube.height = faces[0].height;

	      tempBind(texture);
	      for (i = 0; i < 6; ++i) {
	        setMipMap(faces[i], GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 + i);
	      }
	      setTexInfo(texInfo, GL_TEXTURE_CUBE_MAP$1);
	      tempRestore();

	      if (config.profile) {
	        texture.stats.size = getTextureSize(
	          texture.internalformat,
	          texture.type,
	          reglTextureCube.width,
	          reglTextureCube.height,
	          texInfo.genMipmaps,
	          true);
	      }

	      reglTextureCube.format = textureFormatsInvert[texture.internalformat];
	      reglTextureCube.type = textureTypesInvert[texture.type];

	      reglTextureCube.mag = magFiltersInvert[texInfo.magFilter];
	      reglTextureCube.min = minFiltersInvert[texInfo.minFilter];

	      reglTextureCube.wrapS = wrapModesInvert[texInfo.wrapS];
	      reglTextureCube.wrapT = wrapModesInvert[texInfo.wrapT];

	      for (i = 0; i < 6; ++i) {
	        freeMipMap(faces[i]);
	      }

	      return reglTextureCube
	    }

	    function subimage (face, image, x_, y_, level_) {
	      check$1(!!image, 'must specify image data');
	      check$1(typeof face === 'number' && face === (face | 0) &&
	        face >= 0 && face < 6, 'invalid face');

	      var x = x_ | 0;
	      var y = y_ | 0;
	      var level = level_ | 0;

	      var imageData = allocImage();
	      copyFlags(imageData, texture);
	      imageData.width = 0;
	      imageData.height = 0;
	      parseImage(imageData, image);
	      imageData.width = imageData.width || ((texture.width >> level) - x);
	      imageData.height = imageData.height || ((texture.height >> level) - y);

	      check$1(
	        texture.type === imageData.type &&
	        texture.format === imageData.format &&
	        texture.internalformat === imageData.internalformat,
	        'incompatible format for texture.subimage');
	      check$1(
	        x >= 0 && y >= 0 &&
	        x + imageData.width <= texture.width &&
	        y + imageData.height <= texture.height,
	        'texture.subimage write out of bounds');
	      check$1(
	        texture.mipmask & (1 << level),
	        'missing mipmap data');
	      check$1(
	        imageData.data || imageData.element || imageData.needsCopy,
	        'missing image data');

	      tempBind(texture);
	      setSubImage(imageData, GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 + face, x, y, level);
	      tempRestore();

	      freeImage(imageData);

	      return reglTextureCube
	    }

	    function resize (radius_) {
	      var radius = radius_ | 0;
	      if (radius === texture.width) {
	        return
	      }

	      reglTextureCube.width = texture.width = radius;
	      reglTextureCube.height = texture.height = radius;

	      tempBind(texture);
	      for (var i = 0; i < 6; ++i) {
	        for (var j = 0; texture.mipmask >> j; ++j) {
	          gl.texImage2D(
	            GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 + i,
	            j,
	            texture.format,
	            radius >> j,
	            radius >> j,
	            0,
	            texture.format,
	            texture.type,
	            null);
	        }
	      }
	      tempRestore();

	      if (config.profile) {
	        texture.stats.size = getTextureSize(
	          texture.internalformat,
	          texture.type,
	          reglTextureCube.width,
	          reglTextureCube.height,
	          false,
	          true);
	      }

	      return reglTextureCube
	    }

	    reglTextureCube(a0, a1, a2, a3, a4, a5);

	    reglTextureCube.subimage = subimage;
	    reglTextureCube.resize = resize;
	    reglTextureCube._reglType = 'textureCube';
	    reglTextureCube._texture = texture;
	    if (config.profile) {
	      reglTextureCube.stats = texture.stats;
	    }
	    reglTextureCube.destroy = function () {
	      texture.decRef();
	    };

	    return reglTextureCube
	  }

	  // Called when regl is destroyed
	  function destroyTextures () {
	    for (var i = 0; i < numTexUnits; ++i) {
	      gl.activeTexture(GL_TEXTURE0$1 + i);
	      gl.bindTexture(GL_TEXTURE_2D$1, null);
	      textureUnits[i] = null;
	    }
	    values(textureSet).forEach(destroy);

	    stats.cubeCount = 0;
	    stats.textureCount = 0;
	  }

	  if (config.profile) {
	    stats.getTotalTextureSize = function () {
	      var total = 0;
	      Object.keys(textureSet).forEach(function (key) {
	        total += textureSet[key].stats.size;
	      });
	      return total
	    };
	  }

	  function restoreTextures () {
	    for (var i = 0; i < numTexUnits; ++i) {
	      var tex = textureUnits[i];
	      if (tex) {
	        tex.bindCount = 0;
	        tex.unit = -1;
	        textureUnits[i] = null;
	      }
	    }

	    values(textureSet).forEach(function (texture) {
	      texture.texture = gl.createTexture();
	      gl.bindTexture(texture.target, texture.texture);
	      for (var i = 0; i < 32; ++i) {
	        if ((texture.mipmask & (1 << i)) === 0) {
	          continue
	        }
	        if (texture.target === GL_TEXTURE_2D$1) {
	          gl.texImage2D(GL_TEXTURE_2D$1,
	            i,
	            texture.internalformat,
	            texture.width >> i,
	            texture.height >> i,
	            0,
	            texture.internalformat,
	            texture.type,
	            null);
	        } else {
	          for (var j = 0; j < 6; ++j) {
	            gl.texImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 + j,
	              i,
	              texture.internalformat,
	              texture.width >> i,
	              texture.height >> i,
	              0,
	              texture.internalformat,
	              texture.type,
	              null);
	          }
	        }
	      }
	      setTexInfo(texture.texInfo, texture.target);
	    });
	  }

	  function refreshTextures () {
	    for (var i = 0; i < numTexUnits; ++i) {
	      var tex = textureUnits[i];
	      if (tex) {
	        tex.bindCount = 0;
	        tex.unit = -1;
	        textureUnits[i] = null;
	      }
	      gl.activeTexture(GL_TEXTURE0$1 + i);
	      gl.bindTexture(GL_TEXTURE_2D$1, null);
	      gl.bindTexture(GL_TEXTURE_CUBE_MAP$1, null);
	    }
	  }

	  return {
	    create2D: createTexture2D,
	    createCube: createTextureCube,
	    clear: destroyTextures,
	    getTexture: function (wrapper) {
	      return null
	    },
	    restore: restoreTextures,
	    refresh: refreshTextures
	  }
	}

	var GL_RENDERBUFFER = 0x8D41;

	var GL_RGBA4$1 = 0x8056;
	var GL_RGB5_A1$1 = 0x8057;
	var GL_RGB565$1 = 0x8D62;
	var GL_DEPTH_COMPONENT16 = 0x81A5;
	var GL_STENCIL_INDEX8 = 0x8D48;
	var GL_DEPTH_STENCIL$1 = 0x84F9;

	var GL_SRGB8_ALPHA8_EXT = 0x8C43;

	var GL_RGBA32F_EXT = 0x8814;

	var GL_RGBA16F_EXT = 0x881A;
	var GL_RGB16F_EXT = 0x881B;

	var FORMAT_SIZES = [];

	FORMAT_SIZES[GL_RGBA4$1] = 2;
	FORMAT_SIZES[GL_RGB5_A1$1] = 2;
	FORMAT_SIZES[GL_RGB565$1] = 2;

	FORMAT_SIZES[GL_DEPTH_COMPONENT16] = 2;
	FORMAT_SIZES[GL_STENCIL_INDEX8] = 1;
	FORMAT_SIZES[GL_DEPTH_STENCIL$1] = 4;

	FORMAT_SIZES[GL_SRGB8_ALPHA8_EXT] = 4;
	FORMAT_SIZES[GL_RGBA32F_EXT] = 16;
	FORMAT_SIZES[GL_RGBA16F_EXT] = 8;
	FORMAT_SIZES[GL_RGB16F_EXT] = 6;

	function getRenderbufferSize (format, width, height) {
	  return FORMAT_SIZES[format] * width * height
	}

	var wrapRenderbuffers = function (gl, extensions, limits, stats, config) {
	  var formatTypes = {
	    'rgba4': GL_RGBA4$1,
	    'rgb565': GL_RGB565$1,
	    'rgb5 a1': GL_RGB5_A1$1,
	    'depth': GL_DEPTH_COMPONENT16,
	    'stencil': GL_STENCIL_INDEX8,
	    'depth stencil': GL_DEPTH_STENCIL$1
	  };

	  if (extensions.ext_srgb) {
	    formatTypes['srgba'] = GL_SRGB8_ALPHA8_EXT;
	  }

	  if (extensions.ext_color_buffer_half_float) {
	    formatTypes['rgba16f'] = GL_RGBA16F_EXT;
	    formatTypes['rgb16f'] = GL_RGB16F_EXT;
	  }

	  if (extensions.webgl_color_buffer_float) {
	    formatTypes['rgba32f'] = GL_RGBA32F_EXT;
	  }

	  var formatTypesInvert = [];
	  Object.keys(formatTypes).forEach(function (key) {
	    var val = formatTypes[key];
	    formatTypesInvert[val] = key;
	  });

	  var renderbufferCount = 0;
	  var renderbufferSet = {};

	  function REGLRenderbuffer (renderbuffer) {
	    this.id = renderbufferCount++;
	    this.refCount = 1;

	    this.renderbuffer = renderbuffer;

	    this.format = GL_RGBA4$1;
	    this.width = 0;
	    this.height = 0;

	    if (config.profile) {
	      this.stats = { size: 0 };
	    }
	  }

	  REGLRenderbuffer.prototype.decRef = function () {
	    if (--this.refCount <= 0) {
	      destroy(this);
	    }
	  };

	  function destroy (rb) {
	    var handle = rb.renderbuffer;
	    check$1(handle, 'must not double destroy renderbuffer');
	    gl.bindRenderbuffer(GL_RENDERBUFFER, null);
	    gl.deleteRenderbuffer(handle);
	    rb.renderbuffer = null;
	    rb.refCount = 0;
	    delete renderbufferSet[rb.id];
	    stats.renderbufferCount--;
	  }

	  function createRenderbuffer (a, b) {
	    var renderbuffer = new REGLRenderbuffer(gl.createRenderbuffer());
	    renderbufferSet[renderbuffer.id] = renderbuffer;
	    stats.renderbufferCount++;

	    function reglRenderbuffer (a, b) {
	      var w = 0;
	      var h = 0;
	      var format = GL_RGBA4$1;

	      if (typeof a === 'object' && a) {
	        var options = a;
	        if ('shape' in options) {
	          var shape = options.shape;
	          check$1(Array.isArray(shape) && shape.length >= 2,
	            'invalid renderbuffer shape');
	          w = shape[0] | 0;
	          h = shape[1] | 0;
	        } else {
	          if ('radius' in options) {
	            w = h = options.radius | 0;
	          }
	          if ('width' in options) {
	            w = options.width | 0;
	          }
	          if ('height' in options) {
	            h = options.height | 0;
	          }
	        }
	        if ('format' in options) {
	          check$1.parameter(options.format, formatTypes,
	            'invalid renderbuffer format');
	          format = formatTypes[options.format];
	        }
	      } else if (typeof a === 'number') {
	        w = a | 0;
	        if (typeof b === 'number') {
	          h = b | 0;
	        } else {
	          h = w;
	        }
	      } else if (!a) {
	        w = h = 1;
	      } else {
	        check$1.raise('invalid arguments to renderbuffer constructor');
	      }

	      // check shape
	      check$1(
	        w > 0 && h > 0 &&
	        w <= limits.maxRenderbufferSize && h <= limits.maxRenderbufferSize,
	        'invalid renderbuffer size');

	      if (w === renderbuffer.width &&
	          h === renderbuffer.height &&
	          format === renderbuffer.format) {
	        return
	      }

	      reglRenderbuffer.width = renderbuffer.width = w;
	      reglRenderbuffer.height = renderbuffer.height = h;
	      renderbuffer.format = format;

	      gl.bindRenderbuffer(GL_RENDERBUFFER, renderbuffer.renderbuffer);
	      gl.renderbufferStorage(GL_RENDERBUFFER, format, w, h);

	      check$1(
	        gl.getError() === 0,
	        'invalid render buffer format');

	      if (config.profile) {
	        renderbuffer.stats.size = getRenderbufferSize(renderbuffer.format, renderbuffer.width, renderbuffer.height);
	      }
	      reglRenderbuffer.format = formatTypesInvert[renderbuffer.format];

	      return reglRenderbuffer
	    }

	    function resize (w_, h_) {
	      var w = w_ | 0;
	      var h = (h_ | 0) || w;

	      if (w === renderbuffer.width && h === renderbuffer.height) {
	        return reglRenderbuffer
	      }

	      // check shape
	      check$1(
	        w > 0 && h > 0 &&
	        w <= limits.maxRenderbufferSize && h <= limits.maxRenderbufferSize,
	        'invalid renderbuffer size');

	      reglRenderbuffer.width = renderbuffer.width = w;
	      reglRenderbuffer.height = renderbuffer.height = h;

	      gl.bindRenderbuffer(GL_RENDERBUFFER, renderbuffer.renderbuffer);
	      gl.renderbufferStorage(GL_RENDERBUFFER, renderbuffer.format, w, h);

	      check$1(
	        gl.getError() === 0,
	        'invalid render buffer format');

	      // also, recompute size.
	      if (config.profile) {
	        renderbuffer.stats.size = getRenderbufferSize(
	          renderbuffer.format, renderbuffer.width, renderbuffer.height);
	      }

	      return reglRenderbuffer
	    }

	    reglRenderbuffer(a, b);

	    reglRenderbuffer.resize = resize;
	    reglRenderbuffer._reglType = 'renderbuffer';
	    reglRenderbuffer._renderbuffer = renderbuffer;
	    if (config.profile) {
	      reglRenderbuffer.stats = renderbuffer.stats;
	    }
	    reglRenderbuffer.destroy = function () {
	      renderbuffer.decRef();
	    };

	    return reglRenderbuffer
	  }

	  if (config.profile) {
	    stats.getTotalRenderbufferSize = function () {
	      var total = 0;
	      Object.keys(renderbufferSet).forEach(function (key) {
	        total += renderbufferSet[key].stats.size;
	      });
	      return total
	    };
	  }

	  function restoreRenderbuffers () {
	    values(renderbufferSet).forEach(function (rb) {
	      rb.renderbuffer = gl.createRenderbuffer();
	      gl.bindRenderbuffer(GL_RENDERBUFFER, rb.renderbuffer);
	      gl.renderbufferStorage(GL_RENDERBUFFER, rb.format, rb.width, rb.height);
	    });
	    gl.bindRenderbuffer(GL_RENDERBUFFER, null);
	  }

	  return {
	    create: createRenderbuffer,
	    clear: function () {
	      values(renderbufferSet).forEach(destroy);
	    },
	    restore: restoreRenderbuffers
	  }
	};

	// We store these constants so that the minifier can inline them
	var GL_FRAMEBUFFER$1 = 0x8D40;
	var GL_RENDERBUFFER$1 = 0x8D41;

	var GL_TEXTURE_2D$2 = 0x0DE1;
	var GL_TEXTURE_CUBE_MAP_POSITIVE_X$2 = 0x8515;

	var GL_COLOR_ATTACHMENT0$1 = 0x8CE0;
	var GL_DEPTH_ATTACHMENT = 0x8D00;
	var GL_STENCIL_ATTACHMENT = 0x8D20;
	var GL_DEPTH_STENCIL_ATTACHMENT = 0x821A;

	var GL_FRAMEBUFFER_COMPLETE$1 = 0x8CD5;
	var GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 0x8CD6;
	var GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 0x8CD7;
	var GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 0x8CD9;
	var GL_FRAMEBUFFER_UNSUPPORTED = 0x8CDD;

	var GL_HALF_FLOAT_OES$2 = 0x8D61;
	var GL_UNSIGNED_BYTE$6 = 0x1401;
	var GL_FLOAT$5 = 0x1406;

	var GL_RGB$1 = 0x1907;
	var GL_RGBA$2 = 0x1908;

	var GL_DEPTH_COMPONENT$1 = 0x1902;

	var colorTextureFormatEnums = [
	  GL_RGB$1,
	  GL_RGBA$2
	];

	// for every texture format, store
	// the number of channels
	var textureFormatChannels = [];
	textureFormatChannels[GL_RGBA$2] = 4;
	textureFormatChannels[GL_RGB$1] = 3;

	// for every texture type, store
	// the size in bytes.
	var textureTypeSizes = [];
	textureTypeSizes[GL_UNSIGNED_BYTE$6] = 1;
	textureTypeSizes[GL_FLOAT$5] = 4;
	textureTypeSizes[GL_HALF_FLOAT_OES$2] = 2;

	var GL_RGBA4$2 = 0x8056;
	var GL_RGB5_A1$2 = 0x8057;
	var GL_RGB565$2 = 0x8D62;
	var GL_DEPTH_COMPONENT16$1 = 0x81A5;
	var GL_STENCIL_INDEX8$1 = 0x8D48;
	var GL_DEPTH_STENCIL$2 = 0x84F9;

	var GL_SRGB8_ALPHA8_EXT$1 = 0x8C43;

	var GL_RGBA32F_EXT$1 = 0x8814;

	var GL_RGBA16F_EXT$1 = 0x881A;
	var GL_RGB16F_EXT$1 = 0x881B;

	var colorRenderbufferFormatEnums = [
	  GL_RGBA4$2,
	  GL_RGB5_A1$2,
	  GL_RGB565$2,
	  GL_SRGB8_ALPHA8_EXT$1,
	  GL_RGBA16F_EXT$1,
	  GL_RGB16F_EXT$1,
	  GL_RGBA32F_EXT$1
	];

	var statusCode = {};
	statusCode[GL_FRAMEBUFFER_COMPLETE$1] = 'complete';
	statusCode[GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT] = 'incomplete attachment';
	statusCode[GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS] = 'incomplete dimensions';
	statusCode[GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT] = 'incomplete, missing attachment';
	statusCode[GL_FRAMEBUFFER_UNSUPPORTED] = 'unsupported';

	function wrapFBOState (
	  gl,
	  extensions,
	  limits,
	  textureState,
	  renderbufferState,
	  stats) {
	  var framebufferState = {
	    cur: null,
	    next: null,
	    dirty: false,
	    setFBO: null
	  };

	  var colorTextureFormats = ['rgba'];
	  var colorRenderbufferFormats = ['rgba4', 'rgb565', 'rgb5 a1'];

	  if (extensions.ext_srgb) {
	    colorRenderbufferFormats.push('srgba');
	  }

	  if (extensions.ext_color_buffer_half_float) {
	    colorRenderbufferFormats.push('rgba16f', 'rgb16f');
	  }

	  if (extensions.webgl_color_buffer_float) {
	    colorRenderbufferFormats.push('rgba32f');
	  }

	  var colorTypes = ['uint8'];
	  if (extensions.oes_texture_half_float) {
	    colorTypes.push('half float', 'float16');
	  }
	  if (extensions.oes_texture_float) {
	    colorTypes.push('float', 'float32');
	  }

	  function FramebufferAttachment (target, texture, renderbuffer) {
	    this.target = target;
	    this.texture = texture;
	    this.renderbuffer = renderbuffer;

	    var w = 0;
	    var h = 0;
	    if (texture) {
	      w = texture.width;
	      h = texture.height;
	    } else if (renderbuffer) {
	      w = renderbuffer.width;
	      h = renderbuffer.height;
	    }
	    this.width = w;
	    this.height = h;
	  }

	  function decRef (attachment) {
	    if (attachment) {
	      if (attachment.texture) {
	        attachment.texture._texture.decRef();
	      }
	      if (attachment.renderbuffer) {
	        attachment.renderbuffer._renderbuffer.decRef();
	      }
	    }
	  }

	  function incRefAndCheckShape (attachment, width, height) {
	    if (!attachment) {
	      return
	    }
	    if (attachment.texture) {
	      var texture = attachment.texture._texture;
	      var tw = Math.max(1, texture.width);
	      var th = Math.max(1, texture.height);
	      check$1(tw === width && th === height,
	        'inconsistent width/height for supplied texture');
	      texture.refCount += 1;
	    } else {
	      var renderbuffer = attachment.renderbuffer._renderbuffer;
	      check$1(
	        renderbuffer.width === width && renderbuffer.height === height,
	        'inconsistent width/height for renderbuffer');
	      renderbuffer.refCount += 1;
	    }
	  }

	  function attach (location, attachment) {
	    if (attachment) {
	      if (attachment.texture) {
	        gl.framebufferTexture2D(
	          GL_FRAMEBUFFER$1,
	          location,
	          attachment.target,
	          attachment.texture._texture.texture,
	          0);
	      } else {
	        gl.framebufferRenderbuffer(
	          GL_FRAMEBUFFER$1,
	          location,
	          GL_RENDERBUFFER$1,
	          attachment.renderbuffer._renderbuffer.renderbuffer);
	      }
	    }
	  }

	  function parseAttachment (attachment) {
	    var target = GL_TEXTURE_2D$2;
	    var texture = null;
	    var renderbuffer = null;

	    var data = attachment;
	    if (typeof attachment === 'object') {
	      data = attachment.data;
	      if ('target' in attachment) {
	        target = attachment.target | 0;
	      }
	    }

	    check$1.type(data, 'function', 'invalid attachment data');

	    var type = data._reglType;
	    if (type === 'texture2d') {
	      texture = data;
	      check$1(target === GL_TEXTURE_2D$2);
	    } else if (type === 'textureCube') {
	      texture = data;
	      check$1(
	        target >= GL_TEXTURE_CUBE_MAP_POSITIVE_X$2 &&
	        target < GL_TEXTURE_CUBE_MAP_POSITIVE_X$2 + 6,
	        'invalid cube map target');
	    } else if (type === 'renderbuffer') {
	      renderbuffer = data;
	      target = GL_RENDERBUFFER$1;
	    } else {
	      check$1.raise('invalid regl object for attachment');
	    }

	    return new FramebufferAttachment(target, texture, renderbuffer)
	  }

	  function allocAttachment (
	    width,
	    height,
	    isTexture,
	    format,
	    type) {
	    if (isTexture) {
	      var texture = textureState.create2D({
	        width: width,
	        height: height,
	        format: format,
	        type: type
	      });
	      texture._texture.refCount = 0;
	      return new FramebufferAttachment(GL_TEXTURE_2D$2, texture, null)
	    } else {
	      var rb = renderbufferState.create({
	        width: width,
	        height: height,
	        format: format
	      });
	      rb._renderbuffer.refCount = 0;
	      return new FramebufferAttachment(GL_RENDERBUFFER$1, null, rb)
	    }
	  }

	  function unwrapAttachment (attachment) {
	    return attachment && (attachment.texture || attachment.renderbuffer)
	  }

	  function resizeAttachment (attachment, w, h) {
	    if (attachment) {
	      if (attachment.texture) {
	        attachment.texture.resize(w, h);
	      } else if (attachment.renderbuffer) {
	        attachment.renderbuffer.resize(w, h);
	      }
	      attachment.width = w;
	      attachment.height = h;
	    }
	  }

	  var framebufferCount = 0;
	  var framebufferSet = {};

	  function REGLFramebuffer () {
	    this.id = framebufferCount++;
	    framebufferSet[this.id] = this;

	    this.framebuffer = gl.createFramebuffer();
	    this.width = 0;
	    this.height = 0;

	    this.colorAttachments = [];
	    this.depthAttachment = null;
	    this.stencilAttachment = null;
	    this.depthStencilAttachment = null;
	  }

	  function decFBORefs (framebuffer) {
	    framebuffer.colorAttachments.forEach(decRef);
	    decRef(framebuffer.depthAttachment);
	    decRef(framebuffer.stencilAttachment);
	    decRef(framebuffer.depthStencilAttachment);
	  }

	  function destroy (framebuffer) {
	    var handle = framebuffer.framebuffer;
	    check$1(handle, 'must not double destroy framebuffer');
	    gl.deleteFramebuffer(handle);
	    framebuffer.framebuffer = null;
	    stats.framebufferCount--;
	    delete framebufferSet[framebuffer.id];
	  }

	  function updateFramebuffer (framebuffer) {
	    var i;

	    gl.bindFramebuffer(GL_FRAMEBUFFER$1, framebuffer.framebuffer);
	    var colorAttachments = framebuffer.colorAttachments;
	    for (i = 0; i < colorAttachments.length; ++i) {
	      attach(GL_COLOR_ATTACHMENT0$1 + i, colorAttachments[i]);
	    }
	    for (i = colorAttachments.length; i < limits.maxColorAttachments; ++i) {
	      gl.framebufferTexture2D(
	        GL_FRAMEBUFFER$1,
	        GL_COLOR_ATTACHMENT0$1 + i,
	        GL_TEXTURE_2D$2,
	        null,
	        0);
	    }

	    gl.framebufferTexture2D(
	      GL_FRAMEBUFFER$1,
	      GL_DEPTH_STENCIL_ATTACHMENT,
	      GL_TEXTURE_2D$2,
	      null,
	      0);
	    gl.framebufferTexture2D(
	      GL_FRAMEBUFFER$1,
	      GL_DEPTH_ATTACHMENT,
	      GL_TEXTURE_2D$2,
	      null,
	      0);
	    gl.framebufferTexture2D(
	      GL_FRAMEBUFFER$1,
	      GL_STENCIL_ATTACHMENT,
	      GL_TEXTURE_2D$2,
	      null,
	      0);

	    attach(GL_DEPTH_ATTACHMENT, framebuffer.depthAttachment);
	    attach(GL_STENCIL_ATTACHMENT, framebuffer.stencilAttachment);
	    attach(GL_DEPTH_STENCIL_ATTACHMENT, framebuffer.depthStencilAttachment);

	    // Check status code
	    var status = gl.checkFramebufferStatus(GL_FRAMEBUFFER$1);
	    if (!gl.isContextLost() && status !== GL_FRAMEBUFFER_COMPLETE$1) {
	      check$1.raise('framebuffer configuration not supported, status = ' +
	        statusCode[status]);
	    }

	    gl.bindFramebuffer(GL_FRAMEBUFFER$1, framebufferState.next ? framebufferState.next.framebuffer : null);
	    framebufferState.cur = framebufferState.next;

	    // FIXME: Clear error code here.  This is a work around for a bug in
	    // headless-gl
	    gl.getError();
	  }

	  function createFBO (a0, a1) {
	    var framebuffer = new REGLFramebuffer();
	    stats.framebufferCount++;

	    function reglFramebuffer (a, b) {
	      var i;

	      check$1(framebufferState.next !== framebuffer,
	        'can not update framebuffer which is currently in use');

	      var width = 0;
	      var height = 0;

	      var needsDepth = true;
	      var needsStencil = true;

	      var colorBuffer = null;
	      var colorTexture = true;
	      var colorFormat = 'rgba';
	      var colorType = 'uint8';
	      var colorCount = 1;

	      var depthBuffer = null;
	      var stencilBuffer = null;
	      var depthStencilBuffer = null;
	      var depthStencilTexture = false;

	      if (typeof a === 'number') {
	        width = a | 0;
	        height = (b | 0) || width;
	      } else if (!a) {
	        width = height = 1;
	      } else {
	        check$1.type(a, 'object', 'invalid arguments for framebuffer');
	        var options = a;

	        if ('shape' in options) {
	          var shape = options.shape;
	          check$1(Array.isArray(shape) && shape.length >= 2,
	            'invalid shape for framebuffer');
	          width = shape[0];
	          height = shape[1];
	        } else {
	          if ('radius' in options) {
	            width = height = options.radius;
	          }
	          if ('width' in options) {
	            width = options.width;
	          }
	          if ('height' in options) {
	            height = options.height;
	          }
	        }

	        if ('color' in options ||
	            'colors' in options) {
	          colorBuffer =
	            options.color ||
	            options.colors;
	          if (Array.isArray(colorBuffer)) {
	            check$1(
	              colorBuffer.length === 1 || extensions.webgl_draw_buffers,
	              'multiple render targets not supported');
	          }
	        }

	        if (!colorBuffer) {
	          if ('colorCount' in options) {
	            colorCount = options.colorCount | 0;
	            check$1(colorCount > 0, 'invalid color buffer count');
	          }

	          if ('colorTexture' in options) {
	            colorTexture = !!options.colorTexture;
	            colorFormat = 'rgba4';
	          }

	          if ('colorType' in options) {
	            colorType = options.colorType;
	            if (!colorTexture) {
	              if (colorType === 'half float' || colorType === 'float16') {
	                check$1(extensions.ext_color_buffer_half_float,
	                  'you must enable EXT_color_buffer_half_float to use 16-bit render buffers');
	                colorFormat = 'rgba16f';
	              } else if (colorType === 'float' || colorType === 'float32') {
	                check$1(extensions.webgl_color_buffer_float,
	                  'you must enable WEBGL_color_buffer_float in order to use 32-bit floating point renderbuffers');
	                colorFormat = 'rgba32f';
	              }
	            } else {
	              check$1(extensions.oes_texture_float ||
	                !(colorType === 'float' || colorType === 'float32'),
	              'you must enable OES_texture_float in order to use floating point framebuffer objects');
	              check$1(extensions.oes_texture_half_float ||
	                !(colorType === 'half float' || colorType === 'float16'),
	              'you must enable OES_texture_half_float in order to use 16-bit floating point framebuffer objects');
	            }
	            check$1.oneOf(colorType, colorTypes, 'invalid color type');
	          }

	          if ('colorFormat' in options) {
	            colorFormat = options.colorFormat;
	            if (colorTextureFormats.indexOf(colorFormat) >= 0) {
	              colorTexture = true;
	            } else if (colorRenderbufferFormats.indexOf(colorFormat) >= 0) {
	              colorTexture = false;
	            } else {
	              if (colorTexture) {
	                check$1.oneOf(
	                  options.colorFormat, colorTextureFormats,
	                  'invalid color format for texture');
	              } else {
	                check$1.oneOf(
	                  options.colorFormat, colorRenderbufferFormats,
	                  'invalid color format for renderbuffer');
	              }
	            }
	          }
	        }

	        if ('depthTexture' in options || 'depthStencilTexture' in options) {
	          depthStencilTexture = !!(options.depthTexture ||
	            options.depthStencilTexture);
	          check$1(!depthStencilTexture || extensions.webgl_depth_texture,
	            'webgl_depth_texture extension not supported');
	        }

	        if ('depth' in options) {
	          if (typeof options.depth === 'boolean') {
	            needsDepth = options.depth;
	          } else {
	            depthBuffer = options.depth;
	            needsStencil = false;
	          }
	        }

	        if ('stencil' in options) {
	          if (typeof options.stencil === 'boolean') {
	            needsStencil = options.stencil;
	          } else {
	            stencilBuffer = options.stencil;
	            needsDepth = false;
	          }
	        }

	        if ('depthStencil' in options) {
	          if (typeof options.depthStencil === 'boolean') {
	            needsDepth = needsStencil = options.depthStencil;
	          } else {
	            depthStencilBuffer = options.depthStencil;
	            needsDepth = false;
	            needsStencil = false;
	          }
	        }
	      }

	      // parse attachments
	      var colorAttachments = null;
	      var depthAttachment = null;
	      var stencilAttachment = null;
	      var depthStencilAttachment = null;

	      // Set up color attachments
	      if (Array.isArray(colorBuffer)) {
	        colorAttachments = colorBuffer.map(parseAttachment);
	      } else if (colorBuffer) {
	        colorAttachments = [parseAttachment(colorBuffer)];
	      } else {
	        colorAttachments = new Array(colorCount);
	        for (i = 0; i < colorCount; ++i) {
	          colorAttachments[i] = allocAttachment(
	            width,
	            height,
	            colorTexture,
	            colorFormat,
	            colorType);
	        }
	      }

	      check$1(extensions.webgl_draw_buffers || colorAttachments.length <= 1,
	        'you must enable the WEBGL_draw_buffers extension in order to use multiple color buffers.');
	      check$1(colorAttachments.length <= limits.maxColorAttachments,
	        'too many color attachments, not supported');

	      width = width || colorAttachments[0].width;
	      height = height || colorAttachments[0].height;

	      if (depthBuffer) {
	        depthAttachment = parseAttachment(depthBuffer);
	      } else if (needsDepth && !needsStencil) {
	        depthAttachment = allocAttachment(
	          width,
	          height,
	          depthStencilTexture,
	          'depth',
	          'uint32');
	      }

	      if (stencilBuffer) {
	        stencilAttachment = parseAttachment(stencilBuffer);
	      } else if (needsStencil && !needsDepth) {
	        stencilAttachment = allocAttachment(
	          width,
	          height,
	          false,
	          'stencil',
	          'uint8');
	      }

	      if (depthStencilBuffer) {
	        depthStencilAttachment = parseAttachment(depthStencilBuffer);
	      } else if (!depthBuffer && !stencilBuffer && needsStencil && needsDepth) {
	        depthStencilAttachment = allocAttachment(
	          width,
	          height,
	          depthStencilTexture,
	          'depth stencil',
	          'depth stencil');
	      }

	      check$1(
	        (!!depthBuffer) + (!!stencilBuffer) + (!!depthStencilBuffer) <= 1,
	        'invalid framebuffer configuration, can specify exactly one depth/stencil attachment');

	      var commonColorAttachmentSize = null;

	      for (i = 0; i < colorAttachments.length; ++i) {
	        incRefAndCheckShape(colorAttachments[i], width, height);
	        check$1(!colorAttachments[i] ||
	          (colorAttachments[i].texture &&
	            colorTextureFormatEnums.indexOf(colorAttachments[i].texture._texture.format) >= 0) ||
	          (colorAttachments[i].renderbuffer &&
	            colorRenderbufferFormatEnums.indexOf(colorAttachments[i].renderbuffer._renderbuffer.format) >= 0),
	        'framebuffer color attachment ' + i + ' is invalid');

	        if (colorAttachments[i] && colorAttachments[i].texture) {
	          var colorAttachmentSize =
	              textureFormatChannels[colorAttachments[i].texture._texture.format] *
	              textureTypeSizes[colorAttachments[i].texture._texture.type];

	          if (commonColorAttachmentSize === null) {
	            commonColorAttachmentSize = colorAttachmentSize;
	          } else {
	            // We need to make sure that all color attachments have the same number of bitplanes
	            // (that is, the same numer of bits per pixel)
	            // This is required by the GLES2.0 standard. See the beginning of Chapter 4 in that document.
	            check$1(commonColorAttachmentSize === colorAttachmentSize,
	              'all color attachments much have the same number of bits per pixel.');
	          }
	        }
	      }
	      incRefAndCheckShape(depthAttachment, width, height);
	      check$1(!depthAttachment ||
	        (depthAttachment.texture &&
	          depthAttachment.texture._texture.format === GL_DEPTH_COMPONENT$1) ||
	        (depthAttachment.renderbuffer &&
	          depthAttachment.renderbuffer._renderbuffer.format === GL_DEPTH_COMPONENT16$1),
	      'invalid depth attachment for framebuffer object');
	      incRefAndCheckShape(stencilAttachment, width, height);
	      check$1(!stencilAttachment ||
	        (stencilAttachment.renderbuffer &&
	          stencilAttachment.renderbuffer._renderbuffer.format === GL_STENCIL_INDEX8$1),
	      'invalid stencil attachment for framebuffer object');
	      incRefAndCheckShape(depthStencilAttachment, width, height);
	      check$1(!depthStencilAttachment ||
	        (depthStencilAttachment.texture &&
	          depthStencilAttachment.texture._texture.format === GL_DEPTH_STENCIL$2) ||
	        (depthStencilAttachment.renderbuffer &&
	          depthStencilAttachment.renderbuffer._renderbuffer.format === GL_DEPTH_STENCIL$2),
	      'invalid depth-stencil attachment for framebuffer object');

	      // decrement references
	      decFBORefs(framebuffer);

	      framebuffer.width = width;
	      framebuffer.height = height;

	      framebuffer.colorAttachments = colorAttachments;
	      framebuffer.depthAttachment = depthAttachment;
	      framebuffer.stencilAttachment = stencilAttachment;
	      framebuffer.depthStencilAttachment = depthStencilAttachment;

	      reglFramebuffer.color = colorAttachments.map(unwrapAttachment);
	      reglFramebuffer.depth = unwrapAttachment(depthAttachment);
	      reglFramebuffer.stencil = unwrapAttachment(stencilAttachment);
	      reglFramebuffer.depthStencil = unwrapAttachment(depthStencilAttachment);

	      reglFramebuffer.width = framebuffer.width;
	      reglFramebuffer.height = framebuffer.height;

	      updateFramebuffer(framebuffer);

	      return reglFramebuffer
	    }

	    function resize (w_, h_) {
	      check$1(framebufferState.next !== framebuffer,
	        'can not resize a framebuffer which is currently in use');

	      var w = Math.max(w_ | 0, 1);
	      var h = Math.max((h_ | 0) || w, 1);
	      if (w === framebuffer.width && h === framebuffer.height) {
	        return reglFramebuffer
	      }

	      // resize all buffers
	      var colorAttachments = framebuffer.colorAttachments;
	      for (var i = 0; i < colorAttachments.length; ++i) {
	        resizeAttachment(colorAttachments[i], w, h);
	      }
	      resizeAttachment(framebuffer.depthAttachment, w, h);
	      resizeAttachment(framebuffer.stencilAttachment, w, h);
	      resizeAttachment(framebuffer.depthStencilAttachment, w, h);

	      framebuffer.width = reglFramebuffer.width = w;
	      framebuffer.height = reglFramebuffer.height = h;

	      updateFramebuffer(framebuffer);

	      return reglFramebuffer
	    }

	    reglFramebuffer(a0, a1);

	    return extend(reglFramebuffer, {
	      resize: resize,
	      _reglType: 'framebuffer',
	      _framebuffer: framebuffer,
	      destroy: function () {
	        destroy(framebuffer);
	        decFBORefs(framebuffer);
	      },
	      use: function (block) {
	        framebufferState.setFBO({
	          framebuffer: reglFramebuffer
	        }, block);
	      }
	    })
	  }

	  function createCubeFBO (options) {
	    var faces = Array(6);

	    function reglFramebufferCube (a) {
	      var i;

	      check$1(faces.indexOf(framebufferState.next) < 0,
	        'can not update framebuffer which is currently in use');

	      var params = {
	        color: null
	      };

	      var radius = 0;

	      var colorBuffer = null;
	      var colorFormat = 'rgba';
	      var colorType = 'uint8';
	      var colorCount = 1;

	      if (typeof a === 'number') {
	        radius = a | 0;
	      } else if (!a) {
	        radius = 1;
	      } else {
	        check$1.type(a, 'object', 'invalid arguments for framebuffer');
	        var options = a;

	        if ('shape' in options) {
	          var shape = options.shape;
	          check$1(
	            Array.isArray(shape) && shape.length >= 2,
	            'invalid shape for framebuffer');
	          check$1(
	            shape[0] === shape[1],
	            'cube framebuffer must be square');
	          radius = shape[0];
	        } else {
	          if ('radius' in options) {
	            radius = options.radius | 0;
	          }
	          if ('width' in options) {
	            radius = options.width | 0;
	            if ('height' in options) {
	              check$1(options.height === radius, 'must be square');
	            }
	          } else if ('height' in options) {
	            radius = options.height | 0;
	          }
	        }

	        if ('color' in options ||
	            'colors' in options) {
	          colorBuffer =
	            options.color ||
	            options.colors;
	          if (Array.isArray(colorBuffer)) {
	            check$1(
	              colorBuffer.length === 1 || extensions.webgl_draw_buffers,
	              'multiple render targets not supported');
	          }
	        }

	        if (!colorBuffer) {
	          if ('colorCount' in options) {
	            colorCount = options.colorCount | 0;
	            check$1(colorCount > 0, 'invalid color buffer count');
	          }

	          if ('colorType' in options) {
	            check$1.oneOf(
	              options.colorType, colorTypes,
	              'invalid color type');
	            colorType = options.colorType;
	          }

	          if ('colorFormat' in options) {
	            colorFormat = options.colorFormat;
	            check$1.oneOf(
	              options.colorFormat, colorTextureFormats,
	              'invalid color format for texture');
	          }
	        }

	        if ('depth' in options) {
	          params.depth = options.depth;
	        }

	        if ('stencil' in options) {
	          params.stencil = options.stencil;
	        }

	        if ('depthStencil' in options) {
	          params.depthStencil = options.depthStencil;
	        }
	      }

	      var colorCubes;
	      if (colorBuffer) {
	        if (Array.isArray(colorBuffer)) {
	          colorCubes = [];
	          for (i = 0; i < colorBuffer.length; ++i) {
	            colorCubes[i] = colorBuffer[i];
	          }
	        } else {
	          colorCubes = [ colorBuffer ];
	        }
	      } else {
	        colorCubes = Array(colorCount);
	        var cubeMapParams = {
	          radius: radius,
	          format: colorFormat,
	          type: colorType
	        };
	        for (i = 0; i < colorCount; ++i) {
	          colorCubes[i] = textureState.createCube(cubeMapParams);
	        }
	      }

	      // Check color cubes
	      params.color = Array(colorCubes.length);
	      for (i = 0; i < colorCubes.length; ++i) {
	        var cube = colorCubes[i];
	        check$1(
	          typeof cube === 'function' && cube._reglType === 'textureCube',
	          'invalid cube map');
	        radius = radius || cube.width;
	        check$1(
	          cube.width === radius && cube.height === radius,
	          'invalid cube map shape');
	        params.color[i] = {
	          target: GL_TEXTURE_CUBE_MAP_POSITIVE_X$2,
	          data: colorCubes[i]
	        };
	      }

	      for (i = 0; i < 6; ++i) {
	        for (var j = 0; j < colorCubes.length; ++j) {
	          params.color[j].target = GL_TEXTURE_CUBE_MAP_POSITIVE_X$2 + i;
	        }
	        // reuse depth-stencil attachments across all cube maps
	        if (i > 0) {
	          params.depth = faces[0].depth;
	          params.stencil = faces[0].stencil;
	          params.depthStencil = faces[0].depthStencil;
	        }
	        if (faces[i]) {
	          (faces[i])(params);
	        } else {
	          faces[i] = createFBO(params);
	        }
	      }

	      return extend(reglFramebufferCube, {
	        width: radius,
	        height: radius,
	        color: colorCubes
	      })
	    }

	    function resize (radius_) {
	      var i;
	      var radius = radius_ | 0;
	      check$1(radius > 0 && radius <= limits.maxCubeMapSize,
	        'invalid radius for cube fbo');

	      if (radius === reglFramebufferCube.width) {
	        return reglFramebufferCube
	      }

	      var colors = reglFramebufferCube.color;
	      for (i = 0; i < colors.length; ++i) {
	        colors[i].resize(radius);
	      }

	      for (i = 0; i < 6; ++i) {
	        faces[i].resize(radius);
	      }

	      reglFramebufferCube.width = reglFramebufferCube.height = radius;

	      return reglFramebufferCube
	    }

	    reglFramebufferCube(options);

	    return extend(reglFramebufferCube, {
	      faces: faces,
	      resize: resize,
	      _reglType: 'framebufferCube',
	      destroy: function () {
	        faces.forEach(function (f) {
	          f.destroy();
	        });
	      }
	    })
	  }

	  function restoreFramebuffers () {
	    framebufferState.cur = null;
	    framebufferState.next = null;
	    framebufferState.dirty = true;
	    values(framebufferSet).forEach(function (fb) {
	      fb.framebuffer = gl.createFramebuffer();
	      updateFramebuffer(fb);
	    });
	  }

	  return extend(framebufferState, {
	    getFramebuffer: function (object) {
	      if (typeof object === 'function' && object._reglType === 'framebuffer') {
	        var fbo = object._framebuffer;
	        if (fbo instanceof REGLFramebuffer) {
	          return fbo
	        }
	      }
	      return null
	    },
	    create: createFBO,
	    createCube: createCubeFBO,
	    clear: function () {
	      values(framebufferSet).forEach(destroy);
	    },
	    restore: restoreFramebuffers
	  })
	}

	var GL_FLOAT$6 = 5126;
	var GL_ARRAY_BUFFER$1 = 34962;

	function AttributeRecord () {
	  this.state = 0;

	  this.x = 0.0;
	  this.y = 0.0;
	  this.z = 0.0;
	  this.w = 0.0;

	  this.buffer = null;
	  this.size = 0;
	  this.normalized = false;
	  this.type = GL_FLOAT$6;
	  this.offset = 0;
	  this.stride = 0;
	  this.divisor = 0;
	}

	function wrapAttributeState (
	  gl,
	  extensions,
	  limits,
	  stats,
	  bufferState) {
	  var NUM_ATTRIBUTES = limits.maxAttributes;
	  var attributeBindings = new Array(NUM_ATTRIBUTES);
	  for (var i = 0; i < NUM_ATTRIBUTES; ++i) {
	    attributeBindings[i] = new AttributeRecord();
	  }
	  var vaoCount = 0;
	  var vaoSet = {};

	  var state = {
	    Record: AttributeRecord,
	    scope: {},
	    state: attributeBindings,
	    currentVAO: null,
	    targetVAO: null,
	    restore: extVAO() ? restoreVAO : function () {},
	    createVAO: createVAO,
	    getVAO: getVAO,
	    destroyBuffer: destroyBuffer,
	    setVAO: extVAO() ? setVAOEXT : setVAOEmulated,
	    clear: extVAO() ? destroyVAOEXT : function () {}
	  };

	  function destroyBuffer (buffer) {
	    for (var i = 0; i < attributeBindings.length; ++i) {
	      var record = attributeBindings[i];
	      if (record.buffer === buffer) {
	        gl.disableVertexAttribArray(i);
	        record.buffer = null;
	      }
	    }
	  }

	  function extVAO () {
	    return extensions.oes_vertex_array_object
	  }

	  function extInstanced () {
	    return extensions.angle_instanced_arrays
	  }

	  function getVAO (vao) {
	    if (typeof vao === 'function' && vao._vao) {
	      return vao._vao
	    }
	    return null
	  }

	  function setVAOEXT (vao) {
	    if (vao === state.currentVAO) {
	      return
	    }
	    var ext = extVAO();
	    if (vao) {
	      ext.bindVertexArrayOES(vao.vao);
	    } else {
	      ext.bindVertexArrayOES(null);
	    }
	    state.currentVAO = vao;
	  }

	  function setVAOEmulated (vao) {
	    if (vao === state.currentVAO) {
	      return
	    }
	    if (vao) {
	      vao.bindAttrs();
	    } else {
	      var exti = extInstanced();
	      for (var i = 0; i < attributeBindings.length; ++i) {
	        var binding = attributeBindings[i];
	        if (binding.buffer) {
	          gl.enableVertexAttribArray(i);
	          gl.vertexAttribPointer(i, binding.size, binding.type, binding.normalized, binding.stride, binding.offfset);
	          if (exti && binding.divisor) {
	            exti.vertexAttribDivisorANGLE(i, binding.divisor);
	          }
	        } else {
	          gl.disableVertexAttribArray(i);
	          gl.vertexAttrib4f(i, binding.x, binding.y, binding.z, binding.w);
	        }
	      }
	    }
	    state.currentVAO = vao;
	  }

	  function destroyVAOEXT () {
	    values(vaoSet).forEach(function (vao) {
	      vao.destroy();
	    });
	  }

	  function REGLVAO () {
	    this.id = ++vaoCount;
	    this.attributes = [];
	    var extension = extVAO();
	    if (extension) {
	      this.vao = extension.createVertexArrayOES();
	    } else {
	      this.vao = null;
	    }
	    vaoSet[this.id] = this;
	    this.buffers = [];
	  }

	  REGLVAO.prototype.bindAttrs = function () {
	    var exti = extInstanced();
	    var attributes = this.attributes;
	    for (var i = 0; i < attributes.length; ++i) {
	      var attr = attributes[i];
	      if (attr.buffer) {
	        gl.enableVertexAttribArray(i);
	        gl.bindBuffer(GL_ARRAY_BUFFER$1, attr.buffer.buffer);
	        gl.vertexAttribPointer(i, attr.size, attr.type, attr.normalized, attr.stride, attr.offset);
	        if (exti && attr.divisor) {
	          exti.vertexAttribDivisorANGLE(i, attr.divisor);
	        }
	      } else {
	        gl.disableVertexAttribArray(i);
	        gl.vertexAttrib4f(i, attr.x, attr.y, attr.z, attr.w);
	      }
	    }
	    for (var j = attributes.length; j < NUM_ATTRIBUTES; ++j) {
	      gl.disableVertexAttribArray(j);
	    }
	  };

	  REGLVAO.prototype.refresh = function () {
	    var ext = extVAO();
	    if (ext) {
	      ext.bindVertexArrayOES(this.vao);
	      this.bindAttrs();
	      state.currentVAO = this;
	    }
	  };

	  REGLVAO.prototype.destroy = function () {
	    if (this.vao) {
	      var extension = extVAO();
	      if (this === state.currentVAO) {
	        state.currentVAO = null;
	        extension.bindVertexArrayOES(null);
	      }
	      extension.deleteVertexArrayOES(this.vao);
	      this.vao = null;
	    }
	    if (vaoSet[this.id]) {
	      delete vaoSet[this.id];
	      stats.vaoCount -= 1;
	    }
	  };

	  function restoreVAO () {
	    var ext = extVAO();
	    if (ext) {
	      values(vaoSet).forEach(function (vao) {
	        vao.refresh();
	      });
	    }
	  }

	  function createVAO (_attr) {
	    var vao = new REGLVAO();
	    stats.vaoCount += 1;

	    function updateVAO (attributes) {
	      check$1(Array.isArray(attributes), 'arguments to vertex array constructor must be an array');
	      check$1(attributes.length < NUM_ATTRIBUTES, 'too many attributes');
	      check$1(attributes.length > 0, 'must specify at least one attribute');

	      var bufUpdated = {};
	      var nattributes = vao.attributes;
	      nattributes.length = attributes.length;
	      for (var i = 0; i < attributes.length; ++i) {
	        var spec = attributes[i];
	        var rec = nattributes[i] = new AttributeRecord();
	        var data = spec.data || spec;
	        if (Array.isArray(data) || isTypedArray(data) || isNDArrayLike(data)) {
	          var buf;
	          if (vao.buffers[i]) {
	            buf = vao.buffers[i];
	            if (isTypedArray(data) && buf._buffer.byteLength >= data.byteLength) {
	              buf.subdata(data);
	            } else {
	              buf.destroy();
	              vao.buffers[i] = null;
	            }
	          }
	          if (!vao.buffers[i]) {
	            buf = vao.buffers[i] = bufferState.create(spec, GL_ARRAY_BUFFER$1, false, true);
	          }
	          rec.buffer = bufferState.getBuffer(buf);
	          rec.size = rec.buffer.dimension | 0;
	          rec.normalized = false;
	          rec.type = rec.buffer.dtype;
	          rec.offset = 0;
	          rec.stride = 0;
	          rec.divisor = 0;
	          rec.state = 1;
	          bufUpdated[i] = 1;
	        } else if (bufferState.getBuffer(spec)) {
	          rec.buffer = bufferState.getBuffer(spec);
	          rec.size = rec.buffer.dimension | 0;
	          rec.normalized = false;
	          rec.type = rec.buffer.dtype;
	          rec.offset = 0;
	          rec.stride = 0;
	          rec.divisor = 0;
	          rec.state = 1;
	        } else if (bufferState.getBuffer(spec.buffer)) {
	          rec.buffer = bufferState.getBuffer(spec.buffer);
	          rec.size = ((+spec.size) || rec.buffer.dimension) | 0;
	          rec.normalized = !!spec.normalized || false;
	          if ('type' in spec) {
	            check$1.parameter(spec.type, glTypes, 'invalid buffer type');
	            rec.type = glTypes[spec.type];
	          } else {
	            rec.type = rec.buffer.dtype;
	          }
	          rec.offset = (spec.offset || 0) | 0;
	          rec.stride = (spec.stride || 0) | 0;
	          rec.divisor = (spec.divisor || 0) | 0;
	          rec.state = 1;

	          check$1(rec.size >= 1 && rec.size <= 4, 'size must be between 1 and 4');
	          check$1(rec.offset >= 0, 'invalid offset');
	          check$1(rec.stride >= 0 && rec.stride <= 255, 'stride must be between 0 and 255');
	          check$1(rec.divisor >= 0, 'divisor must be positive');
	          check$1(!rec.divisor || !!extensions.angle_instanced_arrays, 'ANGLE_instanced_arrays must be enabled to use divisor');
	        } else if ('x' in spec) {
	          check$1(i > 0, 'first attribute must not be a constant');
	          rec.x = +spec.x || 0;
	          rec.y = +spec.y || 0;
	          rec.z = +spec.z || 0;
	          rec.w = +spec.w || 0;
	          rec.state = 2;
	        } else {
	          check$1(false, 'invalid attribute spec for location ' + i);
	        }
	      }

	      // retire unused buffers
	      for (var j = 0; j < vao.buffers.length; ++j) {
	        if (!bufUpdated[j] && vao.buffers[j]) {
	          vao.buffers[j].destroy();
	          vao.buffers[j] = null;
	        }
	      }

	      vao.refresh();
	      return updateVAO
	    }

	    updateVAO.destroy = function () {
	      for (var j = 0; j < vao.buffers.length; ++j) {
	        if (vao.buffers[j]) {
	          vao.buffers[j].destroy();
	        }
	      }
	      vao.buffers.length = 0;
	      vao.destroy();
	    };

	    updateVAO._vao = vao;
	    updateVAO._reglType = 'vao';

	    return updateVAO(_attr)
	  }

	  return state
	}

	var GL_FRAGMENT_SHADER = 35632;
	var GL_VERTEX_SHADER = 35633;

	var GL_ACTIVE_UNIFORMS = 0x8B86;
	var GL_ACTIVE_ATTRIBUTES = 0x8B89;

	function wrapShaderState (gl, stringStore, stats, config) {
	  // ===================================================
	  // glsl compilation and linking
	  // ===================================================
	  var fragShaders = {};
	  var vertShaders = {};

	  function ActiveInfo (name, id, location, info) {
	    this.name = name;
	    this.id = id;
	    this.location = location;
	    this.info = info;
	  }

	  function insertActiveInfo (list, info) {
	    for (var i = 0; i < list.length; ++i) {
	      if (list[i].id === info.id) {
	        list[i].location = info.location;
	        return
	      }
	    }
	    list.push(info);
	  }

	  function getShader (type, id, command) {
	    var cache = type === GL_FRAGMENT_SHADER ? fragShaders : vertShaders;
	    var shader = cache[id];

	    if (!shader) {
	      var source = stringStore.str(id);
	      shader = gl.createShader(type);
	      gl.shaderSource(shader, source);
	      gl.compileShader(shader);
	      check$1.shaderError(gl, shader, source, type, command);
	      cache[id] = shader;
	    }

	    return shader
	  }

	  // ===================================================
	  // program linking
	  // ===================================================
	  var programCache = {};
	  var programList = [];

	  var PROGRAM_COUNTER = 0;

	  function REGLProgram (fragId, vertId) {
	    this.id = PROGRAM_COUNTER++;
	    this.fragId = fragId;
	    this.vertId = vertId;
	    this.program = null;
	    this.uniforms = [];
	    this.attributes = [];
	    this.refCount = 1;

	    if (config.profile) {
	      this.stats = {
	        uniformsCount: 0,
	        attributesCount: 0
	      };
	    }
	  }

	  function linkProgram (desc, command, attributeLocations) {
	    var i, info;

	    // -------------------------------
	    // compile & link
	    // -------------------------------
	    var fragShader = getShader(GL_FRAGMENT_SHADER, desc.fragId);
	    var vertShader = getShader(GL_VERTEX_SHADER, desc.vertId);

	    var program = desc.program = gl.createProgram();
	    gl.attachShader(program, fragShader);
	    gl.attachShader(program, vertShader);
	    if (attributeLocations) {
	      for (i = 0; i < attributeLocations.length; ++i) {
	        var binding = attributeLocations[i];
	        gl.bindAttribLocation(program, binding[0], binding[1]);
	      }
	    }

	    gl.linkProgram(program);
	    check$1.linkError(
	      gl,
	      program,
	      stringStore.str(desc.fragId),
	      stringStore.str(desc.vertId),
	      command);

	    // -------------------------------
	    // grab uniforms
	    // -------------------------------
	    var numUniforms = gl.getProgramParameter(program, GL_ACTIVE_UNIFORMS);
	    if (config.profile) {
	      desc.stats.uniformsCount = numUniforms;
	    }
	    var uniforms = desc.uniforms;
	    for (i = 0; i < numUniforms; ++i) {
	      info = gl.getActiveUniform(program, i);
	      if (info) {
	        if (info.size > 1) {
	          for (var j = 0; j < info.size; ++j) {
	            var name = info.name.replace('[0]', '[' + j + ']');
	            insertActiveInfo(uniforms, new ActiveInfo(
	              name,
	              stringStore.id(name),
	              gl.getUniformLocation(program, name),
	              info));
	          }
	        } else {
	          insertActiveInfo(uniforms, new ActiveInfo(
	            info.name,
	            stringStore.id(info.name),
	            gl.getUniformLocation(program, info.name),
	            info));
	        }
	      }
	    }

	    // -------------------------------
	    // grab attributes
	    // -------------------------------
	    var numAttributes = gl.getProgramParameter(program, GL_ACTIVE_ATTRIBUTES);
	    if (config.profile) {
	      desc.stats.attributesCount = numAttributes;
	    }

	    var attributes = desc.attributes;
	    for (i = 0; i < numAttributes; ++i) {
	      info = gl.getActiveAttrib(program, i);
	      if (info) {
	        insertActiveInfo(attributes, new ActiveInfo(
	          info.name,
	          stringStore.id(info.name),
	          gl.getAttribLocation(program, info.name),
	          info));
	      }
	    }
	  }

	  if (config.profile) {
	    stats.getMaxUniformsCount = function () {
	      var m = 0;
	      programList.forEach(function (desc) {
	        if (desc.stats.uniformsCount > m) {
	          m = desc.stats.uniformsCount;
	        }
	      });
	      return m
	    };

	    stats.getMaxAttributesCount = function () {
	      var m = 0;
	      programList.forEach(function (desc) {
	        if (desc.stats.attributesCount > m) {
	          m = desc.stats.attributesCount;
	        }
	      });
	      return m
	    };
	  }

	  function restoreShaders () {
	    fragShaders = {};
	    vertShaders = {};
	    for (var i = 0; i < programList.length; ++i) {
	      linkProgram(programList[i], null, programList[i].attributes.map(function (info) {
	        return [info.location, info.name]
	      }));
	    }
	  }

	  return {
	    clear: function () {
	      var deleteShader = gl.deleteShader.bind(gl);
	      values(fragShaders).forEach(deleteShader);
	      fragShaders = {};
	      values(vertShaders).forEach(deleteShader);
	      vertShaders = {};

	      programList.forEach(function (desc) {
	        gl.deleteProgram(desc.program);
	      });
	      programList.length = 0;
	      programCache = {};

	      stats.shaderCount = 0;
	    },

	    program: function (vertId, fragId, command, attribLocations) {
	      check$1.command(vertId >= 0, 'missing vertex shader', command);
	      check$1.command(fragId >= 0, 'missing fragment shader', command);

	      var cache = programCache[fragId];
	      if (!cache) {
	        cache = programCache[fragId] = {};
	      }
	      var prevProgram = cache[vertId];
	      if (prevProgram) {
	        prevProgram.refCount++;
	        if (!attribLocations) {
	          return prevProgram
	        }
	      }
	      var program = new REGLProgram(fragId, vertId);
	      stats.shaderCount++;
	      linkProgram(program, command, attribLocations);
	      if (!prevProgram) {
	        cache[vertId] = program;
	      }
	      programList.push(program);
	      return extend(program, {
	        destroy: function () {
	          program.refCount--;
	          if (program.refCount <= 0) {
	            gl.deleteProgram(program.program);
	            var idx = programList.indexOf(program);
	            programList.splice(idx, 1);
	            stats.shaderCount--;
	          }
	          // no program is linked to this vert anymore
	          if (cache[program.vertId].refCount <= 0) {
	            gl.deleteShader(vertShaders[program.vertId]);
	            delete vertShaders[program.vertId];
	            delete programCache[program.fragId][program.vertId];
	          }
	          // no program is linked to this frag anymore
	          if (!Object.keys(programCache[program.fragId]).length) {
	            gl.deleteShader(fragShaders[program.fragId]);
	            delete fragShaders[program.fragId];
	            delete programCache[program.fragId];
	          }
	        }
	      })
	    },

	    restore: restoreShaders,

	    shader: getShader,

	    frag: -1,
	    vert: -1
	  }
	}

	var GL_RGBA$3 = 6408;
	var GL_UNSIGNED_BYTE$7 = 5121;
	var GL_PACK_ALIGNMENT = 0x0D05;
	var GL_FLOAT$7 = 0x1406; // 5126

	function wrapReadPixels (
	  gl,
	  framebufferState,
	  reglPoll,
	  context,
	  glAttributes,
	  extensions,
	  limits) {
	  function readPixelsImpl (input) {
	    var type;
	    if (framebufferState.next === null) {
	      check$1(
	        glAttributes.preserveDrawingBuffer,
	        'you must create a webgl context with "preserveDrawingBuffer":true in order to read pixels from the drawing buffer');
	      type = GL_UNSIGNED_BYTE$7;
	    } else {
	      check$1(
	        framebufferState.next.colorAttachments[0].texture !== null,
	        'You cannot read from a renderbuffer');
	      type = framebufferState.next.colorAttachments[0].texture._texture.type;

	      if (extensions.oes_texture_float) {
	        check$1(
	          type === GL_UNSIGNED_BYTE$7 || type === GL_FLOAT$7,
	          'Reading from a framebuffer is only allowed for the types \'uint8\' and \'float\'');

	        if (type === GL_FLOAT$7) {
	          check$1(limits.readFloat, 'Reading \'float\' values is not permitted in your browser. For a fallback, please see: https://www.npmjs.com/package/glsl-read-float');
	        }
	      } else {
	        check$1(
	          type === GL_UNSIGNED_BYTE$7,
	          'Reading from a framebuffer is only allowed for the type \'uint8\'');
	      }
	    }

	    var x = 0;
	    var y = 0;
	    var width = context.framebufferWidth;
	    var height = context.framebufferHeight;
	    var data = null;

	    if (isTypedArray(input)) {
	      data = input;
	    } else if (input) {
	      check$1.type(input, 'object', 'invalid arguments to regl.read()');
	      x = input.x | 0;
	      y = input.y | 0;
	      check$1(
	        x >= 0 && x < context.framebufferWidth,
	        'invalid x offset for regl.read');
	      check$1(
	        y >= 0 && y < context.framebufferHeight,
	        'invalid y offset for regl.read');
	      width = (input.width || (context.framebufferWidth - x)) | 0;
	      height = (input.height || (context.framebufferHeight - y)) | 0;
	      data = input.data || null;
	    }

	    // sanity check input.data
	    if (data) {
	      if (type === GL_UNSIGNED_BYTE$7) {
	        check$1(
	          data instanceof Uint8Array,
	          'buffer must be \'Uint8Array\' when reading from a framebuffer of type \'uint8\'');
	      } else if (type === GL_FLOAT$7) {
	        check$1(
	          data instanceof Float32Array,
	          'buffer must be \'Float32Array\' when reading from a framebuffer of type \'float\'');
	      }
	    }

	    check$1(
	      width > 0 && width + x <= context.framebufferWidth,
	      'invalid width for read pixels');
	    check$1(
	      height > 0 && height + y <= context.framebufferHeight,
	      'invalid height for read pixels');

	    // Update WebGL state
	    reglPoll();

	    // Compute size
	    var size = width * height * 4;

	    // Allocate data
	    if (!data) {
	      if (type === GL_UNSIGNED_BYTE$7) {
	        data = new Uint8Array(size);
	      } else if (type === GL_FLOAT$7) {
	        data = data || new Float32Array(size);
	      }
	    }

	    // Type check
	    check$1.isTypedArray(data, 'data buffer for regl.read() must be a typedarray');
	    check$1(data.byteLength >= size, 'data buffer for regl.read() too small');

	    // Run read pixels
	    gl.pixelStorei(GL_PACK_ALIGNMENT, 4);
	    gl.readPixels(x, y, width, height, GL_RGBA$3,
	      type,
	      data);

	    return data
	  }

	  function readPixelsFBO (options) {
	    var result;
	    framebufferState.setFBO({
	      framebuffer: options.framebuffer
	    }, function () {
	      result = readPixelsImpl(options);
	    });
	    return result
	  }

	  function readPixels (options) {
	    if (!options || !('framebuffer' in options)) {
	      return readPixelsImpl(options)
	    } else {
	      return readPixelsFBO(options)
	    }
	  }

	  return readPixels
	}

	function slice (x) {
	  return Array.prototype.slice.call(x)
	}

	function join (x) {
	  return slice(x).join('')
	}

	function createEnvironment () {
	  // Unique variable id counter
	  var varCounter = 0;

	  // Linked values are passed from this scope into the generated code block
	  // Calling link() passes a value into the generated scope and returns
	  // the variable name which it is bound to
	  var linkedNames = [];
	  var linkedValues = [];
	  function link (value) {
	    for (var i = 0; i < linkedValues.length; ++i) {
	      if (linkedValues[i] === value) {
	        return linkedNames[i]
	      }
	    }

	    var name = 'g' + (varCounter++);
	    linkedNames.push(name);
	    linkedValues.push(value);
	    return name
	  }

	  // create a code block
	  function block () {
	    var code = [];
	    function push () {
	      code.push.apply(code, slice(arguments));
	    }

	    var vars = [];
	    function def () {
	      var name = 'v' + (varCounter++);
	      vars.push(name);

	      if (arguments.length > 0) {
	        code.push(name, '=');
	        code.push.apply(code, slice(arguments));
	        code.push(';');
	      }

	      return name
	    }

	    return extend(push, {
	      def: def,
	      toString: function () {
	        return join([
	          (vars.length > 0 ? 'var ' + vars.join(',') + ';' : ''),
	          join(code)
	        ])
	      }
	    })
	  }

	  function scope () {
	    var entry = block();
	    var exit = block();

	    var entryToString = entry.toString;
	    var exitToString = exit.toString;

	    function save (object, prop) {
	      exit(object, prop, '=', entry.def(object, prop), ';');
	    }

	    return extend(function () {
	      entry.apply(entry, slice(arguments));
	    }, {
	      def: entry.def,
	      entry: entry,
	      exit: exit,
	      save: save,
	      set: function (object, prop, value) {
	        save(object, prop);
	        entry(object, prop, '=', value, ';');
	      },
	      toString: function () {
	        return entryToString() + exitToString()
	      }
	    })
	  }

	  function conditional () {
	    var pred = join(arguments);
	    var thenBlock = scope();
	    var elseBlock = scope();

	    var thenToString = thenBlock.toString;
	    var elseToString = elseBlock.toString;

	    return extend(thenBlock, {
	      then: function () {
	        thenBlock.apply(thenBlock, slice(arguments));
	        return this
	      },
	      else: function () {
	        elseBlock.apply(elseBlock, slice(arguments));
	        return this
	      },
	      toString: function () {
	        var elseClause = elseToString();
	        if (elseClause) {
	          elseClause = 'else{' + elseClause + '}';
	        }
	        return join([
	          'if(', pred, '){',
	          thenToString(),
	          '}', elseClause
	        ])
	      }
	    })
	  }

	  // procedure list
	  var globalBlock = block();
	  var procedures = {};
	  function proc (name, count) {
	    var args = [];
	    function arg () {
	      var name = 'a' + args.length;
	      args.push(name);
	      return name
	    }

	    count = count || 0;
	    for (var i = 0; i < count; ++i) {
	      arg();
	    }

	    var body = scope();
	    var bodyToString = body.toString;

	    var result = procedures[name] = extend(body, {
	      arg: arg,
	      toString: function () {
	        return join([
	          'function(', args.join(), '){',
	          bodyToString(),
	          '}'
	        ])
	      }
	    });

	    return result
	  }

	  function compile () {
	    var code = ['"use strict";',
	      globalBlock,
	      'return {'];
	    Object.keys(procedures).forEach(function (name) {
	      code.push('"', name, '":', procedures[name].toString(), ',');
	    });
	    code.push('}');
	    var src = join(code)
	      .replace(/;/g, ';\n')
	      .replace(/}/g, '}\n')
	      .replace(/{/g, '{\n');
	    var proc = Function.apply(null, linkedNames.concat(src));
	    return proc.apply(null, linkedValues)
	  }

	  return {
	    global: globalBlock,
	    link: link,
	    block: block,
	    proc: proc,
	    scope: scope,
	    cond: conditional,
	    compile: compile
	  }
	}

	// "cute" names for vector components
	var CUTE_COMPONENTS = 'xyzw'.split('');

	var GL_UNSIGNED_BYTE$8 = 5121;

	var ATTRIB_STATE_POINTER = 1;
	var ATTRIB_STATE_CONSTANT = 2;

	var DYN_FUNC$1 = 0;
	var DYN_PROP$1 = 1;
	var DYN_CONTEXT$1 = 2;
	var DYN_STATE$1 = 3;
	var DYN_THUNK = 4;
	var DYN_CONSTANT$1 = 5;
	var DYN_ARRAY$1 = 6;

	var S_DITHER = 'dither';
	var S_BLEND_ENABLE = 'blend.enable';
	var S_BLEND_COLOR = 'blend.color';
	var S_BLEND_EQUATION = 'blend.equation';
	var S_BLEND_FUNC = 'blend.func';
	var S_DEPTH_ENABLE = 'depth.enable';
	var S_DEPTH_FUNC = 'depth.func';
	var S_DEPTH_RANGE = 'depth.range';
	var S_DEPTH_MASK = 'depth.mask';
	var S_COLOR_MASK = 'colorMask';
	var S_CULL_ENABLE = 'cull.enable';
	var S_CULL_FACE = 'cull.face';
	var S_FRONT_FACE = 'frontFace';
	var S_LINE_WIDTH = 'lineWidth';
	var S_POLYGON_OFFSET_ENABLE = 'polygonOffset.enable';
	var S_POLYGON_OFFSET_OFFSET = 'polygonOffset.offset';
	var S_SAMPLE_ALPHA = 'sample.alpha';
	var S_SAMPLE_ENABLE = 'sample.enable';
	var S_SAMPLE_COVERAGE = 'sample.coverage';
	var S_STENCIL_ENABLE = 'stencil.enable';
	var S_STENCIL_MASK = 'stencil.mask';
	var S_STENCIL_FUNC = 'stencil.func';
	var S_STENCIL_OPFRONT = 'stencil.opFront';
	var S_STENCIL_OPBACK = 'stencil.opBack';
	var S_SCISSOR_ENABLE = 'scissor.enable';
	var S_SCISSOR_BOX = 'scissor.box';
	var S_VIEWPORT = 'viewport';

	var S_PROFILE = 'profile';

	var S_FRAMEBUFFER = 'framebuffer';
	var S_VERT = 'vert';
	var S_FRAG = 'frag';
	var S_ELEMENTS = 'elements';
	var S_PRIMITIVE = 'primitive';
	var S_COUNT = 'count';
	var S_OFFSET = 'offset';
	var S_INSTANCES = 'instances';
	var S_VAO = 'vao';

	var SUFFIX_WIDTH = 'Width';
	var SUFFIX_HEIGHT = 'Height';

	var S_FRAMEBUFFER_WIDTH = S_FRAMEBUFFER + SUFFIX_WIDTH;
	var S_FRAMEBUFFER_HEIGHT = S_FRAMEBUFFER + SUFFIX_HEIGHT;
	var S_VIEWPORT_WIDTH = S_VIEWPORT + SUFFIX_WIDTH;
	var S_VIEWPORT_HEIGHT = S_VIEWPORT + SUFFIX_HEIGHT;
	var S_DRAWINGBUFFER = 'drawingBuffer';
	var S_DRAWINGBUFFER_WIDTH = S_DRAWINGBUFFER + SUFFIX_WIDTH;
	var S_DRAWINGBUFFER_HEIGHT = S_DRAWINGBUFFER + SUFFIX_HEIGHT;

	var NESTED_OPTIONS = [
	  S_BLEND_FUNC,
	  S_BLEND_EQUATION,
	  S_STENCIL_FUNC,
	  S_STENCIL_OPFRONT,
	  S_STENCIL_OPBACK,
	  S_SAMPLE_COVERAGE,
	  S_VIEWPORT,
	  S_SCISSOR_BOX,
	  S_POLYGON_OFFSET_OFFSET
	];

	var GL_ARRAY_BUFFER$2 = 34962;
	var GL_ELEMENT_ARRAY_BUFFER$1 = 34963;

	var GL_FRAGMENT_SHADER$1 = 35632;
	var GL_VERTEX_SHADER$1 = 35633;

	var GL_TEXTURE_2D$3 = 0x0DE1;
	var GL_TEXTURE_CUBE_MAP$2 = 0x8513;

	var GL_CULL_FACE = 0x0B44;
	var GL_BLEND = 0x0BE2;
	var GL_DITHER = 0x0BD0;
	var GL_STENCIL_TEST = 0x0B90;
	var GL_DEPTH_TEST = 0x0B71;
	var GL_SCISSOR_TEST = 0x0C11;
	var GL_POLYGON_OFFSET_FILL = 0x8037;
	var GL_SAMPLE_ALPHA_TO_COVERAGE = 0x809E;
	var GL_SAMPLE_COVERAGE = 0x80A0;

	var GL_FLOAT$8 = 5126;
	var GL_FLOAT_VEC2 = 35664;
	var GL_FLOAT_VEC3 = 35665;
	var GL_FLOAT_VEC4 = 35666;
	var GL_INT$3 = 5124;
	var GL_INT_VEC2 = 35667;
	var GL_INT_VEC3 = 35668;
	var GL_INT_VEC4 = 35669;
	var GL_BOOL = 35670;
	var GL_BOOL_VEC2 = 35671;
	var GL_BOOL_VEC3 = 35672;
	var GL_BOOL_VEC4 = 35673;
	var GL_FLOAT_MAT2 = 35674;
	var GL_FLOAT_MAT3 = 35675;
	var GL_FLOAT_MAT4 = 35676;
	var GL_SAMPLER_2D = 35678;
	var GL_SAMPLER_CUBE = 35680;

	var GL_TRIANGLES$1 = 4;

	var GL_FRONT = 1028;
	var GL_BACK = 1029;
	var GL_CW = 0x0900;
	var GL_CCW = 0x0901;
	var GL_MIN_EXT = 0x8007;
	var GL_MAX_EXT = 0x8008;
	var GL_ALWAYS = 519;
	var GL_KEEP = 7680;
	var GL_ZERO = 0;
	var GL_ONE = 1;
	var GL_FUNC_ADD = 0x8006;
	var GL_LESS = 513;

	var GL_FRAMEBUFFER$2 = 0x8D40;
	var GL_COLOR_ATTACHMENT0$2 = 0x8CE0;

	var blendFuncs = {
	  '0': 0,
	  '1': 1,
	  'zero': 0,
	  'one': 1,
	  'src color': 768,
	  'one minus src color': 769,
	  'src alpha': 770,
	  'one minus src alpha': 771,
	  'dst color': 774,
	  'one minus dst color': 775,
	  'dst alpha': 772,
	  'one minus dst alpha': 773,
	  'constant color': 32769,
	  'one minus constant color': 32770,
	  'constant alpha': 32771,
	  'one minus constant alpha': 32772,
	  'src alpha saturate': 776
	};

	// There are invalid values for srcRGB and dstRGB. See:
	// https://www.khronos.org/registry/webgl/specs/1.0/#6.13
	// https://github.com/KhronosGroup/WebGL/blob/0d3201f5f7ec3c0060bc1f04077461541f1987b9/conformance-suites/1.0.3/conformance/misc/webgl-specific.html#L56
	var invalidBlendCombinations = [
	  'constant color, constant alpha',
	  'one minus constant color, constant alpha',
	  'constant color, one minus constant alpha',
	  'one minus constant color, one minus constant alpha',
	  'constant alpha, constant color',
	  'constant alpha, one minus constant color',
	  'one minus constant alpha, constant color',
	  'one minus constant alpha, one minus constant color'
	];

	var compareFuncs = {
	  'never': 512,
	  'less': 513,
	  '<': 513,
	  'equal': 514,
	  '=': 514,
	  '==': 514,
	  '===': 514,
	  'lequal': 515,
	  '<=': 515,
	  'greater': 516,
	  '>': 516,
	  'notequal': 517,
	  '!=': 517,
	  '!==': 517,
	  'gequal': 518,
	  '>=': 518,
	  'always': 519
	};

	var stencilOps = {
	  '0': 0,
	  'zero': 0,
	  'keep': 7680,
	  'replace': 7681,
	  'increment': 7682,
	  'decrement': 7683,
	  'increment wrap': 34055,
	  'decrement wrap': 34056,
	  'invert': 5386
	};

	var shaderType = {
	  'frag': GL_FRAGMENT_SHADER$1,
	  'vert': GL_VERTEX_SHADER$1
	};

	var orientationType = {
	  'cw': GL_CW,
	  'ccw': GL_CCW
	};

	function isBufferArgs (x) {
	  return Array.isArray(x) ||
	    isTypedArray(x) ||
	    isNDArrayLike(x)
	}

	// Make sure viewport is processed first
	function sortState (state) {
	  return state.sort(function (a, b) {
	    if (a === S_VIEWPORT) {
	      return -1
	    } else if (b === S_VIEWPORT) {
	      return 1
	    }
	    return (a < b) ? -1 : 1
	  })
	}

	function Declaration (thisDep, contextDep, propDep, append) {
	  this.thisDep = thisDep;
	  this.contextDep = contextDep;
	  this.propDep = propDep;
	  this.append = append;
	}

	function isStatic (decl) {
	  return decl && !(decl.thisDep || decl.contextDep || decl.propDep)
	}

	function createStaticDecl (append) {
	  return new Declaration(false, false, false, append)
	}

	function createDynamicDecl (dyn, append) {
	  var type = dyn.type;
	  if (type === DYN_FUNC$1) {
	    var numArgs = dyn.data.length;
	    return new Declaration(
	      true,
	      numArgs >= 1,
	      numArgs >= 2,
	      append)
	  } else if (type === DYN_THUNK) {
	    var data = dyn.data;
	    return new Declaration(
	      data.thisDep,
	      data.contextDep,
	      data.propDep,
	      append)
	  } else if (type === DYN_CONSTANT$1) {
	    return new Declaration(
	      false,
	      false,
	      false,
	      append)
	  } else if (type === DYN_ARRAY$1) {
	    var thisDep = false;
	    var contextDep = false;
	    var propDep = false;
	    for (var i = 0; i < dyn.data.length; ++i) {
	      var subDyn = dyn.data[i];
	      if (subDyn.type === DYN_PROP$1) {
	        propDep = true;
	      } else if (subDyn.type === DYN_CONTEXT$1) {
	        contextDep = true;
	      } else if (subDyn.type === DYN_STATE$1) {
	        thisDep = true;
	      } else if (subDyn.type === DYN_FUNC$1) {
	        thisDep = true;
	        var subArgs = subDyn.data;
	        if (subArgs >= 1) {
	          contextDep = true;
	        }
	        if (subArgs >= 2) {
	          propDep = true;
	        }
	      } else if (subDyn.type === DYN_THUNK) {
	        thisDep = thisDep || subDyn.data.thisDep;
	        contextDep = contextDep || subDyn.data.contextDep;
	        propDep = propDep || subDyn.data.propDep;
	      }
	    }
	    return new Declaration(
	      thisDep,
	      contextDep,
	      propDep,
	      append)
	  } else {
	    return new Declaration(
	      type === DYN_STATE$1,
	      type === DYN_CONTEXT$1,
	      type === DYN_PROP$1,
	      append)
	  }
	}

	var SCOPE_DECL = new Declaration(false, false, false, function () {});

	function reglCore (
	  gl,
	  stringStore,
	  extensions,
	  limits,
	  bufferState,
	  elementState,
	  textureState,
	  framebufferState,
	  uniformState,
	  attributeState,
	  shaderState,
	  drawState,
	  contextState,
	  timer,
	  config) {
	  var AttributeRecord = attributeState.Record;

	  var blendEquations = {
	    'add': 32774,
	    'subtract': 32778,
	    'reverse subtract': 32779
	  };
	  if (extensions.ext_blend_minmax) {
	    blendEquations.min = GL_MIN_EXT;
	    blendEquations.max = GL_MAX_EXT;
	  }

	  var extInstancing = extensions.angle_instanced_arrays;
	  var extDrawBuffers = extensions.webgl_draw_buffers;

	  // ===================================================
	  // ===================================================
	  // WEBGL STATE
	  // ===================================================
	  // ===================================================
	  var currentState = {
	    dirty: true,
	    profile: config.profile
	  };
	  var nextState = {};
	  var GL_STATE_NAMES = [];
	  var GL_FLAGS = {};
	  var GL_VARIABLES = {};

	  function propName (name) {
	    return name.replace('.', '_')
	  }

	  function stateFlag (sname, cap, init) {
	    var name = propName(sname);
	    GL_STATE_NAMES.push(sname);
	    nextState[name] = currentState[name] = !!init;
	    GL_FLAGS[name] = cap;
	  }

	  function stateVariable (sname, func, init) {
	    var name = propName(sname);
	    GL_STATE_NAMES.push(sname);
	    if (Array.isArray(init)) {
	      currentState[name] = init.slice();
	      nextState[name] = init.slice();
	    } else {
	      currentState[name] = nextState[name] = init;
	    }
	    GL_VARIABLES[name] = func;
	  }

	  // Dithering
	  stateFlag(S_DITHER, GL_DITHER);

	  // Blending
	  stateFlag(S_BLEND_ENABLE, GL_BLEND);
	  stateVariable(S_BLEND_COLOR, 'blendColor', [0, 0, 0, 0]);
	  stateVariable(S_BLEND_EQUATION, 'blendEquationSeparate',
	    [GL_FUNC_ADD, GL_FUNC_ADD]);
	  stateVariable(S_BLEND_FUNC, 'blendFuncSeparate',
	    [GL_ONE, GL_ZERO, GL_ONE, GL_ZERO]);

	  // Depth
	  stateFlag(S_DEPTH_ENABLE, GL_DEPTH_TEST, true);
	  stateVariable(S_DEPTH_FUNC, 'depthFunc', GL_LESS);
	  stateVariable(S_DEPTH_RANGE, 'depthRange', [0, 1]);
	  stateVariable(S_DEPTH_MASK, 'depthMask', true);

	  // Color mask
	  stateVariable(S_COLOR_MASK, S_COLOR_MASK, [true, true, true, true]);

	  // Face culling
	  stateFlag(S_CULL_ENABLE, GL_CULL_FACE);
	  stateVariable(S_CULL_FACE, 'cullFace', GL_BACK);

	  // Front face orientation
	  stateVariable(S_FRONT_FACE, S_FRONT_FACE, GL_CCW);

	  // Line width
	  stateVariable(S_LINE_WIDTH, S_LINE_WIDTH, 1);

	  // Polygon offset
	  stateFlag(S_POLYGON_OFFSET_ENABLE, GL_POLYGON_OFFSET_FILL);
	  stateVariable(S_POLYGON_OFFSET_OFFSET, 'polygonOffset', [0, 0]);

	  // Sample coverage
	  stateFlag(S_SAMPLE_ALPHA, GL_SAMPLE_ALPHA_TO_COVERAGE);
	  stateFlag(S_SAMPLE_ENABLE, GL_SAMPLE_COVERAGE);
	  stateVariable(S_SAMPLE_COVERAGE, 'sampleCoverage', [1, false]);

	  // Stencil
	  stateFlag(S_STENCIL_ENABLE, GL_STENCIL_TEST);
	  stateVariable(S_STENCIL_MASK, 'stencilMask', -1);
	  stateVariable(S_STENCIL_FUNC, 'stencilFunc', [GL_ALWAYS, 0, -1]);
	  stateVariable(S_STENCIL_OPFRONT, 'stencilOpSeparate',
	    [GL_FRONT, GL_KEEP, GL_KEEP, GL_KEEP]);
	  stateVariable(S_STENCIL_OPBACK, 'stencilOpSeparate',
	    [GL_BACK, GL_KEEP, GL_KEEP, GL_KEEP]);

	  // Scissor
	  stateFlag(S_SCISSOR_ENABLE, GL_SCISSOR_TEST);
	  stateVariable(S_SCISSOR_BOX, 'scissor',
	    [0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight]);

	  // Viewport
	  stateVariable(S_VIEWPORT, S_VIEWPORT,
	    [0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight]);

	  // ===================================================
	  // ===================================================
	  // ENVIRONMENT
	  // ===================================================
	  // ===================================================
	  var sharedState = {
	    gl: gl,
	    context: contextState,
	    strings: stringStore,
	    next: nextState,
	    current: currentState,
	    draw: drawState,
	    elements: elementState,
	    buffer: bufferState,
	    shader: shaderState,
	    attributes: attributeState.state,
	    vao: attributeState,
	    uniforms: uniformState,
	    framebuffer: framebufferState,
	    extensions: extensions,

	    timer: timer,
	    isBufferArgs: isBufferArgs
	  };

	  var sharedConstants = {
	    primTypes: primTypes,
	    compareFuncs: compareFuncs,
	    blendFuncs: blendFuncs,
	    blendEquations: blendEquations,
	    stencilOps: stencilOps,
	    glTypes: glTypes,
	    orientationType: orientationType
	  };

	  check$1.optional(function () {
	    sharedState.isArrayLike = isArrayLike;
	  });

	  if (extDrawBuffers) {
	    sharedConstants.backBuffer = [GL_BACK];
	    sharedConstants.drawBuffer = loop(limits.maxDrawbuffers, function (i) {
	      if (i === 0) {
	        return [0]
	      }
	      return loop(i, function (j) {
	        return GL_COLOR_ATTACHMENT0$2 + j
	      })
	    });
	  }

	  var drawCallCounter = 0;
	  function createREGLEnvironment () {
	    var env = createEnvironment();
	    var link = env.link;
	    var global = env.global;
	    env.id = drawCallCounter++;

	    env.batchId = '0';

	    // link shared state
	    var SHARED = link(sharedState);
	    var shared = env.shared = {
	      props: 'a0'
	    };
	    Object.keys(sharedState).forEach(function (prop) {
	      shared[prop] = global.def(SHARED, '.', prop);
	    });

	    // Inject runtime assertion stuff for debug builds
	    check$1.optional(function () {
	      env.CHECK = link(check$1);
	      env.commandStr = check$1.guessCommand();
	      env.command = link(env.commandStr);
	      env.assert = function (block, pred, message) {
	        block(
	          'if(!(', pred, '))',
	          this.CHECK, '.commandRaise(', link(message), ',', this.command, ');');
	      };

	      sharedConstants.invalidBlendCombinations = invalidBlendCombinations;
	    });

	    // Copy GL state variables over
	    var nextVars = env.next = {};
	    var currentVars = env.current = {};
	    Object.keys(GL_VARIABLES).forEach(function (variable) {
	      if (Array.isArray(currentState[variable])) {
	        nextVars[variable] = global.def(shared.next, '.', variable);
	        currentVars[variable] = global.def(shared.current, '.', variable);
	      }
	    });

	    // Initialize shared constants
	    var constants = env.constants = {};
	    Object.keys(sharedConstants).forEach(function (name) {
	      constants[name] = global.def(JSON.stringify(sharedConstants[name]));
	    });

	    // Helper function for calling a block
	    env.invoke = function (block, x) {
	      switch (x.type) {
	        case DYN_FUNC$1:
	          var argList = [
	            'this',
	            shared.context,
	            shared.props,
	            env.batchId
	          ];
	          return block.def(
	            link(x.data), '.call(',
	            argList.slice(0, Math.max(x.data.length + 1, 4)),
	            ')')
	        case DYN_PROP$1:
	          return block.def(shared.props, x.data)
	        case DYN_CONTEXT$1:
	          return block.def(shared.context, x.data)
	        case DYN_STATE$1:
	          return block.def('this', x.data)
	        case DYN_THUNK:
	          x.data.append(env, block);
	          return x.data.ref
	        case DYN_CONSTANT$1:
	          return x.data.toString()
	        case DYN_ARRAY$1:
	          return x.data.map(function (y) {
	            return env.invoke(block, y)
	          })
	      }
	    };

	    env.attribCache = {};

	    var scopeAttribs = {};
	    env.scopeAttrib = function (name) {
	      var id = stringStore.id(name);
	      if (id in scopeAttribs) {
	        return scopeAttribs[id]
	      }
	      var binding = attributeState.scope[id];
	      if (!binding) {
	        binding = attributeState.scope[id] = new AttributeRecord();
	      }
	      var result = scopeAttribs[id] = link(binding);
	      return result
	    };

	    return env
	  }

	  // ===================================================
	  // ===================================================
	  // PARSING
	  // ===================================================
	  // ===================================================
	  function parseProfile (options) {
	    var staticOptions = options.static;
	    var dynamicOptions = options.dynamic;

	    var profileEnable;
	    if (S_PROFILE in staticOptions) {
	      var value = !!staticOptions[S_PROFILE];
	      profileEnable = createStaticDecl(function (env, scope) {
	        return value
	      });
	      profileEnable.enable = value;
	    } else if (S_PROFILE in dynamicOptions) {
	      var dyn = dynamicOptions[S_PROFILE];
	      profileEnable = createDynamicDecl(dyn, function (env, scope) {
	        return env.invoke(scope, dyn)
	      });
	    }

	    return profileEnable
	  }

	  function parseFramebuffer (options, env) {
	    var staticOptions = options.static;
	    var dynamicOptions = options.dynamic;

	    if (S_FRAMEBUFFER in staticOptions) {
	      var framebuffer = staticOptions[S_FRAMEBUFFER];
	      if (framebuffer) {
	        framebuffer = framebufferState.getFramebuffer(framebuffer);
	        check$1.command(framebuffer, 'invalid framebuffer object');
	        return createStaticDecl(function (env, block) {
	          var FRAMEBUFFER = env.link(framebuffer);
	          var shared = env.shared;
	          block.set(
	            shared.framebuffer,
	            '.next',
	            FRAMEBUFFER);
	          var CONTEXT = shared.context;
	          block.set(
	            CONTEXT,
	            '.' + S_FRAMEBUFFER_WIDTH,
	            FRAMEBUFFER + '.width');
	          block.set(
	            CONTEXT,
	            '.' + S_FRAMEBUFFER_HEIGHT,
	            FRAMEBUFFER + '.height');
	          return FRAMEBUFFER
	        })
	      } else {
	        return createStaticDecl(function (env, scope) {
	          var shared = env.shared;
	          scope.set(
	            shared.framebuffer,
	            '.next',
	            'null');
	          var CONTEXT = shared.context;
	          scope.set(
	            CONTEXT,
	            '.' + S_FRAMEBUFFER_WIDTH,
	            CONTEXT + '.' + S_DRAWINGBUFFER_WIDTH);
	          scope.set(
	            CONTEXT,
	            '.' + S_FRAMEBUFFER_HEIGHT,
	            CONTEXT + '.' + S_DRAWINGBUFFER_HEIGHT);
	          return 'null'
	        })
	      }
	    } else if (S_FRAMEBUFFER in dynamicOptions) {
	      var dyn = dynamicOptions[S_FRAMEBUFFER];
	      return createDynamicDecl(dyn, function (env, scope) {
	        var FRAMEBUFFER_FUNC = env.invoke(scope, dyn);
	        var shared = env.shared;
	        var FRAMEBUFFER_STATE = shared.framebuffer;
	        var FRAMEBUFFER = scope.def(
	          FRAMEBUFFER_STATE, '.getFramebuffer(', FRAMEBUFFER_FUNC, ')');

	        check$1.optional(function () {
	          env.assert(scope,
	            '!' + FRAMEBUFFER_FUNC + '||' + FRAMEBUFFER,
	            'invalid framebuffer object');
	        });

	        scope.set(
	          FRAMEBUFFER_STATE,
	          '.next',
	          FRAMEBUFFER);
	        var CONTEXT = shared.context;
	        scope.set(
	          CONTEXT,
	          '.' + S_FRAMEBUFFER_WIDTH,
	          FRAMEBUFFER + '?' + FRAMEBUFFER + '.width:' +
	          CONTEXT + '.' + S_DRAWINGBUFFER_WIDTH);
	        scope.set(
	          CONTEXT,
	          '.' + S_FRAMEBUFFER_HEIGHT,
	          FRAMEBUFFER +
	          '?' + FRAMEBUFFER + '.height:' +
	          CONTEXT + '.' + S_DRAWINGBUFFER_HEIGHT);
	        return FRAMEBUFFER
	      })
	    } else {
	      return null
	    }
	  }

	  function parseViewportScissor (options, framebuffer, env) {
	    var staticOptions = options.static;
	    var dynamicOptions = options.dynamic;

	    function parseBox (param) {
	      if (param in staticOptions) {
	        var box = staticOptions[param];
	        check$1.commandType(box, 'object', 'invalid ' + param, env.commandStr);

	        var isStatic = true;
	        var x = box.x | 0;
	        var y = box.y | 0;
	        var w, h;
	        if ('width' in box) {
	          w = box.width | 0;
	          check$1.command(w >= 0, 'invalid ' + param, env.commandStr);
	        } else {
	          isStatic = false;
	        }
	        if ('height' in box) {
	          h = box.height | 0;
	          check$1.command(h >= 0, 'invalid ' + param, env.commandStr);
	        } else {
	          isStatic = false;
	        }

	        return new Declaration(
	          !isStatic && framebuffer && framebuffer.thisDep,
	          !isStatic && framebuffer && framebuffer.contextDep,
	          !isStatic && framebuffer && framebuffer.propDep,
	          function (env, scope) {
	            var CONTEXT = env.shared.context;
	            var BOX_W = w;
	            if (!('width' in box)) {
	              BOX_W = scope.def(CONTEXT, '.', S_FRAMEBUFFER_WIDTH, '-', x);
	            }
	            var BOX_H = h;
	            if (!('height' in box)) {
	              BOX_H = scope.def(CONTEXT, '.', S_FRAMEBUFFER_HEIGHT, '-', y);
	            }
	            return [x, y, BOX_W, BOX_H]
	          })
	      } else if (param in dynamicOptions) {
	        var dynBox = dynamicOptions[param];
	        var result = createDynamicDecl(dynBox, function (env, scope) {
	          var BOX = env.invoke(scope, dynBox);

	          check$1.optional(function () {
	            env.assert(scope,
	              BOX + '&&typeof ' + BOX + '==="object"',
	              'invalid ' + param);
	          });

	          var CONTEXT = env.shared.context;
	          var BOX_X = scope.def(BOX, '.x|0');
	          var BOX_Y = scope.def(BOX, '.y|0');
	          var BOX_W = scope.def(
	            '"width" in ', BOX, '?', BOX, '.width|0:',
	            '(', CONTEXT, '.', S_FRAMEBUFFER_WIDTH, '-', BOX_X, ')');
	          var BOX_H = scope.def(
	            '"height" in ', BOX, '?', BOX, '.height|0:',
	            '(', CONTEXT, '.', S_FRAMEBUFFER_HEIGHT, '-', BOX_Y, ')');

	          check$1.optional(function () {
	            env.assert(scope,
	              BOX_W + '>=0&&' +
	              BOX_H + '>=0',
	              'invalid ' + param);
	          });

	          return [BOX_X, BOX_Y, BOX_W, BOX_H]
	        });
	        if (framebuffer) {
	          result.thisDep = result.thisDep || framebuffer.thisDep;
	          result.contextDep = result.contextDep || framebuffer.contextDep;
	          result.propDep = result.propDep || framebuffer.propDep;
	        }
	        return result
	      } else if (framebuffer) {
	        return new Declaration(
	          framebuffer.thisDep,
	          framebuffer.contextDep,
	          framebuffer.propDep,
	          function (env, scope) {
	            var CONTEXT = env.shared.context;
	            return [
	              0, 0,
	              scope.def(CONTEXT, '.', S_FRAMEBUFFER_WIDTH),
	              scope.def(CONTEXT, '.', S_FRAMEBUFFER_HEIGHT)]
	          })
	      } else {
	        return null
	      }
	    }

	    var viewport = parseBox(S_VIEWPORT);

	    if (viewport) {
	      var prevViewport = viewport;
	      viewport = new Declaration(
	        viewport.thisDep,
	        viewport.contextDep,
	        viewport.propDep,
	        function (env, scope) {
	          var VIEWPORT = prevViewport.append(env, scope);
	          var CONTEXT = env.shared.context;
	          scope.set(
	            CONTEXT,
	            '.' + S_VIEWPORT_WIDTH,
	            VIEWPORT[2]);
	          scope.set(
	            CONTEXT,
	            '.' + S_VIEWPORT_HEIGHT,
	            VIEWPORT[3]);
	          return VIEWPORT
	        });
	    }

	    return {
	      viewport: viewport,
	      scissor_box: parseBox(S_SCISSOR_BOX)
	    }
	  }

	  function parseAttribLocations (options, attributes) {
	    var staticOptions = options.static;
	    var staticProgram =
	      typeof staticOptions[S_FRAG] === 'string' &&
	      typeof staticOptions[S_VERT] === 'string';
	    if (staticProgram) {
	      if (Object.keys(attributes.dynamic).length > 0) {
	        return null
	      }
	      var staticAttributes = attributes.static;
	      var sAttributes = Object.keys(staticAttributes);
	      if (sAttributes.length > 0 && typeof staticAttributes[sAttributes[0]] === 'number') {
	        var bindings = [];
	        for (var i = 0; i < sAttributes.length; ++i) {
	          check$1(typeof staticAttributes[sAttributes[i]] === 'number', 'must specify all vertex attribute locations when using vaos');
	          bindings.push([staticAttributes[sAttributes[i]] | 0, sAttributes[i]]);
	        }
	        return bindings
	      }
	    }
	    return null
	  }

	  function parseProgram (options, env, attribLocations) {
	    var staticOptions = options.static;
	    var dynamicOptions = options.dynamic;

	    function parseShader (name) {
	      if (name in staticOptions) {
	        var id = stringStore.id(staticOptions[name]);
	        check$1.optional(function () {
	          shaderState.shader(shaderType[name], id, check$1.guessCommand());
	        });
	        var result = createStaticDecl(function () {
	          return id
	        });
	        result.id = id;
	        return result
	      } else if (name in dynamicOptions) {
	        var dyn = dynamicOptions[name];
	        return createDynamicDecl(dyn, function (env, scope) {
	          var str = env.invoke(scope, dyn);
	          var id = scope.def(env.shared.strings, '.id(', str, ')');
	          check$1.optional(function () {
	            scope(
	              env.shared.shader, '.shader(',
	              shaderType[name], ',',
	              id, ',',
	              env.command, ');');
	          });
	          return id
	        })
	      }
	      return null
	    }

	    var frag = parseShader(S_FRAG);
	    var vert = parseShader(S_VERT);

	    var program = null;
	    var progVar;
	    if (isStatic(frag) && isStatic(vert)) {
	      program = shaderState.program(vert.id, frag.id, null, attribLocations);
	      progVar = createStaticDecl(function (env, scope) {
	        return env.link(program)
	      });
	    } else {
	      progVar = new Declaration(
	        (frag && frag.thisDep) || (vert && vert.thisDep),
	        (frag && frag.contextDep) || (vert && vert.contextDep),
	        (frag && frag.propDep) || (vert && vert.propDep),
	        function (env, scope) {
	          var SHADER_STATE = env.shared.shader;
	          var fragId;
	          if (frag) {
	            fragId = frag.append(env, scope);
	          } else {
	            fragId = scope.def(SHADER_STATE, '.', S_FRAG);
	          }
	          var vertId;
	          if (vert) {
	            vertId = vert.append(env, scope);
	          } else {
	            vertId = scope.def(SHADER_STATE, '.', S_VERT);
	          }
	          var progDef = SHADER_STATE + '.program(' + vertId + ',' + fragId;
	          check$1.optional(function () {
	            progDef += ',' + env.command;
	          });
	          return scope.def(progDef + ')')
	        });
	    }

	    return {
	      frag: frag,
	      vert: vert,
	      progVar: progVar,
	      program: program
	    }
	  }

	  function parseDraw (options, env) {
	    var staticOptions = options.static;
	    var dynamicOptions = options.dynamic;

	    function parseElements () {
	      if (S_ELEMENTS in staticOptions) {
	        var elements = staticOptions[S_ELEMENTS];
	        if (isBufferArgs(elements)) {
	          elements = elementState.getElements(elementState.create(elements, true));
	        } else if (elements) {
	          elements = elementState.getElements(elements);
	          check$1.command(elements, 'invalid elements', env.commandStr);
	        }
	        var result = createStaticDecl(function (env, scope) {
	          if (elements) {
	            var result = env.link(elements);
	            env.ELEMENTS = result;
	            return result
	          }
	          env.ELEMENTS = null;
	          return null
	        });
	        result.value = elements;
	        return result
	      } else if (S_ELEMENTS in dynamicOptions) {
	        var dyn = dynamicOptions[S_ELEMENTS];
	        return createDynamicDecl(dyn, function (env, scope) {
	          var shared = env.shared;

	          var IS_BUFFER_ARGS = shared.isBufferArgs;
	          var ELEMENT_STATE = shared.elements;

	          var elementDefn = env.invoke(scope, dyn);
	          var elements = scope.def('null');
	          var elementStream = scope.def(IS_BUFFER_ARGS, '(', elementDefn, ')');

	          var ifte = env.cond(elementStream)
	            .then(elements, '=', ELEMENT_STATE, '.createStream(', elementDefn, ');')
	            .else(elements, '=', ELEMENT_STATE, '.getElements(', elementDefn, ');');

	          check$1.optional(function () {
	            env.assert(ifte.else,
	              '!' + elementDefn + '||' + elements,
	              'invalid elements');
	          });

	          scope.entry(ifte);
	          scope.exit(
	            env.cond(elementStream)
	              .then(ELEMENT_STATE, '.destroyStream(', elements, ');'));

	          env.ELEMENTS = elements;

	          return elements
	        })
	      }

	      return null
	    }

	    var elements = parseElements();

	    function parsePrimitive () {
	      if (S_PRIMITIVE in staticOptions) {
	        var primitive = staticOptions[S_PRIMITIVE];
	        check$1.commandParameter(primitive, primTypes, 'invalid primitve', env.commandStr);
	        return createStaticDecl(function (env, scope) {
	          return primTypes[primitive]
	        })
	      } else if (S_PRIMITIVE in dynamicOptions) {
	        var dynPrimitive = dynamicOptions[S_PRIMITIVE];
	        return createDynamicDecl(dynPrimitive, function (env, scope) {
	          var PRIM_TYPES = env.constants.primTypes;
	          var prim = env.invoke(scope, dynPrimitive);
	          check$1.optional(function () {
	            env.assert(scope,
	              prim + ' in ' + PRIM_TYPES,
	              'invalid primitive, must be one of ' + Object.keys(primTypes));
	          });
	          return scope.def(PRIM_TYPES, '[', prim, ']')
	        })
	      } else if (elements) {
	        if (isStatic(elements)) {
	          if (elements.value) {
	            return createStaticDecl(function (env, scope) {
	              return scope.def(env.ELEMENTS, '.primType')
	            })
	          } else {
	            return createStaticDecl(function () {
	              return GL_TRIANGLES$1
	            })
	          }
	        } else {
	          return new Declaration(
	            elements.thisDep,
	            elements.contextDep,
	            elements.propDep,
	            function (env, scope) {
	              var elements = env.ELEMENTS;
	              return scope.def(elements, '?', elements, '.primType:', GL_TRIANGLES$1)
	            })
	        }
	      }
	      return null
	    }

	    function parseParam (param, isOffset) {
	      if (param in staticOptions) {
	        var value = staticOptions[param] | 0;
	        check$1.command(!isOffset || value >= 0, 'invalid ' + param, env.commandStr);
	        return createStaticDecl(function (env, scope) {
	          if (isOffset) {
	            env.OFFSET = value;
	          }
	          return value
	        })
	      } else if (param in dynamicOptions) {
	        var dynValue = dynamicOptions[param];
	        return createDynamicDecl(dynValue, function (env, scope) {
	          var result = env.invoke(scope, dynValue);
	          if (isOffset) {
	            env.OFFSET = result;
	            check$1.optional(function () {
	              env.assert(scope,
	                result + '>=0',
	                'invalid ' + param);
	            });
	          }
	          return result
	        })
	      } else if (isOffset && elements) {
	        return createStaticDecl(function (env, scope) {
	          env.OFFSET = '0';
	          return 0
	        })
	      }
	      return null
	    }

	    var OFFSET = parseParam(S_OFFSET, true);

	    function parseVertCount () {
	      if (S_COUNT in staticOptions) {
	        var count = staticOptions[S_COUNT] | 0;
	        check$1.command(
	          typeof count === 'number' && count >= 0, 'invalid vertex count', env.commandStr);
	        return createStaticDecl(function () {
	          return count
	        })
	      } else if (S_COUNT in dynamicOptions) {
	        var dynCount = dynamicOptions[S_COUNT];
	        return createDynamicDecl(dynCount, function (env, scope) {
	          var result = env.invoke(scope, dynCount);
	          check$1.optional(function () {
	            env.assert(scope,
	              'typeof ' + result + '==="number"&&' +
	              result + '>=0&&' +
	              result + '===(' + result + '|0)',
	              'invalid vertex count');
	          });
	          return result
	        })
	      } else if (elements) {
	        if (isStatic(elements)) {
	          if (elements) {
	            if (OFFSET) {
	              return new Declaration(
	                OFFSET.thisDep,
	                OFFSET.contextDep,
	                OFFSET.propDep,
	                function (env, scope) {
	                  var result = scope.def(
	                    env.ELEMENTS, '.vertCount-', env.OFFSET);

	                  check$1.optional(function () {
	                    env.assert(scope,
	                      result + '>=0',
	                      'invalid vertex offset/element buffer too small');
	                  });

	                  return result
	                })
	            } else {
	              return createStaticDecl(function (env, scope) {
	                return scope.def(env.ELEMENTS, '.vertCount')
	              })
	            }
	          } else {
	            var result = createStaticDecl(function () {
	              return -1
	            });
	            check$1.optional(function () {
	              result.MISSING = true;
	            });
	            return result
	          }
	        } else {
	          var variable = new Declaration(
	            elements.thisDep || OFFSET.thisDep,
	            elements.contextDep || OFFSET.contextDep,
	            elements.propDep || OFFSET.propDep,
	            function (env, scope) {
	              var elements = env.ELEMENTS;
	              if (env.OFFSET) {
	                return scope.def(elements, '?', elements, '.vertCount-',
	                  env.OFFSET, ':-1')
	              }
	              return scope.def(elements, '?', elements, '.vertCount:-1')
	            });
	          check$1.optional(function () {
	            variable.DYNAMIC = true;
	          });
	          return variable
	        }
	      }
	      return null
	    }

	    return {
	      elements: elements,
	      primitive: parsePrimitive(),
	      count: parseVertCount(),
	      instances: parseParam(S_INSTANCES, false),
	      offset: OFFSET
	    }
	  }

	  function parseGLState (options, env) {
	    var staticOptions = options.static;
	    var dynamicOptions = options.dynamic;

	    var STATE = {};

	    GL_STATE_NAMES.forEach(function (prop) {
	      var param = propName(prop);

	      function parseParam (parseStatic, parseDynamic) {
	        if (prop in staticOptions) {
	          var value = parseStatic(staticOptions[prop]);
	          STATE[param] = createStaticDecl(function () {
	            return value
	          });
	        } else if (prop in dynamicOptions) {
	          var dyn = dynamicOptions[prop];
	          STATE[param] = createDynamicDecl(dyn, function (env, scope) {
	            return parseDynamic(env, scope, env.invoke(scope, dyn))
	          });
	        }
	      }

	      switch (prop) {
	        case S_CULL_ENABLE:
	        case S_BLEND_ENABLE:
	        case S_DITHER:
	        case S_STENCIL_ENABLE:
	        case S_DEPTH_ENABLE:
	        case S_SCISSOR_ENABLE:
	        case S_POLYGON_OFFSET_ENABLE:
	        case S_SAMPLE_ALPHA:
	        case S_SAMPLE_ENABLE:
	        case S_DEPTH_MASK:
	          return parseParam(
	            function (value) {
	              check$1.commandType(value, 'boolean', prop, env.commandStr);
	              return value
	            },
	            function (env, scope, value) {
	              check$1.optional(function () {
	                env.assert(scope,
	                  'typeof ' + value + '==="boolean"',
	                  'invalid flag ' + prop, env.commandStr);
	              });
	              return value
	            })

	        case S_DEPTH_FUNC:
	          return parseParam(
	            function (value) {
	              check$1.commandParameter(value, compareFuncs, 'invalid ' + prop, env.commandStr);
	              return compareFuncs[value]
	            },
	            function (env, scope, value) {
	              var COMPARE_FUNCS = env.constants.compareFuncs;
	              check$1.optional(function () {
	                env.assert(scope,
	                  value + ' in ' + COMPARE_FUNCS,
	                  'invalid ' + prop + ', must be one of ' + Object.keys(compareFuncs));
	              });
	              return scope.def(COMPARE_FUNCS, '[', value, ']')
	            })

	        case S_DEPTH_RANGE:
	          return parseParam(
	            function (value) {
	              check$1.command(
	                isArrayLike(value) &&
	                value.length === 2 &&
	                typeof value[0] === 'number' &&
	                typeof value[1] === 'number' &&
	                value[0] <= value[1],
	                'depth range is 2d array',
	                env.commandStr);
	              return value
	            },
	            function (env, scope, value) {
	              check$1.optional(function () {
	                env.assert(scope,
	                  env.shared.isArrayLike + '(' + value + ')&&' +
	                  value + '.length===2&&' +
	                  'typeof ' + value + '[0]==="number"&&' +
	                  'typeof ' + value + '[1]==="number"&&' +
	                  value + '[0]<=' + value + '[1]',
	                  'depth range must be a 2d array');
	              });

	              var Z_NEAR = scope.def('+', value, '[0]');
	              var Z_FAR = scope.def('+', value, '[1]');
	              return [Z_NEAR, Z_FAR]
	            })

	        case S_BLEND_FUNC:
	          return parseParam(
	            function (value) {
	              check$1.commandType(value, 'object', 'blend.func', env.commandStr);
	              var srcRGB = ('srcRGB' in value ? value.srcRGB : value.src);
	              var srcAlpha = ('srcAlpha' in value ? value.srcAlpha : value.src);
	              var dstRGB = ('dstRGB' in value ? value.dstRGB : value.dst);
	              var dstAlpha = ('dstAlpha' in value ? value.dstAlpha : value.dst);
	              check$1.commandParameter(srcRGB, blendFuncs, param + '.srcRGB', env.commandStr);
	              check$1.commandParameter(srcAlpha, blendFuncs, param + '.srcAlpha', env.commandStr);
	              check$1.commandParameter(dstRGB, blendFuncs, param + '.dstRGB', env.commandStr);
	              check$1.commandParameter(dstAlpha, blendFuncs, param + '.dstAlpha', env.commandStr);

	              check$1.command(
	                (invalidBlendCombinations.indexOf(srcRGB + ', ' + dstRGB) === -1),
	                'unallowed blending combination (srcRGB, dstRGB) = (' + srcRGB + ', ' + dstRGB + ')', env.commandStr);

	              return [
	                blendFuncs[srcRGB],
	                blendFuncs[dstRGB],
	                blendFuncs[srcAlpha],
	                blendFuncs[dstAlpha]
	              ]
	            },
	            function (env, scope, value) {
	              var BLEND_FUNCS = env.constants.blendFuncs;

	              check$1.optional(function () {
	                env.assert(scope,
	                  value + '&&typeof ' + value + '==="object"',
	                  'invalid blend func, must be an object');
	              });

	              function read (prefix, suffix) {
	                var func = scope.def(
	                  '"', prefix, suffix, '" in ', value,
	                  '?', value, '.', prefix, suffix,
	                  ':', value, '.', prefix);

	                check$1.optional(function () {
	                  env.assert(scope,
	                    func + ' in ' + BLEND_FUNCS,
	                    'invalid ' + prop + '.' + prefix + suffix + ', must be one of ' + Object.keys(blendFuncs));
	                });

	                return func
	              }

	              var srcRGB = read('src', 'RGB');
	              var dstRGB = read('dst', 'RGB');

	              check$1.optional(function () {
	                var INVALID_BLEND_COMBINATIONS = env.constants.invalidBlendCombinations;

	                env.assert(scope,
	                  INVALID_BLEND_COMBINATIONS +
	                           '.indexOf(' + srcRGB + '+", "+' + dstRGB + ') === -1 ',
	                  'unallowed blending combination for (srcRGB, dstRGB)'
	                );
	              });

	              var SRC_RGB = scope.def(BLEND_FUNCS, '[', srcRGB, ']');
	              var SRC_ALPHA = scope.def(BLEND_FUNCS, '[', read('src', 'Alpha'), ']');
	              var DST_RGB = scope.def(BLEND_FUNCS, '[', dstRGB, ']');
	              var DST_ALPHA = scope.def(BLEND_FUNCS, '[', read('dst', 'Alpha'), ']');

	              return [SRC_RGB, DST_RGB, SRC_ALPHA, DST_ALPHA]
	            })

	        case S_BLEND_EQUATION:
	          return parseParam(
	            function (value) {
	              if (typeof value === 'string') {
	                check$1.commandParameter(value, blendEquations, 'invalid ' + prop, env.commandStr);
	                return [
	                  blendEquations[value],
	                  blendEquations[value]
	                ]
	              } else if (typeof value === 'object') {
	                check$1.commandParameter(
	                  value.rgb, blendEquations, prop + '.rgb', env.commandStr);
	                check$1.commandParameter(
	                  value.alpha, blendEquations, prop + '.alpha', env.commandStr);
	                return [
	                  blendEquations[value.rgb],
	                  blendEquations[value.alpha]
	                ]
	              } else {
	                check$1.commandRaise('invalid blend.equation', env.commandStr);
	              }
	            },
	            function (env, scope, value) {
	              var BLEND_EQUATIONS = env.constants.blendEquations;

	              var RGB = scope.def();
	              var ALPHA = scope.def();

	              var ifte = env.cond('typeof ', value, '==="string"');

	              check$1.optional(function () {
	                function checkProp (block, name, value) {
	                  env.assert(block,
	                    value + ' in ' + BLEND_EQUATIONS,
	                    'invalid ' + name + ', must be one of ' + Object.keys(blendEquations));
	                }
	                checkProp(ifte.then, prop, value);

	                env.assert(ifte.else,
	                  value + '&&typeof ' + value + '==="object"',
	                  'invalid ' + prop);
	                checkProp(ifte.else, prop + '.rgb', value + '.rgb');
	                checkProp(ifte.else, prop + '.alpha', value + '.alpha');
	              });

	              ifte.then(
	                RGB, '=', ALPHA, '=', BLEND_EQUATIONS, '[', value, '];');
	              ifte.else(
	                RGB, '=', BLEND_EQUATIONS, '[', value, '.rgb];',
	                ALPHA, '=', BLEND_EQUATIONS, '[', value, '.alpha];');

	              scope(ifte);

	              return [RGB, ALPHA]
	            })

	        case S_BLEND_COLOR:
	          return parseParam(
	            function (value) {
	              check$1.command(
	                isArrayLike(value) &&
	                value.length === 4,
	                'blend.color must be a 4d array', env.commandStr);
	              return loop(4, function (i) {
	                return +value[i]
	              })
	            },
	            function (env, scope, value) {
	              check$1.optional(function () {
	                env.assert(scope,
	                  env.shared.isArrayLike + '(' + value + ')&&' +
	                  value + '.length===4',
	                  'blend.color must be a 4d array');
	              });
	              return loop(4, function (i) {
	                return scope.def('+', value, '[', i, ']')
	              })
	            })

	        case S_STENCIL_MASK:
	          return parseParam(
	            function (value) {
	              check$1.commandType(value, 'number', param, env.commandStr);
	              return value | 0
	            },
	            function (env, scope, value) {
	              check$1.optional(function () {
	                env.assert(scope,
	                  'typeof ' + value + '==="number"',
	                  'invalid stencil.mask');
	              });
	              return scope.def(value, '|0')
	            })

	        case S_STENCIL_FUNC:
	          return parseParam(
	            function (value) {
	              check$1.commandType(value, 'object', param, env.commandStr);
	              var cmp = value.cmp || 'keep';
	              var ref = value.ref || 0;
	              var mask = 'mask' in value ? value.mask : -1;
	              check$1.commandParameter(cmp, compareFuncs, prop + '.cmp', env.commandStr);
	              check$1.commandType(ref, 'number', prop + '.ref', env.commandStr);
	              check$1.commandType(mask, 'number', prop + '.mask', env.commandStr);
	              return [
	                compareFuncs[cmp],
	                ref,
	                mask
	              ]
	            },
	            function (env, scope, value) {
	              var COMPARE_FUNCS = env.constants.compareFuncs;
	              check$1.optional(function () {
	                function assert () {
	                  env.assert(scope,
	                    Array.prototype.join.call(arguments, ''),
	                    'invalid stencil.func');
	                }
	                assert(value + '&&typeof ', value, '==="object"');
	                assert('!("cmp" in ', value, ')||(',
	                  value, '.cmp in ', COMPARE_FUNCS, ')');
	              });
	              var cmp = scope.def(
	                '"cmp" in ', value,
	                '?', COMPARE_FUNCS, '[', value, '.cmp]',
	                ':', GL_KEEP);
	              var ref = scope.def(value, '.ref|0');
	              var mask = scope.def(
	                '"mask" in ', value,
	                '?', value, '.mask|0:-1');
	              return [cmp, ref, mask]
	            })

	        case S_STENCIL_OPFRONT:
	        case S_STENCIL_OPBACK:
	          return parseParam(
	            function (value) {
	              check$1.commandType(value, 'object', param, env.commandStr);
	              var fail = value.fail || 'keep';
	              var zfail = value.zfail || 'keep';
	              var zpass = value.zpass || 'keep';
	              check$1.commandParameter(fail, stencilOps, prop + '.fail', env.commandStr);
	              check$1.commandParameter(zfail, stencilOps, prop + '.zfail', env.commandStr);
	              check$1.commandParameter(zpass, stencilOps, prop + '.zpass', env.commandStr);
	              return [
	                prop === S_STENCIL_OPBACK ? GL_BACK : GL_FRONT,
	                stencilOps[fail],
	                stencilOps[zfail],
	                stencilOps[zpass]
	              ]
	            },
	            function (env, scope, value) {
	              var STENCIL_OPS = env.constants.stencilOps;

	              check$1.optional(function () {
	                env.assert(scope,
	                  value + '&&typeof ' + value + '==="object"',
	                  'invalid ' + prop);
	              });

	              function read (name) {
	                check$1.optional(function () {
	                  env.assert(scope,
	                    '!("' + name + '" in ' + value + ')||' +
	                    '(' + value + '.' + name + ' in ' + STENCIL_OPS + ')',
	                    'invalid ' + prop + '.' + name + ', must be one of ' + Object.keys(stencilOps));
	                });

	                return scope.def(
	                  '"', name, '" in ', value,
	                  '?', STENCIL_OPS, '[', value, '.', name, ']:',
	                  GL_KEEP)
	              }

	              return [
	                prop === S_STENCIL_OPBACK ? GL_BACK : GL_FRONT,
	                read('fail'),
	                read('zfail'),
	                read('zpass')
	              ]
	            })

	        case S_POLYGON_OFFSET_OFFSET:
	          return parseParam(
	            function (value) {
	              check$1.commandType(value, 'object', param, env.commandStr);
	              var factor = value.factor | 0;
	              var units = value.units | 0;
	              check$1.commandType(factor, 'number', param + '.factor', env.commandStr);
	              check$1.commandType(units, 'number', param + '.units', env.commandStr);
	              return [factor, units]
	            },
	            function (env, scope, value) {
	              check$1.optional(function () {
	                env.assert(scope,
	                  value + '&&typeof ' + value + '==="object"',
	                  'invalid ' + prop);
	              });

	              var FACTOR = scope.def(value, '.factor|0');
	              var UNITS = scope.def(value, '.units|0');

	              return [FACTOR, UNITS]
	            })

	        case S_CULL_FACE:
	          return parseParam(
	            function (value) {
	              var face = 0;
	              if (value === 'front') {
	                face = GL_FRONT;
	              } else if (value === 'back') {
	                face = GL_BACK;
	              }
	              check$1.command(!!face, param, env.commandStr);
	              return face
	            },
	            function (env, scope, value) {
	              check$1.optional(function () {
	                env.assert(scope,
	                  value + '==="front"||' +
	                  value + '==="back"',
	                  'invalid cull.face');
	              });
	              return scope.def(value, '==="front"?', GL_FRONT, ':', GL_BACK)
	            })

	        case S_LINE_WIDTH:
	          return parseParam(
	            function (value) {
	              check$1.command(
	                typeof value === 'number' &&
	                value >= limits.lineWidthDims[0] &&
	                value <= limits.lineWidthDims[1],
	                'invalid line width, must be a positive number between ' +
	                limits.lineWidthDims[0] + ' and ' + limits.lineWidthDims[1], env.commandStr);
	              return value
	            },
	            function (env, scope, value) {
	              check$1.optional(function () {
	                env.assert(scope,
	                  'typeof ' + value + '==="number"&&' +
	                  value + '>=' + limits.lineWidthDims[0] + '&&' +
	                  value + '<=' + limits.lineWidthDims[1],
	                  'invalid line width');
	              });

	              return value
	            })

	        case S_FRONT_FACE:
	          return parseParam(
	            function (value) {
	              check$1.commandParameter(value, orientationType, param, env.commandStr);
	              return orientationType[value]
	            },
	            function (env, scope, value) {
	              check$1.optional(function () {
	                env.assert(scope,
	                  value + '==="cw"||' +
	                  value + '==="ccw"',
	                  'invalid frontFace, must be one of cw,ccw');
	              });
	              return scope.def(value + '==="cw"?' + GL_CW + ':' + GL_CCW)
	            })

	        case S_COLOR_MASK:
	          return parseParam(
	            function (value) {
	              check$1.command(
	                isArrayLike(value) && value.length === 4,
	                'color.mask must be length 4 array', env.commandStr);
	              return value.map(function (v) { return !!v })
	            },
	            function (env, scope, value) {
	              check$1.optional(function () {
	                env.assert(scope,
	                  env.shared.isArrayLike + '(' + value + ')&&' +
	                  value + '.length===4',
	                  'invalid color.mask');
	              });
	              return loop(4, function (i) {
	                return '!!' + value + '[' + i + ']'
	              })
	            })

	        case S_SAMPLE_COVERAGE:
	          return parseParam(
	            function (value) {
	              check$1.command(typeof value === 'object' && value, param, env.commandStr);
	              var sampleValue = 'value' in value ? value.value : 1;
	              var sampleInvert = !!value.invert;
	              check$1.command(
	                typeof sampleValue === 'number' &&
	                sampleValue >= 0 && sampleValue <= 1,
	                'sample.coverage.value must be a number between 0 and 1', env.commandStr);
	              return [sampleValue, sampleInvert]
	            },
	            function (env, scope, value) {
	              check$1.optional(function () {
	                env.assert(scope,
	                  value + '&&typeof ' + value + '==="object"',
	                  'invalid sample.coverage');
	              });
	              var VALUE = scope.def(
	                '"value" in ', value, '?+', value, '.value:1');
	              var INVERT = scope.def('!!', value, '.invert');
	              return [VALUE, INVERT]
	            })
	      }
	    });

	    return STATE
	  }

	  function parseUniforms (uniforms, env) {
	    var staticUniforms = uniforms.static;
	    var dynamicUniforms = uniforms.dynamic;

	    var UNIFORMS = {};

	    Object.keys(staticUniforms).forEach(function (name) {
	      var value = staticUniforms[name];
	      var result;
	      if (typeof value === 'number' ||
	          typeof value === 'boolean') {
	        result = createStaticDecl(function () {
	          return value
	        });
	      } else if (typeof value === 'function') {
	        var reglType = value._reglType;
	        if (reglType === 'texture2d' ||
	            reglType === 'textureCube') {
	          result = createStaticDecl(function (env) {
	            return env.link(value)
	          });
	        } else if (reglType === 'framebuffer' ||
	                   reglType === 'framebufferCube') {
	          check$1.command(value.color.length > 0,
	            'missing color attachment for framebuffer sent to uniform "' + name + '"', env.commandStr);
	          result = createStaticDecl(function (env) {
	            return env.link(value.color[0])
	          });
	        } else {
	          check$1.commandRaise('invalid data for uniform "' + name + '"', env.commandStr);
	        }
	      } else if (isArrayLike(value)) {
	        result = createStaticDecl(function (env) {
	          var ITEM = env.global.def('[',
	            loop(value.length, function (i) {
	              check$1.command(
	                typeof value[i] === 'number' ||
	                typeof value[i] === 'boolean',
	                'invalid uniform ' + name, env.commandStr);
	              return value[i]
	            }), ']');
	          return ITEM
	        });
	      } else {
	        check$1.commandRaise('invalid or missing data for uniform "' + name + '"', env.commandStr);
	      }
	      result.value = value;
	      UNIFORMS[name] = result;
	    });

	    Object.keys(dynamicUniforms).forEach(function (key) {
	      var dyn = dynamicUniforms[key];
	      UNIFORMS[key] = createDynamicDecl(dyn, function (env, scope) {
	        return env.invoke(scope, dyn)
	      });
	    });

	    return UNIFORMS
	  }

	  function parseAttributes (attributes, env) {
	    var staticAttributes = attributes.static;
	    var dynamicAttributes = attributes.dynamic;

	    var attributeDefs = {};

	    Object.keys(staticAttributes).forEach(function (attribute) {
	      var value = staticAttributes[attribute];
	      var id = stringStore.id(attribute);

	      var record = new AttributeRecord();
	      if (isBufferArgs(value)) {
	        record.state = ATTRIB_STATE_POINTER;
	        record.buffer = bufferState.getBuffer(
	          bufferState.create(value, GL_ARRAY_BUFFER$2, false, true));
	        record.type = 0;
	      } else {
	        var buffer = bufferState.getBuffer(value);
	        if (buffer) {
	          record.state = ATTRIB_STATE_POINTER;
	          record.buffer = buffer;
	          record.type = 0;
	        } else {
	          check$1.command(typeof value === 'object' && value,
	            'invalid data for attribute ' + attribute, env.commandStr);
	          if ('constant' in value) {
	            var constant = value.constant;
	            record.buffer = 'null';
	            record.state = ATTRIB_STATE_CONSTANT;
	            if (typeof constant === 'number') {
	              record.x = constant;
	            } else {
	              check$1.command(
	                isArrayLike(constant) &&
	                constant.length > 0 &&
	                constant.length <= 4,
	                'invalid constant for attribute ' + attribute, env.commandStr);
	              CUTE_COMPONENTS.forEach(function (c, i) {
	                if (i < constant.length) {
	                  record[c] = constant[i];
	                }
	              });
	            }
	          } else {
	            if (isBufferArgs(value.buffer)) {
	              buffer = bufferState.getBuffer(
	                bufferState.create(value.buffer, GL_ARRAY_BUFFER$2, false, true));
	            } else {
	              buffer = bufferState.getBuffer(value.buffer);
	            }
	            check$1.command(!!buffer, 'missing buffer for attribute "' + attribute + '"', env.commandStr);

	            var offset = value.offset | 0;
	            check$1.command(offset >= 0,
	              'invalid offset for attribute "' + attribute + '"', env.commandStr);

	            var stride = value.stride | 0;
	            check$1.command(stride >= 0 && stride < 256,
	              'invalid stride for attribute "' + attribute + '", must be integer betweeen [0, 255]', env.commandStr);

	            var size = value.size | 0;
	            check$1.command(!('size' in value) || (size > 0 && size <= 4),
	              'invalid size for attribute "' + attribute + '", must be 1,2,3,4', env.commandStr);

	            var normalized = !!value.normalized;

	            var type = 0;
	            if ('type' in value) {
	              check$1.commandParameter(
	                value.type, glTypes,
	                'invalid type for attribute ' + attribute, env.commandStr);
	              type = glTypes[value.type];
	            }

	            var divisor = value.divisor | 0;
	            if ('divisor' in value) {
	              check$1.command(divisor === 0 || extInstancing,
	                'cannot specify divisor for attribute "' + attribute + '", instancing not supported', env.commandStr);
	              check$1.command(divisor >= 0,
	                'invalid divisor for attribute "' + attribute + '"', env.commandStr);
	            }

	            check$1.optional(function () {
	              var command = env.commandStr;

	              var VALID_KEYS = [
	                'buffer',
	                'offset',
	                'divisor',
	                'normalized',
	                'type',
	                'size',
	                'stride'
	              ];

	              Object.keys(value).forEach(function (prop) {
	                check$1.command(
	                  VALID_KEYS.indexOf(prop) >= 0,
	                  'unknown parameter "' + prop + '" for attribute pointer "' + attribute + '" (valid parameters are ' + VALID_KEYS + ')',
	                  command);
	              });
	            });

	            record.buffer = buffer;
	            record.state = ATTRIB_STATE_POINTER;
	            record.size = size;
	            record.normalized = normalized;
	            record.type = type || buffer.dtype;
	            record.offset = offset;
	            record.stride = stride;
	            record.divisor = divisor;
	          }
	        }
	      }

	      attributeDefs[attribute] = createStaticDecl(function (env, scope) {
	        var cache = env.attribCache;
	        if (id in cache) {
	          return cache[id]
	        }
	        var result = {
	          isStream: false
	        };
	        Object.keys(record).forEach(function (key) {
	          result[key] = record[key];
	        });
	        if (record.buffer) {
	          result.buffer = env.link(record.buffer);
	          result.type = result.type || (result.buffer + '.dtype');
	        }
	        cache[id] = result;
	        return result
	      });
	    });

	    Object.keys(dynamicAttributes).forEach(function (attribute) {
	      var dyn = dynamicAttributes[attribute];

	      function appendAttributeCode (env, block) {
	        var VALUE = env.invoke(block, dyn);

	        var shared = env.shared;
	        var constants = env.constants;

	        var IS_BUFFER_ARGS = shared.isBufferArgs;
	        var BUFFER_STATE = shared.buffer;

	        // Perform validation on attribute
	        check$1.optional(function () {
	          env.assert(block,
	            VALUE + '&&(typeof ' + VALUE + '==="object"||typeof ' +
	            VALUE + '==="function")&&(' +
	            IS_BUFFER_ARGS + '(' + VALUE + ')||' +
	            BUFFER_STATE + '.getBuffer(' + VALUE + ')||' +
	            BUFFER_STATE + '.getBuffer(' + VALUE + '.buffer)||' +
	            IS_BUFFER_ARGS + '(' + VALUE + '.buffer)||' +
	            '("constant" in ' + VALUE +
	            '&&(typeof ' + VALUE + '.constant==="number"||' +
	            shared.isArrayLike + '(' + VALUE + '.constant))))',
	            'invalid dynamic attribute "' + attribute + '"');
	        });

	        // allocate names for result
	        var result = {
	          isStream: block.def(false)
	        };
	        var defaultRecord = new AttributeRecord();
	        defaultRecord.state = ATTRIB_STATE_POINTER;
	        Object.keys(defaultRecord).forEach(function (key) {
	          result[key] = block.def('' + defaultRecord[key]);
	        });

	        var BUFFER = result.buffer;
	        var TYPE = result.type;
	        block(
	          'if(', IS_BUFFER_ARGS, '(', VALUE, ')){',
	          result.isStream, '=true;',
	          BUFFER, '=', BUFFER_STATE, '.createStream(', GL_ARRAY_BUFFER$2, ',', VALUE, ');',
	          TYPE, '=', BUFFER, '.dtype;',
	          '}else{',
	          BUFFER, '=', BUFFER_STATE, '.getBuffer(', VALUE, ');',
	          'if(', BUFFER, '){',
	          TYPE, '=', BUFFER, '.dtype;',
	          '}else if("constant" in ', VALUE, '){',
	          result.state, '=', ATTRIB_STATE_CONSTANT, ';',
	          'if(typeof ' + VALUE + '.constant === "number"){',
	          result[CUTE_COMPONENTS[0]], '=', VALUE, '.constant;',
	          CUTE_COMPONENTS.slice(1).map(function (n) {
	            return result[n]
	          }).join('='), '=0;',
	          '}else{',
	          CUTE_COMPONENTS.map(function (name, i) {
	            return (
	              result[name] + '=' + VALUE + '.constant.length>' + i +
	              '?' + VALUE + '.constant[' + i + ']:0;'
	            )
	          }).join(''),
	          '}}else{',
	          'if(', IS_BUFFER_ARGS, '(', VALUE, '.buffer)){',
	          BUFFER, '=', BUFFER_STATE, '.createStream(', GL_ARRAY_BUFFER$2, ',', VALUE, '.buffer);',
	          '}else{',
	          BUFFER, '=', BUFFER_STATE, '.getBuffer(', VALUE, '.buffer);',
	          '}',
	          TYPE, '="type" in ', VALUE, '?',
	          constants.glTypes, '[', VALUE, '.type]:', BUFFER, '.dtype;',
	          result.normalized, '=!!', VALUE, '.normalized;');
	        function emitReadRecord (name) {
	          block(result[name], '=', VALUE, '.', name, '|0;');
	        }
	        emitReadRecord('size');
	        emitReadRecord('offset');
	        emitReadRecord('stride');
	        emitReadRecord('divisor');

	        block('}}');

	        block.exit(
	          'if(', result.isStream, '){',
	          BUFFER_STATE, '.destroyStream(', BUFFER, ');',
	          '}');

	        return result
	      }

	      attributeDefs[attribute] = createDynamicDecl(dyn, appendAttributeCode);
	    });

	    return attributeDefs
	  }

	  function parseVAO (options, env) {
	    var staticOptions = options.static;
	    var dynamicOptions = options.dynamic;
	    if (S_VAO in staticOptions) {
	      var vao = staticOptions[S_VAO];
	      if (vao !== null && attributeState.getVAO(vao) === null) {
	        vao = attributeState.createVAO(vao);
	      }
	      return createStaticDecl(function (env) {
	        return env.link(attributeState.getVAO(vao))
	      })
	    } else if (S_VAO in dynamicOptions) {
	      var dyn = dynamicOptions[S_VAO];
	      return createDynamicDecl(dyn, function (env, scope) {
	        var vaoRef = env.invoke(scope, dyn);
	        return scope.def(env.shared.vao + '.getVAO(' + vaoRef + ')')
	      })
	    }
	    return null
	  }

	  function parseContext (context) {
	    var staticContext = context.static;
	    var dynamicContext = context.dynamic;
	    var result = {};

	    Object.keys(staticContext).forEach(function (name) {
	      var value = staticContext[name];
	      result[name] = createStaticDecl(function (env, scope) {
	        if (typeof value === 'number' || typeof value === 'boolean') {
	          return '' + value
	        } else {
	          return env.link(value)
	        }
	      });
	    });

	    Object.keys(dynamicContext).forEach(function (name) {
	      var dyn = dynamicContext[name];
	      result[name] = createDynamicDecl(dyn, function (env, scope) {
	        return env.invoke(scope, dyn)
	      });
	    });

	    return result
	  }

	  function parseArguments (options, attributes, uniforms, context, env) {
	    var staticOptions = options.static;
	    var dynamicOptions = options.dynamic;

	    check$1.optional(function () {
	      var KEY_NAMES = [
	        S_FRAMEBUFFER,
	        S_VERT,
	        S_FRAG,
	        S_ELEMENTS,
	        S_PRIMITIVE,
	        S_OFFSET,
	        S_COUNT,
	        S_INSTANCES,
	        S_PROFILE,
	        S_VAO
	      ].concat(GL_STATE_NAMES);

	      function checkKeys (dict) {
	        Object.keys(dict).forEach(function (key) {
	          check$1.command(
	            KEY_NAMES.indexOf(key) >= 0,
	            'unknown parameter "' + key + '"',
	            env.commandStr);
	        });
	      }

	      checkKeys(staticOptions);
	      checkKeys(dynamicOptions);
	    });

	    var attribLocations = parseAttribLocations(options, attributes);

	    var framebuffer = parseFramebuffer(options);
	    var viewportAndScissor = parseViewportScissor(options, framebuffer, env);
	    var draw = parseDraw(options, env);
	    var state = parseGLState(options, env);
	    var shader = parseProgram(options, env, attribLocations);

	    function copyBox (name) {
	      var defn = viewportAndScissor[name];
	      if (defn) {
	        state[name] = defn;
	      }
	    }
	    copyBox(S_VIEWPORT);
	    copyBox(propName(S_SCISSOR_BOX));

	    var dirty = Object.keys(state).length > 0;

	    var result = {
	      framebuffer: framebuffer,
	      draw: draw,
	      shader: shader,
	      state: state,
	      dirty: dirty,
	      scopeVAO: null,
	      drawVAO: null,
	      useVAO: false,
	      attributes: {}
	    };

	    result.profile = parseProfile(options);
	    result.uniforms = parseUniforms(uniforms, env);
	    result.drawVAO = result.scopeVAO = parseVAO(options);
	    // special case: check if we can statically allocate a vertex array object for this program
	    if (!result.drawVAO && shader.program && !attribLocations && extensions.angle_instanced_arrays) {
	      var useVAO = true;
	      var staticBindings = shader.program.attributes.map(function (attr) {
	        var binding = attributes.static[attr];
	        useVAO = useVAO && !!binding;
	        return binding
	      });
	      if (useVAO && staticBindings.length > 0) {
	        var vao = attributeState.getVAO(attributeState.createVAO(staticBindings));
	        result.drawVAO = new Declaration(null, null, null, function (env, scope) {
	          return env.link(vao)
	        });
	        result.useVAO = true;
	      }
	    }
	    if (attribLocations) {
	      result.useVAO = true;
	    } else {
	      result.attributes = parseAttributes(attributes, env);
	    }
	    result.context = parseContext(context);
	    return result
	  }

	  // ===================================================
	  // ===================================================
	  // COMMON UPDATE FUNCTIONS
	  // ===================================================
	  // ===================================================
	  function emitContext (env, scope, context) {
	    var shared = env.shared;
	    var CONTEXT = shared.context;

	    var contextEnter = env.scope();

	    Object.keys(context).forEach(function (name) {
	      scope.save(CONTEXT, '.' + name);
	      var defn = context[name];
	      var value = defn.append(env, scope);
	      if (Array.isArray(value)) {
	        contextEnter(CONTEXT, '.', name, '=[', value.join(), '];');
	      } else {
	        contextEnter(CONTEXT, '.', name, '=', value, ';');
	      }
	    });

	    scope(contextEnter);
	  }

	  // ===================================================
	  // ===================================================
	  // COMMON DRAWING FUNCTIONS
	  // ===================================================
	  // ===================================================
	  function emitPollFramebuffer (env, scope, framebuffer, skipCheck) {
	    var shared = env.shared;

	    var GL = shared.gl;
	    var FRAMEBUFFER_STATE = shared.framebuffer;
	    var EXT_DRAW_BUFFERS;
	    if (extDrawBuffers) {
	      EXT_DRAW_BUFFERS = scope.def(shared.extensions, '.webgl_draw_buffers');
	    }

	    var constants = env.constants;

	    var DRAW_BUFFERS = constants.drawBuffer;
	    var BACK_BUFFER = constants.backBuffer;

	    var NEXT;
	    if (framebuffer) {
	      NEXT = framebuffer.append(env, scope);
	    } else {
	      NEXT = scope.def(FRAMEBUFFER_STATE, '.next');
	    }

	    if (!skipCheck) {
	      scope('if(', NEXT, '!==', FRAMEBUFFER_STATE, '.cur){');
	    }
	    scope(
	      'if(', NEXT, '){',
	      GL, '.bindFramebuffer(', GL_FRAMEBUFFER$2, ',', NEXT, '.framebuffer);');
	    if (extDrawBuffers) {
	      scope(EXT_DRAW_BUFFERS, '.drawBuffersWEBGL(',
	        DRAW_BUFFERS, '[', NEXT, '.colorAttachments.length]);');
	    }
	    scope('}else{',
	      GL, '.bindFramebuffer(', GL_FRAMEBUFFER$2, ',null);');
	    if (extDrawBuffers) {
	      scope(EXT_DRAW_BUFFERS, '.drawBuffersWEBGL(', BACK_BUFFER, ');');
	    }
	    scope(
	      '}',
	      FRAMEBUFFER_STATE, '.cur=', NEXT, ';');
	    if (!skipCheck) {
	      scope('}');
	    }
	  }

	  function emitPollState (env, scope, args) {
	    var shared = env.shared;

	    var GL = shared.gl;

	    var CURRENT_VARS = env.current;
	    var NEXT_VARS = env.next;
	    var CURRENT_STATE = shared.current;
	    var NEXT_STATE = shared.next;

	    var block = env.cond(CURRENT_STATE, '.dirty');

	    GL_STATE_NAMES.forEach(function (prop) {
	      var param = propName(prop);
	      if (param in args.state) {
	        return
	      }

	      var NEXT, CURRENT;
	      if (param in NEXT_VARS) {
	        NEXT = NEXT_VARS[param];
	        CURRENT = CURRENT_VARS[param];
	        var parts = loop(currentState[param].length, function (i) {
	          return block.def(NEXT, '[', i, ']')
	        });
	        block(env.cond(parts.map(function (p, i) {
	          return p + '!==' + CURRENT + '[' + i + ']'
	        }).join('||'))
	          .then(
	            GL, '.', GL_VARIABLES[param], '(', parts, ');',
	            parts.map(function (p, i) {
	              return CURRENT + '[' + i + ']=' + p
	            }).join(';'), ';'));
	      } else {
	        NEXT = block.def(NEXT_STATE, '.', param);
	        var ifte = env.cond(NEXT, '!==', CURRENT_STATE, '.', param);
	        block(ifte);
	        if (param in GL_FLAGS) {
	          ifte(
	            env.cond(NEXT)
	              .then(GL, '.enable(', GL_FLAGS[param], ');')
	              .else(GL, '.disable(', GL_FLAGS[param], ');'),
	            CURRENT_STATE, '.', param, '=', NEXT, ';');
	        } else {
	          ifte(
	            GL, '.', GL_VARIABLES[param], '(', NEXT, ');',
	            CURRENT_STATE, '.', param, '=', NEXT, ';');
	        }
	      }
	    });
	    if (Object.keys(args.state).length === 0) {
	      block(CURRENT_STATE, '.dirty=false;');
	    }
	    scope(block);
	  }

	  function emitSetOptions (env, scope, options, filter) {
	    var shared = env.shared;
	    var CURRENT_VARS = env.current;
	    var CURRENT_STATE = shared.current;
	    var GL = shared.gl;
	    sortState(Object.keys(options)).forEach(function (param) {
	      var defn = options[param];
	      if (filter && !filter(defn)) {
	        return
	      }
	      var variable = defn.append(env, scope);
	      if (GL_FLAGS[param]) {
	        var flag = GL_FLAGS[param];
	        if (isStatic(defn)) {
	          if (variable) {
	            scope(GL, '.enable(', flag, ');');
	          } else {
	            scope(GL, '.disable(', flag, ');');
	          }
	        } else {
	          scope(env.cond(variable)
	            .then(GL, '.enable(', flag, ');')
	            .else(GL, '.disable(', flag, ');'));
	        }
	        scope(CURRENT_STATE, '.', param, '=', variable, ';');
	      } else if (isArrayLike(variable)) {
	        var CURRENT = CURRENT_VARS[param];
	        scope(
	          GL, '.', GL_VARIABLES[param], '(', variable, ');',
	          variable.map(function (v, i) {
	            return CURRENT + '[' + i + ']=' + v
	          }).join(';'), ';');
	      } else {
	        scope(
	          GL, '.', GL_VARIABLES[param], '(', variable, ');',
	          CURRENT_STATE, '.', param, '=', variable, ';');
	      }
	    });
	  }

	  function injectExtensions (env, scope) {
	    if (extInstancing) {
	      env.instancing = scope.def(
	        env.shared.extensions, '.angle_instanced_arrays');
	    }
	  }

	  function emitProfile (env, scope, args, useScope, incrementCounter) {
	    var shared = env.shared;
	    var STATS = env.stats;
	    var CURRENT_STATE = shared.current;
	    var TIMER = shared.timer;
	    var profileArg = args.profile;

	    function perfCounter () {
	      if (typeof performance === 'undefined') {
	        return 'Date.now()'
	      } else {
	        return 'performance.now()'
	      }
	    }

	    var CPU_START, QUERY_COUNTER;
	    function emitProfileStart (block) {
	      CPU_START = scope.def();
	      block(CPU_START, '=', perfCounter(), ';');
	      if (typeof incrementCounter === 'string') {
	        block(STATS, '.count+=', incrementCounter, ';');
	      } else {
	        block(STATS, '.count++;');
	      }
	      if (timer) {
	        if (useScope) {
	          QUERY_COUNTER = scope.def();
	          block(QUERY_COUNTER, '=', TIMER, '.getNumPendingQueries();');
	        } else {
	          block(TIMER, '.beginQuery(', STATS, ');');
	        }
	      }
	    }

	    function emitProfileEnd (block) {
	      block(STATS, '.cpuTime+=', perfCounter(), '-', CPU_START, ';');
	      if (timer) {
	        if (useScope) {
	          block(TIMER, '.pushScopeStats(',
	            QUERY_COUNTER, ',',
	            TIMER, '.getNumPendingQueries(),',
	            STATS, ');');
	        } else {
	          block(TIMER, '.endQuery();');
	        }
	      }
	    }

	    function scopeProfile (value) {
	      var prev = scope.def(CURRENT_STATE, '.profile');
	      scope(CURRENT_STATE, '.profile=', value, ';');
	      scope.exit(CURRENT_STATE, '.profile=', prev, ';');
	    }

	    var USE_PROFILE;
	    if (profileArg) {
	      if (isStatic(profileArg)) {
	        if (profileArg.enable) {
	          emitProfileStart(scope);
	          emitProfileEnd(scope.exit);
	          scopeProfile('true');
	        } else {
	          scopeProfile('false');
	        }
	        return
	      }
	      USE_PROFILE = profileArg.append(env, scope);
	      scopeProfile(USE_PROFILE);
	    } else {
	      USE_PROFILE = scope.def(CURRENT_STATE, '.profile');
	    }

	    var start = env.block();
	    emitProfileStart(start);
	    scope('if(', USE_PROFILE, '){', start, '}');
	    var end = env.block();
	    emitProfileEnd(end);
	    scope.exit('if(', USE_PROFILE, '){', end, '}');
	  }

	  function emitAttributes (env, scope, args, attributes, filter) {
	    var shared = env.shared;

	    function typeLength (x) {
	      switch (x) {
	        case GL_FLOAT_VEC2:
	        case GL_INT_VEC2:
	        case GL_BOOL_VEC2:
	          return 2
	        case GL_FLOAT_VEC3:
	        case GL_INT_VEC3:
	        case GL_BOOL_VEC3:
	          return 3
	        case GL_FLOAT_VEC4:
	        case GL_INT_VEC4:
	        case GL_BOOL_VEC4:
	          return 4
	        default:
	          return 1
	      }
	    }

	    function emitBindAttribute (ATTRIBUTE, size, record) {
	      var GL = shared.gl;

	      var LOCATION = scope.def(ATTRIBUTE, '.location');
	      var BINDING = scope.def(shared.attributes, '[', LOCATION, ']');

	      var STATE = record.state;
	      var BUFFER = record.buffer;
	      var CONST_COMPONENTS = [
	        record.x,
	        record.y,
	        record.z,
	        record.w
	      ];

	      var COMMON_KEYS = [
	        'buffer',
	        'normalized',
	        'offset',
	        'stride'
	      ];

	      function emitBuffer () {
	        scope(
	          'if(!', BINDING, '.buffer){',
	          GL, '.enableVertexAttribArray(', LOCATION, ');}');

	        var TYPE = record.type;
	        var SIZE;
	        if (!record.size) {
	          SIZE = size;
	        } else {
	          SIZE = scope.def(record.size, '||', size);
	        }

	        scope('if(',
	          BINDING, '.type!==', TYPE, '||',
	          BINDING, '.size!==', SIZE, '||',
	          COMMON_KEYS.map(function (key) {
	            return BINDING + '.' + key + '!==' + record[key]
	          }).join('||'),
	          '){',
	          GL, '.bindBuffer(', GL_ARRAY_BUFFER$2, ',', BUFFER, '.buffer);',
	          GL, '.vertexAttribPointer(', [
	            LOCATION,
	            SIZE,
	            TYPE,
	            record.normalized,
	            record.stride,
	            record.offset
	          ], ');',
	          BINDING, '.type=', TYPE, ';',
	          BINDING, '.size=', SIZE, ';',
	          COMMON_KEYS.map(function (key) {
	            return BINDING + '.' + key + '=' + record[key] + ';'
	          }).join(''),
	          '}');

	        if (extInstancing) {
	          var DIVISOR = record.divisor;
	          scope(
	            'if(', BINDING, '.divisor!==', DIVISOR, '){',
	            env.instancing, '.vertexAttribDivisorANGLE(', [LOCATION, DIVISOR], ');',
	            BINDING, '.divisor=', DIVISOR, ';}');
	        }
	      }

	      function emitConstant () {
	        scope(
	          'if(', BINDING, '.buffer){',
	          GL, '.disableVertexAttribArray(', LOCATION, ');',
	          BINDING, '.buffer=null;',
	          '}if(', CUTE_COMPONENTS.map(function (c, i) {
	            return BINDING + '.' + c + '!==' + CONST_COMPONENTS[i]
	          }).join('||'), '){',
	          GL, '.vertexAttrib4f(', LOCATION, ',', CONST_COMPONENTS, ');',
	          CUTE_COMPONENTS.map(function (c, i) {
	            return BINDING + '.' + c + '=' + CONST_COMPONENTS[i] + ';'
	          }).join(''),
	          '}');
	      }

	      if (STATE === ATTRIB_STATE_POINTER) {
	        emitBuffer();
	      } else if (STATE === ATTRIB_STATE_CONSTANT) {
	        emitConstant();
	      } else {
	        scope('if(', STATE, '===', ATTRIB_STATE_POINTER, '){');
	        emitBuffer();
	        scope('}else{');
	        emitConstant();
	        scope('}');
	      }
	    }

	    attributes.forEach(function (attribute) {
	      var name = attribute.name;
	      var arg = args.attributes[name];
	      var record;
	      if (arg) {
	        if (!filter(arg)) {
	          return
	        }
	        record = arg.append(env, scope);
	      } else {
	        if (!filter(SCOPE_DECL)) {
	          return
	        }
	        var scopeAttrib = env.scopeAttrib(name);
	        check$1.optional(function () {
	          env.assert(scope,
	            scopeAttrib + '.state',
	            'missing attribute ' + name);
	        });
	        record = {};
	        Object.keys(new AttributeRecord()).forEach(function (key) {
	          record[key] = scope.def(scopeAttrib, '.', key);
	        });
	      }
	      emitBindAttribute(
	        env.link(attribute), typeLength(attribute.info.type), record);
	    });
	  }

	  function emitUniforms (env, scope, args, uniforms, filter) {
	    var shared = env.shared;
	    var GL = shared.gl;

	    var infix;
	    for (var i = 0; i < uniforms.length; ++i) {
	      var uniform = uniforms[i];
	      var name = uniform.name;
	      var type = uniform.info.type;
	      var arg = args.uniforms[name];
	      var UNIFORM = env.link(uniform);
	      var LOCATION = UNIFORM + '.location';

	      var VALUE;
	      if (arg) {
	        if (!filter(arg)) {
	          continue
	        }
	        if (isStatic(arg)) {
	          var value = arg.value;
	          check$1.command(
	            value !== null && typeof value !== 'undefined',
	            'missing uniform "' + name + '"', env.commandStr);
	          if (type === GL_SAMPLER_2D || type === GL_SAMPLER_CUBE) {
	            check$1.command(
	              typeof value === 'function' &&
	              ((type === GL_SAMPLER_2D &&
	                (value._reglType === 'texture2d' ||
	                value._reglType === 'framebuffer')) ||
	              (type === GL_SAMPLER_CUBE &&
	                (value._reglType === 'textureCube' ||
	                value._reglType === 'framebufferCube'))),
	              'invalid texture for uniform ' + name, env.commandStr);
	            var TEX_VALUE = env.link(value._texture || value.color[0]._texture);
	            scope(GL, '.uniform1i(', LOCATION, ',', TEX_VALUE + '.bind());');
	            scope.exit(TEX_VALUE, '.unbind();');
	          } else if (
	            type === GL_FLOAT_MAT2 ||
	            type === GL_FLOAT_MAT3 ||
	            type === GL_FLOAT_MAT4) {
	            check$1.optional(function () {
	              check$1.command(isArrayLike(value),
	                'invalid matrix for uniform ' + name, env.commandStr);
	              check$1.command(
	                (type === GL_FLOAT_MAT2 && value.length === 4) ||
	                (type === GL_FLOAT_MAT3 && value.length === 9) ||
	                (type === GL_FLOAT_MAT4 && value.length === 16),
	                'invalid length for matrix uniform ' + name, env.commandStr);
	            });
	            var MAT_VALUE = env.global.def('new Float32Array([' +
	              Array.prototype.slice.call(value) + '])');
	            var dim = 2;
	            if (type === GL_FLOAT_MAT3) {
	              dim = 3;
	            } else if (type === GL_FLOAT_MAT4) {
	              dim = 4;
	            }
	            scope(
	              GL, '.uniformMatrix', dim, 'fv(',
	              LOCATION, ',false,', MAT_VALUE, ');');
	          } else {
	            switch (type) {
	              case GL_FLOAT$8:
	                check$1.commandType(value, 'number', 'uniform ' + name, env.commandStr);
	                infix = '1f';
	                break
	              case GL_FLOAT_VEC2:
	                check$1.command(
	                  isArrayLike(value) && value.length === 2,
	                  'uniform ' + name, env.commandStr);
	                infix = '2f';
	                break
	              case GL_FLOAT_VEC3:
	                check$1.command(
	                  isArrayLike(value) && value.length === 3,
	                  'uniform ' + name, env.commandStr);
	                infix = '3f';
	                break
	              case GL_FLOAT_VEC4:
	                check$1.command(
	                  isArrayLike(value) && value.length === 4,
	                  'uniform ' + name, env.commandStr);
	                infix = '4f';
	                break
	              case GL_BOOL:
	                check$1.commandType(value, 'boolean', 'uniform ' + name, env.commandStr);
	                infix = '1i';
	                break
	              case GL_INT$3:
	                check$1.commandType(value, 'number', 'uniform ' + name, env.commandStr);
	                infix = '1i';
	                break
	              case GL_BOOL_VEC2:
	                check$1.command(
	                  isArrayLike(value) && value.length === 2,
	                  'uniform ' + name, env.commandStr);
	                infix = '2i';
	                break
	              case GL_INT_VEC2:
	                check$1.command(
	                  isArrayLike(value) && value.length === 2,
	                  'uniform ' + name, env.commandStr);
	                infix = '2i';
	                break
	              case GL_BOOL_VEC3:
	                check$1.command(
	                  isArrayLike(value) && value.length === 3,
	                  'uniform ' + name, env.commandStr);
	                infix = '3i';
	                break
	              case GL_INT_VEC3:
	                check$1.command(
	                  isArrayLike(value) && value.length === 3,
	                  'uniform ' + name, env.commandStr);
	                infix = '3i';
	                break
	              case GL_BOOL_VEC4:
	                check$1.command(
	                  isArrayLike(value) && value.length === 4,
	                  'uniform ' + name, env.commandStr);
	                infix = '4i';
	                break
	              case GL_INT_VEC4:
	                check$1.command(
	                  isArrayLike(value) && value.length === 4,
	                  'uniform ' + name, env.commandStr);
	                infix = '4i';
	                break
	            }
	            scope(GL, '.uniform', infix, '(', LOCATION, ',',
	              isArrayLike(value) ? Array.prototype.slice.call(value) : value,
	              ');');
	          }
	          continue
	        } else {
	          VALUE = arg.append(env, scope);
	        }
	      } else {
	        if (!filter(SCOPE_DECL)) {
	          continue
	        }
	        VALUE = scope.def(shared.uniforms, '[', stringStore.id(name), ']');
	      }

	      if (type === GL_SAMPLER_2D) {
	        check$1(!Array.isArray(VALUE), 'must specify a scalar prop for textures');
	        scope(
	          'if(', VALUE, '&&', VALUE, '._reglType==="framebuffer"){',
	          VALUE, '=', VALUE, '.color[0];',
	          '}');
	      } else if (type === GL_SAMPLER_CUBE) {
	        check$1(!Array.isArray(VALUE), 'must specify a scalar prop for cube maps');
	        scope(
	          'if(', VALUE, '&&', VALUE, '._reglType==="framebufferCube"){',
	          VALUE, '=', VALUE, '.color[0];',
	          '}');
	      }

	      // perform type validation
	      check$1.optional(function () {
	        function emitCheck (pred, message) {
	          env.assert(scope, pred,
	            'bad data or missing for uniform "' + name + '".  ' + message);
	        }

	        function checkType (type) {
	          check$1(!Array.isArray(VALUE), 'must not specify an array type for uniform');
	          emitCheck(
	            'typeof ' + VALUE + '==="' + type + '"',
	            'invalid type, expected ' + type);
	        }

	        function checkVector (n, type) {
	          if (Array.isArray(VALUE)) {
	            check$1(VALUE.length === n, 'must have length ' + n);
	          } else {
	            emitCheck(
	              shared.isArrayLike + '(' + VALUE + ')&&' + VALUE + '.length===' + n,
	              'invalid vector, should have length ' + n, env.commandStr);
	          }
	        }

	        function checkTexture (target) {
	          check$1(!Array.isArray(VALUE), 'must not specify a value type');
	          emitCheck(
	            'typeof ' + VALUE + '==="function"&&' +
	            VALUE + '._reglType==="texture' +
	            (target === GL_TEXTURE_2D$3 ? '2d' : 'Cube') + '"',
	            'invalid texture type', env.commandStr);
	        }

	        switch (type) {
	          case GL_INT$3:
	            checkType('number');
	            break
	          case GL_INT_VEC2:
	            checkVector(2);
	            break
	          case GL_INT_VEC3:
	            checkVector(3);
	            break
	          case GL_INT_VEC4:
	            checkVector(4);
	            break
	          case GL_FLOAT$8:
	            checkType('number');
	            break
	          case GL_FLOAT_VEC2:
	            checkVector(2);
	            break
	          case GL_FLOAT_VEC3:
	            checkVector(3);
	            break
	          case GL_FLOAT_VEC4:
	            checkVector(4);
	            break
	          case GL_BOOL:
	            checkType('boolean');
	            break
	          case GL_BOOL_VEC2:
	            checkVector(2);
	            break
	          case GL_BOOL_VEC3:
	            checkVector(3);
	            break
	          case GL_BOOL_VEC4:
	            checkVector(4);
	            break
	          case GL_FLOAT_MAT2:
	            checkVector(4);
	            break
	          case GL_FLOAT_MAT3:
	            checkVector(9);
	            break
	          case GL_FLOAT_MAT4:
	            checkVector(16);
	            break
	          case GL_SAMPLER_2D:
	            checkTexture(GL_TEXTURE_2D$3);
	            break
	          case GL_SAMPLER_CUBE:
	            checkTexture(GL_TEXTURE_CUBE_MAP$2);
	            break
	        }
	      });

	      var unroll = 1;
	      switch (type) {
	        case GL_SAMPLER_2D:
	        case GL_SAMPLER_CUBE:
	          var TEX = scope.def(VALUE, '._texture');
	          scope(GL, '.uniform1i(', LOCATION, ',', TEX, '.bind());');
	          scope.exit(TEX, '.unbind();');
	          continue

	        case GL_INT$3:
	        case GL_BOOL:
	          infix = '1i';
	          break

	        case GL_INT_VEC2:
	        case GL_BOOL_VEC2:
	          infix = '2i';
	          unroll = 2;
	          break

	        case GL_INT_VEC3:
	        case GL_BOOL_VEC3:
	          infix = '3i';
	          unroll = 3;
	          break

	        case GL_INT_VEC4:
	        case GL_BOOL_VEC4:
	          infix = '4i';
	          unroll = 4;
	          break

	        case GL_FLOAT$8:
	          infix = '1f';
	          break

	        case GL_FLOAT_VEC2:
	          infix = '2f';
	          unroll = 2;
	          break

	        case GL_FLOAT_VEC3:
	          infix = '3f';
	          unroll = 3;
	          break

	        case GL_FLOAT_VEC4:
	          infix = '4f';
	          unroll = 4;
	          break

	        case GL_FLOAT_MAT2:
	          infix = 'Matrix2fv';
	          break

	        case GL_FLOAT_MAT3:
	          infix = 'Matrix3fv';
	          break

	        case GL_FLOAT_MAT4:
	          infix = 'Matrix4fv';
	          break
	      }

	      scope(GL, '.uniform', infix, '(', LOCATION, ',');
	      if (infix.charAt(0) === 'M') {
	        var matSize = Math.pow(type - GL_FLOAT_MAT2 + 2, 2);
	        var STORAGE = env.global.def('new Float32Array(', matSize, ')');
	        if (Array.isArray(VALUE)) {
	          scope(
	            'false,(',
	            loop(matSize, function (i) {
	              return STORAGE + '[' + i + ']=' + VALUE[i]
	            }), ',', STORAGE, ')');
	        } else {
	          scope(
	            'false,(Array.isArray(', VALUE, ')||', VALUE, ' instanceof Float32Array)?', VALUE, ':(',
	            loop(matSize, function (i) {
	              return STORAGE + '[' + i + ']=' + VALUE + '[' + i + ']'
	            }), ',', STORAGE, ')');
	        }
	      } else if (unroll > 1) {
	        scope(loop(unroll, function (i) {
	          return Array.isArray(VALUE) ? VALUE[i] : VALUE + '[' + i + ']'
	        }));
	      } else {
	        check$1(!Array.isArray(VALUE), 'uniform value must not be an array');
	        scope(VALUE);
	      }
	      scope(');');
	    }
	  }

	  function emitDraw (env, outer, inner, args) {
	    var shared = env.shared;
	    var GL = shared.gl;
	    var DRAW_STATE = shared.draw;

	    var drawOptions = args.draw;

	    function emitElements () {
	      var defn = drawOptions.elements;
	      var ELEMENTS;
	      var scope = outer;
	      if (defn) {
	        if ((defn.contextDep && args.contextDynamic) || defn.propDep) {
	          scope = inner;
	        }
	        ELEMENTS = defn.append(env, scope);
	      } else {
	        ELEMENTS = scope.def(DRAW_STATE, '.', S_ELEMENTS);
	      }
	      if (ELEMENTS) {
	        scope(
	          'if(' + ELEMENTS + ')' +
	          GL + '.bindBuffer(' + GL_ELEMENT_ARRAY_BUFFER$1 + ',' + ELEMENTS + '.buffer.buffer);');
	      }
	      return ELEMENTS
	    }

	    function emitCount () {
	      var defn = drawOptions.count;
	      var COUNT;
	      var scope = outer;
	      if (defn) {
	        if ((defn.contextDep && args.contextDynamic) || defn.propDep) {
	          scope = inner;
	        }
	        COUNT = defn.append(env, scope);
	        check$1.optional(function () {
	          if (defn.MISSING) {
	            env.assert(outer, 'false', 'missing vertex count');
	          }
	          if (defn.DYNAMIC) {
	            env.assert(scope, COUNT + '>=0', 'missing vertex count');
	          }
	        });
	      } else {
	        COUNT = scope.def(DRAW_STATE, '.', S_COUNT);
	        check$1.optional(function () {
	          env.assert(scope, COUNT + '>=0', 'missing vertex count');
	        });
	      }
	      return COUNT
	    }

	    var ELEMENTS = emitElements();
	    function emitValue (name) {
	      var defn = drawOptions[name];
	      if (defn) {
	        if ((defn.contextDep && args.contextDynamic) || defn.propDep) {
	          return defn.append(env, inner)
	        } else {
	          return defn.append(env, outer)
	        }
	      } else {
	        return outer.def(DRAW_STATE, '.', name)
	      }
	    }

	    var PRIMITIVE = emitValue(S_PRIMITIVE);
	    var OFFSET = emitValue(S_OFFSET);

	    var COUNT = emitCount();
	    if (typeof COUNT === 'number') {
	      if (COUNT === 0) {
	        return
	      }
	    } else {
	      inner('if(', COUNT, '){');
	      inner.exit('}');
	    }

	    var INSTANCES, EXT_INSTANCING;
	    if (extInstancing) {
	      INSTANCES = emitValue(S_INSTANCES);
	      EXT_INSTANCING = env.instancing;
	    }

	    var ELEMENT_TYPE = ELEMENTS + '.type';

	    var elementsStatic = drawOptions.elements && isStatic(drawOptions.elements);

	    function emitInstancing () {
	      function drawElements () {
	        inner(EXT_INSTANCING, '.drawElementsInstancedANGLE(', [
	          PRIMITIVE,
	          COUNT,
	          ELEMENT_TYPE,
	          OFFSET + '<<((' + ELEMENT_TYPE + '-' + GL_UNSIGNED_BYTE$8 + ')>>1)',
	          INSTANCES
	        ], ');');
	      }

	      function drawArrays () {
	        inner(EXT_INSTANCING, '.drawArraysInstancedANGLE(',
	          [PRIMITIVE, OFFSET, COUNT, INSTANCES], ');');
	      }

	      if (ELEMENTS) {
	        if (!elementsStatic) {
	          inner('if(', ELEMENTS, '){');
	          drawElements();
	          inner('}else{');
	          drawArrays();
	          inner('}');
	        } else {
	          drawElements();
	        }
	      } else {
	        drawArrays();
	      }
	    }

	    function emitRegular () {
	      function drawElements () {
	        inner(GL + '.drawElements(' + [
	          PRIMITIVE,
	          COUNT,
	          ELEMENT_TYPE,
	          OFFSET + '<<((' + ELEMENT_TYPE + '-' + GL_UNSIGNED_BYTE$8 + ')>>1)'
	        ] + ');');
	      }

	      function drawArrays () {
	        inner(GL + '.drawArrays(' + [PRIMITIVE, OFFSET, COUNT] + ');');
	      }

	      if (ELEMENTS) {
	        if (!elementsStatic) {
	          inner('if(', ELEMENTS, '){');
	          drawElements();
	          inner('}else{');
	          drawArrays();
	          inner('}');
	        } else {
	          drawElements();
	        }
	      } else {
	        drawArrays();
	      }
	    }

	    if (extInstancing && (typeof INSTANCES !== 'number' || INSTANCES >= 0)) {
	      if (typeof INSTANCES === 'string') {
	        inner('if(', INSTANCES, '>0){');
	        emitInstancing();
	        inner('}else if(', INSTANCES, '<0){');
	        emitRegular();
	        inner('}');
	      } else {
	        emitInstancing();
	      }
	    } else {
	      emitRegular();
	    }
	  }

	  function createBody (emitBody, parentEnv, args, program, count) {
	    var env = createREGLEnvironment();
	    var scope = env.proc('body', count);
	    check$1.optional(function () {
	      env.commandStr = parentEnv.commandStr;
	      env.command = env.link(parentEnv.commandStr);
	    });
	    if (extInstancing) {
	      env.instancing = scope.def(
	        env.shared.extensions, '.angle_instanced_arrays');
	    }
	    emitBody(env, scope, args, program);
	    return env.compile().body
	  }

	  // ===================================================
	  // ===================================================
	  // DRAW PROC
	  // ===================================================
	  // ===================================================
	  function emitDrawBody (env, draw, args, program) {
	    injectExtensions(env, draw);
	    if (args.useVAO) {
	      if (args.drawVAO) {
	        draw(env.shared.vao, '.setVAO(', args.drawVAO.append(env, draw), ');');
	      } else {
	        draw(env.shared.vao, '.setVAO(', env.shared.vao, '.targetVAO);');
	      }
	    } else {
	      draw(env.shared.vao, '.setVAO(null);');
	      emitAttributes(env, draw, args, program.attributes, function () {
	        return true
	      });
	    }
	    emitUniforms(env, draw, args, program.uniforms, function () {
	      return true
	    });
	    emitDraw(env, draw, draw, args);
	  }

	  function emitDrawProc (env, args) {
	    var draw = env.proc('draw', 1);

	    injectExtensions(env, draw);

	    emitContext(env, draw, args.context);
	    emitPollFramebuffer(env, draw, args.framebuffer);

	    emitPollState(env, draw, args);
	    emitSetOptions(env, draw, args.state);

	    emitProfile(env, draw, args, false, true);

	    var program = args.shader.progVar.append(env, draw);
	    draw(env.shared.gl, '.useProgram(', program, '.program);');

	    if (args.shader.program) {
	      emitDrawBody(env, draw, args, args.shader.program);
	    } else {
	      draw(env.shared.vao, '.setVAO(null);');
	      var drawCache = env.global.def('{}');
	      var PROG_ID = draw.def(program, '.id');
	      var CACHED_PROC = draw.def(drawCache, '[', PROG_ID, ']');
	      draw(
	        env.cond(CACHED_PROC)
	          .then(CACHED_PROC, '.call(this,a0);')
	          .else(
	            CACHED_PROC, '=', drawCache, '[', PROG_ID, ']=',
	            env.link(function (program) {
	              return createBody(emitDrawBody, env, args, program, 1)
	            }), '(', program, ');',
	            CACHED_PROC, '.call(this,a0);'));
	    }

	    if (Object.keys(args.state).length > 0) {
	      draw(env.shared.current, '.dirty=true;');
	    }
	  }

	  // ===================================================
	  // ===================================================
	  // BATCH PROC
	  // ===================================================
	  // ===================================================

	  function emitBatchDynamicShaderBody (env, scope, args, program) {
	    env.batchId = 'a1';

	    injectExtensions(env, scope);

	    function all () {
	      return true
	    }

	    emitAttributes(env, scope, args, program.attributes, all);
	    emitUniforms(env, scope, args, program.uniforms, all);
	    emitDraw(env, scope, scope, args);
	  }

	  function emitBatchBody (env, scope, args, program) {
	    injectExtensions(env, scope);

	    var contextDynamic = args.contextDep;

	    var BATCH_ID = scope.def();
	    var PROP_LIST = 'a0';
	    var NUM_PROPS = 'a1';
	    var PROPS = scope.def();
	    env.shared.props = PROPS;
	    env.batchId = BATCH_ID;

	    var outer = env.scope();
	    var inner = env.scope();

	    scope(
	      outer.entry,
	      'for(', BATCH_ID, '=0;', BATCH_ID, '<', NUM_PROPS, ';++', BATCH_ID, '){',
	      PROPS, '=', PROP_LIST, '[', BATCH_ID, '];',
	      inner,
	      '}',
	      outer.exit);

	    function isInnerDefn (defn) {
	      return ((defn.contextDep && contextDynamic) || defn.propDep)
	    }

	    function isOuterDefn (defn) {
	      return !isInnerDefn(defn)
	    }

	    if (args.needsContext) {
	      emitContext(env, inner, args.context);
	    }
	    if (args.needsFramebuffer) {
	      emitPollFramebuffer(env, inner, args.framebuffer);
	    }
	    emitSetOptions(env, inner, args.state, isInnerDefn);

	    if (args.profile && isInnerDefn(args.profile)) {
	      emitProfile(env, inner, args, false, true);
	    }

	    if (!program) {
	      var progCache = env.global.def('{}');
	      var PROGRAM = args.shader.progVar.append(env, inner);
	      var PROG_ID = inner.def(PROGRAM, '.id');
	      var CACHED_PROC = inner.def(progCache, '[', PROG_ID, ']');
	      inner(
	        env.shared.gl, '.useProgram(', PROGRAM, '.program);',
	        'if(!', CACHED_PROC, '){',
	        CACHED_PROC, '=', progCache, '[', PROG_ID, ']=',
	        env.link(function (program) {
	          return createBody(
	            emitBatchDynamicShaderBody, env, args, program, 2)
	        }), '(', PROGRAM, ');}',
	        CACHED_PROC, '.call(this,a0[', BATCH_ID, '],', BATCH_ID, ');');
	    } else {
	      if (args.useVAO) {
	        if (args.drawVAO) {
	          if (isInnerDefn(args.drawVAO)) {
	            // vao is a prop
	            inner(env.shared.vao, '.setVAO(', args.drawVAO.append(env, inner), ');');
	          } else {
	            // vao is invariant
	            outer(env.shared.vao, '.setVAO(', args.drawVAO.append(env, outer), ');');
	          }
	        } else {
	          // scoped vao binding
	          outer(env.shared.vao, '.setVAO(', env.shared.vao, '.targetVAO);');
	        }
	      } else {
	        outer(env.shared.vao, '.setVAO(null);');
	        emitAttributes(env, outer, args, program.attributes, isOuterDefn);
	        emitAttributes(env, inner, args, program.attributes, isInnerDefn);
	      }
	      emitUniforms(env, outer, args, program.uniforms, isOuterDefn);
	      emitUniforms(env, inner, args, program.uniforms, isInnerDefn);
	      emitDraw(env, outer, inner, args);
	    }
	  }

	  function emitBatchProc (env, args) {
	    var batch = env.proc('batch', 2);
	    env.batchId = '0';

	    injectExtensions(env, batch);

	    // Check if any context variables depend on props
	    var contextDynamic = false;
	    var needsContext = true;
	    Object.keys(args.context).forEach(function (name) {
	      contextDynamic = contextDynamic || args.context[name].propDep;
	    });
	    if (!contextDynamic) {
	      emitContext(env, batch, args.context);
	      needsContext = false;
	    }

	    // framebuffer state affects framebufferWidth/height context vars
	    var framebuffer = args.framebuffer;
	    var needsFramebuffer = false;
	    if (framebuffer) {
	      if (framebuffer.propDep) {
	        contextDynamic = needsFramebuffer = true;
	      } else if (framebuffer.contextDep && contextDynamic) {
	        needsFramebuffer = true;
	      }
	      if (!needsFramebuffer) {
	        emitPollFramebuffer(env, batch, framebuffer);
	      }
	    } else {
	      emitPollFramebuffer(env, batch, null);
	    }

	    // viewport is weird because it can affect context vars
	    if (args.state.viewport && args.state.viewport.propDep) {
	      contextDynamic = true;
	    }

	    function isInnerDefn (defn) {
	      return (defn.contextDep && contextDynamic) || defn.propDep
	    }

	    // set webgl options
	    emitPollState(env, batch, args);
	    emitSetOptions(env, batch, args.state, function (defn) {
	      return !isInnerDefn(defn)
	    });

	    if (!args.profile || !isInnerDefn(args.profile)) {
	      emitProfile(env, batch, args, false, 'a1');
	    }

	    // Save these values to args so that the batch body routine can use them
	    args.contextDep = contextDynamic;
	    args.needsContext = needsContext;
	    args.needsFramebuffer = needsFramebuffer;

	    // determine if shader is dynamic
	    var progDefn = args.shader.progVar;
	    if ((progDefn.contextDep && contextDynamic) || progDefn.propDep) {
	      emitBatchBody(
	        env,
	        batch,
	        args,
	        null);
	    } else {
	      var PROGRAM = progDefn.append(env, batch);
	      batch(env.shared.gl, '.useProgram(', PROGRAM, '.program);');
	      if (args.shader.program) {
	        emitBatchBody(
	          env,
	          batch,
	          args,
	          args.shader.program);
	      } else {
	        batch(env.shared.vao, '.setVAO(null);');
	        var batchCache = env.global.def('{}');
	        var PROG_ID = batch.def(PROGRAM, '.id');
	        var CACHED_PROC = batch.def(batchCache, '[', PROG_ID, ']');
	        batch(
	          env.cond(CACHED_PROC)
	            .then(CACHED_PROC, '.call(this,a0,a1);')
	            .else(
	              CACHED_PROC, '=', batchCache, '[', PROG_ID, ']=',
	              env.link(function (program) {
	                return createBody(emitBatchBody, env, args, program, 2)
	              }), '(', PROGRAM, ');',
	              CACHED_PROC, '.call(this,a0,a1);'));
	      }
	    }

	    if (Object.keys(args.state).length > 0) {
	      batch(env.shared.current, '.dirty=true;');
	    }
	  }

	  // ===================================================
	  // ===================================================
	  // SCOPE COMMAND
	  // ===================================================
	  // ===================================================
	  function emitScopeProc (env, args) {
	    var scope = env.proc('scope', 3);
	    env.batchId = 'a2';

	    var shared = env.shared;
	    var CURRENT_STATE = shared.current;

	    emitContext(env, scope, args.context);

	    if (args.framebuffer) {
	      args.framebuffer.append(env, scope);
	    }

	    sortState(Object.keys(args.state)).forEach(function (name) {
	      var defn = args.state[name];
	      var value = defn.append(env, scope);
	      if (isArrayLike(value)) {
	        value.forEach(function (v, i) {
	          scope.set(env.next[name], '[' + i + ']', v);
	        });
	      } else {
	        scope.set(shared.next, '.' + name, value);
	      }
	    });

	    emitProfile(env, scope, args, true, true)

	    ;[S_ELEMENTS, S_OFFSET, S_COUNT, S_INSTANCES, S_PRIMITIVE].forEach(
	      function (opt) {
	        var variable = args.draw[opt];
	        if (!variable) {
	          return
	        }
	        scope.set(shared.draw, '.' + opt, '' + variable.append(env, scope));
	      });

	    Object.keys(args.uniforms).forEach(function (opt) {
	      var value = args.uniforms[opt].append(env, scope);
	      if (Array.isArray(value)) {
	        value = '[' + value.join() + ']';
	      }
	      scope.set(
	        shared.uniforms,
	        '[' + stringStore.id(opt) + ']',
	        value);
	    });

	    Object.keys(args.attributes).forEach(function (name) {
	      var record = args.attributes[name].append(env, scope);
	      var scopeAttrib = env.scopeAttrib(name);
	      Object.keys(new AttributeRecord()).forEach(function (prop) {
	        scope.set(scopeAttrib, '.' + prop, record[prop]);
	      });
	    });

	    if (args.scopeVAO) {
	      scope.set(shared.vao, '.targetVAO', args.scopeVAO.append(env, scope));
	    }

	    function saveShader (name) {
	      var shader = args.shader[name];
	      if (shader) {
	        scope.set(shared.shader, '.' + name, shader.append(env, scope));
	      }
	    }
	    saveShader(S_VERT);
	    saveShader(S_FRAG);

	    if (Object.keys(args.state).length > 0) {
	      scope(CURRENT_STATE, '.dirty=true;');
	      scope.exit(CURRENT_STATE, '.dirty=true;');
	    }

	    scope('a1(', env.shared.context, ',a0,', env.batchId, ');');
	  }

	  function isDynamicObject (object) {
	    if (typeof object !== 'object' || isArrayLike(object)) {
	      return
	    }
	    var props = Object.keys(object);
	    for (var i = 0; i < props.length; ++i) {
	      if (dynamic.isDynamic(object[props[i]])) {
	        return true
	      }
	    }
	    return false
	  }

	  function splatObject (env, options, name) {
	    var object = options.static[name];
	    if (!object || !isDynamicObject(object)) {
	      return
	    }

	    var globals = env.global;
	    var keys = Object.keys(object);
	    var thisDep = false;
	    var contextDep = false;
	    var propDep = false;
	    var objectRef = env.global.def('{}');
	    keys.forEach(function (key) {
	      var value = object[key];
	      if (dynamic.isDynamic(value)) {
	        if (typeof value === 'function') {
	          value = object[key] = dynamic.unbox(value);
	        }
	        var deps = createDynamicDecl(value, null);
	        thisDep = thisDep || deps.thisDep;
	        propDep = propDep || deps.propDep;
	        contextDep = contextDep || deps.contextDep;
	      } else {
	        globals(objectRef, '.', key, '=');
	        switch (typeof value) {
	          case 'number':
	            globals(value);
	            break
	          case 'string':
	            globals('"', value, '"');
	            break
	          case 'object':
	            if (Array.isArray(value)) {
	              globals('[', value.join(), ']');
	            }
	            break
	          default:
	            globals(env.link(value));
	            break
	        }
	        globals(';');
	      }
	    });

	    function appendBlock (env, block) {
	      keys.forEach(function (key) {
	        var value = object[key];
	        if (!dynamic.isDynamic(value)) {
	          return
	        }
	        var ref = env.invoke(block, value);
	        block(objectRef, '.', key, '=', ref, ';');
	      });
	    }

	    options.dynamic[name] = new dynamic.DynamicVariable(DYN_THUNK, {
	      thisDep: thisDep,
	      contextDep: contextDep,
	      propDep: propDep,
	      ref: objectRef,
	      append: appendBlock
	    });
	    delete options.static[name];
	  }

	  // ===========================================================================
	  // ===========================================================================
	  // MAIN DRAW COMMAND
	  // ===========================================================================
	  // ===========================================================================
	  function compileCommand (options, attributes, uniforms, context, stats) {
	    var env = createREGLEnvironment();

	    // link stats, so that we can easily access it in the program.
	    env.stats = env.link(stats);

	    // splat options and attributes to allow for dynamic nested properties
	    Object.keys(attributes.static).forEach(function (key) {
	      splatObject(env, attributes, key);
	    });
	    NESTED_OPTIONS.forEach(function (name) {
	      splatObject(env, options, name);
	    });

	    var args = parseArguments(options, attributes, uniforms, context, env);

	    emitDrawProc(env, args);
	    emitScopeProc(env, args);
	    emitBatchProc(env, args);

	    return extend(env.compile(), {
	      destroy: function () {
	        args.shader.program.destroy();
	      }
	    })
	  }

	  // ===========================================================================
	  // ===========================================================================
	  // POLL / REFRESH
	  // ===========================================================================
	  // ===========================================================================
	  return {
	    next: nextState,
	    current: currentState,
	    procs: (function () {
	      var env = createREGLEnvironment();
	      var poll = env.proc('poll');
	      var refresh = env.proc('refresh');
	      var common = env.block();
	      poll(common);
	      refresh(common);

	      var shared = env.shared;
	      var GL = shared.gl;
	      var NEXT_STATE = shared.next;
	      var CURRENT_STATE = shared.current;

	      common(CURRENT_STATE, '.dirty=false;');

	      emitPollFramebuffer(env, poll);
	      emitPollFramebuffer(env, refresh, null, true);

	      // Refresh updates all attribute state changes
	      var INSTANCING;
	      if (extInstancing) {
	        INSTANCING = env.link(extInstancing);
	      }

	      // update vertex array bindings
	      if (extensions.oes_vertex_array_object) {
	        refresh(env.link(extensions.oes_vertex_array_object), '.bindVertexArrayOES(null);');
	      }
	      for (var i = 0; i < limits.maxAttributes; ++i) {
	        var BINDING = refresh.def(shared.attributes, '[', i, ']');
	        var ifte = env.cond(BINDING, '.buffer');
	        ifte.then(
	          GL, '.enableVertexAttribArray(', i, ');',
	          GL, '.bindBuffer(',
	          GL_ARRAY_BUFFER$2, ',',
	          BINDING, '.buffer.buffer);',
	          GL, '.vertexAttribPointer(',
	          i, ',',
	          BINDING, '.size,',
	          BINDING, '.type,',
	          BINDING, '.normalized,',
	          BINDING, '.stride,',
	          BINDING, '.offset);'
	        ).else(
	          GL, '.disableVertexAttribArray(', i, ');',
	          GL, '.vertexAttrib4f(',
	          i, ',',
	          BINDING, '.x,',
	          BINDING, '.y,',
	          BINDING, '.z,',
	          BINDING, '.w);',
	          BINDING, '.buffer=null;');
	        refresh(ifte);
	        if (extInstancing) {
	          refresh(
	            INSTANCING, '.vertexAttribDivisorANGLE(',
	            i, ',',
	            BINDING, '.divisor);');
	        }
	      }
	      refresh(
	        env.shared.vao, '.currentVAO=null;',
	        env.shared.vao, '.setVAO(', env.shared.vao, '.targetVAO);');

	      Object.keys(GL_FLAGS).forEach(function (flag) {
	        var cap = GL_FLAGS[flag];
	        var NEXT = common.def(NEXT_STATE, '.', flag);
	        var block = env.block();
	        block('if(', NEXT, '){',
	          GL, '.enable(', cap, ')}else{',
	          GL, '.disable(', cap, ')}',
	          CURRENT_STATE, '.', flag, '=', NEXT, ';');
	        refresh(block);
	        poll(
	          'if(', NEXT, '!==', CURRENT_STATE, '.', flag, '){',
	          block,
	          '}');
	      });

	      Object.keys(GL_VARIABLES).forEach(function (name) {
	        var func = GL_VARIABLES[name];
	        var init = currentState[name];
	        var NEXT, CURRENT;
	        var block = env.block();
	        block(GL, '.', func, '(');
	        if (isArrayLike(init)) {
	          var n = init.length;
	          NEXT = env.global.def(NEXT_STATE, '.', name);
	          CURRENT = env.global.def(CURRENT_STATE, '.', name);
	          block(
	            loop(n, function (i) {
	              return NEXT + '[' + i + ']'
	            }), ');',
	            loop(n, function (i) {
	              return CURRENT + '[' + i + ']=' + NEXT + '[' + i + '];'
	            }).join(''));
	          poll(
	            'if(', loop(n, function (i) {
	              return NEXT + '[' + i + ']!==' + CURRENT + '[' + i + ']'
	            }).join('||'), '){',
	            block,
	            '}');
	        } else {
	          NEXT = common.def(NEXT_STATE, '.', name);
	          CURRENT = common.def(CURRENT_STATE, '.', name);
	          block(
	            NEXT, ');',
	            CURRENT_STATE, '.', name, '=', NEXT, ';');
	          poll(
	            'if(', NEXT, '!==', CURRENT, '){',
	            block,
	            '}');
	        }
	        refresh(block);
	      });

	      return env.compile()
	    })(),
	    compile: compileCommand
	  }
	}

	function stats () {
	  return {
	    vaoCount: 0,
	    bufferCount: 0,
	    elementsCount: 0,
	    framebufferCount: 0,
	    shaderCount: 0,
	    textureCount: 0,
	    cubeCount: 0,
	    renderbufferCount: 0,
	    maxTextureUnits: 0
	  }
	}

	var GL_QUERY_RESULT_EXT = 0x8866;
	var GL_QUERY_RESULT_AVAILABLE_EXT = 0x8867;
	var GL_TIME_ELAPSED_EXT = 0x88BF;

	var createTimer = function (gl, extensions) {
	  if (!extensions.ext_disjoint_timer_query) {
	    return null
	  }

	  // QUERY POOL BEGIN
	  var queryPool = [];
	  function allocQuery () {
	    return queryPool.pop() || extensions.ext_disjoint_timer_query.createQueryEXT()
	  }
	  function freeQuery (query) {
	    queryPool.push(query);
	  }
	  // QUERY POOL END

	  var pendingQueries = [];
	  function beginQuery (stats) {
	    var query = allocQuery();
	    extensions.ext_disjoint_timer_query.beginQueryEXT(GL_TIME_ELAPSED_EXT, query);
	    pendingQueries.push(query);
	    pushScopeStats(pendingQueries.length - 1, pendingQueries.length, stats);
	  }

	  function endQuery () {
	    extensions.ext_disjoint_timer_query.endQueryEXT(GL_TIME_ELAPSED_EXT);
	  }

	  //
	  // Pending stats pool.
	  //
	  function PendingStats () {
	    this.startQueryIndex = -1;
	    this.endQueryIndex = -1;
	    this.sum = 0;
	    this.stats = null;
	  }
	  var pendingStatsPool = [];
	  function allocPendingStats () {
	    return pendingStatsPool.pop() || new PendingStats()
	  }
	  function freePendingStats (pendingStats) {
	    pendingStatsPool.push(pendingStats);
	  }
	  // Pending stats pool end

	  var pendingStats = [];
	  function pushScopeStats (start, end, stats) {
	    var ps = allocPendingStats();
	    ps.startQueryIndex = start;
	    ps.endQueryIndex = end;
	    ps.sum = 0;
	    ps.stats = stats;
	    pendingStats.push(ps);
	  }

	  // we should call this at the beginning of the frame,
	  // in order to update gpuTime
	  var timeSum = [];
	  var queryPtr = [];
	  function update () {
	    var ptr, i;

	    var n = pendingQueries.length;
	    if (n === 0) {
	      return
	    }

	    // Reserve space
	    queryPtr.length = Math.max(queryPtr.length, n + 1);
	    timeSum.length = Math.max(timeSum.length, n + 1);
	    timeSum[0] = 0;
	    queryPtr[0] = 0;

	    // Update all pending timer queries
	    var queryTime = 0;
	    ptr = 0;
	    for (i = 0; i < pendingQueries.length; ++i) {
	      var query = pendingQueries[i];
	      if (extensions.ext_disjoint_timer_query.getQueryObjectEXT(query, GL_QUERY_RESULT_AVAILABLE_EXT)) {
	        queryTime += extensions.ext_disjoint_timer_query.getQueryObjectEXT(query, GL_QUERY_RESULT_EXT);
	        freeQuery(query);
	      } else {
	        pendingQueries[ptr++] = query;
	      }
	      timeSum[i + 1] = queryTime;
	      queryPtr[i + 1] = ptr;
	    }
	    pendingQueries.length = ptr;

	    // Update all pending stat queries
	    ptr = 0;
	    for (i = 0; i < pendingStats.length; ++i) {
	      var stats = pendingStats[i];
	      var start = stats.startQueryIndex;
	      var end = stats.endQueryIndex;
	      stats.sum += timeSum[end] - timeSum[start];
	      var startPtr = queryPtr[start];
	      var endPtr = queryPtr[end];
	      if (endPtr === startPtr) {
	        stats.stats.gpuTime += stats.sum / 1e6;
	        freePendingStats(stats);
	      } else {
	        stats.startQueryIndex = startPtr;
	        stats.endQueryIndex = endPtr;
	        pendingStats[ptr++] = stats;
	      }
	    }
	    pendingStats.length = ptr;
	  }

	  return {
	    beginQuery: beginQuery,
	    endQuery: endQuery,
	    pushScopeStats: pushScopeStats,
	    update: update,
	    getNumPendingQueries: function () {
	      return pendingQueries.length
	    },
	    clear: function () {
	      queryPool.push.apply(queryPool, pendingQueries);
	      for (var i = 0; i < queryPool.length; i++) {
	        extensions.ext_disjoint_timer_query.deleteQueryEXT(queryPool[i]);
	      }
	      pendingQueries.length = 0;
	      queryPool.length = 0;
	    },
	    restore: function () {
	      pendingQueries.length = 0;
	      queryPool.length = 0;
	    }
	  }
	};

	var GL_COLOR_BUFFER_BIT = 16384;
	var GL_DEPTH_BUFFER_BIT = 256;
	var GL_STENCIL_BUFFER_BIT = 1024;

	var GL_ARRAY_BUFFER = 34962;

	var CONTEXT_LOST_EVENT = 'webglcontextlost';
	var CONTEXT_RESTORED_EVENT = 'webglcontextrestored';

	var DYN_PROP = 1;
	var DYN_CONTEXT = 2;
	var DYN_STATE = 3;

	function find (haystack, needle) {
	  for (var i = 0; i < haystack.length; ++i) {
	    if (haystack[i] === needle) {
	      return i
	    }
	  }
	  return -1
	}

	function wrapREGL (args) {
	  var config = parseArgs(args);
	  if (!config) {
	    return null
	  }

	  var gl = config.gl;
	  var glAttributes = gl.getContextAttributes();
	  var contextLost = gl.isContextLost();

	  var extensionState = createExtensionCache(gl, config);
	  if (!extensionState) {
	    return null
	  }

	  var stringStore = createStringStore();
	  var stats$$1 = stats();
	  var extensions = extensionState.extensions;
	  var timer = createTimer(gl, extensions);

	  var START_TIME = clock();
	  var WIDTH = gl.drawingBufferWidth;
	  var HEIGHT = gl.drawingBufferHeight;

	  var contextState = {
	    tick: 0,
	    time: 0,
	    viewportWidth: WIDTH,
	    viewportHeight: HEIGHT,
	    framebufferWidth: WIDTH,
	    framebufferHeight: HEIGHT,
	    drawingBufferWidth: WIDTH,
	    drawingBufferHeight: HEIGHT,
	    pixelRatio: config.pixelRatio
	  };
	  var uniformState = {};
	  var drawState = {
	    elements: null,
	    primitive: 4, // GL_TRIANGLES
	    count: -1,
	    offset: 0,
	    instances: -1
	  };

	  var limits = wrapLimits(gl, extensions);
	  var bufferState = wrapBufferState(
	    gl,
	    stats$$1,
	    config,
	    destroyBuffer);
	  var attributeState = wrapAttributeState(
	    gl,
	    extensions,
	    limits,
	    stats$$1,
	    bufferState);
	  function destroyBuffer (buffer) {
	    return attributeState.destroyBuffer(buffer)
	  }
	  var elementState = wrapElementsState(gl, extensions, bufferState, stats$$1);
	  var shaderState = wrapShaderState(gl, stringStore, stats$$1, config);
	  var textureState = createTextureSet(
	    gl,
	    extensions,
	    limits,
	    function () { core.procs.poll(); },
	    contextState,
	    stats$$1,
	    config);
	  var renderbufferState = wrapRenderbuffers(gl, extensions, limits, stats$$1, config);
	  var framebufferState = wrapFBOState(
	    gl,
	    extensions,
	    limits,
	    textureState,
	    renderbufferState,
	    stats$$1);
	  var core = reglCore(
	    gl,
	    stringStore,
	    extensions,
	    limits,
	    bufferState,
	    elementState,
	    textureState,
	    framebufferState,
	    uniformState,
	    attributeState,
	    shaderState,
	    drawState,
	    contextState,
	    timer,
	    config);
	  var readPixels = wrapReadPixels(
	    gl,
	    framebufferState,
	    core.procs.poll,
	    contextState,
	    glAttributes, extensions, limits);

	  var nextState = core.next;
	  var canvas = gl.canvas;

	  var rafCallbacks = [];
	  var lossCallbacks = [];
	  var restoreCallbacks = [];
	  var destroyCallbacks = [config.onDestroy];

	  var activeRAF = null;
	  function handleRAF () {
	    if (rafCallbacks.length === 0) {
	      if (timer) {
	        timer.update();
	      }
	      activeRAF = null;
	      return
	    }

	    // schedule next animation frame
	    activeRAF = raf.next(handleRAF);

	    // poll for changes
	    poll();

	    // fire a callback for all pending rafs
	    for (var i = rafCallbacks.length - 1; i >= 0; --i) {
	      var cb = rafCallbacks[i];
	      if (cb) {
	        cb(contextState, null, 0);
	      }
	    }

	    // flush all pending webgl calls
	    gl.flush();

	    // poll GPU timers *after* gl.flush so we don't delay command dispatch
	    if (timer) {
	      timer.update();
	    }
	  }

	  function startRAF () {
	    if (!activeRAF && rafCallbacks.length > 0) {
	      activeRAF = raf.next(handleRAF);
	    }
	  }

	  function stopRAF () {
	    if (activeRAF) {
	      raf.cancel(handleRAF);
	      activeRAF = null;
	    }
	  }

	  function handleContextLoss (event) {
	    event.preventDefault();

	    // set context lost flag
	    contextLost = true;

	    // pause request animation frame
	    stopRAF();

	    // lose context
	    lossCallbacks.forEach(function (cb) {
	      cb();
	    });
	  }

	  function handleContextRestored (event) {
	    // clear error code
	    gl.getError();

	    // clear context lost flag
	    contextLost = false;

	    // refresh state
	    extensionState.restore();
	    shaderState.restore();
	    bufferState.restore();
	    textureState.restore();
	    renderbufferState.restore();
	    framebufferState.restore();
	    attributeState.restore();
	    if (timer) {
	      timer.restore();
	    }

	    // refresh state
	    core.procs.refresh();

	    // restart RAF
	    startRAF();

	    // restore context
	    restoreCallbacks.forEach(function (cb) {
	      cb();
	    });
	  }

	  if (canvas) {
	    canvas.addEventListener(CONTEXT_LOST_EVENT, handleContextLoss, false);
	    canvas.addEventListener(CONTEXT_RESTORED_EVENT, handleContextRestored, false);
	  }

	  function destroy () {
	    rafCallbacks.length = 0;
	    stopRAF();

	    if (canvas) {
	      canvas.removeEventListener(CONTEXT_LOST_EVENT, handleContextLoss);
	      canvas.removeEventListener(CONTEXT_RESTORED_EVENT, handleContextRestored);
	    }

	    shaderState.clear();
	    framebufferState.clear();
	    renderbufferState.clear();
	    textureState.clear();
	    elementState.clear();
	    bufferState.clear();
	    attributeState.clear();

	    if (timer) {
	      timer.clear();
	    }

	    destroyCallbacks.forEach(function (cb) {
	      cb();
	    });
	  }

	  function compileProcedure (options) {
	    check$1(!!options, 'invalid args to regl({...})');
	    check$1.type(options, 'object', 'invalid args to regl({...})');

	    function flattenNestedOptions (options) {
	      var result = extend({}, options);
	      delete result.uniforms;
	      delete result.attributes;
	      delete result.context;
	      delete result.vao;

	      if ('stencil' in result && result.stencil.op) {
	        result.stencil.opBack = result.stencil.opFront = result.stencil.op;
	        delete result.stencil.op;
	      }

	      function merge (name) {
	        if (name in result) {
	          var child = result[name];
	          delete result[name];
	          Object.keys(child).forEach(function (prop) {
	            result[name + '.' + prop] = child[prop];
	          });
	        }
	      }
	      merge('blend');
	      merge('depth');
	      merge('cull');
	      merge('stencil');
	      merge('polygonOffset');
	      merge('scissor');
	      merge('sample');

	      if ('vao' in options) {
	        result.vao = options.vao;
	      }

	      return result
	    }

	    function separateDynamic (object, useArrays) {
	      var staticItems = {};
	      var dynamicItems = {};
	      Object.keys(object).forEach(function (option) {
	        var value = object[option];
	        if (dynamic.isDynamic(value)) {
	          dynamicItems[option] = dynamic.unbox(value, option);
	          return
	        } else if (useArrays && Array.isArray(value)) {
	          for (var i = 0; i < value.length; ++i) {
	            if (dynamic.isDynamic(value[i])) {
	              dynamicItems[option] = dynamic.unbox(value, option);
	              return
	            }
	          }
	        }
	        staticItems[option] = value;
	      });
	      return {
	        dynamic: dynamicItems,
	        static: staticItems
	      }
	    }

	    // Treat context variables separate from other dynamic variables
	    var context = separateDynamic(options.context || {}, true);
	    var uniforms = separateDynamic(options.uniforms || {}, true);
	    var attributes = separateDynamic(options.attributes || {}, false);
	    var opts = separateDynamic(flattenNestedOptions(options), false);

	    var stats$$1 = {
	      gpuTime: 0.0,
	      cpuTime: 0.0,
	      count: 0
	    };

	    var compiled = core.compile(opts, attributes, uniforms, context, stats$$1);

	    var draw = compiled.draw;
	    var batch = compiled.batch;
	    var scope = compiled.scope;

	    // FIXME: we should modify code generation for batch commands so this
	    // isn't necessary
	    var EMPTY_ARRAY = [];
	    function reserve (count) {
	      while (EMPTY_ARRAY.length < count) {
	        EMPTY_ARRAY.push(null);
	      }
	      return EMPTY_ARRAY
	    }

	    function REGLCommand (args, body) {
	      var i;
	      if (contextLost) {
	        check$1.raise('context lost');
	      }
	      if (typeof args === 'function') {
	        return scope.call(this, null, args, 0)
	      } else if (typeof body === 'function') {
	        if (typeof args === 'number') {
	          for (i = 0; i < args; ++i) {
	            scope.call(this, null, body, i);
	          }
	        } else if (Array.isArray(args)) {
	          for (i = 0; i < args.length; ++i) {
	            scope.call(this, args[i], body, i);
	          }
	        } else {
	          return scope.call(this, args, body, 0)
	        }
	      } else if (typeof args === 'number') {
	        if (args > 0) {
	          return batch.call(this, reserve(args | 0), args | 0)
	        }
	      } else if (Array.isArray(args)) {
	        if (args.length) {
	          return batch.call(this, args, args.length)
	        }
	      } else {
	        return draw.call(this, args)
	      }
	    }

	    return extend(REGLCommand, {
	      stats: stats$$1,
	      destroy: function () {
	        compiled.destroy();
	      }
	    })
	  }

	  var setFBO = framebufferState.setFBO = compileProcedure({
	    framebuffer: dynamic.define.call(null, DYN_PROP, 'framebuffer')
	  });

	  function clearImpl (_, options) {
	    var clearFlags = 0;
	    core.procs.poll();

	    var c = options.color;
	    if (c) {
	      gl.clearColor(+c[0] || 0, +c[1] || 0, +c[2] || 0, +c[3] || 0);
	      clearFlags |= GL_COLOR_BUFFER_BIT;
	    }
	    if ('depth' in options) {
	      gl.clearDepth(+options.depth);
	      clearFlags |= GL_DEPTH_BUFFER_BIT;
	    }
	    if ('stencil' in options) {
	      gl.clearStencil(options.stencil | 0);
	      clearFlags |= GL_STENCIL_BUFFER_BIT;
	    }

	    check$1(!!clearFlags, 'called regl.clear with no buffer specified');
	    gl.clear(clearFlags);
	  }

	  function clear (options) {
	    check$1(
	      typeof options === 'object' && options,
	      'regl.clear() takes an object as input');
	    if ('framebuffer' in options) {
	      if (options.framebuffer &&
	          options.framebuffer_reglType === 'framebufferCube') {
	        for (var i = 0; i < 6; ++i) {
	          setFBO(extend({
	            framebuffer: options.framebuffer.faces[i]
	          }, options), clearImpl);
	        }
	      } else {
	        setFBO(options, clearImpl);
	      }
	    } else {
	      clearImpl(null, options);
	    }
	  }

	  function frame (cb) {
	    check$1.type(cb, 'function', 'regl.frame() callback must be a function');
	    rafCallbacks.push(cb);

	    function cancel () {
	      // FIXME:  should we check something other than equals cb here?
	      // what if a user calls frame twice with the same callback...
	      //
	      var i = find(rafCallbacks, cb);
	      check$1(i >= 0, 'cannot cancel a frame twice');
	      function pendingCancel () {
	        var index = find(rafCallbacks, pendingCancel);
	        rafCallbacks[index] = rafCallbacks[rafCallbacks.length - 1];
	        rafCallbacks.length -= 1;
	        if (rafCallbacks.length <= 0) {
	          stopRAF();
	        }
	      }
	      rafCallbacks[i] = pendingCancel;
	    }

	    startRAF();

	    return {
	      cancel: cancel
	    }
	  }

	  // poll viewport
	  function pollViewport () {
	    var viewport = nextState.viewport;
	    var scissorBox = nextState.scissor_box;
	    viewport[0] = viewport[1] = scissorBox[0] = scissorBox[1] = 0;
	    contextState.viewportWidth =
	      contextState.framebufferWidth =
	      contextState.drawingBufferWidth =
	      viewport[2] =
	      scissorBox[2] = gl.drawingBufferWidth;
	    contextState.viewportHeight =
	      contextState.framebufferHeight =
	      contextState.drawingBufferHeight =
	      viewport[3] =
	      scissorBox[3] = gl.drawingBufferHeight;
	  }

	  function poll () {
	    contextState.tick += 1;
	    contextState.time = now();
	    pollViewport();
	    core.procs.poll();
	  }

	  function refresh () {
	    textureState.refresh();
	    pollViewport();
	    core.procs.refresh();
	    if (timer) {
	      timer.update();
	    }
	  }

	  function now () {
	    return (clock() - START_TIME) / 1000.0
	  }

	  refresh();

	  function addListener (event, callback) {
	    check$1.type(callback, 'function', 'listener callback must be a function');

	    var callbacks;
	    switch (event) {
	      case 'frame':
	        return frame(callback)
	      case 'lost':
	        callbacks = lossCallbacks;
	        break
	      case 'restore':
	        callbacks = restoreCallbacks;
	        break
	      case 'destroy':
	        callbacks = destroyCallbacks;
	        break
	      default:
	        check$1.raise('invalid event, must be one of frame,lost,restore,destroy');
	    }

	    callbacks.push(callback);
	    return {
	      cancel: function () {
	        for (var i = 0; i < callbacks.length; ++i) {
	          if (callbacks[i] === callback) {
	            callbacks[i] = callbacks[callbacks.length - 1];
	            callbacks.pop();
	            return
	          }
	        }
	      }
	    }
	  }

	  var regl = extend(compileProcedure, {
	    // Clear current FBO
	    clear: clear,

	    // Short cuts for dynamic variables
	    prop: dynamic.define.bind(null, DYN_PROP),
	    context: dynamic.define.bind(null, DYN_CONTEXT),
	    this: dynamic.define.bind(null, DYN_STATE),

	    // executes an empty draw command
	    draw: compileProcedure({}),

	    // Resources
	    buffer: function (options) {
	      return bufferState.create(options, GL_ARRAY_BUFFER, false, false)
	    },
	    elements: function (options) {
	      return elementState.create(options, false)
	    },
	    texture: textureState.create2D,
	    cube: textureState.createCube,
	    renderbuffer: renderbufferState.create,
	    framebuffer: framebufferState.create,
	    framebufferCube: framebufferState.createCube,
	    vao: attributeState.createVAO,

	    // Expose context attributes
	    attributes: glAttributes,

	    // Frame rendering
	    frame: frame,
	    on: addListener,

	    // System limits
	    limits: limits,
	    hasExtension: function (name) {
	      return limits.extensions.indexOf(name.toLowerCase()) >= 0
	    },

	    // Read pixels
	    read: readPixels,

	    // Destroy regl and all associated resources
	    destroy: destroy,

	    // Direct GL state manipulation
	    _gl: gl,
	    _refresh: refresh,

	    poll: function () {
	      poll();
	      if (timer) {
	        timer.update();
	      }
	    },

	    // Current time
	    now: now,

	    // regl Statistics Information
	    stats: stats$$1
	  });

	  config.onDone(null, regl);

	  return regl
	}

	return wrapREGL;

	})));
	
} (regl$1));

var reglExports = regl$1.exports;
var regl = /*@__PURE__*/getDefaultExportFromCjs(reglExports);

// const window = global.window



const Mouse = mouseListen();
// to do: add ability to pass in certain uniforms and transforms
class HydraRenderer {

  constructor ({
    pb = null,
    width = 1280,
    height = 720,
    numSources = 4,
    numOutputs = 4,
    makeGlobal = true,
    autoLoop = true,
    detectAudio = true,
    enableStreamCapture = true,
    canvas,
    precision,
    extendTransforms = {} // add your own functions on init
  } = {}) {

    ArrayUtils.init();

    this.pb = pb;

    this.width = width;
    this.height = height;
    this.renderAll = false;
    this.detectAudio = detectAudio;

    this._initCanvas(canvas);

    //global.window.test = 'hi'
    // object that contains all properties that will be made available on the global context and during local evaluation
    this.synth = {
      time: 0,
      bpm: 30,
      width: this.width,
      height: this.height,
      fps: undefined,
      stats: {
        fps: 0
      },
      speed: 1,
      mouse: Mouse,
      render: this._render.bind(this),
      setResolution: this.setResolution.bind(this),
      update: (dt) => {},// user defined update function
      hush: this.hush.bind(this),
      tick: this.tick.bind(this)
    };

    if (makeGlobal) window.loadScript = this.loadScript;


    this.timeSinceLastUpdate = 0;
    this._time = 0; // for internal use, only to use for deciding when to render frames

    // only allow valid precision options
    let precisionOptions = ['lowp','mediump','highp'];
    if(precision && precisionOptions.includes(precision.toLowerCase())) {
      this.precision = precision.toLowerCase();
      //
      // if(!precisionValid){
      //   console.warn('[hydra-synth warning]\nConstructor was provided an invalid floating point precision value of "' + precision + '". Using default value of "mediump" instead.')
      // }
    } else {
      let isIOS =
    (/iPad|iPhone|iPod/.test(navigator.platform) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
    !window.MSStream;
      this.precision = isIOS ? 'highp' : 'mediump';
    }



    this.extendTransforms = extendTransforms;

    // boolean to store when to save screenshot
    this.saveFrame = false;

    // if stream capture is enabled, this object contains the capture stream
    this.captureStream = null;

    this.generator = undefined;

    this._initRegl();
    this._initOutputs(numOutputs);
    this._initSources(numSources);
    this._generateGlslTransforms();

    this.synth.screencap = () => {
      this.saveFrame = true;
    };

    if (enableStreamCapture) {
      try {
        this.captureStream = this.canvas.captureStream(25);
        // to do: enable capture stream of specific sources and outputs
        this.synth.vidRecorder = new VideoRecorder(this.captureStream);
      } catch (e) {
        console.warn('[hydra-synth warning]\nnew MediaSource() is not currently supported on iOS.');
        console.error(e);
      }
    }

    if(detectAudio) this._initAudio();

    if(autoLoop) loop(this.tick.bind(this)).start();

    // final argument is properties that the user can set, all others are treated as read-only
    this.sandbox = new EvalSandbox(this.synth, makeGlobal, ['speed', 'update', 'bpm', 'fps']);
  }

  eval(code) {
    this.sandbox.eval(code);
  }

  getScreenImage(callback) {
    this.imageCallback = callback;
    this.saveFrame = true;
  }

  hush() {
    this.s.forEach((source) => {
      source.clear();
    });
    this.o.forEach((output) => {
      this.synth.solid(0, 0, 0, 0).out(output);
    });
    this.synth.render(this.o[0]);
    // this.synth.update = (dt) => {}
    this.sandbox.set('update', (dt) => {});
  }

  loadScript(url = "") {
   const p = new Promise((res, rej) => {
     var script = document.createElement("script");
     script.onload = function () {
       console.log(`loaded script ${url}`);
       res();
     };
     script.onerror = (err) => {
       console.log(`error loading script ${url}`, "log-error");
       res();
     };
     script.src = url;
     document.head.appendChild(script);
   });
   return p;
 }

  setResolution(width, height) {
  //  console.log(width, height)
    this.canvas.width = width;
    this.canvas.height = height;
    this.width = width; // is this necessary?
    this.height = height; // ?
    this.sandbox.set('width', width);
    this.sandbox.set('height', height);
    console.log(this.width);
    this.o.forEach((output) => {
      output.resize(width, height);
    });
    this.s.forEach((source) => {
      source.resize(width, height);
    });
    this.regl._refresh();
     console.log(this.canvas.width);
  }

  canvasToImage (callback) {
    const a = document.createElement('a');
    a.style.display = 'none';

    let d = new Date();
    a.download = `hydra-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${d.getHours()}.${d.getMinutes()}.${d.getSeconds()}.png`;
    document.body.appendChild(a);
    var self = this;
    this.canvas.toBlob( (blob) => {
        if(self.imageCallback){
          self.imageCallback(blob);
          delete self.imageCallback;
        } else {
          a.href = URL.createObjectURL(blob);
          console.log(a.href);
          a.click();
        }
    }, 'image/png');
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(a.href);
    }, 300);
  }

  _initAudio () {
    this.synth.a = new Audio({
      numBins: 4,
      parentEl: this.canvas.parentNode
      // changeListener: ({audio}) => {
      //   that.a = audio.bins.map((_, index) =>
      //     (scale = 1, offset = 0) => () => (audio.fft[index] * scale + offset)
      //   )
      //
      //   if (that.makeGlobal) {
      //     that.a.forEach((a, index) => {
      //       const aname = `a${index}`
      //       window[aname] = a
      //     })
      //   }
      // }
    });
  }

  // create main output canvas and add to screen
  _initCanvas (canvas) {
    if (canvas) {
      this.canvas = canvas;
      this.width = canvas.width;
      this.height = canvas.height;
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.imageRendering = 'pixelated';
      document.body.appendChild(this.canvas);
    }
  }

  _initRegl () {
    this.regl = regl({
    //  profile: true,
      canvas: this.canvas,
      pixelRatio: 1//,
      // extensions: [
      //   'oes_texture_half_float',
      //   'oes_texture_half_float_linear'
      // ],
      // optionalExtensions: [
      //   'oes_texture_float',
      //   'oes_texture_float_linear'
     //]
   });

    // This clears the color buffer to black and the depth buffer to 1
    this.regl.clear({
      color: [0, 0, 0, 1]
    });

    this.renderAll = this.regl({
      frag: `
      precision ${this.precision} float;
      varying vec2 uv;
      uniform sampler2D tex0;
      uniform sampler2D tex1;
      uniform sampler2D tex2;
      uniform sampler2D tex3;

      void main () {
        vec2 st = vec2(1.0 - uv.x, uv.y);
        st*= vec2(2);
        vec2 q = floor(st).xy*(vec2(2.0, 1.0));
        int quad = int(q.x) + int(q.y);
        st.x += step(1., mod(st.y,2.0));
        st.y += step(1., mod(st.x,2.0));
        st = fract(st);
        if(quad==0){
          gl_FragColor = texture2D(tex0, st);
        } else if(quad==1){
          gl_FragColor = texture2D(tex1, st);
        } else if (quad==2){
          gl_FragColor = texture2D(tex2, st);
        } else {
          gl_FragColor = texture2D(tex3, st);
        }

      }
      `,
      vert: `
      precision ${this.precision} float;
      attribute vec2 position;
      varying vec2 uv;

      void main () {
        uv = position;
        gl_Position = vec4(1.0 - 2.0 * position, 0, 1);
      }`,
      attributes: {
        position: [
          [-2, 0],
          [0, -2],
          [2, 2]
        ]
      },
      uniforms: {
        tex0: this.regl.prop('tex0'),
        tex1: this.regl.prop('tex1'),
        tex2: this.regl.prop('tex2'),
        tex3: this.regl.prop('tex3')
      },
      count: 3,
      depth: { enable: false }
    });

    this.renderFbo = this.regl({
      frag: `
      precision ${this.precision} float;
      varying vec2 uv;
      uniform vec2 resolution;
      uniform sampler2D tex0;

      void main () {
        gl_FragColor = texture2D(tex0, vec2(1.0 - uv.x, uv.y));
      }
      `,
      vert: `
      precision ${this.precision} float;
      attribute vec2 position;
      varying vec2 uv;

      void main () {
        uv = position;
        gl_Position = vec4(1.0 - 2.0 * position, 0, 1);
      }`,
      attributes: {
        position: [
          [-2, 0],
          [0, -2],
          [2, 2]
        ]
      },
      uniforms: {
        tex0: this.regl.prop('tex0'),
        resolution: this.regl.prop('resolution')
      },
      count: 3,
      depth: { enable: false }
    });
  }

  _initOutputs (numOutputs) {
    const self = this;
    this.o = (Array(numOutputs)).fill().map((el, index) => {
      var o = new Output({
        regl: this.regl,
        width: this.width,
        height: this.height,
        precision: this.precision,
        label: `o${index}`
      });
    //  o.render()
      o.id = index;
      self.synth['o'+index] = o;
      return o
    });

    // set default output
    this.output = this.o[0];
  }

  _initSources (numSources) {
    this.s = [];
    for(var i = 0; i < numSources; i++) {
      this.createSource(i);
    }
  }

  createSource (i) {
    let s = new HydraSource({regl: this.regl, pb: this.pb, width: this.width, height: this.height, label: `s${i}`});
    this.synth['s' + this.s.length] = s;
    this.s.push(s);
    return s
  }

  _generateGlslTransforms () {
    var self = this;
    this.generator = new GeneratorFactory({
      defaultOutput: this.o[0],
      defaultUniforms: this.o[0].uniforms,
      extendTransforms: this.extendTransforms,
      changeListener: ({type, method, synth}) => {
          if (type === 'add') {
            self.synth[method] = synth.generators[method];
            if(self.sandbox) self.sandbox.add(method);
          }
      //  }
      }
    });
    this.synth.setFunction = this.generator.setFunction.bind(this.generator);
  }

  _render (output) {
    if (output) {
      this.output = output;
      this.isRenderingAll = false;
    } else {
      this.isRenderingAll = true;
    }
  }

  // dt in ms
  tick (dt, uniforms) {
    this.sandbox.tick();
    if(this.detectAudio === true) this.synth.a.tick();
  //  let updateInterval = 1000/this.synth.fps // ms
    this.sandbox.set('time', this.synth.time += dt * 0.001 * this.synth.speed);
    this.timeSinceLastUpdate += dt;
    if(!this.synth.fps || this.timeSinceLastUpdate >= 1000/this.synth.fps) {
    //  console.log(1000/this.timeSinceLastUpdate)
      this.synth.stats.fps = Math.ceil(1000/this.timeSinceLastUpdate);
      if(this.synth.update) {
        try { this.synth.update(this.timeSinceLastUpdate); } catch (e) { console.log(e); }
      }
    //  console.log(this.synth.speed, this.synth.time)
      for (let i = 0; i < this.s.length; i++) {
        this.s[i].tick(this.synth.time);
      }
    //  console.log(this.canvas.width, this.canvas.height)
      for (let i = 0; i < this.o.length; i++) {
        this.o[i].tick({
          time: this.synth.time,
          mouse: this.synth.mouse,
          bpm: this.synth.bpm,
          resolution: [this.canvas.width, this.canvas.height]
        });
      }
      if (this.isRenderingAll) {
        this.renderAll({
          tex0: this.o[0].getCurrent(),
          tex1: this.o[1].getCurrent(),
          tex2: this.o[2].getCurrent(),
          tex3: this.o[3].getCurrent(),
          resolution: [this.canvas.width, this.canvas.height]
        });
      } else {

        this.renderFbo({
          tex0: this.output.getCurrent(),
          resolution: [this.canvas.width, this.canvas.height]
        });
      }
      this.timeSinceLastUpdate = 0;
    }
    if(this.saveFrame === true) {
      this.canvasToImage();
      this.saveFrame = false;
    }
  //  this.regl.poll()
  }


}

function createHydra(options = {}) {
    const hydra = new HydraRenderer({ 
        makeGlobal: false,  // Important: we don't want to pollute global scope
        detectAudio: false,
        ...options
    });

    // Get the synth instance that contains all the generator functions
    const synth = hydra.synth;

    // Return both the hydra instance and the synth
    return { hydra, synth };
}

function setupHydraWords(addToDictionary, { hydra, synth }) {
    if (!hydra || !synth) {
        throw new Error('Hydra and synth instances must be provided');
    }

    // Stack for building hydra chains
    let currentChain = null;

    // Helper to get args from stack in correct order with defaults
    function getArgs(context, count, defaults) {
        console.log("getArgs() context.stack:", context.stack.print(), 'defaults: ', defaults);
        const args = [];
        try {
            // Try to pop count number of items from stack
            for (let i = 0; i < count; i++) {
                args.unshift(context.stack.pop());
            }
        } catch (e) {
            while (args.length < count) {
                args.unshift(defaults[args.length]);
            }
        }
        console.log("getArgs() args:", args);
        return args;
    }

    // Sources
    addToDictionary("osc", function(context) {
        const [freq = 60, sync = 0.1, offset = 0] = getArgs(context, 3, [60, 0.1, 0]);
        console.log("osc() freq:", freq, "sync:", sync, "offset:", offset);
        currentChain = synth.osc(freq, sync, offset);
    });

    addToDictionary("solid", function(context) {
        const [r = 0, g = 0, b = 0, a = 1] = getArgs(context, 4, [0, 0, 0, 1]);
        currentChain = synth.solid(r, g, b, a);
    });

    addToDictionary("noise", function(context) {
        const [scale = 10, offset = 0.1] = getArgs(context, 2, [10, 0.1]);
        currentChain = synth.noise(scale, offset);
    });

    addToDictionary("voronoi", function(context) {
        const [scale = 5, speed = 0.3, blending = 0.3] = getArgs(context, 3, [5, 0.3, 0.3]);
        currentChain = synth.voronoi(scale, speed, blending);
    });

    addToDictionary("shape", function(context) {
        const [sides = 3, radius = 0.3, smoothing = 0.01] = getArgs(context, 3, [3, 0.3, 0.01]);
        currentChain = synth.shape(sides, radius, smoothing);
    });

    // Geometry
    addToDictionary("rotate", function(context) {
        const [angle = 10, speed = 0] = getArgs(context, 2, [10, 0]);
        if (!currentChain) throw new Error("No active hydra chain");
        currentChain = currentChain.rotate(angle, speed);
    });

    addToDictionary("scale", function(context) {
        const [amount = 1.5] = getArgs(context, 1, [1.5]);
        if (!currentChain) throw new Error("No active hydra chain");
        currentChain = currentChain.scale(amount);
    });

    addToDictionary("pixelate", function(context) {
        const [pixelX = 20, pixelY = 20] = getArgs(context, 2, [20, 20]);
        if (!currentChain) throw new Error("No active hydra chain");
        currentChain = currentChain.pixelate(pixelX, pixelY);
    });

    addToDictionary("kaleid", function(context) {
        const [nSides = 4] = getArgs(context, 1, [4]);
        if (!currentChain) throw new Error("No active hydra chain");
        currentChain = currentChain.kaleid(nSides);
    });

    // Color
    addToDictionary("colorama", function(context) {
        const [amount = 0.005] = getArgs(context, 1, [0.005]);
        if (!currentChain) throw new Error("No active hydra chain");
        currentChain = currentChain.colorama(amount);
    });

    addToDictionary("contrast", function(context) {
        const [amount = 1.6] = getArgs(context, 1, [1.6]);
        if (!currentChain) throw new Error("No active hydra chain");
        currentChain = currentChain.contrast(amount);
    });

    addToDictionary("brightness", function(context) {
        const [amount = 0.4] = getArgs(context, 1, [0.4]);
        if (!currentChain) throw new Error("No active hydra chain");
        currentChain = currentChain.brightness(amount);
    });

    addToDictionary("posterize", function(context) {
        const [bins = 3, gamma = 0.6] = getArgs(context, 2, [3, 0.6]);
        if (!currentChain) throw new Error("No active hydra chain");
        currentChain = currentChain.posterize(bins, gamma);
    });

    // Blend modes
    addToDictionary("blend", function(context) {
        const [texture, amount = 0.5] = getArgs(context, 2, [null, 0.5]);
        if (!currentChain) throw new Error("No active hydra chain");
        currentChain = currentChain.blend(texture, amount);
    });

    addToDictionary("diff", function(context) {
        const [texture] = getArgs(context, 1, [null]);
        if (!currentChain) throw new Error("No active hydra chain");
        currentChain = currentChain.diff(texture);
    });

    addToDictionary("mult", function(context) {
        const [texture, amount = 1] = getArgs(context, 2, [null, 1]);
        if (!currentChain) throw new Error("No active hydra chain");
        currentChain = currentChain.mult(texture, amount);
    });

    addToDictionary("add", function(context) {
        const [texture, amount = 0.5] = getArgs(context, 2, [null, 0.5]);
        if (!currentChain) throw new Error("No active hydra chain");
        currentChain = currentChain.add(texture, amount);
    });

    // Modulate
    addToDictionary("modulate", function(context) {
        const [texture, amount = 0.1] = getArgs(context, 2, [null, 0.1]);
        if (!currentChain) throw new Error("No active hydra chain");
        currentChain = currentChain.modulate(texture, amount);
    });

    addToDictionary("modulateScale", function(context) {
        const [texture, multiple = 1, offset = 1] = getArgs(context, 3, [null, 1, 1]);
        if (!currentChain) throw new Error("No active hydra chain");
        currentChain = currentChain.modulateScale(texture, multiple, offset);
    });

    addToDictionary("modulatePixelate", function(context) {
        const [texture, multiple = 10, offset = 3] = getArgs(context, 3, [null, 10, 3]);
        if (!currentChain) throw new Error("No active hydra chain");
        currentChain = currentChain.modulatePixelate(texture, multiple, offset);
    });

    // Output functions
    addToDictionary("out", function(context) {
        const [buffer = 0] = getArgs(context, 1, [0]);
        console.log("out() currentChain:", currentChain);
        if (!currentChain) throw new Error("No active hydra chain");
        currentChain.out(buffer);
    });

    // Final evaluation word
    addToDictionary("hydra", function(context) {
        if (!currentChain) throw new Error("No hydra chain to evaluate");
        console.log("hydra() currentChain:", currentChain);
        // Reset chain after evaluation
        currentChain = null;
    });

    // Buffer management
    addToDictionary("src", function(context) {
        const [buffer = 0] = getArgs(context, 1, [0]);
        currentChain = synth.src(buffer);
    });

    // Render management
    addToDictionary("render", function(context) {
        const [buffer = 0] = getArgs(context, 1, [0]);
        hydra.render(buffer);
    });
}

class Aww {
  constructor(next, hydraInstance) {
    // Core structures
    var context = {
      stack: Stack('Argument Stack'),
      returnStack: Stack('Return Stack'),
      dictionary: Dictionary(),
      memory: Memory(),
      // This is set when the interpreter is waiting for a key to be pressed or sleeping
      pause: false,
      // This is set within readLine as a callback to continue processing tokens
      // once a key has been pressed or sleep has finished
      onContinue: null,
      // Add array to store valid tokens
      parsedTokens: [],
      logger: createLogger(LogLevel.TRACE)
  };

  // This variable is shared across multiple calls to readLine,
  // as definitions can span multiple lines
  var currentDefinition = null;

  function namedFunction(name, prefix,  func) {
    console.log("Named function: ", name, func);
    if (typeof name !== 'string') {
      throw new Error('namedFunction expects a string as the first argument');
    }
    const originalName = name;
    if (prefix) {
      name = prefix + " " + name;
    }
    func._name = name;
    func._token = originalName;
    func._prefix = prefix;
    return func;
  }

  // Convert token into an action that executes that token's behavior
  function tokenToAction(token) {
    if (!token) return null;
    if (token.value === undefined) return null;

    var word = token.value;
    var definition = context.dictionary.lookup(word);

    context.logger.trace('tokenToAction', `Token: ${JSON.stringify(token)} -> Definition: ${JSON.stringify(definition)}`);

    if (token.isStringLiteral) {
      return namedFunction(word, 'String', function (context) {
        return word;
      });
    } else if (definition !== null) {
      return definition;
    } else if (isFinite(word)) {
      return namedFunction(word, 'Number', function (context) {
        context.stack.push(+word);
      });
    }
    context.logger.trace('tokenToAction', `Token: ${JSON.stringify(token)} -> null`);
    return null;
  }

  function addToDictionary(name, definition, isPermanent = false) {
    context.logger.debug('Dictionary', `Adding word: ${name}`, { isPermanent, definition });
    context.dictionary.add(name, namedFunction(name, null,  definition), isPermanent);
  }

  // compile actions into definition and add definition to dictionary
  function compileAndAddToDictionary(name, actions, isPermanent = false) {
    var definition = compile(context.dictionary, actions);
    addToDictionary(name, definition, isPermanent);
  }

  function createVariable(name) {
    var pointer = context.memory.addVariable(name);
    context.logger.debug('Memory', `Creating variable: ${name}`, { pointer });
    addToDictionary(name, function (context) {
      context.stack.push(pointer);
    });
  }

  function createConstant(name, value) {
    context.logger.debug('Memory', `Creating constant: ${name}`, { value });
    addToDictionary(name, function (context) {
      context.stack.push(value);
    });
  }

  function startDefinition(name, isPermanent = false) {
    context.logger.debug('Compiler', `Starting definition: ${name}`, { isPermanent });
    currentDefinition = { name: name, actions: [], isPermanent: isPermanent };
  }

  function endDefinition() {
    context.logger.debug('Compiler', `Ending definition: ${currentDefinition.name}`);
    compileAndAddToDictionary(currentDefinition.name, currentDefinition.actions, currentDefinition.isPermanent);
    currentDefinition = null;
  }

  function addActionToCurrentDefinition(action) {
    if (action.code === ";") {
      endDefinition();
    } else {
      currentDefinition.actions.push(action);
    }
  }

  function executeRuntimeAction(tokenizer, action, next) {
    context.logger.debug('Runtime', `Executing action: ${action?._name}`);
    
    // Store the token if it's valid and skip if invalid
    if (action === null) {
      context.logger.trace('Runtime', `Executing action: ${action?._name} -> null`);
      next(); // Continue processing instead of returning
      return;
    }

    // Store the token if it's valid
    if (action) {
      const token = action._token;
      context.logger.trace('Runtime', `Executing action: ${action?._name} -> ${token}`);
      if (token) {
        context.parsedTokens.push(token);
      }
    }

    if (typeof action === 'function') {
      if (action.length == 2) { // has next callback
        action(context, next);
      } else {
        next(action(context));
      }
    } else if (action && action.code) {
      switch (action.code) {
        case "variable":
          createVariable(tokenizer.nextToken().value);
          break;
        case "constant":
          createConstant(tokenizer.nextToken().value, context.stack.pop());
          break;
        case ";":
          endDefinition();
          break;
        default:
          throw new Error("Unknown control code: " + action.code);
      }
      next("");
    } else {
      throw new Error("Invalid action: " + action);
    }
  }

  // Read a line of input. Callback is called with output for this line.
  function readLine(line, outputCallback, next) {
    context.logger.info('Input', `Processing line: ${line}`);
    if (!next) {
      next = outputCallback;
      outputCallback = null;
    }
    context.addOutput = outputCallback || function () {};
    var tokenizer = Tokenizer(line);
    context.parsedTokens = [];

    // processNextToken recursively executes tokens
    function processNextToken() {
      var token = tokenizer.peekToken();

      if (!token) {
        context.logger.debug('Runtime', `No token (last token)`);
        if (!currentDefinition) { // don't append output while definition is in progress
          context.logger.debug('Runtime', `No token (last token), no current definition, append output`);
          context.addOutput(" ok");
        }
        next();
        return;
      }

      context.logger.trace('Runtime', `Processing Next token: ${JSON.stringify(token)}`);


      const peekAction = tokenToAction(token);
      const peekNextToken = tokenizer.peekToken(1);
      const peekNextToken2 = tokenizer.peekToken(2);

      context.logger.trace('Runtime', `Peek Next Token: ${JSON.stringify(peekNextToken)}, Peek Next Next Token: ${JSON.stringify(peekNextToken2)}`);


      if (peekNextToken2 && peekAction?.code === '~' && isCapitalized(peekNextToken?.value) && tokenToAction(peekNextToken2)?.code  === 'is') {
        context.logger.trace('Runtime', `Handling permanent definition: ${token.value} ${peekNextToken.value} ${peekNextToken2.value}`);
        handlePermanentDefinition();
      } else if (peekNextToken && isCapitalized(token.value) && tokenToAction(peekNextToken)?.code === 'is') {
        context.logger.trace('Runtime', `Handling non-permanent definition: ${token.value} ${peekAction2.value}`);
        handleDefinitionTypeIS(false);
      } else if (peekAction?.code === ':') {
        tokenizer.nextToken(); // consume ':'
        context.logger.trace('Runtime', `Handling colon definition: ${token.value}`);
        var word = tokenizer.nextToken().value;
        context.parsedTokens.push(word);
        startDefinition(word);
      } else if (currentDefinition) {
        context.logger.trace('Runtime', `Handling current definition: ${token.value}`);
        var action = tokenToAction(tokenizer.nextToken());
        addActionToCurrentDefinition(action);
      } else {
        context.logger.trace('Runtime', `Handling default runtime action: ${token.value}`);
        var action = tokenToAction(tokenizer.nextToken());
        executeRuntimeAction(tokenizer, action, handleOutput);
      }
      processNextToken();
    }

    function isCapitalized(word) {
      return word && word[0] === word[0].toUpperCase();
    }

    function handlePermanentDefinition() {
      tokenizer.nextToken(); // consume '~'
      handleDefinitionTypeIS(true);
    }

    function handleDefinitionTypeIS(isPermanent) {
      var word = tokenizer.nextToken().value;
      context.parsedTokens.push(word);
      const definitionWord = tokenizer.nextToken().value;
      context.parsedTokens.push(definitionWord);

      context.logger.debug('Compiler', `Handling definition type IS: ${word} ${definitionWord} ->`);

      
      if (tokenToAction(tokenizer.peekToken())?.code === 'now') {
        tokenizer.nextToken(); // consume 'now'
        var newDefinition = tokenToAction(tokenizer.nextToken());
        context.dictionary.redefine(word, newDefinition, isPermanent);
      } else  {
        startDefinition(word, isPermanent);
      }
      
      processNextToken(); // Changed from processTokens() to processNextToken()
    }

    function handleOutput(output) {
      context.logger.trace('Runtime', `Handling output: ${output}`);
      context.addOutput(output);
      if (context.pause) {
        context.onContinue = processTokens;
      } else {
        processTokens();
      }
    }

    function processTokens() {
      context.logger.trace('Runtime', `Processing tokens`);
      try {
        processNextToken();
      } catch (e) {
        currentDefinition = null;
        context.addOutput(" " + e.message);
        context.logger.error('Runtime', `Error processing tokens: ${e.message}`);
        next();
      }
    }

    processTokens();
  }

  function readLines(codeLines, callbacks, next) {
    if (callbacks && !next) {
      next = callbacks;
      callbacks = null;
    }

    if (codeLines.length == 0) {
      next();
      return;
    }

    var codeLine = codeLines[0];

    callbacks && callbacks.lineCallback(codeLine);
    readLine(codeLine, callbacks && callbacks.outputCallback, function () {
      readLines(codeLines.slice(1), callbacks, next);
    });
  }

  addPredefinedWords(addToDictionary, readLines, function () {
    // Set up hydra words if instance provided
    if (hydraInstance) {
      setupHydraWords(addToDictionary, hydraInstance);
    }

    next({
      readLine: readLine,
      readLines: readLines,
      keydown: function (keyCode) {
        context.logger.debug('Input', `Keydown event: ${keyCode}`);
        context.memory.setValue(context.memory.getVariable("last-key"), keyCode);
        context.keydown && context.keydown(keyCode);
      },
      getStack: function () {
        return context.stack.print();
      },
      getContext: function () {
        return context;
      },
      getDictionary: function () {
        return context.dictionary.print();
      },
      getMemory: function () {
        return context.memory.print();
      },
      // Add new getter for parsed tokens
      getParsedTokens: function () {
        return context.parsedTokens;
      },
      // Clear parsed tokens at start of new line
      clearParsedTokens: function () {
        context.parsedTokens = [];
      },
      setMemoryHandler: function (cb) {
        context.onMemoryChange = function (address, value) {
          cb(address, value, context.memory.getVariable("graphics"));
        };
      },
      // Add logger controls
      setLogLevel: function(level) {
        context.logger.setLevel(level);
      },
      getLogs: function(level) {
        return context.logger.getLogs(level);
      },
      clearLogs: function() {
        context.logger.clearLogs();
      },
      // Add callback setter for logs
      onLog: function(callback) {
        context.logger.setLogCallback(callback);
      }
    });
  });
  }
}

exports.Aww = Aww;
exports.createHydra = createHydra;
