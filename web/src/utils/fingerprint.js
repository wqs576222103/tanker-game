const ANONYMOUS_NAME_PREFIX = "匿名玩家";

let cachedFingerprint = "";

/**
 * 生成浏览器指纹
 * @returns {string} 基于浏览器特征生成的唯一标识
 */
export function generateFingerprint() {
  if (cachedFingerprint) return cachedFingerprint;

  const components = [];

  // User Agent
  components.push(navigator.userAgent);

  // 语言
  components.push(navigator.language);

  // 屏幕信息
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

  // 时区
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // 平台
  components.push(navigator.platform);

  // 硬件并发数
  components.push(navigator.hardwareConcurrency || "");

  // 设备内存
  components.push(navigator.deviceMemory || "");

  // 已安装的插件
  if (navigator.plugins) {
    const pluginNames = Array.from(navigator.plugins)
      .map((p) => p.name)
      .join(",");
    components.push(pluginNames);
  }

  // Canvas 指纹
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("browser fingerprint", 2, 2);
    const dataURL = canvas.toDataURL();
    // 只取 hash 的一部分，避免过长
    components.push(dataURL.slice(-100));
  } catch (e) {
    components.push("canvas_unsupported");
  }

  // WebGL 指纹
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
      }
    }
  } catch (e) {
    components.push("webgl_unsupported");
  }

  // 生成 hash
  const rawString = components.join("###");
  cachedFingerprint = simpleHash(rawString);
  return cachedFingerprint;
}

/**
 * 获取匿名身份（无 token 且无 employeeId 时使用）
 * 玩家名称与工号均由浏览器指纹生成
 * @returns {{ employeeId: string, username: string, tankName: string }}
 */
export function getAnonymousIdentity() {
  const fingerprint = generateFingerprint();
  const suffix = fingerprint.replace(/^F_/, "");
  const username = ANONYMOUS_NAME_PREFIX + suffix;
  return {
    employeeId: fingerprint,
    username,
    tankName: username,
  };
}

/**
 * 简单的字符串 hash 函数
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 转换为32位整数
  }
  // 转为正数并转为16进制字符串
  const positiveHash = Math.abs(hash);
  return "F_" + positiveHash.toString(16).padStart(8, "0");
}
