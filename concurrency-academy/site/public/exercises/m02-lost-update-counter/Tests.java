public class Tests {
    // 判题规范：禁用 System.exit（会干掉 CompileServer 主循环）；成败以 SUMMARY x/y 为准
    public static void main(String[] args) throws Exception {
        int pass = 0;
        for (int round = 1; round <= 5; round++) {
            Counter c = new Counter();
            Thread t1 = new Thread(() -> { for (int i = 0; i < 5000; i++) c.increment(); }, "t1");
            Thread t2 = new Thread(() -> { for (int i = 0; i < 5000; i++) c.increment(); }, "t2");
            t1.start(); t2.start(); t1.join(); t2.join();
            int v = c.get();
            if (v == 10000) { pass++; System.out.println("PASS round-" + round); }
            else System.out.println("FAIL round-" + round + ": expected=10000, actual=" + v);
        }
        System.out.println("SUMMARY " + pass + "/5");
    }
}
