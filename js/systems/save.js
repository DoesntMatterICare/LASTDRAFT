// SaveSystem: progress + settings in localStorage.
(function () {
  const LD = window.LD;
  const KEY = "livingdraft.ch1.save";
  const SKEY = "livingdraft.settings";

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  LD.Save = {
    exists: () => !!store.get(KEY),
    save(state) { return store.set(KEY, JSON.stringify(state)); },
    load() {
      const raw = store.get(KEY);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    },
    clear: () => store.del(KEY),

    defaultSettings: () => ({
      master: 0.8, music: 0.65, sfx: 0.8, shake: 1, highContrast: false,
      damageAssist: false, reduceFlash: false, binds: null,
    }),
    loadSettings() {
      const s = LD.Save.defaultSettings();
      try { Object.assign(s, JSON.parse(store.get(SKEY) || "{}")); } catch (e) {}
      return s;
    },
    saveSettings: (s) => store.set(SKEY, JSON.stringify(s)),
  };
})();
