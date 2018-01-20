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

Your plugin should export a constructor function, which is passed the context object upon instantiation. You can put whatever you want onto the context object.
```
function Plugin(context) {
	var d = context.document
	var ul = d.getElementById('plugins')
	var li = d.createElement('li')
	li.innerHTML = 'electron-updater-sample-plugin'
	ul.appendChild(li)
}

module.exports = Plugin
```

## Examples
* [electron-updater-sample](https://github.com/EvolveLabs/electron-updater-sample)
* [electron-updater-sample-plugin](https://github.com/EvolveLabs/electron-updater-sample-plugin)

## Related
* [electron-updater](https://github.com/EvolveLabs/electron-updater)
