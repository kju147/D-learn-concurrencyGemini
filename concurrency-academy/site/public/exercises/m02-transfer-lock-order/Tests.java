public class Tests {
    public static void main(String[] args) throws Exception {
        // 在另一线程里跑学员程序，这样我们能在教员线程里观察它是否死锁
        Thread underTest = new Thread(() -> {
            try { Main.main(new String[0]); }
            catch (Throwable t) { throw new RuntimeException(t); }
        }, "test-runner");

        underTest.start();

        // 给它 20 秒。二十里还走不完一段转账，就只能误以为你死盘了
        underTest.join(20000);

        int pass = 0;
        if (!underTest.isAlive()) {
            pass++;
            System.out.println("PASS 转账在时限内收尾了（没出死锁卡住）");
        } else {
            System.out.println("FAIL 20 秒还走不完——多半是你把锁顺序拧反了");
        }
        System.out.println("SUMMARY " + pass + "/1");
    }
}
