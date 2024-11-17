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
  var dict = [];

  function add(name, definition, isPermanent = false) {
    // console.log("Adding word to dictionary: ", name, definition, isPermanent);
    if (name === null || name === undefined) {
      console.log("Trying to add word with null name to dictionary");
      throw new Error("Cant add null name");
    }
    dict.unshift([name.toLowerCase(), definition, isPermanent]);
  }

  function lookup(key) {
    key = key.toLowerCase();
    var item = dict.find(function (item) {
      return item[0] === key;
    });
    // console.log("Looking up word in dictionary: ", key, item, "found: ", item ? item[1] : null);

    return item ? item[1] : null;
  }

  function isPermanent(key) {
    key = key.toLowerCase();
    var item = dict.find(function (item) {
      return item[0] === key;
    });

    return item ? item[2] : false;
  }

  function redefine(key, newDefinition, isPermanent) {
    key = key.toLowerCase();
    var index = dict.findIndex(function (item) {
      return item[0] === key;
    });

    // console.log("Redefining word in dictionary: ", key, newDefinition, isPermanent, "at index: ", index);

    if (index !== -1) {
      dict[index] = [key, newDefinition, isPermanent];
    } else {
      // If the word doesn't exist, add it
      add(key, newDefinition, isPermanent);
    }
  }

  function print() {
    return dict;
  }

  return {
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
    parsedTokens: []
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
    var word = token.value;
    var definition = context.dictionary.lookup(word);

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
    return null;
  }

  function addToDictionary(name, definition, isPermanent = false) {
    context.dictionary.add(name, namedFunction(name, null,  definition), isPermanent);
  }

  // compile actions into definition and add definition to dictionary
  function compileAndAddToDictionary(name, actions, isPermanent = false) {
    var definition = compile(context.dictionary, actions);
    addToDictionary(name, definition, isPermanent);
  }

  function createVariable(name) {
    var pointer = context.memory.addVariable(name);
    addToDictionary(name, function (context) {
      context.stack.push(pointer);
    });
  }

  function createConstant(name, value) {
    addToDictionary(name, function (context) {
      context.stack.push(value);
    });
  }

  function startDefinition(name, isPermanent = false) {
    currentDefinition = { name: name, actions: [], isPermanent: isPermanent };
  }

  function endDefinition() {
    compileAndAddToDictionary(currentDefinition.name, currentDefinition.actions, currentDefinition.isPermanent);
    currentDefinition = null;
  }

  function executeRuntimeAction(tokenizer, action, next) {
    console.log("Executing runtime action: ", action?._name);
    
    // Store the token if it's valid and skip if invalid
    if (action === null) {
      next(); // Continue processing instead of returning
      return;
    }

    // Store the token if it's valid
    if (action) {
      const token = action._token;
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
        if (!currentDefinition) { // don't append output while definition is in progress
          context.addOutput(" ok");
        }
        next();
        return;
      }

      if (token.value === '~' && isCapitalized(tokenizer.peekToken(2)?.value) && tokenizer.peekToken(3)?.value === 'is') {
        handlePermanentDefinition();
      } else if (isCapitalized(token.value) && tokenizer.peekToken(2)?.value === 'is') {
        handleDefinition(false);
      } else {
        var action = tokenToAction(tokenizer.nextToken());
        executeRuntimeAction(tokenizer, action, handleOutput);
      }
    }

    function isCapitalized(word) {
      return word && word[0] === word[0].toUpperCase();
    }

    function handlePermanentDefinition() {
      tokenizer.nextToken(); // consume '~'
      handleDefinition(true);
    }

    function handleDefinition(isPermanent) {
      var word = tokenizer.nextToken().value;
      context.parsedTokens.push(word);
      const definitionWord = tokenizer.nextToken().value;
      context.parsedTokens.push(definitionWord);
      
      if (tokenizer.peekToken()?.value === 'now') {
        tokenizer.nextToken(); // consume 'now'
        var newDefinition = tokenToAction(tokenizer.nextToken());
        context.dictionary.redefine(word, newDefinition, isPermanent);
      } else if (tokenizer.peekToken()) {
        // Inline definition
        var definition = tokenToAction(tokenizer.nextToken());
        addToDictionary(word, definition, isPermanent);
      } else {
        // Multi-line definition
        startDefinition(word, isPermanent);
      }
      
      processNextToken(); // Changed from processTokens() to processNextToken()
    }

    function handleOutput(output) {
      context.addOutput(output);
      if (context.pause) {
        context.onContinue = processTokens;
      } else {
        processTokens();
      }
    }

    function processTokens() {
      try {
        processNextToken();
      } catch (e) {
        currentDefinition = null;
        context.addOutput(" " + e.message);
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
      }
    });
  });
}

module.exports = Forth;
