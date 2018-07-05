#!/bin/bash

gitURL="$(git remote get-url origin)"
branch="$(git name-rev --name-only HEAD)"
productName="Shinobi Pro"
reqsubstr="Not a git repository"
if [ -z "${gitURL##*$reqsubstr*}" ]; then
    echo "This is not a Git folder"
    gitURL="https://gitlab.com/Shinobi-Systems/Shinobi"
    branch='master'
else
    echo "This is a Git folder"
fi
reqsubstr="/ShinobiCE"
if [ -z "${gitURL##*$reqsubstr*}" ]; then
    echo "This is Shinobi CE"
    productName="Shinobi CE"
    gitURL="https://gitlab.com/Shinobi-Systems/ShinobiCE"
else
    echo "This is Shinobi Pro"
fi
echo $branch
echo $gitURL
echo "Shinobi - Stopping All Processes"
pm2 stop all

# open working directory (default is /home)
cd ..

# delete the old backup
if [ -e "./ShinobiOld" ]; then
    echo "Remove old backup"
    rm -rf ShinobiOld
fi

# back up old install
echo "Shinobi - Backup old files"
mv Shinobi ShinobiOld

# clone the new files
echo "Shinobi - Download new files"
git clone $gitURL -b $branch Shinobi

# set permissions
chmod -R 777 Shinobi

# move videos, videos2, conf.json, and super.json
echo "Shinobi - Move videos, videos2, conf.json, and super.json"
mv ShinobiOld/videos Shinobi/videos
mv ShinobiOld/videos2 Shinobi/videos2
cp ShinobiOld/conf.json Shinobi/conf.json
if [ -e "./ShinobiOld/super.json" ]; then
    cp ShinobiOld/super.json Shinobi/super.json
fi

# merge new plugin files but keep configs (added files)
echo "Shinobi - merge new plugin files but keep configs (added files)"
cp -R Shinobi/plugins Shinobi/pluginsTemp
rm -rf Shinobi/plugins
cp -R ShinobiOld/plugins Shinobi/plugins
rm -rf ShinobiOld/plugins
cp -R Shinobi/pluginsTemp/* Shinobi/plugins/
rm -rf Shinobi/pluginsTemp

# move node modules and install updates
echo "Shinobi - Move node modules and install updates"
mv ShinobiOld/node_modules Shinobi/node_modules
cd Shinobi
chmod -R 777 node_modules
npm install

# write version info
gitVersionNumber=$(git rev-parse HEAD)
theDateRightNow=$(date)
touch version.json
chmod 666 version.json
versionJson='{"Product" : "'"$productName"'" , "Branch" : "'"$branch"'" , "Version" : "'"$gitVersionNumber"'" , "Date" : "'"$theDateRightNow"'" , "Repository" : "'"$gitURL"'"}'
echo $versionJson > version.json
echo $versionJson

# start processes
echo "Shinobi - Starting All Processes"
pm2 start all