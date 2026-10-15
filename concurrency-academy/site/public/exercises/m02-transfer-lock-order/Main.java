// 银行账户转账：两个方向同时互转
public class Main {
    public static void main(String[] args) throws Exception {
        Account a = new Account("A", 5000);
        Account b = new Account("B", 5000);

        Thread t1 = new Thread(() -> {
            for (int i = 0; i < 1000; i++) a.transferTo(b, 1);
        }, "tAtoB");
        Thread t2 = new Thread(() -> {
            for (int i = 0; i < 1000; i++) b.transferTo(a, 1);
        }, "tBtoA");

        t1.start(); t2.start(); t1.join(); t2.join();
        System.out.println("转账完成");
    }
}

class Account {
    final String name;
    int balance;

    Account(String name, int balance) { this.name = name; this.balance = balance; }

    /** 把钱从 this 转给 target。
     * TODO：现状是先把自己的锁拿到、再去抢对方的锁。
     * 两个方向同时跑就会死锁——请用『统一加锁顺序』的方式修好它。
     * 【提示】账户有 name，两个线程先拿名字按字典序小的一方。
     */
    synchronized void transferTo(Account target, int amount) {
        // 拿到自己的锁后故意小睡一拍——这正是真实世界里"死锁总会找上门"的放大器
        try { Thread.sleep(2); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        synchronized (target) {
            if (balance >= amount) {
                balance -= amount;
                target.balance += amount;
            }
        }
    }
}
