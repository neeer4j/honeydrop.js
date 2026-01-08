import React, { createContext, useContext, ReactNode } from 'react';
import { Honeydrop } from '../Honeydrop';

const HoneydropContext = createContext<Honeydrop | null>(null);

export interface HoneydropProviderProps {
    client: Honeydrop;
    children: ReactNode;
}

export const HoneydropProvider: React.FC<HoneydropProviderProps> = ({ client, children }) => {
    return (
        <HoneydropContext.Provider value={client}>
            {children}
        </HoneydropContext.Provider>
    );
};

export const useHoneydrop = (): Honeydrop => {
    const context = useContext(HoneydropContext);
    if (!context) {
        throw new Error('useHoneydrop must be used within a HoneydropProvider');
    }
    return context;
};
