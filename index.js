var path = require('path'),
    fs = require('fs'),
    async = require('async'),
    AppDirectory = require('appdirectory')

var beLoud = true;

function getPlugins(plugins) {
    var mapped = []
    Object.getOwnPropertyNames(plugins).forEach(function (name) {
        mapped.push({
            name: name,
            version: plugins[name]
        })
    })

    return mapped
}

function getPluginPackage(plugin, callback) {
    var context = this
    var name = plugin.name
    var version = plugin.version
    // Load the package.json in either the linked dev directory or from the downloaded plugin
    async.map(
        ['link', version],
        function (version, callback) {
            var packagePath = path.join(context.pluginsDir, name, version, 'package.json')
            fs.readFile(packagePath, {encoding:'utf8'}, function (err, result) {
                if(err) return callback()
                callback(null, {
                    name: name,
                    version: version,
                    config: JSON.parse(result)
                })
            })
        },
        function (err, results) {
            // If neither file is found, or there was an unexpected error then fail
            var result = results[0] || results[1]
            if (err || !result) return callback(err || 'ENOENT')
            callback(null, result)
        })
}

function loadPlugin(context, results, callback) {
    var modules = []
    var dependencies = []
    try {
        for(var i = 0, n = results.length; i < n; i++) {
            var plugin = results[i]
            var main = plugin.config.main
            var name = plugin.name
            var version = plugin.version
            var depName = name.replace(/-/g, '.')
            var file = path.resolve(path.join(context.pluginsDir, name, version), main)
            var Plugin = require(file)
            var mod = new Plugin(context.appContext)
            modules.push(mod)
            dependencies.push(depName)
        }
    } catch (err) {
        return callback(err)
    }

    callback(null, dependencies, modules)
}

function load( appContext, callback) {
    let pluginPath = '';
    let makePluginPath = false;

    if ( appContext.context.hasOwnProperty( 'pluginPath' ) )
    {
      pluginPath = appContext.context.pluginPath;
    }

    if ( appContext.context.hasOwnProperty( 'makePluginPath' ) )
    {
      makePluginPath = true;
    }

    if ( appContext.context.hasOwnProperty( 'quiet' ) ) {
      beLoud = false;
    }

    var appDir = path.dirname(process.mainModule.filename);
    var packagePath = path.join(appDir, 'package.json');
    fs.readFile(packagePath, {encoding: 'utf8'}, function (err, contents) {
        if(err) return callback(err);
        var config = JSON.parse(contents)
        var dirs = new AppDirectory({
            appName: config.name,
            appAuthor: config.publisher
        })
        var appData = dirs.userData()
        if ( beLoud ) { console.log('[electron-plugins] appData: ' + appData); }

        // If the plugin path is not provided, use the default.
        if ( !pluginPath ) {
          pluginPath = path.join(appData, 'plugins');
          if ( beLoud ) { console.log( '[electron-plugins] Using default plugin path.' + pluginPath ); }
        }
        else {
          // Check to see if this is a "relative path", ASSUME ~ is homedir for all platforms.
          if( pluginPath.slice( 0, 1 ) === '~' )
          {
            pluginPath = require( 'os' ).homedir() + pluginPath.substr(1);
          }
          if( pluginPath.slice( -1 ) === ':' )
          {
            pluginPath = pluginPath.slice( 0, -1 ) + config.name;
          }
          if ( beLoud ) { console.log( '[electron-plugins] Using provided plugin path. ' + pluginPath ); }
        }
        var currentPath = path.join( pluginPath, '.current' )

        // If the plugin path does not exist, log it and bail.
        if( !fs.existsSync( pluginPath ) ) {
          if ( beLoud ) { console.log( '[electron-plugins] Plugin path does not exist.'); }
          if ( makePluginPath ) {
            fs.mkdirSync( pluginPath );
            if ( beLoud ) { console.log( '[electron-plugins] Created plugin path. '); }
          }
        }
        else {
          if ( beLoud ) { console.log( '[electron-plugins] Loading plugins from ' + pluginPath ); }
          fs.readFile(currentPath, {encoding: 'utf8'}, function (err, contents) {
              var plugins = (!err ? JSON.parse(contents) : config.plugins) || {}
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
          })
        }
    })
}

module.exports = {
    load: load
}
