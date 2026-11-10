/* 預覽版：本機暱稱檔。之後可換成 Google / 電子信箱登入。 */
export const Auth = {
  mode: "local", // stub: later "google" | "email"
  async signInLocal(nickname) {
    const name = String(nickname || "").trim().slice(0, 12);
    if (!name) throw new Error("請先取一個暱稱");
    return {
      id: "local-" + Date.now().toString(36),
      nickname: name,
      provider: "local",
      createdAt: Date.now()
    };
  },
  // STUB: Cloudflare Workers + Google / magic-link email
  async signInGoogle() {
    throw new Error("Google 登入尚未開放（預覽版使用本機暱稱）");
  },
  async signInEmail(_email) {
    throw new Error("電子信箱登入尚未開放");
  }
};
