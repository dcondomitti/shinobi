# OpenALPR

Install required libraries.

**Ubuntu 17.10 and 18.04 only**

> By default plugins run as a client. `camera.js` is running as the host awaiting a plugin to connect to it. To learn about how to connect a plugin as a Host please review the "Run the plugin as a Host" section at the end of this README.

1. Go to the plugin's directory and run the installer for OpenALPR. **/home/Shinobi** is the default directory for where Shinobi is installed.
    ```
    cd /home/Shinobi/plugins/openalpr
    sh INSTALL.sh
    ```

2. Then add the plugin key to the **Main Configuration** file, the `conf.json` located in **/home/Shinobi**. You will find the `pluginKeys` object empty on a new install as seen below.
    ```
    "pluginKeys":{}
    ```
    > Add the key so it looks something like this.

    ```
    "pluginKeys":{
        "OpenALPR": "SomeOpenALPRkeySoPeopleDontMessWithYourShinobi"
    }
    ```

3. Restart Shinobi to apply the Plugin Key. Shinobi does not need to be restarted when a plugin is initiated or stopped after applying changes to the Main Configuration file.

> You should change `SomeOpenALPRkeySoPeopleDontMessWithYourShinobi` to something else in both the main configuration and plugin configuration. Both files changed need to be matching keys of course.

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
  "plug":"OpenALPR",
  "hostPort":8082,
  "key":"SomeOpenALPRkeySoPeopleDontMessWithYourShinobi",
  "mode":"host",
  "type":"detector"
}
```

Now modify the **Main Configuration** file located in the main directory of Shinobi. *Where you currently should be.*

```
nano conf.json
```

Add the `plugins` array if you don't already have it. Add the following *object inside the array*.

```
  "plugins":[
      {
          "id" : "OpenALPR",
          "https" : false,
          "host" : "localhost",
          "port" : 8082,
          "key" : "SomeOpenALPRkeySoPeopleDontMessWithYourShinobi",
          "mode" : "host",
          "type" : "detector"
      }
  ],
```
