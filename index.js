'use strict';

const eejs = require('ep_etherpad-lite/node/eejs/');
// const Changeset = require('ep_etherpad-lite/static/js/Changeset');
// const settings = require('ep_etherpad-lite/node/utils/Settings');

exports.eejsBlock_editbarMenuLeft = (hookName, args, cb) => {
  if (args.renderContext.isReadOnly) return cb();

  args.content += eejs.require('ep_awwtysm/templates/editbarButtons.ejs');
  return cb();
};

exports.eejsBlock_editorContainerBox = (hookName, args, cb) => {
  args.content += eejs.require('ep_awwtysm/templates/logsModal.ejs', {}, module);
  args.content += eejs.require('ep_awwtysm/templates/mainModal.ejs', {}, module);
  args.content += eejs.require('ep_awwtysm/templates/replModal.ejs', {}, module);
  return cb();
};

exports.eejsBlock_styles = (hookName, args, cb) => {
  args.content +=
  "<link href='../static/plugins/ep_awwtysm/static/css/awwGlobal.css' rel='stylesheet'>";
  return cb();
};


exports.padInitToolbar = (hookName, args, cb) => {
  const toolbar = args.toolbar;

  const runButton = toolbar.button({
    command: 'run',
    localizationId: 'ep_awwtysm.toolbar.run.title',
    class: 'buttonicon buttonicon-run ep_awwtysm ep_awwtysm_run',
  });

  const runAllButton = toolbar.button({
    command: 'run_all',
    localizationId: 'ep_awwtysm.toolbar.run_all.title',
    class: 'buttonicon buttonicon-run-all ep_awwtysm ep_awwtysm_run_all',
  });

  toolbar.registerButton('run', runButton);
  toolbar.registerButton('run_all', runAllButton);
  return cb();
};
