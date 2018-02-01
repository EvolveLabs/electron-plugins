# electron-plugins
Plugin loader for electron applications.

## Installation
```
npm install electron-plugins --save
```

## Usage
In your electron render process you can load your plugins like so:
```
var plugins = require('electron-plugins');

document.addEventListener('DOMContentLoaded', function () {
  var context = { document: document };
  plugins.load(context, function (err, loaded) {
    if(err) return console.error(err);
    console.log('Plugins loaded successfully.');
  });
});
```

The context object may take the following additional, optional parameters:
 * pluginPath: String: The path to find plugins. Defaults to ApplicationRoot/plugins
  * Substitutes:
  ~ - User home dir per os.homedir() IF first character
  : - Application Name per package.json IF last character
  * Examples:
    ~/.config/: - /home/user/.config/MyApp
    ~: - /home/usr/MyApp
 * makePluginPath: Boolean: Create the plugin path if it is not found. Defaults to false
 * quiet: Boolean: Do not write to the console. Defaults to false.
 * plugins: An Object of user provided plugins in the format { pluginName: pluginVerionsString } using semvar compatible strings OR LINK for the version.

If you would prefer to do plugin discovery, you can load using the following:

```
var plugins = require('electron-plugins');

document.addEventListener('DOMContentLoaded', function () {
  plugins.discover( '', false, function ( err, results ) {
    var context = { document: document };
    if( !err )
    {
      context.plugins = results;
    }
    plugins.load({context: context}, function (err, loaded) {
      if(err) return console.error(err);
        console.log('Plugins loaded successfully.');
    });
  });
});
```

## About your plugin:

The default plugin folder location is pulled from the AppDirectory object for the application if not provided by the app.
Inside the plugins folder, your plugin should have  directory matching its name. There should be a subdirectory for each version of the plugin installed, named for the version in semvar compatible format ( example: 0.0.1 ) or LINK for developmental code.

Your plugin will need a package.json. If config.main is not set, it is assumed to be index.js.

Your plugin should export a constructor function, which is passed the context object upon instantiation. You can put whatever you want onto the context object.
```
function Plugin(context) {
  alert("This plugin loaded!");
}

module.exports = Plugin
```

## Examples
* [electron-updater-sample](https://github.com/EvolveLabs/electron-updater-sample)
* [electron-updater-sample-plugin](https://github.com/EvolveLabs/electron-updater-sample-plugin)

## Related
* [electron-updater](https://github.com/EvolveLabs/electron-updater)
