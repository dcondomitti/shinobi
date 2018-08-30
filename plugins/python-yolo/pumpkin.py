from flask import Flask, request, jsonify, render_template
from flask_socketio import SocketIO, emit
from pydarknet import Detector, Image
import cv2
import os
import json
import numpy as np
import sys

dirname = sys.argv[1]

try:
    with open("{}/conf.json".format(dirname)) as json_file:  
        config = json.load(json_file)
        httpPort = config['pythonPort']
        try:
            httpPort
        except NameError:
            httpPort = 7990
except Exception as e:
    print("conf.json not found.")
    httpPort = 7990

# Load Flask
app = Flask("YOLOv3 for Shinobi (Pumpkin Pie)")
socketio = SocketIO(app)
# Silence Flask
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# Load Darknet
net = Detector(bytes("{}/cfg/yolov3.cfg".format(dirname), encoding="utf-8"), bytes("{}/weights/yolov3.weights".format(dirname), encoding="utf-8"), 0, bytes("{}/cfg/coco.data".format(dirname),encoding="utf-8"))

def spark(filepath):
    try:
        filepath
    except NameError:
        return "File path not found."
    img = cv2.imread(filepath)

    img2 = Image(img)

    # r = net.classify(img2)
    results = net.detect(img2)
    returnData = '[]'
    try:
        new_list = []
        for item in results:
            sub_list = {}
            i = 0
            for sub_item in item:
                if i == 0:
                    key = 'tag'
                    sub_list[key] = sub_item.decode('utf-8')
                if i == 1:
                    key = 'confidence'
                    sub_list[key] = sub_item
                if i == 2:
                    key = 'points'
                    points_list = []
                    for points_item in sub_item:
                        points_list.append(points_item)
                    sub_list[key] = points_list
                i += 1
            new_list.append(sub_list)
        returnData = new_list
#        returnData = json.dumps(results)
    except Exception as e:
        returnData = ',\n'.join(map(str, results))
    
    return returnData

# bake the image data by a file path
# POST body contains the "img" variable. The value should be to a local image path. 
# Example : /dev/shm/streams/[GROUP_KEY]/[MONITOR_ID]/s.jpg
@app.route('/', methods=['GET'])
def index():
    return "Pumpkin.py is running. This web interface should NEVER be accessible remotely. The Node.js plugin that runs this script should only be allowed accessible remotely."

# bake the image data by a file path
# POST body contains the "img" variable. The value should be to a local image path. 
# Example : /dev/shm/streams/[GROUP_KEY]/[MONITOR_ID]/s.jpg
@app.route('/post', methods=['POST'])
def post():
    filepath = request.form['img']
    return jsonify(spark(filepath))

# bake the image data by a file path
# GET string contains the "img" variable. The value should be to a local image path. 
# Example : /dev/shm/streams/[GROUP_KEY]/[MONITOR_ID]/s.jpg
@app.route('/get', methods=['GET'])
def get():
    filepath = request.args.get('img')
    return jsonify(spark(filepath))

@socketio.on('f')
def receiveMessage(message):
    emit('f',{'id':message.get("id"),'data':spark(message.get("path"))})

# quick-and-dirty start
if __name__ == '__main__':
    socketio.run(app, port=httpPort)