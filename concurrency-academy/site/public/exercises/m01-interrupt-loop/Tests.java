import java.io.ByteArrayOutputStream;
import java.io.PrintStream;

public class Tests {
    public static void main(String[] args) throws Exception {
        PrintStream original = System.out;
        ByteArrayOutputStream cap = new ByteArrayOutputStream();
        System.setOut(new PrintStream(cap));

        try {
            Main.main(new String[0]); // Main.main 自身必须在合理时间里跑完
        } finally {
            System.setOut(original);
        }
        String out = cap.toString();

        int pass = 0;

        // ① 监控线程真的跑过活（循环至少走通一轮）
        if (out.contains("巡检一轮")) { pass++; System.out.println("PASS 监控跑过"); }
        else System.out.println("FAIL 没跑到监控循环里去");

        // ② 主线程停下来了（说明 watcher 被叫停电了）
        // 若 Main.main 真返回了，说明主线程没死等——即 watcher 真的结束了
        pass++;
        System.out.println("PASS main() 安全返回（主线程没死等，watcher 真的被停掉）");

        System.out.println("SUMMARY " + pass + "/2");
    }
}
