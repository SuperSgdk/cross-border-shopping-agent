import { useEffect, useState, useSyncExternalStore } from "react";
import { CommerceClient } from "../lib/commerceClient";

export function useCommerceAgent() {
  const [client] = useState(() => {
    let storage: Storage | undefined;
    try {
      storage = window.localStorage;
    } catch {
      /* 存储受限时使用内存。 */
    }
    const base = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
    let accessToken = import.meta.env.VITE_API_TOKEN;
    try { accessToken ||= storage?.getItem("globex.access-token"); } catch { /* 可使用构建配置。 */ }
    return new CommerceClient({ url: `${base}/commerce/ag-ui/run`, storage,
      buyerId: import.meta.env.VITE_BUYER_ID || "SuperSgdk", accessToken });
  });
  const snapshot = useSyncExternalStore(client.subscribe, client.getSnapshot);
  useEffect(() => { void client.initialize(); return () => client.detach(); }, [client]);
  useEffect(() => {
    void client.refreshConfirmations();
    void client.refreshSkills();
  }, [client, snapshot.sessionId]);
  return {
    ...snapshot,
    submit: client.submit,
    submitForm: client.submitForm,
    resolveToolApproval: client.resolveToolApproval,
    stop: client.stop,
    reset: client.reset,
    setSession: client.setSession,
    prepareOrder: client.prepareOrder,
    prepareCancel: client.prepareCancel,
    resolveConfirmation: client.resolveConfirmation,
    refreshConfirmations: client.refreshConfirmations,
    refreshSkills: client.refreshSkills,
    workspaceRequest: client.workspaceRequest,
    resume: client.resume,
  };
}
