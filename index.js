'use strict';

const eejs = require('ep_etherpad-lite/node/eejs/');
const Changeset = require('ep_etherpad-lite/static/js/Changeset');
const settings = require('ep_etherpad-lite/node/utils/Settings');

exports.eejsBlock_editbarMenuLeft = (hookName, args, cb) => {
  if (args.renderContext.isReadOnly) return cb();

  args.content += eejs.require('ep_awwtysm/templates/editbarButtons.ejs');
  return cb();
};

const _analyzeLine = (alineAttrs, apool) => {
  let alignment = null;
  if (alineAttrs) {
    const opIter = Changeset.opIterator(alineAttrs);
    if (opIter.hasNext()) {
      const op = opIter.next();
      alignment = Changeset.opAttributeValue(op, 'align', apool);
    }
  }
  return alignment;
};

// line, apool,attribLine,text
exports.getLineHTMLForExport = async (hookName, context) => {
  const align = _analyzeLine(context.attribLine, context.apool);
  if (align) {
    if (context.text.indexOf('*') === 0) {
      context.lineContent = context.lineContent.replace('*', '');
    }
    const heading = context.lineContent.match(/<h([1-6])([^>]+)?>/);

    if (heading) {
      if (heading.indexOf('style=') === -1) {
        context.lineContent = context.lineContent.replace('>', ` style='text-align:${align}'>`);
      } else {
        context.lineContent = context.lineContent.replace('style=', `style='text-align:${align} `);
      }
    } else {
      context.lineContent =
        `<p style='text-align:${align}'>${context.lineContent}</p>`;
    }
    return context.lineContent;
  }
};

exports.padInitToolbar = (hookName, args, cb) => {
  const toolbar = args.toolbar;

  const runButton = toolbar.button({
    command: 'run',
    localizationId: 'ep_awwtysm.toolbar.run.title',
    class: 'buttonicon buttonicon-run ep_awwtysm ep_awwtysm_run',
  });

  toolbar.registerButton('run', runButton);

  return cb();
};
