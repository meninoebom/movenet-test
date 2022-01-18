const express = require("express");
const app = express();
const http = require("http");
const httpServer = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:1234",
  },
});
const osc = require("osc-min");
const dgram = require("dgram");
const udp = dgram.createSocket("udp4");

io.on("connection", (socket) => {
  socket.on("poses", (poses) => {
    if (!poses) return;
    sendPoseToWekinator(poses[0]);
  });
});

// Examples of send OSC to Wekinator
// https://github.com/parcodiyellowstone/posenet-authentication/blob/master/train/app.js
// https://github.com/noisyneuron/wekOsc/blob/master/server.js
const sendPoseToWekinator = function (rawPoseData) {
  if (!rawPoseData) return;

  const flattenedPoseObject = {};
  rawPoseData.keypoints.forEach((k) => {
    flattenedPoseObject[k.name] = {};
    flattenedPoseObject[k.name]["y"] = k.y;
    flattenedPoseObject[k.name]["x"] = k.x;
  });

  const args = [
    { type: "float", value: flattenedPoseObject.nose.y },
    { type: "float", value: flattenedPoseObject.nose.x },
    { type: "float", value: flattenedPoseObject.left_eye.y },
    { type: "float", value: flattenedPoseObject.left_eye.x },
    { type: "float", value: flattenedPoseObject.right_eye.y },
    { type: "float", value: flattenedPoseObject.right_eye.x },
    { type: "float", value: flattenedPoseObject.left_ear.y },
    { type: "float", value: flattenedPoseObject.left_ear.x },
    { type: "float", value: flattenedPoseObject.right_ear.y },
    { type: "float", value: flattenedPoseObject.right_ear.x },
    { type: "float", value: flattenedPoseObject.left_shoulder.y },
    { type: "float", value: flattenedPoseObject.left_shoulder.x },
    { type: "float", value: flattenedPoseObject.right_shoulder.y },
    { type: "float", value: flattenedPoseObject.right_shoulder.x },
    { type: "float", value: flattenedPoseObject.left_elbow.y },
    { type: "float", value: flattenedPoseObject.left_elbow.x },
    { type: "float", value: flattenedPoseObject.right_elbow.y },
    { type: "float", value: flattenedPoseObject.right_elbow.x },
    { type: "float", value: flattenedPoseObject.left_wrist.y },
    { type: "float", value: flattenedPoseObject.left_wrist.x },
    { type: "float", value: flattenedPoseObject.right_wrist.y },
    { type: "float", value: flattenedPoseObject.right_wrist.x },
    { type: "float", value: flattenedPoseObject.left_hip.y },
    { type: "float", value: flattenedPoseObject.left_hip.x },
    { type: "float", value: flattenedPoseObject.right_hip.y },
    { type: "float", value: flattenedPoseObject.right_hip.x },
    { type: "float", value: flattenedPoseObject.left_knee.y },
    { type: "float", value: flattenedPoseObject.left_knee.x },
    { type: "float", value: flattenedPoseObject.right_knee.y },
    { type: "float", value: flattenedPoseObject.right_knee.x },
    { type: "float", value: flattenedPoseObject.left_ankle.y },
    { type: "float", value: flattenedPoseObject.left_ankle.x },
    { type: "float", value: flattenedPoseObject.right_ankle.y },
    { type: "float", value: flattenedPoseObject.right_ankle.x },
  ];
  console.log("right wrist X = ", rawPoseData.keypoints[10].x);
  console.log("nose wrist Y = ", rawPoseData.keypoints[10].y);
  console.log("");

  // Takes a JavaScript representation of an OSC packet and returns a Node.js buffer
  // https://www.npmjs.com/package/osc-min

  // By default, Wekinator listens for its input messages on port 6448.
  // The default input message is /wek/inputs and each input must be sent as
  // a float within this message.
  // http://www.wekinator.org/detailed-instructions/
  const buffer = osc.toBuffer({
    address: "/wek/inputs",
    args: args,
  });

  // Broadcasts a datagram on the socket. For connectionless sockets, the
  // destination port and address must be specified. Connected sockets, on
  // the other hand, will use their associated remote endpoint, so the port
  // and address arguments must not be set.
  //  The msg argument contains the message to be sent. Depending on its type,
  // different behavior can apply. If msg is a Buffer, any TypedArray or a
  // DataView, the offset and length specify the offset within the Buffer
  // where the message begins and the number of bytes in the message,
  // respectively.
  // https://nodejs.org/api/dgram.html#socketsendmsg-offset-length-port-address-callback
  return udp.send(buffer, 0, buffer.length, 6448, "localhost");
};

httpServer.listen(3000, () => {
  console.log("listening on *:3000");
});
