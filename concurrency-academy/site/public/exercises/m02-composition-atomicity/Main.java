import java.util.HashMap;
import java.util.Map;

// 8 个线程对同一个键计数，每个 5000 次，最终应得 40000
public class Main {
    public static void main(String[] args) throws Exception {
        Map<String, Integer> counter = new HashMap<>();
        Thread[] ts = new Thread[8];
        for (int i = 0; i < 8; i++) {
            ts[i] = new Thread(() -> {
                for (int j = 0; j < 5000; j++) {
                    // TODO：这行是把“先查再加”分成了两步，会让你意识到这里发生的是不可靠的复合操作
                    Integer old = counter.get("house");
                    counter.put("house", (old == null ? 0 : old) + 1);
                }
            }, "t" + i);
        }
        for (Thread t : ts) t.start();
        for (Thread t : ts) t.join();
        System.out.println("house=" + counter.get("house"));
    }
}
