import java.nio.file.Path;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * JDK 21 learning checks, revision 2. No JUnit/Maven dependency.
 * These are bounded observations, not a proof of all thread interleavings.
 * Run only your own trusted exercise locally; this is NOT a security sandbox.
 */
public final class StartJoinTests {
    private static final String[] CASES = {"thread", "await", "values", "interrupt"};

    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            int failures = 0;
            String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
            for (String name : CASES) {
                Process process = new ProcessBuilder(java, "-Xmx96m", "-XX:ActiveProcessorCount=2",
                        "-cp", System.getProperty("java.class.path"), "StartJoinTests", name)
                        .inheritIO().start();
                if (!process.waitFor(6, TimeUnit.SECONDS)) {
                    process.destroyForcibly();
                    process.waitFor(2, TimeUnit.SECONDS);
                    System.out.println("FAIL " + name + ": timeout; check missing start, deadlock or endless wait.");
                    failures++;
                } else if (process.exitValue() != 0) {
                    failures++;
                }
            }
            System.out.println("\nBehavior checks: " + (CASES.length - failures) + "/" + CASES.length);
            System.out.println("Read README.md for explanations. Passing checks is not a proof of correctness.");
            System.exit(failures == 0 ? 0 : 1);
        }
        try {
            switch (args[0]) {
                case "thread" -> checkThread();
                case "await" -> checkAwait();
                case "values" -> checkValues();
                case "interrupt" -> checkInterrupt();
                default -> throw new AssertionError("unknown test");
            }
            System.out.println("PASS " + args[0]);
            System.exit(0);
        } catch (Throwable failure) {
            System.out.println("FAIL " + args[0] + ": " + failure);
            System.exit(1);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    private static void checkThread() throws Exception {
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

    private static void checkAwait() throws Exception {
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

    private static void checkValues() throws Exception {
        for (int expected : new int[]{0, 7, 12800, -3}) {
            int[] result = {Integer.MIN_VALUE};
            AtomicInteger calls = new AtomicInteger();
            OrderImport.validateAndAwait(() -> { result[0] = expected; calls.incrementAndGet(); });
            require(calls.get() == 1 && result[0] == expected,
                    "do not hardcode 42 or cache one task; each invocation has a different Runnable");
        }
    }

    private static void checkInterrupt() throws Exception {
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
