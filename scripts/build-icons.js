const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const sourcePath = path.join(buildDir, 'icon-source.png');
const svgPath = path.join(buildDir, 'icon.svg');
const pngPath = path.join(buildDir, 'icon.png');

async function build() {
  const useCustomIcon = fs.existsSync(sourcePath);
  const input = useCustomIcon ? sourcePath : svgPath;

  if (useCustomIcon) {
    await sharp(input)
      .resize(512, 512)
      .png()
      .toFile(pngPath);
  } else {
    const svg = fs.readFileSync(svgPath);
    await sharp(svg)
      .resize(512, 512)
      .png()
      .toFile(pngPath);
  }

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = await Promise.all(
    sizes.map(size =>
      sharp(input)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );

  const icoBuffer = await toIco(pngBuffers);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);

  fs.copyFileSync(pngPath, path.join(__dirname, '..', 'ui', 'icon.png'));
  console.log('Icons built: icon.png, icon.ico, ui/icon.png');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
