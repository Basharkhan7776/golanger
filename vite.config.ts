import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

function localGoRunnerPlugin(): Plugin {
  return {
    name: 'local-go-runner',
    configureServer(server) {
      server.middlewares.use('/api/compile', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method Not Allowed');
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', () => {
          try {
            const { code, isTest } = JSON.parse(body);
            const runnerDir = path.resolve(process.cwd(), 'runner');
            const uniqueId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const isTestMode = Boolean(isTest || code.includes('func Test') || code.includes('*testing.T'));

            const fileName = isTestMode ? `${uniqueId}_test.go` : `${uniqueId}.go`;
            const filePath = path.join(runnerDir, fileName);

            fs.writeFileSync(filePath, code, 'utf-8');

            const goArgs = isTestMode
              ? ['test', '-v', '-count=1', fileName]
              : ['run', fileName];

            const goProc = spawn('go', goArgs, { cwd: runnerDir });
            let goStdout = '';
            let goStderr = '';

            goProc.stdout.on('data', d => { goStdout += d.toString(); });
            goProc.stderr.on('data', d => { goStderr += d.toString(); });

            const cleanup = () => {
              try {
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                }
              } catch {}
            };

            goProc.on('close', codeExit => {
              cleanup();
              const combined = `${goStdout} ${goStderr}`;
              let passed = codeExit === 0;

              if (isTestMode) {
                if (combined.includes('FAIL') || combined.includes('FAIL:')) {
                  passed = false;
                }
                if (combined.includes('PASS') || combined.includes('ok  \t')) {
                  passed = true;
                }
              }

              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({
                success: passed,
                stdout: goStdout,
                stderr: goStderr,
                exitDetail: passed ? 'Exited with status 0' : `Execution failed (status ${codeExit})`
              }));
            });

            goProc.on('error', err => {
              cleanup();
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({
                success: false,
                stdout: '',
                stderr: `Failed to spawn go: ${err.message}`,
                exitDetail: 'Go compiler not found'
              }));
            });
          } catch (e: any) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [
    localGoRunnerPlugin(),
    tailwindcss(),
    react(),
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/@monaco-editor/') || id.includes('node_modules/monaco-editor/')) {
            return 'monaco-vendor';
          }
          if (id.includes('node_modules/react-markdown/') || id.includes('node_modules/remark-gfm/')) {
            return 'markdown-vendor';
          }
        },
      },
    },
  },
})
