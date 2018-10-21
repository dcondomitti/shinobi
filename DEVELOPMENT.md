Shinobi Developer Guide
=======================

>Thanks to @Kagetsuki for taking the time to write this!

General Devlopment Outline
--------------------------
Shinobi [currently] runs directly out of the repository rather than from a package you install.
A full Shinobi install will try to embed itself into the system, so ideally a machine running
Shinobi would only be running Shinobi; but when developing Shinobi that would be fairly
inconvenient. This guide is going to outline a development process where Shinobi will be fairly
contained, and development won't have any wide reaching effects on the system or generally require
any sort of super user access.  

Prerequisites
=============

> To get all of Shinobi at once you can use the Ninja Way. Learn more about that here
https://shinobi.video/docs/start#content-the-ninja-way

- *Node.js* :
You'll need Node and NPM, and for this guide we recommend you set up a user-local install of
[NVM](https://github.com/creationix/nvm) and install the latest LTS release. Keeping the Node
installation managed and separate from the system Node/NPM will help keep things clean and
contained. Node.js version must be at least version 8.11. Use Node.js 9 to be ready for
future development.

- *MariaDB/MySQL or SQLite3* :
You'll also need either MariaDB/MySQL or SQLite (version 3) or both. SQLite will be esepcially
easy to develop with as clearing the DB is as simple as deleting a file and you can keep the DB
instance you're working with by copying it. It is recommended to use at least version 15.1.

- *FFmpeg* :
You'll also need FFmpeg. This is the video processing engine at the core of Shinobi. You will
need at least version 3.3.3.

Development
===========
First off you need to clone the Shinobi repository. Either the regular Shinobi repository or the
CE repository should work, but the regular will likely have more updates (but has a different
license). If you're specifically concerned about OSS then just clone the CE edition, but if
you're more concerned about fixing an issue or adding a feature then go for the regular
repository. Be sure to work on a fork of the repository if you intend to submit a patch/merge
request.

Obtaining the repository
------------------------
To clone Shinobi:
```sh
git clone https://gitlab.com/Shinobi-Systems/Shinobi.git
```

or to clone Shinobi CE:
```sh
git clone https://gitlab.com/Shinobi-Systems/ShinobiCE.git
```
Then cd into either the "Shinobi" or "ShinobiCE" directory.

Grabbing packages
-----------------
To install the required Node packages you need to install them with NPM:
```sh
npm install
```
If the install fails you may need to install additional packages on your system or you may need
to change how you installed Node/NPM or change your installation method.

Setting your cloned repository for quick development
----------------------------------------------------
First we need a base conf.json to modify. Shinobi doesn't have a conf.json by default as
adding it to the repository would end up conflicting or altering the configuration on running
instances of Shinobi whenever someone updated.
```sh
cp conf.sample.json conf.json
```
Generally for development SQLite is going to be easier with SQLite, as we don't have to maintain
a MariaDB/MySQL installation and we may need to reset the database often. To set the DB to SQLite:
```sh
node tools/modifyConfiguration.js databaseType=sqlite
```
You can confirm this worked by checking conf.json for the following line
\[near the end of the file\]:
```json
"databaseType": "sqlite"
```

Currently Shinobi doesn't use a model framework or seeding system, so setting up the database
basically involves copying the pre-set instance bundled with the repository:
```sh
cp sql/shinobi.sample.sqlite shinobi.sqlite
```

### Resetting the DB
If you need to reset the database, you can now do so by deleting the shiobi.sqlite file and
copying the sql/shinobi.sample.sqlite file again. Just be sure to stop any running Shinobi
instances before you do so.

Enabling the Super User Interface
---------------------------------
In order to access the "Super User Interface", where we'll create our initial users, we need to
copy the super.sample.json file to super.json:
```sh
cp super.sample.json super.json
```
And that's it! As long as that file exists we can access the Super User Interface. The default
login information is user: 'admin@shinobi.video' password: 'admin'. This can of course be changed;
but for development we advise leaving it as the default.

Running Shinobi
---------------
Shinobi is usually run with the PM2 process manager, but for development we'll run the "camera"
and "cron" processes directy. To monitor output, we recommend you use a terminal multiplexer like
byobu, tmux, or screen. In one terminal window, run ```node cron.js``` and in another run
```node camera.js```. Shinobi should now be running on port 8080 on your local machine (you can
change the port in conf.json) and accessable at http://localhost:8080 in your browser. Any source
code changes you make will require restarting either the camera or cron process [or both].
