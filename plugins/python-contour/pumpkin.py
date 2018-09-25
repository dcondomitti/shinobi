from flask import Flask, request, jsonify, render_template
from flask_socketio import SocketIO, emit
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
app = Flask("Contour Detection for Shinobi (Pumpkin Pie)")
socketio = SocketIO(app)
# Silence Flask
# import logging
# log = logging.getLogger('werkzeug')
# log.setLevel(logging.ERROR)

#load car detector
oldFrames = {}

fgbg = cv2.createBackgroundSubtractorMOG2()

# detection function
def spark(filepath,trackerId):
    try:
        filepath
    except NameError:
        return "File path not found."
    frame = cv2.imread(filepath)
    returnData = []
    # resize the frame, convert it to grayscale, and blur it
    # frame = imutils.resize(frame, width=500)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (21, 21), 0)

    # if the first frame is None, initialize it
    global oldFrames
    try:
        oldFrames[trackerId]
    except KeyError:
        oldFrames[trackerId] = None

    if oldFrames[trackerId] is None:
        oldFrames[trackerId] = gray

    # compute the absolute difference between the current frame and
    # first frame
    frameDelta = cv2.absdiff(oldFrames[trackerId], gray)
    thresh = cv2.threshold(frameDelta, 55, 255, cv2.THRESH_BINARY)[1]

    # dilate the thresholded image to fill in holes, then find contours
    # on thresholded image
    thresh = cv2.dilate(thresh, None, iterations=2)
    image = thresh.copy()
    image,cnts,hierarchy = cv2.findContours(image, cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)

    # loop over the contours
    for c in cnts:
        # if the contour is too small, ignore it
        #if cv2.contourArea(c) > args["max_area"] or cv2.contourArea < args["min_area"]:
        #   continue
        d = max(cnts, key = cv2.contourArea)
        # compute the bounding box for the contour, draw it on the frame,
        # and update the text
        (x, y, w, h) = cv2.boundingRect(d)
        matrix = {}
        matrix["tag"] = "Contour"
        matrix["x"] = int(x)
        matrix["y"] = int(y)
        matrix["w"] = int(w)
        matrix["h"] = int(h)
        returnData.append(matrix)
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
    emit('f',{'id':message.get("id"),'data':spark(message.get("path"),message.get("trackerId"))})

# quick-and-dirty start
if __name__ == '__main__':
    socketio.run(app, port=httpPort)
