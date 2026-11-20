const { spawn } = require('child_process');
const fs = require('fs');

async function runBrowser(commands) {
  return new Promise((resolve, reject) => {
    const cp = spawn('npx', ['-y', '@browsermcp/mcp@latest'], { shell: true });
    let stdout = '';
    let stderr = '';

    cp.stdout.on('data', d => { stdout += d.toString(); });
    cp.stderr.on('data', d => { stderr += d.toString(); });

    const timeout = setTimeout(() => {
      cp.kill();
      resolve(stdout);
    }, 20000);

    setTimeout(() => {
      const req = JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'browser',
          arguments: { commands }
        }
      }) + '\n';
      cp.stdin.write(req);
    }, 800);

    cp.on('close', () => {
      clearTimeout(timeout);
      try {
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.result && parsed.result.content) {
              return resolve(parsed.result.content.map(c => c.text).join('\n'));
            }
          } catch {}
        }
        resolve(stdout);
      } catch (err) {
        resolve(stdout);
      }
    });
  });
}

const cmdFile = process.argv[2];
let commands = '';
if (cmdFile && fs.existsSync(cmdFile)) {
  commands = fs.readFileSync(cmdFile, 'utf8');
} else {
  commands = process.argv.slice(2).join('\n');
}

runBrowser(commands).then(res => {
  console.log(res);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
