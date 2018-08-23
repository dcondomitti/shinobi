#!/bin/bash
echo "-----------------------------------------------"
echo "-- Installing Python Yolo Plugin for Shinobi --"
echo "-----------------------------------------------"
echo "-----------------------------------"
if [ ! -d "weights" ]; then
    echo "Downloading yolov3 weights..."
    mkdir weights
    wget -O weights/yolov3.weights https://pjreddie.com/media/files/yolov3.weights
else
    echo "yolov3 weights found..."
fi
echo "-----------------------------------"
if [ ! -d "cfg" ]; then
    echo "Downloading yolov3 cfg"
    mkdir cfg
    wget -O cfg/coco.data https://raw.githubusercontent.com/pjreddie/darknet/master/cfg/coco.data
    wget -O cfg/yolov3.cfg https://raw.githubusercontent.com/pjreddie/darknet/master/cfg/yolov3.cfg
else
    echo "yolov3 cfg found..."
fi
echo "-----------------------------------"
if [ ! -d "data" ]; then
    echo "Downloading yolov3 data"
    mkdir data
    wget -O data/coco.names https://raw.githubusercontent.com/pjreddie/darknet/master/data/coco.names
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
sudo apt update -y
sudo apt-get install libxml2-dev libxslt-dev libxslt1-dev zlib1g-dev -y
echo "Installing python3"
sudo apt install python3 python3-dev python3-pip -y
sudo apt install python3-lxml libxml2-dev -y
echo "-----------------------------------"
if ! [ -x "$(command -v gcc-6)" ]; then
    echo "Installing gcc-6 and g++-6"
    sudo add-apt-repository ppa:ubuntu-toolchain-r/test -y
    sudo apt-get install gcc-6 g++-6 -y && sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-6 60 --slave /usr/bin/g++ g++ /usr/bin/g++-6
else
    echo "gcc-6 and g++-6 found..."
fi
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
echo "Smoking pips..."
pip3 install flask_socketio
pip3 install flask
pip3 install numpy
pip3 install gevent gevent-websocket
export PATH=/usr/local/cuda/bin:$PATH
pip3 install lxml
pip3 install numpy
pip3 install cython
echo "Installing Darknet..."
cd /opt
git clone https://github.com/pjreddie/darknet.git darknet
cd darknet
make
cd ..
echo "Installing YOLO3-4-Py"
echo "Learn more about this wrapper here : https://github.com/madhawav/YOLO3-4-Py"
git clone https://github.com/madhawav/YOLO3-4-Py.git YOLO3-4-Py
cd YOLO3-4-Py
export GPU=1
export OPENCV=1
pip3 install .
apt remove libpython-all-dev python-all python-all-dev python-asn1crypto python-cffi-backend python-crypto python-cryptography python-dbus python-enum34 python-gi python-idna python-ipaddress python-keyring python-keyrings.alt python-pkg-resources python-secretstorage python-setuptools python-six python-wheel python-xdg -y
echo "Done Installing Darknet..."
export PATH=/opt/darknet:$PATH
echo "Start the plugin with pm2 like so :"
echo "pm2 start shinobi-python-yolo.js"
