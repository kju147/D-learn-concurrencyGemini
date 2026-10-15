// 一个共享的售票窗口。20 个线程同时抢 100 张票。
// 不改全局结构，在这个地方修，注意窗口卖票的身份与名字。
public class Main {
    public static void main(String[] args) throws Exception {
        TicketWindow w = new TicketWindow(10000);
        Thread[] ts = new Thread[8];
        for (int i = 0; i < 8; i++) {
            ts[i] = new Thread(() -> w.sell(), "窗口-" + i);
        }
        for (Thread t : ts) t.start();
        for (Thread t : ts) t.join();
        System.out.println("总售出: " + w.sold() + " 剩余: " + w.remaining());
    }
}

class TicketWindow {
    private final int total;
    private int tickets;

    TicketWindow(int count) {
        this.total = count;
        this.tickets = count;
    }

    // 已售出多少张
    int sold() {
        return total - tickets;
    }

    // 剩余库存
    int remaining() {
        return tickets;
    }

    // 每条线程反复买，直到没票为止
    void sell() {
        while (true) {
            // TODO：目前这里「查票 + 减一」是两步，中间会被插队超卖；修好它
            if (tickets <= 0) return;   // 卖完了，线程离场
            tickets--;
        }
    }
}
