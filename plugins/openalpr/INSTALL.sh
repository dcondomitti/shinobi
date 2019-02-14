DIR=`dirname $0`
INSTALLERS_DIR="$DIR/../../INSTALL"
if ! [ -x "$(command -v dos2unix)" ]; then
    echo "-----------------------------------"
    echo "Installing dos2unix"
    apt install dos2unix -y
fi
echo "-----------------------------------"
if ! [ -x "$(command -v alpr)" ]; then
    echo "Installing OpenALPR"
    echo "Do you want to Install OpenALPR with CUDA enabled?"
    echo "(Y)es or (n)o?"
    echo "Press [ENTER] for default (Yes)"
    read openalprcudaenabled
    if [ "$openalprcudaenabled" = "n" ] || [ "$openalprcudaenabled" = "N" ]; then
        sed -i -e 's/detector = lbpgpu/detector = lbpcpu/g' "$DIR/openalpr.conf"
        dos2unix $INSTALLERS_DIR/openalpr-cpu-easy.sh
        sh $INSTALLERS_DIR/openalpr-cpu-easy.sh
    else
        sed -i -e 's/detector = lbpcpu/detector = lbpgpu/g' "$DIR/openalpr.conf"
        dos2unix $INSTALLERS_DIR/openalpr-gpu-easy.sh
        sh $INSTALLERS_DIR/openalpr-gpu-easy.sh
    fi
else
    echo "OpenALPR found... : $(alpr --version)"
fi
echo "-----------------------------------"
if [ ! -e "$DIR/conf.json" ]; then
    echo "Creating conf.json"
    cp $DIR/conf.sample.json $DIR/conf.json
else
    echo "conf.json already exists..."
fi
echo "-----------------------------------"
echo "Installing Modules.."
npm install --unsafe-perm
echo "Finding and Fixing Module Vulnerabilities.."
npm audit fix --force
echo "Shinobi - Do you want to start the plugin?"
echo "(Y)es or (n)o?"
echo "Press [ENTER] for default (Yes)"
read startplugin
if [ "$startplugin" = "n" ] || [ "$startplugin" = "N" ]; then
    echo "-----------------------------------"
    echo "Start the plugin with pm2 like so :"
    echo "pm2 start $DIR/shinobi-openalpr.js"
    echo "-----------------------------------"
    echo "Start the plugin without pm2 :"
    echo "node $DIR/shinobi-openalpr.js"
else
    pm2 start shinobi-openalpr.js
    pm2 save
fi
