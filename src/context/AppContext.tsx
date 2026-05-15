import React, { createContext, useContext, useState, useEffect } from 'react';

// Types
export type UserRole = 'owner' | 'professional' | 'customer';

export interface Profile {
  id: string;
  name: string;
  role: UserRole;
  commission?: number;
  avatar?: string;
  email?: string;
  phone?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  commission: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  promotionPrice?: number;
  commission: number;
  image?: string;
  stock: number;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  serviceId: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  priceAtTime: number;
  commissionAtTime: number;
  notes?: string;
  isNewForPro?: boolean; // Para o balão de notificação
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  lastVisit?: string;
  totalSpent: number;
  appointmentsCount: number;
}

interface AppContextType {
  role: UserRole | null;
  userId: string | null;
  setAuth: (role: UserRole | null, userId: string | null) => void;
  logout: () => void;
  services: Service[];
  products: Product[];
  appointments: Appointment[];
  profiles: Profile[];
  clients: Client[];
  addService: (service: Omit<Service, 'id'>) => void;
  updateService: (id: string, service: Partial<Service>) => void;
  deleteService: (id: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  updateAppointment: (id: string, appointment: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addProfile: (profile: Omit<Profile, 'id'>) => void;
  updateProfile: (id: string, profile: Partial<Profile>) => void;
  deleteProfile: (id: string) => void;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  clearProNotifications: (proId: string) => void;
  config: {
    businessName: string;
    logoUrl: string;
    primaryColor: string;
    accentColor: string;
  };
  updateConfig: (config: Partial<AppContextType['config']>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [config, setConfig] = useState({
    businessName: 'Barbearia Premium',
    logoUrl: '/logo3.png',
    primaryColor: '#050505',
    accentColor: '#d4af37'
  });
  
  const [isReady, setIsReady] = useState(false);

  const setAuth = (newRole: UserRole | null, newId: string | null) => {
    setRole(newRole);
    setUserId(newId);
    if (newRole && newId) {
      localStorage.setItem('bb_current_role', newRole);
      localStorage.setItem('bb_current_userid', newId);
    } else {
      localStorage.removeItem('bb_current_role');
      localStorage.removeItem('bb_current_userid');
    }
  };

  const logout = () => setAuth(null, null);

  // Initial Load
  useEffect(() => {
    const load = (key: string, defaultVal: any) => {
      try {
        const saved = localStorage.getItem(key);
        if (saved && saved !== '[]' && saved !== 'null') return JSON.parse(saved);
      } catch (e) { console.error("Load error", key, e); }
      return defaultVal;
    };

    const savedRole = localStorage.getItem('bb_current_role') as UserRole | null;
    const savedId = localStorage.getItem('bb_current_userid');
    if (savedRole && savedId) {
      setRole(savedRole);
      setUserId(savedId);
    }

    setServices(load('bb_services', [
      { id: 's1', name: 'Corte Degradê', description: 'Corte moderno', price: 50, commission: 30 },
      { id: 's2', name: 'Barba Completa', description: 'Toalha quente', price: 40, commission: 30 }
    ]));
    setProducts(load('bb_products', [{ id: 'p1', name: 'Pomada', description: 'Efeito matte', price: 45, commission: 10, stock: 15 }]));
    setClients(load('bb_clients', [{ id: 'c1', name: 'José Silva', phone: '(11) 98888-7777', totalSpent: 0, appointmentsCount: 0 }]));
    setProfiles(load('bb_profiles', [
      { id: '1', name: 'Marcos Villas', role: 'owner', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcos' },
      { id: '2', name: 'Rafael Silva', role: 'professional', commission: 30, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rafael' }
    ]));
    setAppointments(load('bb_appointments', []));
    
    const savedConfig = localStorage.getItem('bb_config');
    if (savedConfig) setConfig(JSON.parse(savedConfig));

    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    localStorage.setItem('bb_services', JSON.stringify(services));
    localStorage.setItem('bb_products', JSON.stringify(products));
    localStorage.setItem('bb_appointments', JSON.stringify(appointments));
    localStorage.setItem('bb_clients', JSON.stringify(clients));
    localStorage.setItem('bb_profiles', JSON.stringify(profiles));
    localStorage.setItem('bb_config', JSON.stringify(config));
  }, [services, products, appointments, clients, profiles, config, isReady]);

  // CRUD... (simplificado para brevidade, mas completo no arquivo real)
  const addService = (s: Omit<Service, 'id'>) => setServices(prev => [...prev, { ...s, id: `s-${Date.now()}` }]);
  const updateService = (id: string, s: Partial<Service>) => setServices(prev => prev.map(i => i.id === id ? {...i, ...s} : i));
  const deleteService = (id: string) => setServices(prev => prev.filter(s => s.id !== id));
  const addProduct = (p: Omit<Product, 'id'>) => setProducts(prev => [...prev, { ...p, id: `p-${Date.now()}` }]);
  const updateProduct = (id: string, p: Partial<Product>) => setProducts(prev => prev.map(i => i.id === id ? {...i, ...p} : i));
  const deleteProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));
  const addClient = (c: Omit<Client, 'id'>) => setClients(prev => [...prev, { ...c, id: `c-${Date.now()}` }]);
  const updateClient = (id: string, c: Partial<Client>) => setClients(prev => prev.map(i => i.id === id ? {...i, ...c} : i));
  const deleteClient = (id: string) => setClients(prev => prev.filter(c => c.id !== id));
  const addProfile = (p: Omit<Profile, 'id'>) => setProfiles(prev => [...prev, { ...p, id: `pro-${Date.now()}` }]);
  const updateProfile = (id: string, p: Partial<Profile>) => setProfiles(prev => prev.map(i => i.id === id ? {...i, ...p} : i));
  const deleteProfile = (id: string) => setProfiles(prev => prev.filter(p => p.id !== id));
  
  const addAppointment = (a: Omit<Appointment, 'id'>) => setAppointments(prev => [...prev, { ...a, id: `a-${Date.now()}`, isNewForPro: true }]);
  const updateAppointment = (id: string, a: Partial<Appointment>) => setAppointments(prev => prev.map(i => i.id === id ? {...i, ...a} : i));
  const deleteAppointment = (id: string) => setAppointments(prev => prev.filter(a => a.id !== id));

  const clearProNotifications = (proId: string) => {
    setAppointments(prev => prev.map(a => a.professionalId === proId ? { ...a, isNewForPro: false } : a));
  };

  const updateAppointmentStatus = (id: string, status: Appointment['status']) => {
    setAppointments(prev => prev.map(a => {
      if (a.id === id) {
        if (status === 'completed' && a.status !== 'completed') {
          setClients(cPrev => cPrev.map(c => c.id === a.clientId ? {
            ...c, totalSpent: (c.totalSpent || 0) + (a.priceAtTime || 0), appointmentsCount: (c.appointmentsCount || 0) + 1, lastVisit: a.date
          } : c));
        }
        return { ...a, status, isNewForPro: false };
      }
      return a;
    }));
  };

  const updateConfig = (newC: Partial<AppContextType['config']>) => setConfig(prev => ({ ...prev, ...newC }));

  return (
    <AppContext.Provider value={{
      role, userId, setAuth, logout, services, products, appointments, profiles, clients,
      addService, updateService, deleteService,
      addProduct, updateProduct, deleteProduct,
      addAppointment, updateAppointment, deleteAppointment,
      addClient, updateClient, deleteClient,
      addProfile, updateProfile, deleteProfile,
      updateAppointmentStatus, clearProNotifications, config, updateConfig
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
