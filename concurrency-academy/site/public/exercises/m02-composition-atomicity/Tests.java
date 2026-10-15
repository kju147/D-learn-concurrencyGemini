import java.io.ByteArrayOutputStream;
import java.io.PrintStream;

public class Tests {
    public static void main(String[] args) throws Exception {
        int pass = 0;
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
            if (out.contains("house=40000")) { pass++; System.out.println("PASS round-" + round); }
            else System.out.println("FAIL round-" + round + " 产出: " + out.trim());
        }
        System.out.println("SUMMARY " + pass + "/5");
    }
}
