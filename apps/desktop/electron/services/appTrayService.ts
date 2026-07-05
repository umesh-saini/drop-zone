import { app, Menu, Tray, nativeImage, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AppTrayService {
  private tray: Tray | null = null;
  private window: BrowserWindow | null = null;
  public isQuitting = false;
  private pairings: any[] = [];

  public init(window: BrowserWindow) {
    this.window = window;
    const icon = nativeImage.createFromPath(path.join(__dirname, '../../public/tray.png'));
    // Scale down the icon to standard tray size
    this.tray = new Tray(icon.resize({ width: 24, height: 24 }));
    
    this.tray.setToolTip('DropZone');
    this.updateMenu();
    
    this.tray.on('click', () => {
      this.window?.show();
    });

    ipcMain.on('tray:update-permissions', (_event, pairings) => {
      this.pairings = pairings;
      this.updateMenu();
    });
  }

  private updateMenu() {
    if (!this.tray) return;

    const permissionsSubmenu = this.pairings.map(pairing => ({
      label: pairing.deviceName,
      submenu: pairing.permissions.map((perm: any) => ({
        label: perm.label,
        type: 'checkbox' as const,
        checked: perm.granted,
        click: (item: Electron.MenuItem) => {
          this.window?.webContents.send('app:toggle-permission', {
            pairingId: pairing.pairingId,
            types: perm.types,
            granted: item.checked
          });
        }
      }))
    }));

    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Show App', 
        click: () => this.window?.show() 
      },
      { 
        label: 'Hide App', 
        click: () => this.window?.hide() 
      },
      { type: 'separator' },
      { 
        label: 'App Permissions', 
        submenu: permissionsSubmenu.length > 0 ? permissionsSubmenu : [{ label: 'No paired devices', enabled: false }]
      },
      { type: 'separator' },
      { 
        label: 'Quit DropZone', 
        click: () => {
          this.isQuitting = true;
          app.quit();
        } 
      }
    ]);
    
    this.tray.setContextMenu(contextMenu);
  }
}

export const appTrayService = new AppTrayService();
