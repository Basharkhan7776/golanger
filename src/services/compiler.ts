import type { CompileResult, ExerciseMode } from '../types/exercise';

const PLAYGROUND_URL = 'https://go.dev/_/compile';

export async function executeGoCode(code: string, mode: ExerciseMode): Promise<CompileResult> {
  const startTime = performance.now();
  const isTestMode = mode === 'test' || code.includes('func Test') || code.includes('*testing.T');

  // Attempt local compiler endpoint first (provided by Vite dev server plugin)
  try {
    const localResp = await fetch('/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, isTest: isTestMode }),
    });

    if (localResp.ok) {
      const data = await localResp.json();
      const duration = Math.round(performance.now() - startTime);

      return {
        success: Boolean(data.success),
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        exitDetail: data.exitDetail || (data.success ? 'Exited with status 0' : 'Execution failed'),
        executionTimeMs: duration,
      };
    }
  } catch {
    // If local compiler endpoint is unreachable (e.g. static preview without backend), fallback to playground API
  }

  // Fallback to official Go Playground API
  try {
    const params = new URLSearchParams();
    params.append('version', '2');
    params.append('body', code);

    const response = await fetch(PLAYGROUND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Go Playground server returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const duration = Math.round(performance.now() - startTime);

    let stdout = '';
    if (Array.isArray(data.Events)) {
      stdout = data.Events.map((e: any) => e.Message || '').join('');
    }

    const stderr = data.Errors || data.VetErrors || '';
    let passed = !stderr;

    if (isTestMode) {
      const combined = `${stdout} ${stderr}`;
      const hasFail = combined.includes('--- FAIL:') || combined.includes('FAIL\t') || combined.includes('\nFAIL');
      const hasPass = combined.includes('PASS\n') || combined.includes('--- PASS:');
      passed = !stderr && !hasFail && hasPass;
    }

    return {
      success: passed,
      stdout: stdout,
      stderr: stderr,
      exitDetail: data.Errors ? 'Compilation failed' : (passed ? 'Exited with status 0' : 'Test failed'),
      executionTimeMs: duration,
    };
  } catch (err: any) {
    const duration = Math.round(performance.now() - startTime);
    return {
      success: false,
      stdout: '',
      stderr: `Network or Server Error: ${err?.message || 'Failed to connect to Go compiler.'}\nEnsure your local dev server is running or check your internet connection.`,
      exitDetail: 'Network error',
      executionTimeMs: duration,
    };
  }
}
