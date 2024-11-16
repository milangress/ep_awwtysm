'use strict';

const eejs = require('ep_etherpad-lite/node/eejs/');
// const Changeset = require('ep_etherpad-lite/static/js/Changeset');
// const settings = require('ep_etherpad-lite/node/utils/Settings');

exports.eejsBlock_editbarMenuLeft = (hookName, args, cb) => {
  if (args.renderContext.isReadOnly) return cb();

  args.content += eejs.require('ep_awwtysm/templates/editbarButtons.ejs');
  return cb();
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
