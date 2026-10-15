import java.io.ByteArrayOutputStream;
import java.io.PrintStream;

public class Tests {
    public static void main(String[] args) throws Exception {
        PrintStream original = System.out;
        ByteArrayOutputStream cap = new ByteArrayOutputStream();
        System.setOut(new PrintStream(cap));
        try {
            Main.main(new String[0]);
        } finally {
            System.setOut(original);
        }
        String out = cap.toString();

        int pass = 0;
        if (out.contains("烧水中")) { pass++; System.out.println("PASS 烧水任务落了"); }
        else System.out.println("FAIL 烧水的打印不在输出里");

        if (out.contains("洗茶具中")) { pass++; System.out.println("PASS 洗茶具任务落了"); }
        else System.out.println("FAIL 洗茶具的打印不在输出里");

        if (out.contains("茶好了")) { pass++; System.out.println("PASS 主线程汇合输出了"); }
        else System.out.println("FAIL 没汇合到最终输出");

        // 顺序性：茶好了必须排在烧水和洗茶具之后
        int iWater = out.indexOf("烧水中");
        int iTea = out.indexOf("洗茶具中");
        int iDone = out.indexOf("茶好了");
        if (iDone > iWater && iDone > iTea && iWater >= 0 && iTea >= 0) {
            pass++;
            System.out.println("PASS 顺序正确：汇合在最后");
        } else {
            System.out.println("FAIL 顺序不对：主线程睡晚了，在 join 后等它们");
        }

        System.out.println("SUMMARY " + pass + "/4");
    }
}
