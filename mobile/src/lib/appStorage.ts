import { Platform } from "react-native";

const memory = new Map<string, string>();

type AsyncStorageModule = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function getNativeAsyncStorage(): AsyncStorageModule {
  // Carregar só em nativo — na web o pacote pode acionar "Native module is null"
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@react-native-async-storage/async-storage").default as AsyncStorageModule;
}

function webGet(key: string): string | null {
  try {
    if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
      return globalThis.localStorage.getItem(key);
    }
  } catch {
    /* ignore */
  }
  return memory.get(key) ?? null;
}

function webSet(key: string, value: string): void {
  try {
    if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
      globalThis.localStorage.setItem(key, value);
      return;
    }
  } catch {
    /* ignore */
  }
  memory.set(key, value);
}

function webRemove(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    /* ignore */
  }
  memory.delete(key);
}

/**
 * Preferir isto a AsyncStorage direto: na web usa localStorage; no nativo usa AsyncStorage
 * com fallback em memória se o módulo falhar (Expo Go / bridge).
 */
export const appStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return webGet(key);
    }
    try {
      return await getNativeAsyncStorage().getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      webSet(key, value);
      return;
    }
    try {
      await getNativeAsyncStorage().setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      webRemove(key);
      return;
    }
    try {
      await getNativeAsyncStorage().removeItem(key);
    } catch {
      memory.delete(key);
    }
  },
};
