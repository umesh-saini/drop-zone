const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_LOGO = path.join(__dirname, '../logo.png');

async function generateIcons() {
  if (!fs.existsSync(SOURCE_LOGO)) {
    console.error(`❌ Source logo not found at ${SOURCE_LOGO}`);
    process.exit(1);
  }

  console.log(`🚀 Starting icon generation from ${SOURCE_LOGO}...`);

  try {
    // ---------------------------------------------------------
    // 1. Desktop Icons (Electron)
    // ---------------------------------------------------------
    console.log('Generating Desktop icons...');
    await sharp(SOURCE_LOGO)
      .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(__dirname, '../apps/desktop/build/icon.png'));

    // ---------------------------------------------------------
    // 2. Web Icons (PWA)
    // ---------------------------------------------------------
    console.log('Generating Web icons...');
    await sharp(SOURCE_LOGO)
      .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(__dirname, '../apps/web/public/logo192.png'));

    await sharp(SOURCE_LOGO)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(__dirname, '../apps/web/public/logo512.png'));
      
    await sharp(SOURCE_LOGO)
      .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(__dirname, '../apps/web/public/favicon.png'));

    // ---------------------------------------------------------
    // 3. Mobile Icons (Expo)
    // ---------------------------------------------------------
    console.log('Generating Mobile icons...');
    // Main Expo icon
    await sharp(SOURCE_LOGO)
      .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(__dirname, '../apps/mobile/assets/icon.png'));

    // Adaptive Foreground (scaled down to 80% to fit within Android's safe zone mask)
    await sharp(SOURCE_LOGO)
      .resize(800, 800, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 112,
        bottom: 112,
        left: 112,
        right: 112,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(__dirname, '../apps/mobile/assets/android-icon-foreground.png'));

    // ---------------------------------------------------------
    // 4. Android Push Notification Silhouette
    // ---------------------------------------------------------
    console.log('Generating Android Notification Silhouette...');
    // Android requires a pure monochrome white silhouette on a transparent background
    const whiteSquare = Buffer.from(
      `<svg><rect x="0" y="0" width="96" height="96" fill="#ffffff" /></svg>`
    );
    
    const resizedSource = await sharp(SOURCE_LOGO)
      .resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp(whiteSquare)
      .composite([
        { 
          input: resizedSource, 
          blend: 'dest-in' // Keeps the white square only where the source logo has opaque pixels
        }
      ])
      .png()
      .toFile(path.join(__dirname, '../apps/mobile/assets/notification-icon.png'));

    console.log('✅ All icons successfully generated!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
}

generateIcons();
