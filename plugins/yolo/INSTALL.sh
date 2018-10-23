#!/bin/bash
echo "----------------------------------------"
echo "-- Installing Yolo Plugin for Shinobi --"
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
if ! [ -x "$(command -v opencv_version)" ]; then
    echo "You need to install OpenCV with CUDA first."
    echo "inside the Shinobi directory run the following :"
    echo "sh INSTALL/opencv-cuda.sh"
    exit 1
else
    echo "OpenCV found... : $(opencv_version)"
fi
echo "-----------------------------------"
if [ ! -d "models" ]; then
    echo "Downloading yolov3 weights..."
    mkdir models
    wget -O models/yolov3.weights https://pjreddie.com/media/files/yolov3.weights
else
    echo "yolov3 weights found..."
fi
echo "-----------------------------------"
if [ ! -d "models/cfg" ]; then
    echo "Downloading yolov3 cfg"
    mkdir models/cfg
    wget -O models/cfg/coco.data https://raw.githubusercontent.com/pjreddie/darknet/master/cfg/coco.data
    wget -O models/cfg/yolov3.cfg https://raw.githubusercontent.com/pjreddie/darknet/master/cfg/yolov3.cfg
else
    echo "yolov3 cfg found..."
fi
echo "-----------------------------------"
if [ ! -d "models/data" ]; then
    echo "Downloading yolov3 data"
    mkdir models/data
    wget -O models/data/coco.names https://raw.githubusercontent.com/pjreddie/darknet/master/data/coco.names
else
    echo "yolov3 data found..."
fi
echo "-----------------------------------"
if [ ! -e "./conf.json" ]; then
    echo "Creating conf.json"
    sudo cp conf.sample.json conf.json
else
    echo "conf.json already exists..."
fi
echo "-----------------------------------"
echo "Getting Imagemagick"
if [ -f /etc/redhat-release ]; then
  yum update
  yum install imagemagick -y
fi

if [ -f /etc/lsb-release ]; then
  apt update -y
  apt install imagemagick -y
fi
echo "-----------------------------------"
echo "Getting node-gyp to build C++ modules"
npm install node-gyp -g --unsafe-perm
echo "-----------------------------------"
echo "Getting C++ module : @vapi/node-yolo"
echo "https://github.com/rcaceiro/node-yolo"
export PATH=/usr/local/cuda/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH
npm install @vapi/node-yolo@1.2.4 --unsafe-perm
npm audit fix --force
echo "-----------------------------------"
echo "Start the plugin with pm2 like so :"
echo "pm2 start shinobi-yolo.js"
echo "-----------------------------------"
echo "Start the plugin without pm2 :"
echo "node shinobi-yolo.js"
