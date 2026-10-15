// 课程地图：14 模块元数据（课的顺序与归属由 content/lessons 的 frontmatter 决定）
export type ModuleMeta = {
  id: string; index: string; title: string; subtitle: string; gate: string;
};

export const modules: ModuleMeta[] = [
  { id: 'm00', index: 'M00', title: '入学诊断与预备知识', subtitle: '先校准，再上路', gate: '完成诊断并拿到自己的路线' },
  { id: 'm01', index: 'M01', title: '线程与任务', subtitle: '先会观察，再会创建', gate: '能写出可停止、可观察、命名良好的线程' },
  { id: 'm02', index: 'M02', title: '共享状态与互斥', subtitle: '先建立安全底线', gate: '能识别临界区并用不变量论证正确性' },
  { id: 'm03', index: 'M03', title: '线程协作与活性', subtitle: 'wait/notify、死锁与活锁', gate: '能用 while+wait 范式协作并定位死锁链' },
  { id: 'm04', index: 'M04', title: 'Java 内存模型', subtitle: '从"能跑"到"能证明"', gate: '能用 happens-before 规则给出证明而非感觉' },
  { id: 'm05', index: 'M05', title: 'Monitor、显式锁与 AQS', subtitle: '锁的里子', gate: '能画出 AQS 等待队列并解释唤醒传播' },
  { id: 'm06', index: 'M06', title: 'CAS、原子类与无锁思维', subtitle: '乐观并发的边界', gate: '能说清 CAS 适用边界与 ABA 对策' },
  { id: 'm07', index: 'M07', title: '线程池、调度与并行计算', subtitle: '从队列到容量承诺', gate: '能为业务推导池容量并解释拒绝策略' },
  { id: 'm08', index: 'M08', title: '同步器、队列与并发容器', subtitle: '正确选型', gate: '能为场景选出对的队列与容器并说明代价' },
  { id: 'm09', index: 'M09', title: 'CompletableFuture 与异步图', subtitle: '编排、超时、取消', gate: '能组合异步图且不污染执行器' },
  { id: 'm10', index: 'M10', title: 'JDK 21 现代并发', subtitle: '虚拟线程与结构化并发', gate: '能把阻塞服务迁移到虚拟线程并诊断 pinning' },
  { id: 'm11', index: 'M11', title: '测试、性能与生产诊断', subtitle: 'JCStress/JMH/JFR', gate: '能用证据（而非跑很多次）证明正确性' },
  { id: 'm12', index: 'M12', title: 'Spring 与真实业务架构', subtitle: '资源联动与弹性', gate: '能设计限流/舱壁/超时/重试的组合策略' },
  { id: 'm13', index: 'M13', title: '集大成项目：FlashFlow', subtitle: '十阶段订单履约系统', gate: '交付正确性与性能双验收报告' },
];

export function getModule(id: string) {
  return modules.find((m) => m.id === id);
}
