import React, { createContext, useContext, useState } from 'react';
import { ApiClient } from '../api/client';

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  workspaceId: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  workspaceId: string;
  userId: string;
  activeBrandId?: string;
  login: (userInfo: UserProfile) => void;
  logout: () => void;
  setWorkspaceId: (id: string) => void;
  setUserId: (id: string) => void;
  setActiveBrandId: (id?: string) => void;
  api: ApiClient;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>({
    name: 'Dev Agency Admin',
    email: 'demo@riona.ai',
    role: 'agency_admin',
    workspaceId: 'ws-dev-1',
  });
  const [workspaceId, setWorkspaceId] = useState('ws-dev-1');
  const [userId, setUserId] = useState('user-dev-1');
  const [activeBrandId, setActiveBrandId] = useState<string | undefined>(undefined);

  const login = (userInfo: UserProfile) => {
    setUser(userInfo);
    setWorkspaceId(userInfo.workspaceId);
  };

  const logout = () => {
    setUser(null);
  };

  const api = new ApiClient({
    userId,
    workspaceId,
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        workspaceId,
        userId,
        activeBrandId,
        login,
        logout,
        setWorkspaceId,
        setUserId,
        setActiveBrandId,
        api,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
