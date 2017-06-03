let ws = null;
let ready = false;

let canvas = document.createElement("canvas");
let ctx = canvas.getContext("2d");

document.body.appendChild(canvas);

function applyHDScaling(canvas, ctx) {
  const width = canvas.width;
  const height = canvas.height;
  const scale = window.devicePixelRatio;
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
};

let width = window.innerWidth;
let height = window.innerHeight;

let queue = [];

const PACKET_CANVAS_SIZE = 1;
const PACKET_SYNC_PIXELS = 2;
const PACKET_VPX_CODEC = 3;

const connect = () => {
  const Socket = window.MozWebSocket || window.WebSocket;
  const url = "ws://127.0.0.1:8080";
  ws = new Socket(url);
  ws.binaryType = "arraybuffer";
  addEventListeners();
};

const addEventListeners = () => {
  ws.addEventListener("open", onOpen);
  ws.addEventListener("close", onClose);
  ws.addEventListener("error", onError);
  ws.addEventListener("message", onMessage);
};

const errorMsg = `Outdated or unsupported browser!`;

if (
  typeof MediaSource === "undefined" ||
  !MediaSource.isTypeSupported("video/webm; codecs=vp8")
) {
  throw new Error(errorMsg);
}

const getVpxCodec = () => {
  if (MediaSource.isTypeSupported("video/webm; codecs=vp9")) {
    return (9);
  }
  if (MediaSource.isTypeSupported("video/webm; codecs=vp8")) {
    return (8);
  }
  if (MediaSource.isTypeSupported("video/webm; codecs=vp7")) {
    return (7);
  }
  return (8);
};

const onOpen = (e) => {
  ready = true;
  ws.send(new Uint16Array([PACKET_CANVAS_SIZE, width | 0, height | 0]));
  ws.send(new Uint8Array([PACKET_VPX_CODEC, getVpxCodec()]));
};

const onClose = (e) => {

};

const onError = (e) => {

};

/*requestAnimationFrame(function draw() {
  requestAnimationFrame(draw);
  ctx.drawImage(
    video,
    0, 0,
    video.width, video.height
  );
});*/

requestAnimationFrame(function draw() {
  requestAnimationFrame(draw, 1e3 / 60);
  if (queue.length && !sb.updating) {
    sb.appendBuffer(queue.shift());
  }
});

let ms = new MediaSource();
let sb = null;
video.src = window.URL.createObjectURL(ms);
video.crossOrigin = "anonymous";
video.style.backgroundColor = "transparent";
//video.style.display = "none";
video.play();

ms.addEventListener('sourceopen', function(e) {

  sb = ms.addSourceBuffer(`video/webm; codecs=vp${getVpxCodec()}`);

  sb.addEventListener("error", (e) => { console.log("error: " + ms.readyState); });
  sb.addEventListener("abort", (e) => { console.log("abort: " + ms.readyState); });
  sb.addEventListener("update", (e) => {
    if (queue.length && !sb.updating) {
      sb.appendBuffer(queue.shift());
    }
  });

}, false);

ms.addEventListener("sourceopen", (e) => { console.log(e); });
ms.addEventListener("sourceended", (e) => { console.log(e); });
ms.addEventListener("sourceclose", (e) => { console.log(e); });
ms.addEventListener("error", (e) => { console.log(e); });

const onMessage = (e) => {
  if (sb === null) return;
  let data = e.data;
  if (sb.updating || queue.length) {
    queue.push(data);
  } else {
    sb.appendBuffer(data);
  }
};

const resize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  video.width = width;
  video.height = height;
  applyHDScaling(canvas, ctx);
};
window.addEventListener("resize", resize);

resize();
connect();
