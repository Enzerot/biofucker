import path from "path";
import { app, BrowserWindow, Menu, shell } from "electron";
import defaultMenu from "electron-default-menu";
import { spawn } from "child_process";

const appPath = app.getAppPath();
const standaloneDir = path.join(appPath, ".next", "standalone");

const isDev = process.env.NODE_ENV === "development";
const localhostUrl = "http://localhost:3000"; // must match Next.js dev server

let mainWindow: BrowserWindow | null = null;
let server: ReturnType<typeof spawn> | null = null;

process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
process.env["ELECTRON_ENABLE_LOGGING"] = "true";

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 800,
    show: false,
    webPreferences: {
      contextIsolation: true,
      devTools: true,
    },
  });
  mainWindow.maximize();
  mainWindow.show();

  // Next.js handler

  if (!isDev) {
    server = spawn(
      "node",
      [path.join(standaloneDir, "server.js")],
      {
        env: { ...process.env, PORT: "3000" },
        windowsHide: true,
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch((e) => console.error(e));
    return { action: "deny" };
  });


  Menu.setApplicationMenu(Menu.buildFromTemplate(defaultMenu(app, shell)));

  await app.whenReady();

  await mainWindow.loadURL(localhostUrl + "/");

  console.log("[APP] Loaded", localhostUrl);
};

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    console.error("Failed to initialize database:", error);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (server) {
    server.kill();
    server = null;
  }
  app.quit();
});

app.on(
  "activate",
  () =>
    BrowserWindow.getAllWindows().length === 0 && !mainWindow && createWindow()
);
