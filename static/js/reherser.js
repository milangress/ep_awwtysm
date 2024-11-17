'use strict';

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
      return arr.join(" ") + " <- Top ";
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

  return {
    addVariable: addVariable,
    getVariable: getVariable,
    setValue: setValue,
    getValue: getValue,
    allot: allot
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

function Forth(next) {
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

module.exports = Forth;
