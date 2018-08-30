from flask import Flask, request, jsonify, render_template
from flask_socketio import SocketIO, emit
from PIL import Image
import face_recognition
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
app = Flask("DLIB for Shinobi (Pumpkin Pie)")
socketio = SocketIO(app)
# Silence Flask
# import logging
# log = logging.getLogger('werkzeug')
# log.setLevel(logging.ERROR)

#check for faces dir
facesDir = "{}/faces/".format(dirname)
if not os.path.exists(facesDir):
    os.makedirs(facesDir)

# load faces
included_extensions = ['jpg','jpeg', 'bmp', 'png', 'gif']
file_names = [fn for fn in os.listdir(facesDir)
              if any(fn.endswith(ext) for ext in included_extensions)]
known_faces = []
face_locations = []
face_encodings = []
face_names = []

for faceFile in file_names:
    face = face_recognition.load_image_file(facesDir+faceFile)
    face_encoding = face_recognition.face_encodings(face)[0]
    known_faces.append(face_encoding)

# detection function
def spark(filepath):
    try:
        filepath
    except NameError:
        return "File path not found."
    img = cv2.imread(filepath)
    returnData = []
    frame = img[:, :, ::-1]

    # Find all the faces and face encodings in the current frame of video
    face_locations = face_recognition.face_locations(frame)
    face_encodings = face_recognition.face_encodings(frame, face_locations)
    face_names = []
    for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
        # See if the face is a match for the known face(s)
        matrix = {}
        matrix["coordinates"] = [
            {"x" : left, "y" : top},
            {"x" : right, "y" : top},
            {"x" : right, "y" : bottom},
            {"x" : left, "y" : bottom}
        ]
        (left, top), (right, bottom)
        match = face_recognition.compare_faces(known_faces, face_encoding, tolerance=0.50)
        if True in match:
            first_match_index = match.index(True)
            name = file_names[first_match_index]
            matrix["tag"] = name
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
    emit('f',{'id':message.get("id"),'data':spark(message.get("path"))})

# quick-and-dirty start
if __name__ == '__main__':
    socketio.run(app, port=httpPort)
