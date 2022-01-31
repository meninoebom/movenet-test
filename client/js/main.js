import "regenerator-runtime/runtime"; // So that Parcel will support Promise and async/await
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import * as poseDetection from "@tensorflow-models/pose-detection";

//from https://openprocessing.org/sketch/1236523/pc/afKoTxb1
//info about skeleton https://discuss.tensorflow.org/t/drawing-skeleton-with-movenet-on-p5js-with-movenet-tensorflow-js-poses-are-detected-and-working/3102/5
window.p5js = window.p5;
delete window.p5;

const socket = io("http://localhost:3000");

const sketch = new p5js((p5) => {
  const ScoreThreshold = 0.4;

  let detector;
  let poses;
  let video;
  let screenAspect;
  let videoAspect;

  p5.setup = async function setup() {
    p5.createCanvas(p5.windowWidth, p5.windowHeight);
    screenAspect = p5.windowWidth / p5.windowHeight;

    const detectorConfig = {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    };

    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      detectorConfig
    );
    console.log("Pose Detector Initialized");

    video = p5.createCapture(p5.VIDEO, getPosesRecursively);
    videoAspect = video.width / video.height;
    video.hide();
    console.log("setup complete");
  };

  async function getPosesRecursively() {
    poses = await detector.estimatePoses(video.elt);
    setTimeout(getPosesRecursively, 100);
    console.log("poses:", poses);
    socket.emit("poses", poses);
  }

  // A list of pairs of either keypoint indices or sub lists of keypoint indicies
  // Each pair defines an edge in the skeleton "graph"
  // When a pair contains a sublist, that is meant to represent the average of two keypoints
  const skeleton = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [0, [6, 5]],
    [6, 5],
    [6, 12],
    [5, 11],
    [5, 7],
    [6, 8],
    [7, 9],
    [8, 10],
    [
      [5, 6],
      [11, 12],
    ],
    [[11, 12], 11],
    [[11, 12], 12],
    [11, 13],
    [12, 14],
    [13, 15],
    [14, 16],
  ];

  function getKeypointForEdgeVertex(keypoints, vertex) {
    if (typeof vertex === "number") {
      const { x, y, score } = keypoints[vertex];
      if (score > ScoreThreshold) {
        return { x, y };
      }
    } else if (vertex instanceof Array) {
      const points = vertex.map((v) => keypoints[v]);
      if (points.every((kp) => kp.score > ScoreThreshold)) {
        const { x, y } =
          // Average the points
          points.reduce(
            (acc, v) => ({
              x: (acc.x * acc.w + v.x) / (acc.w + 1),
              y: (acc.y * acc.w + v.y) / (acc.w + 1),
              w: acc.w + 1,
            }),
            { x: 0, y: 0, w: 0 }
          );
        return { x, y };
      }
    }
  }

  p5.draw = function draw() {
    p5.background(0, 0, 0, 10);
    if (video) {
      let vw, vh;
      // This isn't valid during setup() for some reason
      videoAspect = video.width / video.height;
      if (screenAspect >= videoAspect) {
        // The screen is wider than the video
        vh = p5.height;
        vw = p5.height * videoAspect;
      } else {
        // The video is wider than the screen
        vw = p5.width;
        vh = p5.width / videoAspect;
      }
      p5.push();
      // Mirror the video
      p5.scale(-1, 1);
      p5.translate(-vw, 0);
      p5.image(video, 0, 0, vw, vh);
      p5.pop();
      // One way to adjust the skeleton to match the video size would be to use
      // scale():
      //     scale(vw / video.width, vh / video.height);
      // However this scales stroke an text size as well. And if we wanted to flip
      // the skeleton horinontally (using a negative scaling factor in the x axis),
      // this would also flip the text.
      //
      // To only adjust position we can use the map() function like so:
      //     map(x, 0, video.width, vw, 0)
      // Note that the ordering of the input range and output range is flipped in
      // order to mirror the skeleton.

      // helper functions
      const mapX = (x) => p5.map(x, 0, video.width, vw, 0);
      const mapY = (y) => p5.map(y, 0, video.height, 0, vh);

      if (poses && poses.length > 0) {
        //console.log(poses[0].keypoints.length)
        //console.log(poses[0].keypoints[0].x);
        p5.stroke(0, 255, 255);
        p5.strokeWeight(2);
        for (let edge of skeleton) {
          let start = getKeypointForEdgeVertex(poses[0].keypoints, edge[0]);
          let end = getKeypointForEdgeVertex(poses[0].keypoints, edge[1]);

          if (start && end) {
            p5.line(mapX(start.x), mapY(start.y), mapX(end.x), mapY(end.y));
          }
        }

        for (let i = 0; i < poses[0].keypoints.length; i++) {
          const { x, y, score } = poses[0].keypoints[i];
          // console.log(kp);
          if (score > ScoreThreshold) {
            p5.fill(255, 0, 255);
            p5.stroke(0, 255, 255);
            p5.strokeWeight(2);
            p5.circle(mapX(x), mapY(y), 15);

            p5.push();
            // fill('red');
            // noStroke();
            // text(`${i}`, mapX(x), mapY(y));
            p5.pop();
          }
        }
      }
    }
  };
}, document.getElementById("p5-sketch"));
