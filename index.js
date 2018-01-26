const path = require("path");
const fs = require("fs");
const async = require("async");
const AppDirectory = require("appdirectory");
const compareVersions = require( "compare-versions");

var beLoud = true;

function getPlugins(plugins) {
    var mapped = [];
    Object.getOwnPropertyNames(plugins).forEach(function (name) {
        mapped.push({
            name: name,
            version: plugins[name]
        });
    });

    return mapped;
}

function getPluginPackage(plugin, callback) {
    var context = this;
    var name = plugin.name;
    var version = plugin.version;
    // Load the package.json in either the linked dev directory or from the downloaded plugin
    async.map(
        ["link", version],
        function (version, callback) {
            var packagePath = path.join(context.pluginsDir, name, version, "package.json");
            fs.readFile(packagePath, {encoding:"utf8"}, function (err, result) {
                if(err) { return callback(); }
                callback(null, {
                    name: name,
                    version: version,
                    config: JSON.parse(result)
                });
            });
        },
        function (err, results) {
            // If neither file is found, or there was an unexpected error then fail
            var result = results[0] || results[1];
            if (err || !result) { return callback(err || "ENOENT"); }
            callback(null, result);
        });
}

function loadPlugin(context, results, callback) {
    var modules = [];
    var dependencies = [];
    try {
        for ( var i = 0, n = results.length; i < n; i++) {
            var plugin = results[i];
            var main   = plugin.config.hasOwnProperty("main") ? plugin.config.main : "index.js";
            var name = plugin.name;
            var version = plugin.version;
            var depName = name.replace(/-/g, ".");
            var file = path.resolve(path.join(context.pluginsDir, name, version), main);
            var Plugin = require(file);
            var mod = new Plugin(context.appContext);
            modules.push(mod);
            dependencies.push(depName);
        }
    } catch (err) {
        return callback(err);
    }

    callback(null, dependencies, modules);
}

/* FROM https://stackoverflow.com/questions/31645738/how-to-create-full-path-with-nodes-fs-mkdirsync */

function mkDirByPathSync(targetDir, {isRelativeToScript = false} = {}) {
  const sep = path.sep;
  const initDir = path.isAbsolute(targetDir) ? sep : "";
  const baseDir = isRelativeToScript ? __dirname : ".";

  targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(baseDir, parentDir, childDir);
    try {
      fs.mkdirSync(curDir);
      if ( beLoud ) { console.log(`Directory ${curDir} created!`); }
    } catch (err) {
      if (err.code !== "EEXIST") {
        throw err;
      }

      if ( beLoud ) { console.log(`Directory ${curDir} already exists!`); }
    }

    return curDir;
  }, initDir);
}

function substitutePluginPath( passedPath, callback ) {
  let pluginPath = "";

  var appDir = path.dirname(process.mainModule.filename);
  var packagePath = path.join(appDir, "package.json");

  fs.readFile(packagePath, {encoding: "utf8"}, function (err, contents) {
      if(err) return callback(err, null);
      var config = JSON.parse(contents)
      var dirs = new AppDirectory({
          appName: config.name,
          appAuthor: config.publisher
      })
      var appData = dirs.userData()
      if ( beLoud ) { console.log("[electron-plugins] appData: " + appData); }

      pluginPath = passedPath ? passedPath : path.join(appData, "plugins");

      // Check to see if this is a "relative path", ASSUME ~ is homedir for all platforms.
      if( pluginPath.slice( 0, 1 ) === "~" )
      {
        pluginPath = path.join( require( "os" ).homedir(), pluginPath.substr(1) );
      }
      if( pluginPath.slice( -1 ) === ":" )
      {
        pluginPath = path.join( pluginPath.slice( 0, -1 ), config.name );
      }
      if ( beLoud ) { console.log( "[electron-plugins] Using provided plugin path. " + pluginPath ); }

      return callback( null, pluginPath );
    } );
}

function discover( pluginRelPath, useDev, callback ) {
  let foundPlugins = {};
  substitutePluginPath( pluginRelPath, function ( err, pluginPath ) {
    if( fs.existsSync( pluginPath ) ) {
      dirContents = fs.readdirSync( pluginPath );
      for( var contLoop=0; contLoop < dirContents.length; contLoop++ )
      {
        if( fs.statSync( path.join(pluginPath, dirContents[ contLoop ])).isDirectory() )
        {
          const versions = fs.readdirSync( path.join(pluginPath, dirContents[ contLoop ] ) );
          var newestVersion = "0.0.0";
          for ( var verLoop=0; verLoop < versions.length; verLoop++ ) {
            if( fs.statSync( path.join( pluginPath, dirContents[ contLoop ], versions[ verLoop ])).isDirectory() ) {
              if( versions[ verLoop ] === "LINK" )
              {
                if ( useDev )
                {
                  foundPlugins[ dirContents[ contLoop ] ] = "LINK";
                }
              }
              else if( compareVersions( newestVersion, versions[ verLoop ] ) < 0 )
              {
                newestVersion = versions[ verLoop ];
              }
            }
          }
          if( newestVersion != "0.0.0" ) { foundPlugins[ dirContents[ contLoop ] ] = newestVersion; }
        }
      }
      callback( null, foundPlugins );
    } else {
      callback( "Plugin Path not found.", null );
    }
  });
}

function load( appContext, callback) {
  let makePluginPath = false;

  if ( appContext.context.hasOwnProperty( "makePluginPath" ) ) {
    makePluginPath = true;
  }

  if ( appContext.context.hasOwnProperty( "quiet" ) ) {
    beLoud = false;
  }

  let passedPath = appContext.context.hasOwnProperty( "pluginPath" ) ? appContext.context.pluginPath : "";
  substitutePluginPath( passedPath, function ( err, pluginPath ) {
      var currentPath = path.join( pluginPath, ".current" )

      // If the plugin path does not exist, log it and bail.
      if( !fs.existsSync( pluginPath ) ) {
        if ( beLoud ) { console.log( "[electron-plugins] Plugin path does not exist."); }
        if ( makePluginPath ) {
          mkDirByPathSync( pluginPath );
          if ( beLoud ) { console.log( "[electron-plugins] Created plugin path. "); }
        }
      }
      else {
        if ( beLoud ) { console.log( "[electron-plugins] Loading plugins from " + pluginPath ); }
          var plugins;
          if ( appContext.context.hasOwnProperty( "plugins" ) ) {
            plugins = appContext.context.plugins;
          }
          else {
            let contents = fs.readFileSync(currentPath, {encoding: "utf8"})
            plugins = (!err ? JSON.parse(contents) : config.plugins) || {}
          }
          var context = {
            plugins: plugins,
            pluginsDir: pluginPath,
            appContext: appContext
          }
          async.map(
            getPlugins(context.plugins),
            getPluginPackage.bind(context),
            function (err, results) {
              if(err) return callback(err)
              loadPlugin(context, results, callback)
            })
      }
  })
}

module.exports = {
    load: load,
    discover: discover
}
