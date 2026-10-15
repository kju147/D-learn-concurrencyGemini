# Java 真实练习：当前交付与在线执行边界

## 当前可用

- 第一题升级为第 2 版：补全 `validateAndAwait(Runnable)`；旧草稿保留在原来的浏览器存储键下。
- 网站一键下载当前代码、JDK 21 行为测试、IDEA 使用说明。不需要 Maven，不上传用户代码。
- 教学测试验证线程身份、名称、平台线程、任务执行次数、完成等待、多组结果以及中断传播。
- 原来的正则检查明确标为“结构自检”，不再写入完成记录。原有浏览器数据未删除。
- `/api/java` 是待连接的服务端 HTTP 适配器。缺少配置会返回 503，前端不显示可运行按钮。
- **没有交付或部署远程执行服务；没有服务器沙箱验证；没有账户进度同步。**

测试源码在 `public/exercises/m01-start-join/StartJoinTests.java`；公开测试是教学材料，不是防作弊评测。
本机测试会执行学习者自己的 Java 代码，测试中的超时不等于安全隔离。

## 本地验证（维护者）

```text
npm run test:java-proxy
npm run test:java-fixtures
npm run build
```

运行 fixture 测试前把 JAVA_HOME 指向 JDK 21。此脚本只执行仓库里固定的正确/错误示例，
不得修改为接收网络提交、用户文件路径或任意源码。它不是网站的执行服务。

## 为什么在线运行需要另一个执行环境

网站当前运行在 Worker 环境，没有 javac/JVM。在线执行不可信代码还需要限制文件系统、
网络、CPU、内存、线程数、输出量和执行时长。不能在网站主机上直接 spawn Java。

Docker + Linux 是自建方案之一，不是学习者的前置条件。若后续自建，建议专用 Linux VM
配合 gVisor `runsc` 隔离；不要把普通 Docker 当作足以公开接收不可信代码的保证。
也可以评估托管判题服务，但必须确认 JDK 21、隐私条款、配额/费用和隔离能力后再接入。
没有预设免费服务永久可用，也没有把源码发送给任何第三方判题服务。

## 预留的服务契约（不是部署步骤）

网站的生产秘密配置：

| 配置              | 内容                                            |
| ----------------- | ----------------------------------------------- |
| JAVA_RUNNER_URL   | 执行服务 HTTPS origin，不含路径、凭证或查询参数 |
| JAVA_RUNNER_TOKEN | 至少 32 字符的独立随机共享密钥，只在服务端使用  |

不要在执行服务通过安全验收之前设置这两个配置。更换托管服务时需要实现对应适配器，
不能直接把它的 URL 填入当前契约。密钥不可放入浏览器、Git 或 hosting.json。

网站由 Sites 网关认证用户。接口拒绝无身份和非同源 POST，限制请求大小，
只转发第一题第 2 版与固定的 run/submit 模式。身份转为不透明的配额键，原始用户 ID、邮箱不转发。

执行服务应提供：

- `GET /health`，需要 Bearer 认证；仅在沙箱自检通过后返回
  `{"ready":true,"runtime":"jdk21-runsc","revision":2}`。更换隔离后端时需同步修改契约。
- `POST /execute`，需要 Bearer 认证，读取 `X-Learner-Key` 实施服务端配额，
  请求形如 `{exerciseId:"m01-start-join",revision:2,mode:"run"|"submit",code:"..."}`。
- 返回 `lib/java-execution.mjs` 的有限状态与输出契约。`run` 只编译并运行示例，
  `submit` 执行真实行为测试。不能用正则、输出 42 或客户端上传的 PASS 代替测试结果。
- 测试通过只是教学反馈，不适用于证书、防作弊或对抗性评分。

## 上线前还必须做的工作

1. 用户选定执行服务、授权源码传输范围及可接受费用；不擅自创建收费资源。
2. 固定镜像/工具链版本；独立执行环境不能有云密钥、用户数据、Docker socket 或宿主目录挂载。
3. 无网络、非 root、只读根目录、临时工作区、CPU/内存/PID/输出上限、外层强制超时和失败清理。
4. 服务端认证、每人速率/并发配额、总并发上限、队列背压；不依赖浏览器限流或 Worker 进程内计数。
5. 验证死循环、线程爆炸、内存耗尽、海量输出、目录访问、网络访问、进程残留、重启恢复。
6. 校准 gVisor/JDK 21 的线程和内存限制，避免正常编译被误杀；进行真实服务的端到端测试。
7. 经过检查后才配置站点密钥并重新部署。当前接口单元测试中的服务响应是 mock，不代表线上已经可用。

参考：[Docker 运行选项](https://docs.docker.com/reference/cli/docker/container/run/)、
[gVisor Docker Quick Start](https://gvisor.dev/docs/user_guide/quick_start/docker/)、
[JDK 21 Thread API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html)。
