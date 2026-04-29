/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * 公司 inf-fingerprint 服务的限流豁免 key。
   * 通过 GitHub Secrets → Docker build-arg → Vite define 注入；本地开发
   * 在 frontend/.env.local 里填（gitignored）。
   * 没注入时为空字符串，identify() 调用相当于不带 apiKey。
   */
  readonly VITE_INF_FP_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
