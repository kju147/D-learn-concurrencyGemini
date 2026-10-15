public class Main {
    public static void main(String[] args) throws Exception {
        Thread t1 = new Thread(() -> { try { Thread.sleep(500); System.out.println("烧水中"); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } });
        Thread t2 = new Thread(() -> { try { Thread.sleep(300); System.out.println("洗茶具中"); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } });
        t1.start(); t2.start();
        t1.join(); t2.join();
        System.out.println("茶好了");
    }
}