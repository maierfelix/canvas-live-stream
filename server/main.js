const url = require("url");
const path = require("path");
const electron = require("electron");

// now open up electron with our fresh rolluped bundle
const initElectron = () => {
  return new Promise((resolve) => {

    const app = electron.app;
    const BrowserWindow = electron.BrowserWindow;

    let win = null;
    const createWindow = () => {
      win = new BrowserWindow({
        width: 650,
        height: 420,
        titleBarStyle: "hidden"
      });

      win.loadURL(url.format({
        pathname: path.join(__dirname, "/static/index.html"),
        protocol: "file:",
        slashes: true
      }));
      win.setMenu(null);

      //win.setFullScreen(true);
      win.webContents.openDevTools();
      win.on("closed", () => {
        win = null;
      });
      resolve({ win, app });
    };

    app.on("ready", createWindow);
    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") app.quit();
    });
    app.on("activate", () => {
      if (win === null) createWindow();
    });

  });
};

// simple live reload system
initElectron().then((old) => {
  old.win.reload();
  old.win.webContents.reloadIgnoringCache();
  old.win.webContents.openDevTools();
});
