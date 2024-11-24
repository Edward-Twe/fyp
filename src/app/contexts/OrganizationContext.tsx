import React, { useEffect, useState } from 'react';
import { Organization } from '@prisma/client'; // Adjust the import path as needed

interface OrganizationContextType {
  selectedOrg: Organization | null;
  setSelectedOrg: React.Dispatch<React.SetStateAction<Organization | null>>;
}

export const OrganizationContext = React.createContext<OrganizationContextType | undefined>(undefined);

export function useOrganization() {
  const context = React.useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }

  const clearSelectedOrg = () => {
    context.setSelectedOrg(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedOrg');
    }
  };

  return { ...context, clearSelectedOrg };
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedOrg = localStorage.getItem('selectedOrg');
    if (storedOrg) {
      setSelectedOrg(JSON.parse(storedOrg));
    }
  }, []);

  useEffect(() => {
    if (isClient && selectedOrg) {
      localStorage.setItem('selectedOrg', JSON.stringify(selectedOrg));
    }
  }, [isClient, selectedOrg]);

  return (
    <OrganizationContext.Provider value={{ selectedOrg, setSelectedOrg }}>
      {children}
    </OrganizationContext.Provider>
  );
}

