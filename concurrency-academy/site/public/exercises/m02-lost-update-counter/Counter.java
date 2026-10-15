public class Counter {
    private int count = 0;

    // TODO：目前 increment 里 count++ 不是原子的。
    // 在动画里你已经看到它怎么丢更新——用 synchronized 修掉它。
    public void increment() {
        count++;
    }

    public int get() {
        return count;
    }
}
