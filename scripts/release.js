
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function run(command) {
    console.log(`> ${command}`);
    try {
        execSync(command, { stdio: 'inherit', cwd: rootDir });
    } catch (e) {
        console.error(`COMMAND FAILED: ${command}`);
        process.exit(1);
    }
}

// 1. Verify Integrity (Shield Pattern)
console.log('\n🛡️  VERIFYING INTEGRITY 🛡️');
run('npm test');
// run('npm audit'); // Optional: Uncomment to enforce 0 vuln policy

// 2. Determine Version Bump
const args = process.argv.slice(2);
const bumpType = args[0] || 'patch'; // patch, minor, major
if (!['patch', 'minor', 'major'].includes(bumpType)) {
    console.error('Invalid bump type. Use: patch, minor, major');
    process.exit(1);
}

// 3. Update package.json
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const oldVersion = pkg.version;
const [major, minor, patchVer] = oldVersion.split('.').map(Number);

let newVersion = '';
if (bumpType === 'major') newVersion = `${major + 1}.0.0`;
if (bumpType === 'minor') newVersion = `${major}.${minor + 1}.0`;
if (bumpType === 'patch') newVersion = `${major}.${minor}.${patchVer + 1}`;

console.log(`\n📦 BUMPING VERSION: ${oldVersion} -> ${newVersion}`);
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// 4. Update Changelog
const changelogPath = path.join(rootDir, 'CHANGELOG.md');
const date = new Date().toISOString().split('T')[0];
const entry = `\n## [${newVersion}] - ${date}\n- Automated release.\n- (Add notes here)\n`;

if (fs.existsSync(changelogPath)) {
    const content = fs.readFileSync(changelogPath, 'utf8');
    // Insert after header
    const newContent = content.replace('# Changelog\n', '# Changelog\n' + entry);
    fs.writeFileSync(changelogPath, newContent);
} else {
    fs.writeFileSync(changelogPath, `# Changelog\n${entry}`);
}

// 5. Commit & Tag
console.log('\n📝 COMMITTING & TAGGING');
try {
    run(`git add package.json CHANGELOG.md`);
    run(`git commit -m "chore(release): v${newVersion}"`);
    run(`git tag v${newVersion}`);
    console.log(`\n✅ RELEASE SUCCESSFUL: v${newVersion}`);
    console.log(`👉 DO NOT FORGET: git push && git push --tags`);
} catch (e) {
    console.log('⚠️  Git operations skipped or failed (is this a git repo?). Manual commit required.');
}
