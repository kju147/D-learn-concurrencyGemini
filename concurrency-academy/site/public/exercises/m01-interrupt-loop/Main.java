public class Main {
    public static void main(String[] args) throws Exception {
        // TODO：写一个监控线程 watcher：
        //   while (不持中断) {
        //       干一件事（比如 System.out.println("巡检一轮")）
        //       睡 1000 毫秒
        //   }
        //
        // 主线程这边：300 毫秒后调 watcher.interrupt()；
        // 若能顺利在 catcher 里看到一轮被打断、线程安全退出，则判题过。
        //
        // 判题会判断两件事：1. interrupted 循环是否真的退出来了  2. 最终状态里 TERMINATED 可见
    }
}
