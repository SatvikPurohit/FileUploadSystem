import { useContext } from 'react';
import { AuthContext } from '../AuthConext';


// Hook for components to consume the context easily
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
