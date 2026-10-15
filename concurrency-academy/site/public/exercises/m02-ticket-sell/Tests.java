import java.io.ByteArrayOutputStream;
import java.io.PrintStream;

public class Tests {
    public static void main(String[] args) throws Exception {
        int pass = 0;
        // 判题一遍一遍重跑，多线程以前各家群另外不同的梅花上次
        for (int round = 1; round <= 5; round++) {
            PrintStream original = System.out;
            ByteArrayOutputStream cap = new ByteArrayOutputStream();
            System.setOut(new PrintStream(cap));
            try {
                Main.main(new String[0]);
            } finally {
                System.setOut(original);
            }
            String out = cap.toString();
            if (out.contains("总售出: 10000") && out.contains("剩余: 0")) {
                pass++;
                System.out.println("PASS round-" + round);
            } else {
                System.out.println("FAIL round-" + round + " 产出: " + out.trim());
            }
        }
        System.out.println("SUMMARY " + pass + "/5");
    }
}
