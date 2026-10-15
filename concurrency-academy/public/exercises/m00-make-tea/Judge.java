import java.util.List;

/**
 * 浏览器 JVM 判题：烧水泡茶统筹法。
 * 判定点是行为而不是代码长什么样：
 *   1) 两个任务都要执行
 *   2) 让它们跑的两个线程要命名（烧水的/洗茶的）
 *   3) 泡茶必须在两个前置任务之后（主线程要先 join)
 * 打印协议：PASS <name> / FAIL <name>: <原因> / SUMMARY a/b
 */
public final class Judge {
    private static final String[] CASES = {"both-ran", "named-threads", "tea-last"};

    public static void main(String[] args) throws Exception {
        int failures = 0;
        for (String name : CASES) {
            String detail = null;
            try {
                switch (name) {
                    case "both-ran": checkBothRan(); break;
                    case "named-threads": checkThreadNames(); break;
                    case "tea-last": checkTeaLast(); break;
                    default: throw new AssertionError("unknown");
                }
            } catch (Throwable e) {
                detail = String.valueOf(e);
            }
            if (detail == null) System.out.println("PASS " + name);
            else { failures++; System.out.println("FAIL " + name + ": " + detail); }
            System.out.flush();
        }
        System.out.println("SUMMARY " + (CASES.length - failures) + "/" + CASES.length);
        System.out.flush();
    }

    private static void require(boolean ok, String msg) {
        if (!ok) throw new AssertionError(msg);
    }

    private static void checkBothRan() throws Exception {
        BrewTea.events.clear();
        BrewTea.main(new String[0]);
        require(BrewTea.events.stream().anyMatch(e -> e.endsWith("水开了")), "缺失了 \"水开了\"");
        require(BrewTea.events.stream().anyMatch(e -> e.endsWith("茶具洗好了")), "缺失了 \"茶具洗好了\"");
    }

    private static void checkThreadNames() throws Exception {
        BrewTea.events.clear();
        BrewTea.main(new String[0]);
        boolean boiler = BrewTea.events.stream().anyMatch(e -> e.startsWith("烧水的:"));
        boolean washer = BrewTea.events.stream().anyMatch(e -> e.startsWith("洗茶的:"));
        require(boiler, "烧水的任务不是在名为「烧水的」线程中跑完的");
        require(washer, "洗茶具的任务不是在名为「洗茶的」线程中跑完的");
    }

    private static void checkTeaLast() throws Exception {
        BrewTea.events.clear();
        BrewTea.main(new String[0]);
        List<String> evts = BrewTea.events;
        int idxTea = evts.indexOf("main:泡茶");
        int lastPre = Math.max(
            lastIndexOf(evts, "水开了"),
            lastIndexOf(evts, "茶具洗好了")
        );
        require(idxTea == evts.size() - 1, "泡茶必须最后出现，即主线程先 join 完两个工作线程再说");
        require(lastPre >= 0 && lastPre < idxTea, "泡茶早了——前置的活还没完成");
    }

    private static int lastIndexOf(List<String> evts, String needle) {
        for (int i = evts.size() - 1; i >= 0; i--) {
            if (evts.get(i).endsWith(needle)) return i;
        }
        return -1;
    }
}
