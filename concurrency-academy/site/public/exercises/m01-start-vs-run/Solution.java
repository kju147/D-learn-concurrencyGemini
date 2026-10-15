public class Main {
    public static void work() {
        System.out.println("[work] 我在线程：" + Thread.currentThread().getName());
    }
    public static void main(String[] args) throws Exception {
        Thread t = new Thread(() -> work(), "worker");
        t.start();
        t.join();
    }
}