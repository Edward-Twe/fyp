import { Organization } from '@prisma/client';
import React from 'react';

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
  return context;
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [selectedOrg, setSelectedOrg] = React.useState<Organization | null>(null);

  return (
    <OrganizationContext.Provider value={{ selectedOrg, setSelectedOrg }}>
      {children}
    </OrganizationContext.Provider>
  );
}

