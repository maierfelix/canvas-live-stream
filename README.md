# Canvas Live Stream

### Screenshot:
<img width="65%" src="https://image.prntscr.com/image/8a73c87ca2d747008c6a471dfaa2ee80.png" />

**Left** The live stream inside the browser<br/>
**Right** The server and stream preview (can't be disabled due to a chromium bug)

### Description

This is an experiment with the new ``canvas.captureStream`` and if it is already possible to create a canvas game stream server with it. I'm abusing [electron](https://github.com/electron/electron) to have the original api to the canvas + super easy setup, and then just broadcasting it's stream into the client's video element.

The HTML media api has many streaming related bugs right now, for example it not possible (without slow hacks) to preserve the alpha channel of the streamed canvas. Also the video timing offsets are clunky and doesn't fit all time. Canvas frames only get captured when the canvas is attached to the dom and visible - this really makes it impossible to create a realistic server. I recommend to use the exact chromium version proposed here, because many things change quickly e.g. in the latest chromium build you have to explicitly tell the video codec to use, otherwise it will silently fail and send bad encoded stream chunks.

**Conclusion**: It is still **very** experimental and has some quirky bugs here and there. Also the ``MediaStream`` instance returns a blob, which is very slow to turn into a arraybuffer to send over with websockets. I'm not sure if this will ever change (or I'm doing it wrong). So all this is maybe possible in a near future but it has really great potential!

### Setup

The server uses the electron beta build, which can be found [here](https://github.com/electron/electron/tree/v1.7.2). The actual streamed game is contained in server/static/game.js and gets passed in the connected user related canvas and 2d context parameters which can be drawn onto.
The client just connects to the server, shares some initial information like which video compression format to use and then receives the stream data.

You can run the server by ``npm run start``.
