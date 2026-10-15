public class OrderImport {
    private static int validOrders;

    // 只补全这个方法：启动工作线程，并等待它结束。
    public static void validateAndAwait(Runnable validate) throws InterruptedException {
        // TODO 1：创建并启动名为 order-validator 的平台线程

        // TODO 2：等待校验线程执行完成；不要吞掉 InterruptedException
    }

    public static void main(String[] args) throws InterruptedException {
        validateAndAwait(() -> validOrders = 42);
        System.out.println("validOrders=" + validOrders);
    }
}
