public class Main {
    // 干活的函数，你不需要动它
    public static void work() {
        System.out.println("[work] 我在线程：" + Thread.currentThread().getName());
    }

    public static void main(String[] args) throws Exception {
        // TODO：起一个新线程（名字叫 "worker"），让它执行 work()，
        // 并且让主线程等它跑完再走。
        //
        // 关于是否真开了线程，判题会看输出里的线程名是否对得上。
    }
}
