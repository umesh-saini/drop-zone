export const platformFolder = 
  process.platform === 'win32' ? 'windows' : 
  process.platform === 'darwin' ? 'mac' : 
  'linux';
