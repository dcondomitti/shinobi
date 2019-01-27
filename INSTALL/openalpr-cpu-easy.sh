# Install prerequisites
DIR=`dirname $0`
INSTALLERS_DIR="$DIR"
echo "-----------------------------------"
if ! [ -x "$(command -v opencv_version)" ]; then
    echo "Installing OpenCV"
    dos2unix $INSTALLERS_DIR/opencv-cuda.sh
    sh $INSTALLERS_DIR/opencv-cuda.sh
else
    echo "OpenCV found... : $(opencv_version)"
fi
# this includes all the ones missing from OpenALPR's guide.
sudo apt install libtesseract-dev git cmake build-essential libleptonica-dev -y
sudo apt install liblog4cplus-dev libcurl3-dev -y
sudo apt install libleptonica-dev -y
sudo apt install libcurl4-openssl-dev -y
sudo apt install liblog4cplus-dev -y
sudo apt install beanstalkd -y
sudo apt install openjdk-8-jdk -y

# Clone the latest code from GitHub
git clone https://github.com/openalpr/openalpr.git

# Setup the build directory
cd openalpr/src
mkdir build
cd build

# setup the compile environment
cmake -DCMAKE_INSTALL_PREFIX:PATH=/usr -DCMAKE_INSTALL_SYSCONFDIR:PATH=/etc ..

# compile the library
make

# Install the binaries/libraries to your local system (prefix is /usr)
sudo make install

# Test the library
wget http://plates.openalpr.com/h786poj.jpg -O lp.jpg
alpr lp.jpg
rm lp.jpg
