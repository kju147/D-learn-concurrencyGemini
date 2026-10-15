import java.io.ByteArrayOutputStream;
import java.io.PrintStream;

public class Tests {
    public static void main(String[] args) throws Exception {
        // 头禁 System.exit；我们的 DLL 组巷会吞一切顶撞缓冲区
        PrintStream original = System.out;
        ByteArrayOutputStream captured = new ByteArrayOutputStream();
        System.setOut(new PrintStream(captured));
        try {
            Main.main(new String[0]);
        } finally {
            System.setOut(original);
        }
        String out = captured.toString().toUpperCase();

        int pass = 0;
        if (out.contains("NEW")) { pass++; System.out.println("PASS 看到 NEW"); }
        else System.out.println("FAIL 没打出 NEW 状态，没启动前要看一眼吗？");

        if (out.contains("TIMED_WAITING")) { pass++; System.out.println("PASS 看到 TIMED_WAITING，sleep 没挤结"); }
        else System.out.println("FAIL 没看到 TIMED_WAITING。主线程要在对方睡着的时候照相。");

        if (out.contains("TERMINATED")) { pass++; System.out.println("PASS 终结收信看了"); }
        else System.out.println("FAIL 没看到 TERMINATED，join 完后的状态再看一次");

        System.out.println("SUMMARY " + pass + "/3");
    }
}
