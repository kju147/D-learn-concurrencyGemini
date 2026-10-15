public class BrewTea {
    // 任务的共同抶件，以「谁:做了什么」的形式记录
    public static final java.util.List<String> events = new java.util.concurrent.CopyOnWriteArrayList<>();

    public static void main(String[] args) throws InterruptedException {
        Runnable boilWater = () -> {
            sleepSeconds(3);
            events.add(Thread.currentThread().getName() + ":水开了");
        };
        Runnable washSet = () -> {
            sleepSeconds(2);
            events.add(Thread.currentThread().getName() + ":茶具洗好了");
        };

        // TODO 1: 并行做两件事：洗茶的叫 "洗茶的"，烧水的叫 "烧水的"
        // （提示：Thread.ofPlatform().name(...).start(...) 会返回已经启动的线程）

        // TODO 2: 与上一段相反——别忘了让主线等两个都干完

        events.add("main:泡茶");
    }

    private static void sleepSeconds(int seconds) {
        try { Thread.sleep(seconds * 1000L); } catch (InterruptedException e) { return; }
    }
}
