const WebSocket = require("ws").Server;

const port = 8080;
const ws = new WebSocket({ port: port, maxReceivedFrameSize: 0x10000 });

const MAX_CANVAS_WIDTH = 2000;
const MAX_CANVAS_HEIGHT = 2000;

const PACKET_CANVAS_SIZE = 1;
const PACKET_SYNC_PIXELS = 2;
const PACKET_VPX_CODEC = 3;

let users = [];

class User {
  constructor(socket) {
    this.socket = socket;
    this.reader = new FileReader();
    this.vpx = 0;
    this.width = 0;
    this.height = 0;
    this.chunks = [];
    this.ctx = null;
    this.view = null;
    this.stream = null;
    this.recorder = null;
  }
  allocateShadowCanvas(width, height) {
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;
    this.view = canvas;
    this.ctx = ctx;
  }
  createCanvasStream() {
    const canvas = this.view;
    const ctx = this.ctx;
    applyHDScaling(canvas, ctx);
    document.body.appendChild(canvas);
    init(canvas, ctx);
    const video = canvas.captureStream(60);
    const stream = new MediaStream();
    const track = video.getTracks()[0];
    const recorder = new MediaRecorder(stream, { mimeType: `video/webm; codecs=vp${this.vpx}` });
    this.stream = stream;
    this.recorder = recorder;
    stream.addTrack(track);
    const onData = (e) => {
      //time = Date.now();
      if (e.data.size > 0) {
        this.chunks.push(e.data);
        //console.log("Added chunk!");
        this.processChunks();
      }
    };
    const onError = (e) => {
      console.log("error:", e);
    };
    recorder.ondataavailable = onData;
    recorder.onerror = onError;
    console.log(`Recording using MIME ${recorder.mimeType}`);
    recorder.start(0);
  }
  processChunks(e) {
    let chunks = this.chunks;
    if (chunks.length <= 0) return;
    const blob = new Blob(chunks, { "type": "video/webm" });
    const length = chunks.length;
    const reader = new FileReader();
    reader.addEventListener("loadend", (e) => {
      if (!this.closed) this.send(new Uint8Array(reader.result));
      // release processed chunks
    }, false);
    reader.readAsArrayBuffer(blob);
    this.chunks = [];
    return;
  }
  close() {
    this.closed = true;
    this.socket.close();
    this.recorder.stop();
    this.stream.getVideoTracks()[0].stop();
    this.socket = null;
    this.reader = null;
    this.chunks = [];
    this.stream = null;
    this.recorder = null;
    this.removeUiReference();
    this.ctx = null;
    this.view = null;
    removeUserFromUsers(this);
  }
  // chrome < 58 bug
  // canvas.captureStream only fires
  // if the canvas is attached to the body
  removeUiReference() {
    this.view.parentNode.removeChild(this.view);
  }
  send(msg) {
    const socket = this.socket;
    if (socket.readyState === socket.CLOSE) {
      this.close();
    }
    else if (socket.readyState === socket.OPEN) {
      socket.send(msg);
    }
  }
  onMessage(msg) {
    const kind = msg[0] << 0;
    switch (kind) {
      case PACKET_CANVAS_SIZE:
        // canvas size not defined yet
        if (this.width <= 0 && this.height <= 0) {
          this.applyCanvasBoundings(msg);
        }
      break;
      case PACKET_VPX_CODEC:
        if (this.vpx === 0) {
          this.applyVbxCodec(msg);
        }
      break;
    };
    // auto initialize canvas stream
    if (this.isReady() && this.stream === null) {
      this.createCanvasStream();
    }
  }
  isReady() {
    return (
      this.vpx !== 0 &&
      this.width > 0 && this.height > 0
    );
  }
  applyCanvasBoundings(msg) {
    const data = decode16ByteBuffer(msg);
    if (data.length === 3) {
      const width = Math.min(data[1] | 0, MAX_CANVAS_WIDTH);
      const height = Math.min(data[2] | 0, MAX_CANVAS_HEIGHT);
      this.width = width | 0;
      this.height = height | 0;
      console.log("User boundings:", width, height);
      this.allocateShadowCanvas(width, height);
    }
  }
  applyVbxCodec(msg) {
    const data = decode8ByteBuffer(msg);
    if (data.length === 2) {
      const code = data[1];
      if (code === 8 || code === 9) {
        this.vpx = code | 0;
        console.log("User vpx:", code);
      }
    }
  }
};

function rndColor() {
  const r = (Math.random() * 256) | 0;
  const g = (Math.random() * 256) | 0;
  const b = (Math.random() * 256) | 0;
  const a = (Math.random() * 256) | 0;
  return (`rgba(${r},${g},${b},${a})`);
};

ws.on("connection", (socket) => {
  let user = new User(socket);
  users.push(user);
  socket.on("message", (msg) => {
    if (Buffer.isBuffer(msg) && msg.length > 0) {
      user.onMessage(msg);
    }
  });
  socket.on("close", () => {
    user.close();
    user = null;
    socket = null;
  });
});

setTimeout(function update() {
  setTimeout(update, 0);
  users.map((user) => user.processChunks());
}, 0);

function removeUserFromUsers(user) {
  for (let ii = 0; ii < users.length; ++ii) {
    if (users[ii] === user) {
      users.splice(ii, 1);
      return (true);
    }
  };
  console.log("Failed to remove user", user);
  return (false);
};

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

function decode8ByteBuffer(buffer) {
  const bytes = Uint8Array.BYTES_PER_ELEMENT;
  const data = new Uint8Array(buffer.length | 0);
  for (let ii = 0; ii < buffer.length; ++ii) {
    data[ii | 0] = buffer[ii] & 0xff;
  };
  return (data);
};

function decode16ByteBuffer(buffer) {
  const bytes = Uint16Array.BYTES_PER_ELEMENT;
  const data = new Uint16Array((buffer.length / bytes) | 0);
  for (let ii = 0; ii < buffer.length; ii += bytes) {
    data[(ii / bytes) | 0] = get16BufferByteAt(buffer, ii);
  };
  return (data);
};

function decode32ByteBuffer(buffer) {
  const bytes = Uint32Array.BYTES_PER_ELEMENT;
  const data = new Uint32Array((buffer.length / bytes) | 0);
  for (let ii = 0; ii < buffer.length; ii += bytes) {
    data[(ii / bytes) | 0] = get32BufferByteAt(buffer, ii);
  };
  return (data);
};

function get16BufferByteAt(buffer, index) {
  return ((
    (buffer[index + 0]) << 0 |
    (buffer[index + 1]) << 8
  ) | 0);
};

function get32BufferByteAt(buffer, index) {
  return ((
    (buffer[index + 0]) << 0 |
    (buffer[index + 1]) << 8 |
    (buffer[index + 2]) << 16 |
    (buffer[index + 3]) << 24
  ) | 0);
};

console.log("Listening on", port);
