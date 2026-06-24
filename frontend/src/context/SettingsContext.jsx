import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const SettingsContext = createContext({ settings: null, dataVersion: 0, refresh: () => {} });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/settings/public");
      setSettings(data || {});
    } catch {
      setSettings({});
    }
  }, []);


  useEffect(() => {
    refresh();

    const checkVersion = async () => {
      try {
        const { data } = await api.get("/data-version");
        if (data && data.version !== undefined) {
          setDataVersion((prev) => {
            if (prev === 0) return data.version; // Initial setup
            if (data.version > prev) {
              refresh(); // Automatically refetch settings
              return data.version;
            }
            return prev;
          });
        }
      } catch {}
    };

    checkVersion();
    const interval = setInterval(checkVersion, 10000); // Background polling every 10s
    window.addEventListener("focus", checkVersion); // Instant sync on returning to browser tab

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", checkVersion);
    };
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, dataVersion, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const usePublicSettings = () => useContext(SettingsContext);
