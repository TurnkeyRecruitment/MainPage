import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv.find(argument => argument.startsWith('--mode='))?.slice(7) ?? 'production';
if (!['production', 'preview'].includes(mode)) throw new Error('Mode must be production or preview.');
for (const script of ['prepare-publication.mjs', 'prepare-worker.mjs']) {
  execFileSync(process.execPath, [path.join(root, 'tools', script), `--mode=${mode}`], { cwd: root, stdio: 'inherit' });
}
