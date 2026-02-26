/**
 * 模块管理服务
 * 管理可选功能模块的下载、安装、卸载和更新
 *
 * 支持的模块:
 * - ocr: OCR 文字识别模块 (PaddleOCR)
 */
import { app } from "electron";
import path from "path";
import fs from "fs";
import https from "https";
import http from "http";
import net from "net";
import { spawn, ChildProcess } from "child_process";
import AdmZip from "adm-zip";

// ==================== 类型定义 ====================

export interface ModuleManifest {
  name: string;
  version: string;
  platform: string;
  size: number;
  sha256: string;
  downloadUrl: string;
  capabilities: string[];
  minAppVersion?: string;
}

export interface ModuleStatus {
  id: string;
  installed: boolean;
  version?: string;
  size?: number;
  downloadProgress?: number;
  status:
    | "not_installed"
    | "downloading"
    | "installing"
    | "installed"
    | "error";
  error?: string;
}

export interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  size: number;
  capabilities: string[];
  latestVersion: string;
  downloadUrl: string;
}

export interface DownloadProgress {
  moduleId: string;
  downloaded: number;
  total: number;
  percent: number;
}

// ==================== 模块注册表 ====================

const MODULE_REGISTRY: Record<string, ModuleInfo> = {
  ocr: {
    id: "ocr",
    name: "OCR 文字识别",
    description: "基于 PaddleOCR 的图片文字识别功能，支持中英文混合识别",
    icon: "text_fields",
    size: 150 * 1024 * 1024, // 约 150MB
    capabilities: ["chinese", "english", "mixed"],
    latestVersion: "1.0.0",
    // 使用 GitHub API 动态获取最新 release
    downloadUrl: "https://api.github.com/repos/lixiaoblack/personal-workstation/releases/latest",
  },
};

// ==================== 模块管理器 ====================

class ModuleManager {
  private modulesDir: string;
  private downloadingModules: Map<string, AbortController> = new Map();
  private ocrProcess: ChildProcess | null = null;
  private ocrPort: number = 8767;

  constructor() {
    // 模块存储目录
    this.modulesDir = path.join(app.getPath("userData"), "modules");
    this.ensureModulesDir();
  }

  /**
   * 确保模块目录存在
   */
  private ensureModulesDir(): void {
    if (!fs.existsSync(this.modulesDir)) {
      fs.mkdirSync(this.modulesDir, { recursive: true });
    }
  }

  /**
   * 获取模块安装路径
   */
  private getModulePath(moduleId: string): string {
    return path.join(this.modulesDir, moduleId);
  }

  /**
   * 获取模块版本路径
   */
  private getModuleVersionPath(moduleId: string, version: string): string {
    return path.join(this.modulesDir, moduleId, version);
  }

  /**
   * 获取平台标识
   */
  private getPlatform(): string {
    const platform = process.platform;
    const arch = process.arch;
    if (platform === "win32") {
      return arch === "arm64" ? "win-arm64" : "win-x64";
    } else if (platform === "darwin") {
      return arch === "arm64" ? "mac-arm64" : "mac-x64";
    }
    return "linux-x64";
  }

  /**
   * 获取模块可执行文件名
   */
  private getModuleExecutable(moduleId: string): string {
    const platform = process.platform;
    if (moduleId === "ocr") {
      return platform === "win32" ? "ocr-module.exe" : "ocr-module";
    }
    return platform === "win32" ? `${moduleId}.exe` : moduleId;
  }

  // ==================== 公共 API ====================

  /**
   * 获取所有可用模块信息
   */
  getAvailableModules(): ModuleInfo[] {
    return Object.values(MODULE_REGISTRY);
  }

