# Python Yolo

> This plugin requires the use of port `7990` by default. You can specify a different port by adding `pythonPort` to your plugin's conf.json.

**Ubuntu and Debian only**

Go to the Shinobi directory. **/home/Shinobi** is the default directory.

```
cd /home/Shinobi/plugins/python-yolo
```

Copy the config file.

```
sh INSTALL.sh
```

Start the plugin.

```
pm2 start shinobi-python-yolo.js
```

Doing this will reveal options in the monitor configuration. Shinobi does not need to be restarted when a plugin is initiated or stopped.

## Run the plugin as a Host
> The main app (Shinobi) will be the client and the plugin will be the host. The purpose of allowing this method is so that you can use one plugin for multiple Shinobi instances. Allowing you to easily manage connections without starting multiple processes.

Edit your plugins configuration file. Set the `hostPort` **to be different** than the `listening port for camera.js`.

```
nano conf.json
```

Here is a sample of a Host configuration for the plugin.
 - `plug` is the name of the plugin corresponding in the main configuration file.
 - `https` choose if you want to use SSL or not. Default is `false`.
 - `hostPort` can be any available port number. **Don't make this the same port number as Shinobi.** Default is `8082`.
 - `type` tells the main application (Shinobi) what kind of plugin it is. In this case it is a detector.

```
{
  "plug":"PythonYolo",
  "hostPort":8082,
  "key":"SomeOpenALPRkeySoPeopleDontMessWithYourShinobi",
  "mode":"host",
  "type":"detector"
}
```

Now modify the **main configuration file** located in the main directory of Shinobi. *Where you currently should be.*

```
nano conf.json
```

Add the `plugins` array if you don't already have it. Add the following *object inside the array*.

```
  "plugins":[
      {
          "id" : "PythonYolo",
          "https" : false,
          "host" : "localhost",
          "port" : 8082,
          "key" : "SomeOpenALPRkeySoPeopleDontMessWithYourShinobi",
          "mode" : "host",
          "type" : "detector"
      }
  ],
```