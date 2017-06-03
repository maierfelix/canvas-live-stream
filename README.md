# Canvas Live Stream

### Screenshot:
<img width="75%" src="https://image.prntscr.com/image/8a73c87ca2d747008c6a471dfaa2ee80.png" />
<br/>
[**Left**] The live stream inside the browser<br/>
[**Right**] The server and stream preview (can't be disabled due to a chromium bug)

### Description

This is a experiment about the new ``canvas.captureStream`` and if it is already possible to create a canvas game stream server with it. I'm abusing [electron](https://github.com/electron/electron) to have the original api to the canvas and super easy setup, then just broadcasting it's stream into the client's video element.

**Conclusion**: It is still **very** experimental and has some quirky bugs here and there. Also the ``MediaStream`` api returns a blob, which is very slow to turn into a arraybuffer to send over with websockets. I'm not sure if this will ever change (or I'm doing it wrong). So all this is maybe possible in a near future, but not right now.

### Setup

The server uses the electron beta build, which can be found [here](https://github.com/electron/electron/tree/v1.7.2). The actual streamed game is contained in server/static/game.js and gets passed in the connected user related canvas and canvas-context which can be drawn onto.
The client just connects to the server, shares some initial information like which video compression format to use and receives the stream data.