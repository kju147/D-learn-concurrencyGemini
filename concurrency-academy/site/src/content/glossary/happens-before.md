---
term: happens-before
concise: JMM 的可见性保证规则：若操作 A happens-before 操作 B，则 A 的结果对 B 可见，且 A 的执行顺序排在 B 之前。
firstSeenIn: m04
related:
  - volatile
  - 内存屏障
---

happens-before 是 JLS §17.4.5 定义的关系。它不是"时间上的先后"，而是"可见性与顺序的承诺"。
最常见的几条：程序次序规则、监视器解锁规则、volatile 写读规则、线程 start/join 规则、传递性。
本课程 M04 会把它从"记住六条规则"升级为"能做传递性证明"。
