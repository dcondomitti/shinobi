#!/bin/bash
echo "-----------------------------------------------"
echo "-- Installing Python Dlib Plugin for Shinobi --"
echo "-----------------------------------------------"
echo "-----------------------------------"
if [ ! -e "./conf.json" ]; then
    echo "Creating conf.json"
    sudo cp conf.sample.json conf.json
else
    echo "conf.json already exists..."
fi
echo "-----------------------------------"
sudo apt update -y
echo "Installing python3"
sudo apt install python3 python3-dev python3-pip -y
echo "-----------------------------------"
sudo add-apt-repository ppa:ubuntu-toolchain-r/test -y
sudo apt update
sudo apt-get install gcc-6 g++-6 -y && sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-6 60 --slave /usr/bin/g++ g++ /usr/bin/g++-6
echo "-----------------------------------"
if ! [ -x "$(command -v nvidia-smi)" ]; then
    echo "You need to install NVIDIA Drivers to use this."
    echo "inside the Shinobi directory run the following :"
    echo "sh INSTALL/cuda9-part1.sh"
    exit 1
else
    echo "NVIDIA Drivers found..."
    echo "$(nvidia-smi |grep 'Driver Version')"
fi
echo "-----------------------------------"
if [ ! -d "/usr/local/cuda" ]; then
    echo "You need to install CUDA Toolkit to use this."
    echo "inside the Shinobi directory run the following :"
    echo "sh INSTALL/cuda9-part2-after-reboot.sh"
    exit 1
else
    echo "CUDA Toolkit found..."
fi
echo "-----------------------------------"
if ! [ -x "$(command -v opencv_version)" ]; then
    echo "You need to install OpenCV with CUDA first."
    echo "inside the Shinobi directory run the following :"
    echo "sh INSTALL/opencv-cuda.sh"
    exit 1
else
    echo "OpenCV found... : $(opencv_version)"
fi
echo "-----------------------------------"
echo "Getting new pip..."
pip3 install --upgrade pip
pip install --user --upgrade pip
export PATH=/usr/local/cuda/bin:$PATH
echo "Smoking pips..."
pip3 install flask_socketio
pip3 install flask
pip3 install numpy
pip3 install gevent gevent-websocket
echo "Start the plugin with pm2 like so :"
echo "pm2 start shinobi-python-dlib.js"
