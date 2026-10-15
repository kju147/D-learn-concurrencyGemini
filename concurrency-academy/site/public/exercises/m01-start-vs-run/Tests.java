import java.io.ByteArrayOutputStream;
import java.io.PrintStream;

public class Tests {
    // 判题公约：禁 System.exit；SUMMARY x/y 为准
    public static void main(String[] args) throws Exception {
        // 1) 劫持标准输出，跑学员的 main
        PrintStream original = System.out;
        ByteArrayOutputStream captured = new ByteArrayOutputStream();
        System.setOut(new PrintStream(captured));
        try {
            Main.main(new String[0]);
        } finally {
            System.setOut(original);
        }
        String out = captured.toString();

        int pass = 0;
        // 2.1 断言：work() 真正在名为 worker 的线程里跑（即用 start()，不是 run() 糯合在 main 里执行）
        if (out.contains("我在线程：worker")) { pass++; System.out.println("PASS 新线程确实叫 worker"); }
        else System.out.println("FAIL 工作的线程名:/期望 worker/，输出实际是：" + out.trim());

        // 2.2 断言：主线程在收尾后输出应全部来自 main（主线程収干 [work] 这一行）
        if (!out.contains("我在线程：main")) { pass++; System.out.println("PASS 主线程没有替别人干活"); }
        else System.out.println("FAIL 输出是运行的含义在 main 上 —— 你可能写成了 run()");

        System.out.println("SUMMARY " + pass + "/2");
    }
}
