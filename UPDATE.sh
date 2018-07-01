#!/bin/bash
echo "Stopping All Processes"
pm2 stop all

# open working directory (default is /home)
cd ..

# delete the old backup
if [ -e "./ShinobiOld" ]; then
    echo "Remove old backup"
    rm -rf ShinobiOld
fi

# back up old install
echo "Backup old files"
mv Shinobi ShinobiOld

# clone the new files
echo "Download new files"
git clone https://gitlab.com/Shinobi-Systems/Shinobi Shinobi

# set permissions
chmod -R 777 Shinobi

# move videos, videos2, conf.json, and super.json
echo "Move videos, videos2, conf.json, and super.json"
mv ShinobiOld/videos Shinobi/videos
mv ShinobiOld/videos2 Shinobi/videos2
cp ShinobiOld/conf.json Shinobi/conf.json
if [ -e "./ShinobiOld/super.json" ]; then
    cp ShinobiOld/super.json Shinobi/super.json
fi

# merge new plugin files but keep configs (added files)
echo "merge new plugin files but keep configs (added files)"
cp -R Shinobi/plugins Shinobi/pluginsTemp
rm -rf Shinobi/plugins
cp -R ShinobiOld/plugins Shinobi/plugins
rm -rf ShinobiOld/plugins
cp -R Shinobi/pluginsTemp/* Shinobi/plugins/
rm -rf Shinobi/pluginsTemp

# move node modules and install updates
echo "Move node modules and install updates"
mv ShinobiOld/node_modules Shinobi/node_modules
cd Shinobi
chmod -R 777 node_modules
npm install

# start processes
echo "Starting All Processes"
pm2 start all