"use strict";
var path = require("path"),
    url = require("url"),
    express = require("express");

module.exports = function(opts) {
  var env = process.env.NODE_ENV || "development";

  opts = typeof(opts) === "string" ? {root: opts} : (opts || {});
  opts.maxAge = opts.maxAge || (env === "production" ? 86400*100*365 : 0);
  opts.helper = opts.hasOwnProperty("helper") ? opts.helper : "assets";
  opts.livereload = opts.hasOwnProperty("livereload") ? opts.livereload : env === "development";
  opts.map = opts.map || {};
  opts.href = opts.href || undefined;

  // root must be defined
  if (!opts.root) {
    throw new Error("Assets root must be defined");
  }

  // load hashmap
  if (typeof(opts.map) === "string") {
    opts.map = require(opts.map);
  }

  // middleware
  var serve = express.static(opts.root, {maxAge: opts.maxAge});
  var regex = /^\/(.+)-([a-f0-9]+)(\.[^.]+)$/;

  return function(req, res, next) {
    // assign helpers
    if (opts.helper && !req.app.locals[opts.helper]) {
      if (opts.href === undefined) {
        opts.href = opts.vhost ? "//"+opts.vhost : "";
        opts.href += req.originalUrl.substr(0, req.originalUrl.length - req.url.length);
      }

      helper(req.app, opts);
    }

    // check vhost
    if (opts.vhost && req.host !== opts.vhost) return next();

    // remove potential hash tag
    var parsed = url.parse(req.url);
    var match = parsed.path.match(regex);

    if (match) {
      var realname = match[1] + match[3];

      if (opts.map[realname] && opts.map[realname] === match[2]) {
        req.url = "/"+realname;
      }
    }

    return serve.call(this, req, res, next);
  };
};


/**
 * View helper
 */
var helper = module.exports.helper = function(app, opts) {
  // a href path must be defined
  if (opts.href === undefined) {
    throw new Error("Assets href must be defined");
  }
    
  // inject hash tag in url
  app.locals[opts.helper] = function(file) {
    if (opts.map.hasOwnProperty(file)) {
      var ext = path.extname(file);
      file = file.substring(0, file.length-ext.length) + "-" + opts.map[file] + ext;
    }

    file = opts.href+"/"+file;
    if (app.get("env") === "development") {
      file += "?"+Date.now();
    }

    return file;
  };

  app.locals[opts.helper].css = function(file) {
    return '<link rel="stylesheet" href="'+this(file)+'">';
  };

  app.locals[opts.helper].js = function(file) {
    return '<script src="'+this(file)+'"></script>';
  };

  app.locals[opts.helper].livereload = function() {
    if (!opts.livereload) return '';
    return '<script src="//localhost:35729/livereload.js"></script>';
  };
};
