#!/bin/bash
THE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
sudo apt update -y
sudo apt-get install libx11-dev -y
sudo apt-get install libpng-dev -y
sudo apt-get install libopenblas-dev -y
echo "----------------------------------------"
echo "-- Installing Dlib Plugin for Shinobi --"
echo "----------------------------------------"
if ! [ -x "$(command -v nvidia-smi)" ]; then
    echo "You need to install NVIDIA Drivers to use this."
    echo "inside the Shinobi directory run the following :"
    echo "sh INSTALL/cuda.sh"
    exit 1
else
    echo "NVIDIA Drivers found..."
    echo "$(nvidia-smi |grep 'Driver Version')"
fi
echo "-----------------------------------"
if [ ! -d "/usr/local/cuda" ]; then
    echo "You need to install CUDA Toolkit to use this."
    echo "inside the Shinobi directory run the following :"
    echo "sh INSTALL/cuda.sh"
    exit 1
else
    echo "CUDA Toolkit found..."
fi
echo "-----------------------------------"
if [ ! -e "./conf.json" ]; then
    echo "Creating conf.json"
    sudo cp conf.sample.json conf.json
else
    echo "conf.json already exists..."
fi
npm i npm -g
echo "-----------------------------------"
echo "Getting node-gyp to build C++ modules"
npm install node-gyp -g --unsafe-perm
echo "-----------------------------------"
echo "Getting C++ module : face-recognition"
echo "https://gitlab.com/Shinobi-Systems/face-recognition-js-cuda"
npm install --unsafe-perm
npm audit fix --force
cd $THE_DIR
echo "-----------------------------------"
echo "Start the plugin with pm2 like so :"
echo "pm2 start shinobi-dlib.js"
echo "-----------------------------------"
echo "Start the plugin without pm2 :"
echo "node shinobi-dlib.js"
