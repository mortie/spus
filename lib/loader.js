var fs = require("fs");
var zlib = require("zlib");
var browserPrefix = require("browser-prefix");
var log = require("mlogger");
var jshint = require("jshint").JSHINT;
var minify = require("./minify.js");
var includeHtml = require("./includeHtml.js");

exports.load = function(endpoints, conf) {
	var res = {
		endpoints: {},
		templates: {},
		views: {}
	}

	//Prepare endpoints
	var errs = false;
	var eps = Object.keys(endpoints).map(function(i) {
		var ep = {
			path: endpoints[i],
			url: i
		}

		try {

			//The endpoint is a function if the file ends with .node.js
			if (/\.node\.js$/.test(ep.path)) {
				ep.func = require("../"+conf.dir.web+"/"+ep.path);
				return ep;

			//If it doesn't end with .node.js, it's a regular text file and will
			//just be served as is
			} else {
				ep.str = fs.readFileSync(conf.dir.web+"/"+ep.path, "utf8");

				//Add browser prefixes
				if (/\.css$/.test(ep.path)) {
					ep.str = browserPrefix(ep.str);
					ep.mimeType = "text/css";
					if (conf.minify) ep.str = minify.css(ep.str);
				} else if (/\.html$/.test(ep.path)) {
					ep.mimeType = "text/html";
					if (conf.minify) ep.str = minify.html(ep.str);
				} else if (/\.js$/.test(ep.path)) {
					jshint.errors = [];
					jshint(ep.str);
					jshint.errors.forEach(function(err) {
						if (!err)
							return;

						log.warn(
							conf.dir.web+"/"+ep.path+": "+
							"Line "+err.line+": "+
							err.reason
						);
					});

					ep.mimeType = "application/javascript";
					if (conf.minify && !jshint.errors) ep.str = minify.js(ep.str);
				}

				return ep;
			}

		//Errors will usually be because an endpoint doesn't exist
		} catch (err) {
			if (err.code === "ENOENT" || err.code === "MODULE_NOT_FOUND") {
				log.error("File not found: "+conf.dir.web+"/"+ep.path);
				errs = true;
			} else {
				log.warn(conf.dir.web+"/"+ep.path);
				throw err;
			}
		}
	});

	//No need to proceed if some endpoints don't exist
	if (errs) process.exit();

	eps.forEach(function(ep) {
		res.endpoints[ep.url] = ep;
	});


	//Prepare all templates
	var templates = {};
	fs.readdirSync("templates").forEach(function(f) {
		var name = f.replace(/\.html$/, "");
		res.templates[name] = includeHtml("templates/"+f, conf);
	});

	//Prepare all views
	var views = {};
	fs.readdirSync("views").forEach(function(f) {
		var name = f.replace(/\.html$/, "");
		res.views[name] = includeHtml("views/"+f, conf);
	});

	return res;
}
