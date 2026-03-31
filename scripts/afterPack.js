const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  const appOutDir = context.appOutDir;
  const isWin = process.platform === 'win32';

  const sigFiles = fs.readdirSync(appOutDir).filter(f => f.endsWith('.sig'));
  for (const sig of sigFiles) {
    const sigPath = path.join(appOutDir, sig);
    fs.unlinkSync(sigPath);
    console.log(`\n[afterPack] Removed old signature: ${sig}`);
  }

  console.log(`[afterPack] Signing VMP in: ${appOutDir}`);

  const pyCommands = isWin
    ? [
        ['py', ['-3', '-m', 'castlabs_evs.vmp', 'sign-pkg', '--force', appOutDir]],
        ['py', ['-m', 'castlabs_evs.vmp', 'sign-pkg', '--force', appOutDir]],
        ['python', ['-m', 'castlabs_evs.vmp', 'sign-pkg', '--force', appOutDir]],
      ]
    : [
        ['python3', ['-m', 'castlabs_evs.vmp', 'sign-pkg', '--force', appOutDir]],
        ['python', ['-m', 'castlabs_evs.vmp', 'sign-pkg', '--force', appOutDir]],
      ];

  for (const [cmd, args] of pyCommands) {
    const result = spawnSync(cmd, args, {
      stdio: 'inherit',
      shell: true,
      windowsHide: true,
    });
    if (result.status === 0) {
      console.log('[afterPack] VMP signature applied successfully.\n');
      return;
    }
    if (result.error?.code !== 'ENOENT') break;
  }

  console.error('[afterPack] ERROR: Failed to sign VMP. Spotify will not work correctly.');
  console.error('Make sure castlabs-evs is installed: pip install castlabs-evs');
  process.exit(1);
};
