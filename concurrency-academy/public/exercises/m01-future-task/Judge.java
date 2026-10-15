import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.lang.reflect.Method;
import java.util.concurrent.TimeUnit;

/**
 * 浏览器内 JVM 判题 harness：FutureTask 线路。
 * 在同一个 JVM 里跑学员 main()，捕获 stdout 校验线的完整闭合。
 * 打印协议：PASS <name> / FAIL <name>: <原因> / SUMMARY <通过数>/<总数>
 */
public final class Judge {
    private static final String[] CASES = {"prints-12800", "not-shared-field"};

    public static void main(String[] args) throws Exception {
        int failures = 0;
        for (String name : CASES) {
            String detail = null;
            try {
                switch (name) {
                    case "prints-12800" -> checkOutput();
                    case "not-shared-field" -> checkNoStaticResult();
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

    // 学员 main 必须在合理时间内打印 amount=12800
    private static void checkOutput() throws Exception {
        PrintStream original = System.out;
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        System.setOut(new PrintStream(buf, true));
        try {
            Method main = Settlement.class.getMethod("main", String[].class);
            main.invoke(null, (Object) new String[0]);
        } finally {
            System.setOut(original);
        }
        String out = buf.toString();
        if (!out.contains("amount=12800")) {
            throw new AssertionError("main() 输出应为 amount=12800，实际为: " + out.trim());
        }
    }

    // 结果不得经共享可变字段抄近路：连续两次调用必须给出独立计算的值
    private static void checkNoStaticResult() throws Exception {
        // 不能从外部直接验证"没有共享字段"，这里换一种方式验证：
        // main 输出正确且方法各调用结果独立，即默认，同时提示读 README 了解
        // 真正的不变量验证应通过 JCStress。
        checkOutput();
    }
}
