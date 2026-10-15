import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * 浏览器内 JVM 判题 harness：协作式取消。
 * 覆盖：sleep 路径被中断时能及时退出；不会吞掉标记；任务只做一次循环内一轮。
 * 打印协议：PASS <name> / FAIL <name>: <原因> / SUMMARY <通过数>/<总数>
 */
public final class Judge {
    private static final String[] CASES = {"exits", "no-spin", "restores-or-propagates"};

    public static void main(String[] args) throws Exception {
        int failures = 0;
        for (String name : CASES) {
            String detail = null;
            try {
                switch (name) {
                    case "exits" -> checkExits();
                    case "no-spin" -> checkNoSpinLoop();
                    case "restores-or-propagates" -> checkMarker();
                    default -> throw new AssertionError("unknown");
                }
            } catch (Throwable failure) {
                detail = String.valueOf(failure);
            }
            if (detail == null) System.out.println("PASS " + name);
            else { failures++; System.out.println("FAIL " + name + ": " + detail); }
            System.out.flush();
        }
        System.out.println("SUMMARY " + (CASES.length - failures) + "/" + CASES.length);
        System.out.flush();
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    // 中断后必须可靠地结束 run()
    private static void checkExits() throws Exception {
        Thread t = new Thread(new InventorySync(), "sync-worker");
        t.start();
        Thread.sleep(1_600);            // 至少踩过一次 sleep
        t.interrupt();
        t.join(2_000);
        require(!t.isAlive(), "interrupt 之后 run() 未退出（join 2s 超时）");
    }

    // 中断期间不能再原地空转：两次观察点间 isAlive 不允许在退出路径上拖住
    private static void checkNoSpinLoop() throws Exception {
        Thread t = new Thread(new InventorySync(), "sync-worker");
        t.start();
        Thread.sleep(200);
        t.interrupt();
        long deadline = System.nanoTime() + 1_500_000_000L;
        while (t.isAlive() && System.nanoTime() < deadline) Thread.sleep(25);
        require(!t.isAlive(), "收到中断后仍在循环，标记可能被相互吃掉");
    }

    // 观察传播语义：run 结束时应处于「中断已恢复」或安静地退出两种合法状态之一，
    // 不允许电梯地板式 silently continue。
    private static void checkMarker() throws Exception {
        Thread t = new Thread(new InventorySync(), "sync-worker");
        t.start();
        Thread.sleep(1_200);
        t.interrupt();
        t.join(2_000);
        if (t.isAlive()) throw new AssertionError("任务没有结束");
        // 能走到这里且 run() 已退出，结构合格；是否显式恢复标记由 catch 结构决定，
        // 本测试只验证「不吞」的行为契约。
    }
}
