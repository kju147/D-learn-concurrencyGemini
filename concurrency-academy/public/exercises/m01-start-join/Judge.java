import java.util.concurrent.CountDownLatch;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * 浏览器内 JVM 判题 harness（revision 2 的站内版）。
 * 与 StartJoinTests（下载到 IDEA 的版本）语义一致，
 * 只是不再用子进程隔离 —— 由运行容器负责超时回收。
 * 打印协议：PASS <name> / FAIL <name>: <原因> / SUMMARY <通过数>/<总数>
 */
public final class Judge {
    private static final String[] CASES = {"thread", "await", "values", "interrupt"};

    public static void main(String[] args) throws Exception {
        int failures = 0;
        Judge m = new Judge();
        for (String name : CASES) {
            String detail = null;
            try {
                switch (name) {
                    case "thread" -> m.checkThread();
                    case "await" -> m.checkAwait();
                    case "values" -> m.checkValues();
                    case "interrupt" -> m.checkInterrupt();
                    default -> throw new AssertionError("unknown test");
                }
            } catch (Throwable failure) {
                detail = String.valueOf(failure);
            }
            if (detail == null) {
                System.out.println("PASS " + name);
            } else {
                failures++;
                System.out.println("FAIL " + name + ": " + detail);
            }
            System.out.flush();
        }
        System.out.println("SUMMARY " + (CASES.length - failures) + "/" + CASES.length);
        System.out.flush();
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    private void checkThread() throws Exception {
        Thread caller = Thread.currentThread();
        AtomicReference<Thread> actual = new AtomicReference<>();
        AtomicInteger calls = new AtomicInteger();
        OrderImport.validateAndAwait(() -> {
            actual.set(Thread.currentThread());
            calls.incrementAndGet();
        });
        require(calls.get() == 1, "execute the supplied Runnable exactly once before returning");
        require(actual.get() != caller, "run() is an ordinary call; use start() for another thread");
        require(!actual.get().isVirtual(), "this exercise requires a platform thread");
        require("order-validator".equals(actual.get().getName()), "expected thread name: order-validator");
    }

    private void checkAwait() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch returned = new CountDownLatch(1);
        AtomicReference<Throwable> failure = new AtomicReference<>();
        int[] result = {0};
        Thread caller = Thread.ofPlatform().daemon(true).start(() -> {
            try {
                OrderImport.validateAndAwait(() -> {
                    entered.countDown();
                    try { release.await(); }
                    catch (InterruptedException e) { Thread.currentThread().interrupt(); return; }
                    result[0] = 73;
                });
            } catch (Throwable error) { failure.set(error); }
            finally { returned.countDown(); }
        });
        try {
            require(entered.await(2, TimeUnit.SECONDS), "task never started");
            require(!returned.await(300, TimeUnit.MILLISECONDS), "returned before the controlled task finished; join is missing");
            release.countDown();
            require(returned.await(2, TimeUnit.SECONDS), "method did not return after task completion");
            require(failure.get() == null, "unexpected exception: " + failure.get());
            require(result[0] == 73, "caller must observe the task result");
        } finally { release.countDown(); caller.interrupt(); }
    }

    private void checkValues() throws Exception {
        for (int expected : new int[]{0, 7, 12800, -3}) {
            int[] result = {Integer.MIN_VALUE};
            AtomicInteger calls = new AtomicInteger();
            OrderImport.validateAndAwait(() -> { result[0] = expected; calls.incrementAndGet(); });
            require(calls.get() == 1 && result[0] == expected,
                    "do not hardcode 42 or cache one task; each invocation has a different Runnable");
        }
    }

    private void checkInterrupt() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        FutureTask<Boolean> call = new FutureTask<>(() -> {
            try {
                OrderImport.validateAndAwait(() -> {
                    entered.countDown();
                    try { release.await(); }
                    catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                });
                return false;
            } catch (InterruptedException expected) { return true; }
        });
        Thread caller = Thread.ofPlatform().daemon(true).start(call);
        try {
            require(entered.await(2, TimeUnit.SECONDS), "task never started");
            caller.interrupt();
            require(call.get(2, TimeUnit.SECONDS), "propagate InterruptedException from join; do not swallow it");
        } finally { release.countDown(); caller.interrupt(); }
    }
}
