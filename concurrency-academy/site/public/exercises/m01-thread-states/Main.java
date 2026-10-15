public class Main {
    public static void main(String[] args) throws Exception {
        // TODO：写一段代码，让我们亲眼看到 NEW → RUNNABLE → TIMED_WAITING → TERMINATED 四段状态。
        //
        // 你需要做的：
        // 1. 建一个目标线程对象（先别 start），打印它此刻的状态
        // 2. start() 它，目标里干一票"sleep(500)"
        // 3. 主线程趁它在睡，用 getState() 抓一手
        // 4. join() 它后再看一次
        //
        // 加分项：输出必须吃到 System.out，这关系到判题的标准
    }
}