  /**
   * 获取模块状态
   */
  getModuleStatus(moduleId: string): ModuleStatus {
    const info = MODULE_REGISTRY[moduleId];
    if (!info) {
      return {
        id: moduleId,
        installed: false,
        status: "error",
        error: "模块不存在",
      };
    }

    const modulePath = this.getModulePath(moduleId);

    // 检查是否正在下载
    if (this.downloadingModules.has(moduleId)) {
      return {
        id: moduleId,
        installed: false,
        status: "downloading",
      };
    }

    // 检查是否已安装
    if (fs.existsSync(modulePath)) {
      // 读取已安装版本
      const versions = fs.readdirSync(modulePath).filter((v) => {
        const vPath = path.join(modulePath, v);
        return fs.statSync(vPath).isDirectory();
      });

      if (versions.length > 0) {
        // 获取最新版本
        const latestVersion = versions.sort().pop()!;
        const versionPath = this.getModuleVersionPath(moduleId, latestVersion);
        const manifestPath = path.join(versionPath, "manifest.json");

        let version = latestVersion;
        let size = info.size;

        if (fs.existsSync(manifestPath)) {
          try {
            const manifest: ModuleManifest = JSON.parse(
              fs.readFileSync(manifestPath, "utf-8")
            );
            version = manifest.version;
            size = manifest.size;
          } catch (e) {
            console.error(`[ModuleManager] 读取 manifest 失败:`, e);
          }
        }

        return {
          id: moduleId,
          installed: true,
          version,
          size,
          status: "installed",
        };
      }
    }

    return {
      id: moduleId,
      installed: false,
      status: "not_installed",
    };
  }

