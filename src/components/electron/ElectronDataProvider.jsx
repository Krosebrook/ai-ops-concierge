import { createContext, useContext, useCallback } from 'react';
import { useElectron } from '@/hooks/useElectron';

const ElectronDataContext = createContext(null);

export const ElectronDataProvider = ({ children }) => {
  const { isElectron, api } = useElectron();

  // Override base44 SDK calls when in Electron
  const getLocalData = useCallback(async (entityType, query) => {
    if (!isElectron || !api) return null;
    return api.getLocalData(entityType, query);
  }, [isElectron, api]);

  const createData = useCallback(async (entityType, data) => {
    if (!isElectron || !api) return null;
    return api.createData(entityType, data);
  }, [isElectron, api]);

  const updateData = useCallback(async (entityType, id, data) => {
    if (!isElectron || !api) return null;
    return api.updateData(entityType, id, data);
  }, [isElectron, api]);

  const deleteData = useCallback(async (entityType, id) => {
    if (!isElectron || !api) return null;
    return api.deleteData(entityType, id);
  }, [isElectron, api]);

  return (
    <ElectronDataContext.Provider
      value={{
        isElectron,
        getLocalData,
        createData,
        updateData,
        deleteData,
      }}
    >
      {children}
    </ElectronDataContext.Provider>
  );
};

export const useElectronData = () => {
  const context = useContext(ElectronDataContext);
  if (!context) {
    throw new Error('useElectronData must be used within ElectronDataProvider');
  }
  return context;
};