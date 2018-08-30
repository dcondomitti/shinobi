#!/bin/sh
echo "------------------------------------------"
echo "-- Installing CUDA Toolkit and CUDA DNN --"
echo "------------------------------------------"
# Install CUDA Drivers and Toolkit
wget https://cdn.shinobi.video/installers/cuda-repo-ubuntu1710_9.2.148-1_amd64.deb -O cuda.deb
sudo dpkg -i cuda.deb
sudo apt-key adv --fetch-keys https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1710/x86_64/7fa2af80.pub
sudo apt-get update -y
sudo apt-get -o Dpkg::Options::="--force-overwrite" install cuda -y
sudo apt-get -o Dpkg::Options::="--force-overwrite" install --fix-broken -y
# Install CUDA DNN
wget https://cdn.shinobi.video/installers/libcudnn7_7.2.1.38-1+cuda9.2_amd64.deb -O cuda-dnn.deb
sudo dpkg -i cuda-dnn.deb
wget https://cdn.shinobi.video/installers/libcudnn7-dev_7.2.1.38-1+cuda9.2_amd64.deb -O cuda-dnn-dev.deb
sudo dpkg -i cuda-dnn-dev.deb
echo "-- Cleaning Up --"
# Cleanup
sudo rm cuda.deb
sudo rm cuda-dnn.deb
sudo rm cuda-dnn-dev.deb
echo "------------------------------"
echo "Reboot is required. Do it now?"
echo "------------------------------"
echo "(y)es or (N)o. Default is No."
read rebootTheMachineHomie
if [ "$rebootTheMachineHomie" = "y" ] || [ "$rebootTheMachineHomie" = "Y" ]; then
    sudo reboot
fi
