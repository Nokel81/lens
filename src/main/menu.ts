import { app, BrowserWindow, dialog, Menu, MenuItem, MenuItemConstructorOptions, shell, webContents } from "electron"
import { isDevelopment, isMac, issuesTrackerUrl, isWindows, slackUrl } from "../common/vars";

// todo: refactor + split menu sections to separated files, e.g. menus/file.menu.ts

export interface MenuOptions {
  logoutHook: () => void;
  addClusterHook: () => void;
  clusterSettingsHook: () => void;
  showWhatsNewHook: () => void;
  showPreferencesHook: () => void;
}

function setClusterSettingsEnabled(enabled: boolean) {
  Menu.getApplicationMenu().items[+isMac].submenu.items[1].enabled = enabled
}

function showAbout(_menuitem: MenuItem, browserWindow: BrowserWindow) {
  const appDetails = [
    `Version: ${app.getVersion()}`,
    `Copyright 2020 Lakend Labs, Inc.`
  ]

  dialog.showMessageBoxSync(browserWindow, {
    title: `${isWindows ? "  " : ""}Lens`,
    type: "info",
    buttons: ["Close"],
    message: `Lens`,
    detail: appDetails.join("\r\n")
  })
}

interface SimpleMenuItemConstructorOptions extends MenuItemConstructorOptions {
  submenu?: MenuItemConstructorOptions[]
}

/**
 * Constructs the menu based on the example at: https://electronjs.org/docs/api/menu#main-process
 * Menu items are constructed piece-by-piece to have slightly better control on individual sub-menus
 *
 * @param ipc the main promiceIpc handle. Needed to be able to hook IPC sending into logout click handler.
 */
export default function initMenu(opts: MenuOptions, promiseIpc: any) {
  const mt: SimpleMenuItemConstructorOptions[] = [];
  if (isMac) {
    mt.push({
      label: app.getName(),
      submenu: [
        {
          label: "About Lens",
          click: showAbout
        },
        { type: 'separator' },
        {
          label: 'Preferences',
          click: opts.showPreferencesHook,
          enabled: true
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { 
          role: 'quit',
          accelerator: "CmdOrCtrl+q"
        }
      ]
    });
  }

  const fileMenu: SimpleMenuItemConstructorOptions = {
    label: "File",
    submenu: [{
      label: 'Add Cluster...',
      click: opts.addClusterHook,
      accelerator: "CmdOrCtrl+Plus"
    },
    {
      label: 'Cluster Settings',
      click: opts.clusterSettingsHook,
      enabled: false
    }]
  };
  if (!isMac) {
    fileMenu.submenu.push(
      { type: 'separator' },
      {
        label: 'Preferences',
        click: opts.showPreferencesHook,
        enabled: true
      },
      { type: 'separator' },
      { 
        role: 'quit',
        accelerator: "CmdOrCtrl+q"
      }
    );
  }
  mt.push(fileMenu);

  const editMenu: SimpleMenuItemConstructorOptions = {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'delete' },
      { type: 'separator' },
      { role: 'selectAll' },
    ]
  };
  mt.push(editMenu);

  const viewMenu: SimpleMenuItemConstructorOptions = {
    label: 'View',
    submenu: [
      {
        label: 'Back',
        accelerator: 'CmdOrCtrl+[',
        click() {
          webContents.getFocusedWebContents().executeJavaScript('window.history.back()')
        }
      },
      {
        label: 'Forward',
        accelerator: 'CmdOrCtrl+]',
        click() {
          webContents.getFocusedWebContents().executeJavaScript('window.history.forward()')
        }
      },
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click() {
          webContents.getFocusedWebContents().reload()
        }
      },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  };
  mt.push(viewMenu);

  const helpMenu: SimpleMenuItemConstructorOptions = {
    role: 'help',
    submenu: [
      {
        label: 'License',
        click: async () => {
          shell.openExternal('https://lakendlabs.com/licenses/lens-eula.md');
        },
      },
      {
        label: 'Community Slack',
        click: async () => {
          shell.openExternal(slackUrl);
        },
      },
      {
        label: 'Report an Issue',
        click: async () => {
          shell.openExternal(issuesTrackerUrl);
        },
      },
      {
        label: "What's new?",
        click: opts.showWhatsNewHook,
      }
    ]
  };
  if (!isMac) {
    helpMenu.submenu.push({
      label: "About Lens",
      click: showAbout
    })
  }
  mt.push(helpMenu);

  Menu.setApplicationMenu(Menu.buildFromTemplate(mt));

  promiseIpc.on("enableClusterSettingsMenuItem", (clusterId: string) => {
    setClusterSettingsEnabled(true)
  });

  promiseIpc.on("disableClusterSettingsMenuItem", () => {
    setClusterSettingsEnabled(false)
  });
}
