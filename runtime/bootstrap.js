/**
 * Hello World — AstrBot Plugin v2 模板
 *
 * 演示功能：
 *   1. 命令处理器  — /hello <名字>
 *   2. 正则匹配器  — 复读以 "echo:" 开头的消息
 *   3. LLM 钩子   — on_decorating_result 追加后缀
 *   4. LLM 钩子   — after_message_sent 补发消息
 *   5. 生命周期    — onPluginLoaded / onPluginUnloaded
 *   6. 读取配置
 */

export default async function bootstrap(hostApi) {
  // ---------- 工具函数 ----------
  const log = (msg) => hostApi.log("INFO", `[helloworld] ${msg}`);

  // ---------- 读取插件元数据 ----------
  const meta = hostApi.getPluginMetadata();
  log(`插件加载: ${meta.pluginId} v${meta.installedVersion}`);

  // ---------- 读取用户配置 ----------
  // getSettings() 返回 _conf_schema.json 中定义的键值对
  let settings = {};
  try {
    settings = hostApi.getSettings() || {};
  } catch (_) { /* 首次运行可能无已保存配置 */ }

  const greetingPrefix = settings.greeting_prefix ?? "你好";
  const enableEcho     = settings.enable_echo    ?? true;
  const echoPrefix     = settings.echo_prefix    ?? "🔊 ";
  const llmFooter      = settings.llm_footer     ?? "";
  const maxRetries     = settings.max_retries    ?? 3;

  // ============================================================
  //  1. 命令处理器 — /hello
  // ============================================================
  hostApi.registerCommandHandler({
    key: "helloworld-hello",
    command: "hello",
    aliases: ["hi", "你好"],
    groupPath: [],
    priority: 0,
    filters: [],
    metadata: {
      description: "向指定的人打招呼，用法: /hello <名字>",
    },
    handler(event) {
      // event.args     — 命令参数数组，如 /hello 世界 → ["世界"]
      // event.remainingText — 命令后面的完整文本
      const name = event.remainingText || "世界";

      // --- 方式 1: 纯文本回复 ---
      // event.replyText(`${greetingPrefix}，${name}！`);

      // --- 方式 2: 结构化回复（可带附件）---
      event.replyResult({
        text: `${greetingPrefix}，${name}！这是来自 Hello World 插件的问候 👋`,
        // attachments: [
        //   { source: "assets/welcome.png", label: "欢迎图片" },
        // ],
      });
    },
  });

  // ============================================================
  //  2. 正则匹配器 — 复读 "echo:xxx"
  // ============================================================
  if (enableEcho) {
    hostApi.registerRegexHandler({
      key: "helloworld-echo",
      pattern: "^echo[：:]\\s*(.+)",
      flags: "i",
      priority: 0,
      filters: [],
      metadata: {},
      handler(event) {
        // event.matchedText — 完整匹配文本
        // event.groups      — 捕获组数组，groups[0] 为第一个 ()
        const content = (event.groups && event.groups[0]) || event.matchedText;
        log(`复读: ${content}`);
        // 正则处理器目前没有 replyResult，通过 stopPropagation 阻止后续处理
        event.stopPropagation();
      },
    });
  }

  // ============================================================
  //  3. LLM 钩子 — 在 AI 回复末尾追加后缀
  // ============================================================
  if (llmFooter) {
    hostApi.registerLlmHook({
      hook: "on_decorating_result",
      key: "helloworld-llm-footer",
      priority: 100, // 低优先级，最后执行
      metadata: {},
      handler(payload) {
        // payload 是单个对象: { event, result }
        // result.text          — 当前回复文本
        // result.appendText()  — 追加文本
        // result.replaceText() — 替换文本
        // result.appendAttachment({ uri, mimeType? })
        // result.setShouldSend(bool)
        // result.stop()        — 阻止后续钩子
        const result = payload && payload.result;
        if (result && typeof result.appendText === "function") {
          result.appendText(`\n${llmFooter}`);
        }
      },
    });
  }

  // ============================================================
  //  4. LLM 钩子 — after_message_sent 补发消息示例
  // ============================================================
  // 取消下面的注释即可启用补发功能演示
  // hostApi.registerLlmHook({
  //   hook: "after_message_sent",
  //   key: "helloworld-followup",
  //   priority: 100,
  //   metadata: {},
  //   handler(payload) {
  //     const { event, view } = payload;
  //     // view.canSendFollowup — 是否支持补发（QQ 等外部平台为 true）
  //     // view.sendFollowup(text, attachments) — 发送补发消息
  //     if (view.canSendFollowup && typeof view.sendFollowup === "function") {
  //       const result = view.sendFollowup("这是来自 helloworld 的补发消息 📮", []);
  //       log(`补发结果: success=${result.success}`);
  //     }
  //   },
  // });

  // ============================================================
  //  5. 生命周期钩子
  // ============================================================
  hostApi.onPluginLoaded({
    key: "helloworld-loaded",
    handler() {
      log("onPluginLoaded 触发 ✓");
    },
  });

  hostApi.onPluginUnloaded({
    key: "helloworld-unloaded",
    handler() {
      log("onPluginUnloaded 触发，再见！");
    },
  });

  // ============================================================
  //  6. 消息处理器（可选示例，默认注释）
  // ============================================================
  // hostApi.registerMessageHandler({
  //   key: "helloworld-msg",
  //   priority: 0,
  //   filters: [],
  //   metadata: {},
  //   handler(event) {
  //     // event.rawText      — 原始消息文本
  //     // event.workingText  — 经过前置处理的文本
  //     // event.conversationId / event.senderId ...
  //     log(`收到消息: ${event.rawText}`);
  //   },
  // });

  log(`bootstrap 完成 ✓ (maxRetries=${maxRetries})`);
}