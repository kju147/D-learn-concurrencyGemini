public class Main {
    public static void main(String[] args) throws Exception {
        Thread watcher = new Thread(() -> {
            try {
                while (!Thread.currentThread().isInterrupted()) {
                    System.out.println("巡检一轮");
                    Thread.sleep(1000);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "watcher");
        watcher.start();
        Thread.sleep(300);
        watcher.interrupt();
        watcher.join();
        System.out.println("巡守结束");
    }
}