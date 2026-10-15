'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Play, RefreshCw, ShieldCheck, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  loadExercisePack,
  runStarter,
  submitForJudging,
  type ExercisePack,
  type JudgeResult,
} from '@/lib/exercise-runtime';
import {
  ensureReady,
  getStatus,
  onRunnerEvent,
  type RuntimeStatus,
} from '@/lib/wasm-java-runner';
import { cleanResult, EXERCISE_ID, REVISION, TESTS } from '@/lib/java-execution.mjs';
import { makeExercisePack } from '@/lib/exercise-pack.mjs';

const STATUS_TEXT: Record<RuntimeStatus, string> = {
  cold: '尚未启动浏览器内 JVM（首次约 76MB，缓存后下次秒开）。',
  booting: '正在启动 OpenJDK 21…',
  ready: 'JVM 就绪：真实编译与判题都在本浏览器内完成，代码不外传。',
  running: '正在编译并执行…',
  dead: 'JVM 崩溃或超时重建中。',
};

const KIND_TEXT: Record<JudgeResult['kind'], string> = {
  completed: '示例运行结束（不等于验收通过）',
  passed: '本次 JVM 行为测试全部通过',
  tests_failed: '行为测试未全部通过',
  compile_error: '编译失败',
  runtime_error: '运行时出错',
  timeout: '执行超时',
};

export function JavaExecutionPanel({
  exerciseId,
  code,
  onAttempt,
  onVerified,
}: {
  exerciseId: string;
  code: string;
  onAttempt: () => void;
  onVerified: () => void;
}) {
  const [pack, setPack] = useState<ExercisePack | null>(null);
  const [packError, setPackError] = useState('');
  const [status, setStatus] = useState<RuntimeStatus>(getStatus());
  const [stage, setStage] = useState<{ text: string; progress: number } | null>(null);
  const [busy, setBusy] = useState<'run' | 'submit' | null>(null);
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [error, setError] = useState('');
  const [packing, setPacking] = useState(false);
  const generation = useRef(0);

  // 加载练习包
  useEffect(() => {
    let live = true;
    setPack(null);
    setPackError('');
    loadExercisePack(exerciseId)
      .then((p) => { if (live) setPack(p); })
      .catch((e) => { if (live) setPackError(e instanceof Error ? e.message : String(e)); });
    return () => { live = false; };
  }, [exerciseId]);

  // 跟踪 JVM 状态
  useEffect(() => {
    return onRunnerEvent((e) => {
      if (e.type === 'status') setStatus(e.status);
      if (e.type === 'stage') setStage({ text: e.text, progress: e.progress });
      if (e.type === 'status' && e.status === 'ready') setStage(null);
    });
  }, []);

  // 代码变化 → 旧结果作废
  useEffect(() => {
    generation.current++;
    setResult(null);
    setError('');
  }, [code]);

  const boot = () => {
    setError('');
    ensureReady().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };

  async function execute(mode: 'run' | 'submit') {
    if (!pack) return;
    const g = ++generation.current;
    setBusy(mode);
    setError('');
    setResult(null);
    onAttempt();
    try {
      await ensureReady();
      const r = mode === 'run' ? await runStarter(pack, code) : await submitForJudging(pack, code);
      if (g !== generation.current) return;
      setResult(r);
      if (r.kind === 'passed') onVerified();
    } catch (e) {
      if (g === generation.current) {
        setError(e instanceof Error ? e.message : '执行失败，请重试。');
      }
    } finally {
      if (g === generation.current) setBusy(null);
    }
  }

  async function downloadPack() {
    if (!pack) return;
    setPacking(true);
    setError('');
    try {
      const tests = pack.judgeSource;
      const bytes = makeExercisePack(code, tests, pack.readme || '练习包');
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: 'application/zip' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `${exerciseId}-jdk21.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : '下载失败，请重试。');
    } finally {
      setPacking(false);
    }
  }

  const canExecute = status === 'ready' && !busy && !!pack;

  return (
    <section className="m3-surface p-4" aria-label="浏览器内真实判题">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">编写 → 编译 → 行为测试（本浏览器）</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground" role="status">
            {STATUS_TEXT[status]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={downloadPack} disabled={packing || !pack}>
            {packing ? <RefreshCw className="animate-spin" /> : <Download />}
            下载到 IDEA
          </Button>
          {status !== 'ready' ? (
            <Button onClick={boot} disabled={status === 'booting' || status === 'running'}>
              {status === 'booting' || status === 'running' ? (
                <RefreshCw className="animate-spin" />
              ) : (
                <Cpu />
              )}
              {status === 'booting' ? '正在启动…' : '启动 JDK 21（浏览器内）'}
            </Button>
          ) : (
            <>
              <Button variant="outline" disabled={!canExecute} onClick={() => execute('run')}>
                <Play />
                {busy === 'run' ? '正在运行…' : '运行示例'}
              </Button>
              <Button disabled={!canExecute} onClick={() => execute('submit')}>
                <ShieldCheck />
                {busy === 'submit' ? '正在判题…' : '提交判题'}
              </Button>
            </>
          )}
        </div>
      </div>

      {stage && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground">{stage.text}</p>
          <Progress value={stage.progress} className="mt-1.5 h-1.5" />
        </div>
      )}

      {packError && (
        <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive" role="alert">
          练习包加载失败：{packError}
        </p>
      )}

      {busy && (
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          {busy === 'submit'
            ? '正在编译并在浏览器 JVM 中执行行为测试……修改代码会隐藏旧反馈。'
            : '正在编译并运行你的 main()……'}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-3" aria-live="polite">
          <p className="text-sm font-semibold">
            {KIND_TEXT[result.kind]}{' '}
            <span className="font-normal text-muted-foreground">
              · {Math.round(result.durationMs)} ms
            </span>
            {result.summary && (
              <span className="ml-1 font-normal text-muted-foreground">
                {result.summary.passed}/{result.summary.total}
              </span>
            )}
          </p>
          {result.kind === 'compile_error' && (
            <p className="text-xs text-muted-foreground">
              从第一条编译错误开始检查文件名、行号、分号和方法签名；后续错误可能由它引起。
            </p>
          )}
          {result.cases.map((c) => (
            <div key={c.name} className="rounded-lg bg-muted p-3 text-xs">
              <strong>
                {c.passed ? '通过' : '未通过'} · {c.name}
              </strong>
              {c.detail && <p className="mt-1 text-muted-foreground">{c.detail}</p>}
            </div>
          ))}
          {(result.stdout || result.stderr) && (
            <details open={result.kind !== 'passed'}>
              <summary className="cursor-pointer text-xs font-medium">程序输出</summary>
              <pre className="code-block mt-2 max-h-80 overflow-auto text-xs">
                {result.stdout}
                {result.stderr ? '\n[stderr]\n' + result.stderr : ''}
              </pre>
            </details>
          )}
          {result.kind === 'passed' && (
            <p className="text-xs text-muted-foreground">
              已在本浏览器记录一次 JVM 验收通过；测试覆盖：{TESTS.map((t) => t.label).join('；')}。
              通过不是所有并发调度都正确的证明。
            </p>
          )}
        </div>
      )}

      <p className="mt-4 border-t border-border pt-3 text-[11px] leading-5 text-muted-foreground">
        执行引擎：OpenJDK 21（Zero，Emscripten WASM）于本浏览器 Worker 内运行，代码不外传。
        超时/死循环会强制重建 JVM 实例。
      </p>
    </section>
  );
}
