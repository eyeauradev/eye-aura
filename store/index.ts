export type AppStoreStatus = "idle" | "loading" | "ready" | "error";

export type AppStore = {
  status: AppStoreStatus;
};

export const initialAppStore: AppStore = {
  status: "idle",
};
