var loader = require("@loader");

// Register for server-side rendering.
var register = loader.has("asset-register") ?
  loader.get("asset-register")["default"] : function(){};

function getExistingAsset(load){
	var s = typeof jQuery !== "undefined" ? jQuery : document.querySelectorAll.bind(document);
	var val = s("[asset-id='" + load.name + "']");
	return val && val[0];
}

var isNode = typeof process === "object" &&
	{}.toString.call(process) === "[object process]";

var isNW = (function(){
	try {
		return loader._nodeRequire("nw.gui") !== "undefined";
	} catch(e) {
		return false;
	}
})();

var isProduction = (loader.isEnv && loader.isEnv("production")) || (loader.envMap && loader.envMap.production) || loader.env === "production";
if(isProduction) {
	exports.fetch = function(load) {
		// return a thenable for fetching (as per specification)
		// alternatively return new Promise(function(resolve, reject) { ... })
		var cssFile = load.address;

		var link;
		if(isNode && !isNW) {
			var path = loader._nodeRequire("path");
			cssFile = path.relative(loader.baseURL, cssFile);

			var href = "/" + cssFile;

			// If server side rendering and a baseURL is set, use it.
			if(loader.renderingLoader) {
				var baseURL = loader.renderingLoader.baseURL;
				if(baseURL.indexOf("http") === 0) {
					href = baseURL + cssFile.replace("dist/", "");
				}
			}

			link = document.createElement('link');
			link.setAttribute("rel", "stylesheet");
			link.setAttribute("href", href);

			register(load.name, "css", function(){
				return link.cloneNode(true);
			});
		} else {
			if(typeof document !== "undefined") {
				link = getExistingAsset(load);
				if(!link) {
					link = document.createElement('link');
					link.rel = 'stylesheet';
					link.href = cssFile;

					document.head.appendChild(link);
				}
			}
		}

		return "";
	};
} else {
	exports.instantiate = function(load) {
		var loader = this;

		load.metadata.deps = [];
		load.metadata.execute = function(){
			var liveReloadEnabled = loader.has("live-reload");
			var source = load.source+"/*# sourceURL="+load.address+" */";
			source = source.replace(/url\(['"]?([^'"\)]*)['"]?\)/g, function(whole, part) {
				return "url(" + steal.joinURIs( load.address, part) + ")";
			});

			if(load.source && typeof document !== "undefined") {
				var doc = document.head ? document : document.getElementsByTagName ?
					document : document.documentElement;

				var head = doc.head || doc.getElementsByTagName('head')[0];

				if(!head) {
					var docEl = doc.documentElement || doc;
					head = document.createElement("head");
					docEl.insertBefore(head, docEl.firstChild);
				}

				var style = getExistingAsset(load);
				if(!style || liveReloadEnabled) {
					style = document.createElement('style')

					// make source load relative to the current page

					style.type = 'text/css';

					if (style.styleSheet){
						style.styleSheet.cssText = source;
					} else {
						style.appendChild(document.createTextNode(source));
					}
					head.appendChild(style);
				}

				if(liveReloadEnabled) {
					var cssReload = loader.import("live-reload", { name: "$css" });
					Promise.resolve(cssReload).then(function(reload){
						loader.import(load.name).then(function(){
							reload.once(load.name, function(){
								head.removeChild(style);
							});
						});
					});
				}

				// For server-side rendering, register this module.
				register(load.name, "css", function(){
					return style.cloneNode(true);
				});
			}

			return System.newModule({source: source});
		};
		load.metadata.format = "css";
	};

}

exports.buildType = "css";
exports.includeInBuild = true;
