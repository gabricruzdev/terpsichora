#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const pkgPath = process.argv[2] || path.join(__dirname, '..', 'node_modules', 'electron', 'dist');
const isWin = process.platform === 'win32';

const pyCommands = isWin
  ? [
      ['py', ['-3', '-m', 'castlabs_evs.vmp', 'sign-pkg', pkgPath]],
      ['py', ['-m', 'castlabs_evs.vmp', 'sign-pkg', pkgPath]],
      ['powershell', ['-NoProfile', '-Command', `python -m castlabs_evs.vmp sign-pkg "${pkgPath}"`]],
      ['python', ['-m', 'castlabs_evs.vmp', 'sign-pkg', pkgPath]],
    ]
  : [
      ['python3', ['-m', 'castlabs_evs.vmp', 'sign-pkg', pkgPath]],
      ['python', ['-m', 'castlabs_evs.vmp', 'sign-pkg', pkgPath]],
    ];

for (const [cmd, args] of pyCommands) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    windowsHide: true,
  });
  if (result.status === 0) {
    console.log('\nAssinatura VMP concluída.');
    process.exit(0);
  }
  if (result.error?.code !== 'ENOENT') break;
}

console.error(`
Erro: castlabs-evs não encontrado ou falhou.

1. pip install castlabs-evs
2. python -m castlabs_evs.account signup
3. node scripts/sign-electron.js

Manual: python -m castlabs_evs.vmp sign-pkg node_modules/electron/dist
Docs: https://github.com/castlabs/electron-releases/wiki/EVS
`);
process.exit(1);
