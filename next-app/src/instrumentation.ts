export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initSchema } = await import("./lib/db");
    try {
      await initSchema();
      console.log("[DB] Schema initialized successfully");
    } catch (err) {
      console.error("[DB] Failed to initialize schema:", err);
    }
  }
}