  /**
   * 下载模块
   */
  async downloadModule(
    moduleId: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    const info = MODULE_REGISTRY[moduleId];
    if (!info) {
      return { success: false, error: "模块不存在" };
    }

    // 检查是否正在下载
    if (this.downloadingModules.has(moduleId)) {
      return { success: false, error: "模块正在下载中" };
    }

    const platform = this.getPlatform();
    const fileName = `${moduleId}-module-v${info.latestVersion}-${platform}.zip`;
    const downloadPath = path.join(this.modulesDir, "downloads", fileName);

    // 确保下载目录存在
    const downloadDir = path.dirname(downloadPath);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    console.log(`[ModuleManager] 开始下载模块: ${moduleId}`);

    // 创建 AbortController 用于取消下载
    const abortController = new AbortController();
    this.downloadingModules.set(moduleId, abortController);

    try {
      // 获取最新 release 信息
      const releaseInfo = await this.getLatestReleaseInfo();
      if (!releaseInfo) {
        return { success: false, error: "无法获取版本信息，请检查网络连接" };
      }

      // 查找对应平台的资源
      const asset = releaseInfo.assets.find(
        (a: { name: string; browser_download_url: string }) =>
          a.name === fileName || a.name.includes(`${moduleId}-module`) && a.name.includes(platform)
      );

      if (!asset) {
        console.error(`[ModuleManager] 未找到资源: ${fileName}`);
        console.error(`[ModuleManager] 可用资源:`, releaseInfo.assets.map((a: { name: string }) => a.name));
        return { success: false, error: `未找到 ${platform} 平台的模块资源` };
      }

      const downloadUrl = asset.browser_download_url;
      console.log(`[ModuleManager] 下载地址: ${downloadUrl}`);

      await this.downloadFile(downloadUrl, downloadPath, info.size, onProgress);

      console.log(`[ModuleManager] 下载完成: ${downloadPath}`);

      // 安装模块
      const installResult = await this.installModule(moduleId, downloadPath);

      // 清理下载文件
      if (fs.existsSync(downloadPath)) {
        fs.unlinkSync(downloadPath);
      }

      return installResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[ModuleManager] 下载失败:`, errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.downloadingModules.delete(moduleId);
    }
  }

  /**
   * 获取最新 Release 信息
   */
  private async getLatestReleaseInfo(): Promise<{
    tag_name: string;
    assets: Array<{ name: string; browser_download_url: string }>;
  } | null> {
    return new Promise((resolve) => {
      const url = "https://api.github.com/repos/lixiaoblack/personal-workstation/releases/latest";

      https
        .get(
          url,
          {
            headers: {
              "User-Agent": "PersonalWorkstation/1.0",
              Accept: "application/vnd.github.v3+json",
            },
          },
          (response) => {
            let data = "";
            response.on("data", (chunk) => {
              data += chunk;
            });
            response.on("end", () => {
              try {
                const release = JSON.parse(data);
                resolve(release);
              } catch {
                console.error("[ModuleManager] 解析 Release 信息失败");
                resolve(null);
              }
            });
          }
        )
        .on("error", (err) => {
          console.error("[ModuleManager] 获取 Release 信息失败:", err.message);
          resolve(null);
        });
    });
  }

  /**
   * 下载文件
   */
  private downloadFile(
    url: string,
    destPath: string,
    expectedSize: number,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith("https") ? https : http;

      const file = fs.createWriteStream(destPath);
      let downloaded = 0;

      const request = protocol.get(
        url,
        {
          headers: {
            "User-Agent": "PersonalWorkstation/1.0",
          },
        },
        (response) => {
          // 处理重定向
          if (response.statusCode === 301 || response.statusCode === 302) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              file.close();
              fs.unlinkSync(destPath);
              this.downloadFile(redirectUrl, destPath, expectedSize, onProgress)
                .then(resolve)
                .catch(reject);
              return;
            }
          }

          if (response.statusCode !== 200) {
            file.close();
            fs.unlinkSync(destPath);
            reject(new Error(`下载失败: HTTP ${response.statusCode}`));
            return;
          }

          const totalSize =
            parseInt(response.headers["content-length"] || "0", 10) ||
            expectedSize;

          response.on("data", (chunk: Buffer) => {
            downloaded += chunk.length;
            onProgress?.({
              moduleId: "ocr",
              downloaded,
              total: totalSize,
              percent: Math.round((downloaded / totalSize) * 100),
            });
          });

          response.pipe(file);

          file.on("finish", () => {
            file.close();
            resolve();
          });
        }
      );

      request.on("error", (err) => {
        file.close();
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
        reject(err);
      });

      request.end();
    });
  }

  /**
   * 安装模块
   */
  async installModule(
    moduleId: string,
    packagePath: string
  ): Promise<{ success: boolean; error?: string }> {
    const info = MODULE_REGISTRY[moduleId];
    if (!info) {
      return { success: false, error: "模块不存在" };
    }

    console.log(`[ModuleManager] 开始安装模块: ${moduleId}`);

    try {
      const versionPath = this.getModuleVersionPath(
        moduleId,
        info.latestVersion
      );

      // 确保目标目录存在
      if (!fs.existsSync(versionPath)) {
        fs.mkdirSync(versionPath, { recursive: true });
      }

      // 解压 ZIP 文件
      const zip = new AdmZip(packagePath);
      zip.extractAllTo(versionPath, true);

      // 创建 manifest.json
      const manifest: ModuleManifest = {
        name: moduleId,
        version: info.latestVersion,
        platform: this.getPlatform(),
        size: info.size,
        sha256: "", // TODO: 计算实际 SHA256
        downloadUrl: info.downloadUrl,
        capabilities: info.capabilities,
      };

      fs.writeFileSync(
        path.join(versionPath, "manifest.json"),
        JSON.stringify(manifest, null, 2)
      );

      // 设置可执行权限 (macOS/Linux)
      if (process.platform !== "win32") {
        const exePath = path.join(
          versionPath,
          this.getModuleExecutable(moduleId)
        );
        if (fs.existsSync(exePath)) {
          fs.chmodSync(exePath, 0o755);
        }
      }

      console.log(`[ModuleManager] 安装完成: ${versionPath}`);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[ModuleManager] 安装失败:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 卸载模块
   */
  async uninstallModule(
    moduleId: string
  ): Promise<{ success: boolean; error?: string }> {
    const modulePath = this.getModulePath(moduleId);

    if (!fs.existsSync(modulePath)) {
      return { success: true };
    }

    // 停止正在运行的模块进程
    if (moduleId === "ocr" && this.ocrProcess) {
      this.stopOcrModule();
    }

    try {
      // 递归删除目录
      fs.rmSync(modulePath, { recursive: true, force: true });
      console.log(`[ModuleManager] 模块已卸载: ${moduleId}`);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[ModuleManager] 卸载失败:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 取消下载
   */
  cancelDownload(moduleId: string): boolean {
    const controller = this.downloadingModules.get(moduleId);
    if (controller) {
      controller.abort();
      this.downloadingModules.delete(moduleId);
      return true;
    }
    return false;
  }

  // ==================== OCR 模块特定方法 ====================

  /**
   * 启动 OCR 模块
   */
  async startOcrModule(): Promise<{
    success: boolean;
    port?: number;
    error?: string;
  }> {
    const status = this.getModuleStatus("ocr");
    if (!status.installed) {
      return { success: false, error: "OCR 模块未安装" };
    }

    if (this.ocrProcess) {
      return { success: true, port: this.ocrPort };
    }

    const versionPath = this.getModuleVersionPath(
      "ocr",
      status.version || "1.0.0"
    );
    const exePath = path.join(versionPath, this.getModuleExecutable("ocr"));

    if (!fs.existsSync(exePath)) {
      return { success: false, error: "OCR 模块可执行文件不存在" };
    }

    try {
      // 查找可用端口
      this.ocrPort = await this.findAvailablePort(8767);

      console.log(`[ModuleManager] 启动 OCR 模块，端口: ${this.ocrPort}`);

      this.ocrProcess = spawn(exePath, ["--port", String(this.ocrPort)], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.ocrProcess.stdout?.on("data", (data: Buffer) => {
        console.log(`[OCR Module] ${data.toString().trim()}`);
      });

      this.ocrProcess.stderr?.on("data", (data: Buffer) => {
        console.error(`[OCR Module Error] ${data.toString().trim()}`);
      });

      this.ocrProcess.on("close", (code) => {
        console.log(`[OCR Module] 进程退出，退出码: ${code}`);
        this.ocrProcess = null;
      });

      // 等待服务启动
      await this.waitForOcrReady();

      return { success: true, port: this.ocrPort };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[ModuleManager] 启动 OCR 模块失败:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 停止 OCR 模块
   */
  stopOcrModule(): void {
    if (this.ocrProcess) {
      this.ocrProcess.kill("SIGTERM");
      this.ocrProcess = null;
      console.log(`[ModuleManager] OCR 模块已停止`);
    }
  }

  /**
   * 获取 OCR 模块端口
   */
  getOcrPort(): number | null {
    return this.ocrProcess ? this.ocrPort : null;
  }

  /**
   * 检查 OCR 模块是否运行中
   */
  isOcrRunning(): boolean {
    return this.ocrProcess !== null;
  }

  /**
   * 查找可用端口
   */
  private findAvailablePort(startPort: number): Promise<number> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.listen(startPort, () => {
        const address = server.address();
        const port =
          typeof address === "object" && address ? address.port : startPort;
        server.close(() => resolve(port));
      });

      server.on("error", () => {
        // 端口被占用，尝试下一个
        resolve(this.findAvailablePort(startPort + 1));
      });
    });
  }

  /**
   * 等待 OCR 服务就绪
   */
  private waitForOcrReady(maxWaitMs: number = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        if (Date.now() - startTime > maxWaitMs) {
          reject(new Error("OCR 服务启动超时"));
          return;
        }

        const req = http.get(
          `http://127.0.0.1:${this.ocrPort}/health`,
          (res) => {
            if (res.statusCode === 200) {
              resolve();
            } else {
              setTimeout(check, 500);
            }
          }
        );

        req.on("error", () => {
          setTimeout(check, 500);
        });

        req.end();
      };

      // 延迟 1 秒后开始检查
      setTimeout(check, 1000);
    });
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 停止所有模块进程
    this.stopOcrModule();

    // 取消所有下载
    Array.from(this.downloadingModules.entries()).forEach(([, controller]) => {
      controller.abort();
    });
    this.downloadingModules.clear();
  }
}

// 导出单例
export const moduleManager = new ModuleManager();
