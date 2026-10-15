public class Main {
    public static void main(String[] args) throws Exception {
        TicketWindow w = new TicketWindow(10000);
        Thread[] ts = new Thread[8];
        for (int i = 0; i < 8; i++) ts[i] = new Thread(() -> w.sell(), "窗口-" + i);
        for (Thread t : ts) t.start();
        for (Thread t : ts) t.join();
        System.out.println("总售出: " + w.sold() + " 剩余: " + w.remaining());
    }
}
class TicketWindow {
    private final int total; private int tickets;
    TicketWindow(int count) { this.total = count; this.tickets = count; }
    int sold() { return total - tickets; }
    int remaining() { return tickets; }
    void sell() {
        while (true) {
            synchronized (this) {
                if (tickets <= 0) return;
                tickets--;
            }
        }
    }
}