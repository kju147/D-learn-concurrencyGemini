public final class InventorySync implements Runnable {
    @Override
    public void run() {
        // TODO：只要没有收到中断就持续同步
        while (true) {
            try {
                syncOnce();
                Thread.sleep(1_000);
            } catch (InterruptedException e) {
                // TODO：不要吞掉中断
            }
        }
    }

    private void syncOnce() {
        // pull inventory changes
    }
}
