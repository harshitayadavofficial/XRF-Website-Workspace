import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const SettingsContext = createContext({ settings: null, refresh: () => {} });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/settings");
      setSettings(data || {});
    } catch {
      setSettings({});
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const usePublicSettings = () => useContext(SettingsContext);
