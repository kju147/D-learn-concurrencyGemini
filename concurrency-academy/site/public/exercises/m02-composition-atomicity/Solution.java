import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

// 修复方案：换 ConcurrentHashMap 之后，「先查后加就变成了原子复合动作
public class Main {
    public static void main(String[] args) throws Exception {
        ConcurrentMap<String, Integer> counter = new ConcurrentHashMap<>();
        Thread[] ts = new Thread[8];
        for (int i = 0; i < 8; i++) {
            ts[i] = new Thread(() -> {
                for (int j = 0; j < 5000; j++) {
                    // merge 是一个原子操作：同一个键上的 read-modify-write 能被锁在原子壳里
                    counter.merge("house", 1, Integer::sum);
                }
            }, "t" + i);
        }
        for (Thread t : ts) t.start();
        for (Thread t : ts) t.join();
        System.out.println("house=" + counter.get("house"));
    }
}
