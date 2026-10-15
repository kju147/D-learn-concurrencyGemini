// lib/exercise-runtime.ts
// 练习包 v1 的加载与判题编排（浏览器内 JVM）

import { ensureReady, runFiles, type RunOutcome } from './wasm-java-runner';

export type ExerciseManifest = {
  id: string;
  moduleId: string;
  title: string;
  revision: number;
  entry: string;      // 起始代码里的 public 类名（如 OrderImport）
  tests: string;      // 判题类名（如 Judge）
  starter: string;    // starter 文件名
  timeoutSec: number;
  notes?: string;
};

export type ExercisePack = {
  manifest: ExerciseManifest;
  starterSource: string;
  judgeSource: string;
  readme: string;
};

export type JudgeCaseResult = {
  name: string;
  passed: boolean;
  detail: string;
};

export type JudgeResult = {
  kind: 'passed' | 'tests_failed' | 'compile_error' | 'runtime_error' | 'timeout' | 'completed';
  cases: JudgeCaseResult[];
  summary: { passed: number; total: number } | null;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export async function loadExercisePack(id: string): Promise<ExercisePack> {
  const base = `/exercises/${id}`;
  const manifestRes = await fetch(`${base}/manifest.json`, { cache: 'no-store' });
  if (!manifestRes.ok) throw new Error(`练习包 manifest 缺失：${id}`);
  const manifest = (await manifestRes.json()) as ExerciseManifest;

  const [starterSource, judgeSource, readme] = await Promise.all([
    fetch(`${base}/${manifest.starter}`, { cache: 'no-store' }).then((r) => r.text()),
    fetch(`${base}/${manifest.tests}.java`, { cache: 'no-store' }).then((r) => r.text()),
    fetch(`${base}/README.md`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => ''),
  ]);
  return { manifest, starterSource, judgeSource, readme };
}

/** run 模式：只编译并运行学员代码的 main，观察输出。 */
export async function runStarter(pack: ExercisePack, code: string): Promise<JudgeResult> {
  await ensureReady();
  const outcome = await runFiles(
    [{ name: pack.manifest.entry, content: code }],
    pack.manifest.entry,
    pack.manifest.timeoutSec * 1000,
  );
  return toResult(outcome, null);
}

/** submit 模式：Judge 编译单元放最前（编译入口与运行目标一致），starter 经 JBOX_FILE 进入。 */
export async function submitForJudging(pack: ExercisePack, code: string): Promise<JudgeResult> {
  await ensureReady();
  const outcome = await runFiles(
    [
      { name: pack.manifest.tests, content: pack.judgeSource },
      { name: pack.manifest.entry, content: code },
    ],
    pack.manifest.tests,
    pack.manifest.timeoutSec * 1000,
  );
  return toResult(outcome, pack);
}

function toResult(outcome: RunOutcome, pack: ExercisePack | null): JudgeResult {
  const cases: JudgeCaseResult[] = [];
  let summary: JudgeResult['summary'] = null;

  if (pack) {
    const lines = outcome.stdout.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^(PASS|FAIL)\s+([a-z-]+)(?::\s*(.*))?$/);
      if (m) {
        cases.push({ name: m[2], passed: m[1] === 'PASS', detail: m[3] ?? '' });
      }
      const s = line.match(/^SUMMARY\s+(\d+)\/(\d+)$/);
      if (s) summary = { passed: Number(s[1]), total: Number(s[2]) };
    }
  }

  let kind: JudgeResult['kind'];
  if (pack && summary) {
    kind = summary.passed === summary.total ? 'passed' : 'tests_failed';
  } else if (outcome.exitCode !== 0) {
    kind = /:\s*error:/.test(outcome.stdout) ? 'compile_error' : 'runtime_error';
  } else {
    kind = pack ? (cases.length ? 'tests_failed' : 'runtime_error') : 'completed';
  }

  return {
    kind,
    cases,
    summary,
    stdout: outcome.stdout,
    stderr: outcome.stderr,
    durationMs: outcome.durationMs,
  };
}
