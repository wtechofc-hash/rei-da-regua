import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Types
export type UserRole = 'owner' | 'professional' | 'customer' | 'superadmin';

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
  shopId: string | null;
  shopData: any;
  setAuth: (role: UserRole | null, userId: string | null, shopId?: string | null) => void;
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
  addAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<Appointment | null>;
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
  const [shopId, setShopId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [shopData, setShopData] = useState<any>(null);
  const [config, setConfig] = useState({
    businessName: 'Barbearia Premium',
    logoUrl: '/logo3.png',
    primaryColor: '#050505',
    accentColor: '#d4af37'
  });
  
  const [isReady, setIsReady] = useState(false);

  const setAuth = (newRole: UserRole | null, newId: string | null, newShopId: string | null = null) => {
    setRole(newRole);
    setUserId(newId);
    setShopId(newShopId);
    if (newRole && newId) {
      localStorage.setItem('bb_current_role', newRole);
      localStorage.setItem('bb_current_userid', newId);
      if (newShopId) localStorage.setItem('bb_current_shopid', newShopId);
    } else {
      localStorage.removeItem('bb_current_role');
      localStorage.removeItem('bb_current_userid');
      localStorage.removeItem('bb_current_shopid');
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
    const savedShopId = localStorage.getItem('bb_current_shopid');
    if (savedRole && savedId) {
      setRole(savedRole);
      setUserId(savedId);
      setShopId(savedShopId);
    }

    // Load initial data from Supabase
    const fetchData = async () => {
      try {
        const currentShopId = savedShopId;
        const query = currentShopId ? (q: any) => q.eq('shop_id', currentShopId) : (q: any) => q;

        // Fetch Shop Data
        if (currentShopId) {
          const { data: sData } = await supabase.from('shops').select('*').eq('id', currentShopId).maybeSingle();
          if (sData) {
            setShopData(sData);
          } else if (savedRole === 'owner') {
            // Auto-logout if the shop was deleted by an admin
            logout();
            return;
          }
        }

        // Fetch Services
        const { data: servicesData } = await query(supabase.from('services').select('*'));
        if (servicesData) setServices(servicesData.map((s: any) => ({
          id: s.id, name: s.name, description: s.category || '', price: s.price, commission: 0 
        })));

        // Fetch Products
        const { data: productsData } = await query(supabase.from('products').select('*'));
        if (productsData) setProducts(productsData.map((p: any) => ({
          id: p.id, name: p.name, description: p.category || '', price: p.price, stock: p.stock, image: p.image_url, commission: 0
        })));

        // Fetch Clients
        const { data: clientsData } = await query(supabase.from('clients').select('*'));
        if (clientsData) setClients(clientsData.map((c: any) => ({
          id: c.id, name: c.name, phone: c.phone || '', email: c.email, lastVisit: c.last_visit, totalSpent: c.total_spent, appointmentsCount: 0
        })));

        // Fetch Professionals
        const { data: prosData } = await query(supabase.from('professionals').select('*'));
        if (prosData) setProfiles(prosData.map((p: any) => ({
          id: p.id, name: p.name, role: (p.role?.toLowerCase() === 'owner' ? 'owner' : 'professional') as UserRole, 
          avatar: p.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`, commission: p.commission_rate
        })));

        // Fetch Appointments
        const { data: apptsData } = await query(supabase.from('appointments').select('*, clients(name)'));
        if (apptsData) setAppointments(apptsData.map((a: any) => ({
          id: a.id, clientId: a.client_id, clientName: (a.clients as any)?.name || 'Cliente', 
          professionalId: a.professional_id, serviceId: a.service_id, date: a.date, time: a.time, 
          status: a.status as any, priceAtTime: a.total_price || 0, commissionAtTime: 0
        })));

        // Fetch Config
        const { data: configData } = await query(supabase.from('business_config').select('*')).single();
        if (configData) setConfig({
          businessName: configData.business_name,
          logoUrl: configData.logo_url || '/logo3.png',
          primaryColor: '#050505',
          accentColor: configData.theme_color || '#d4af37'
        });

      } catch (error) {
        console.error("Error fetching data from Supabase:", error);
      } finally {
        setIsReady(true);
      }
    };

    fetchData();
  }, []);


  const addService = async (s: Omit<Service, 'id'>) => {
    const { data, error } = await supabase.from('services').insert([{ 
      name: s.name, price: s.price, duration: 30, category: s.description, shop_id: shopId 
    }]).select();
    if (data) setServices(prev => [...prev, { ...s, id: data[0].id }]);
  };
  const updateService = async (id: string, s: Partial<Service>) => {
    await supabase.from('services').update({ name: s.name, price: s.price }).eq('id', id);
    setServices(prev => prev.map(i => i.id === id ? {...i, ...s} : i));
  };
  const deleteService = async (id: string) => {
    await supabase.from('services').delete().eq('id', id);
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const addProduct = async (p: Omit<Product, 'id'>) => {
    const { data } = await supabase.from('products').insert([{ 
      name: p.name, price: p.price, stock: p.stock, category: p.description, image_url: p.image, shop_id: shopId 
    }]).select();
    if (data) setProducts(prev => [...prev, { ...p, id: data[0].id }]);
  };
  const updateProduct = async (id: string, p: Partial<Product>) => {
    await supabase.from('products').update({ name: p.name, price: p.price, stock: p.stock }).eq('id', id);
    setProducts(prev => prev.map(i => i.id === id ? {...i, ...p} : i));
  };
  const deleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addClient = async (c: Omit<Client, 'id'>) => {
    const { data } = await supabase.from('clients').insert([{ name: c.name, phone: c.phone, email: c.email, shop_id: shopId }]).select();
    if (data) setClients(prev => [...prev, { ...c, id: data[0].id }]);
  };
  const updateClient = async (id: string, c: Partial<Client>) => {
    await supabase.from('clients').update({ name: c.name, phone: c.phone, email: c.email }).eq('id', id);
    setClients(prev => prev.map(i => i.id === id ? {...i, ...c} : i));
  };
  const deleteClient = async (id: string) => {
    await supabase.from('clients').delete().eq('id', id);
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const addProfile = async (p: Omit<Profile, 'id'>) => {
    const { data } = await supabase.from('professionals').insert([{ 
      name: p.name, role: p.role, photo_url: p.avatar, commission_rate: p.commission, shop_id: shopId 
    }]).select();
    if (data) setProfiles(prev => [...prev, { ...p, id: data[0].id }]);
  };
  const updateProfile = async (id: string, p: Partial<Profile>) => {
    await supabase.from('professionals').update({ name: p.name, role: p.role, photo_url: p.avatar, commission_rate: p.commission }).eq('id', id);
    setProfiles(prev => prev.map(i => i.id === id ? {...i, ...p} : i));
  };
  const deleteProfile = async (id: string) => {
    await supabase.from('professionals').delete().eq('id', id);
    setProfiles(prev => prev.filter(p => p.id !== id));
  };
  
  const addAppointment = async (a: Omit<Appointment, 'id'>) => {
    const { data } = await supabase.from('appointments').insert([{ 
      client_id: a.clientId, professional_id: a.professionalId, service_id: a.serviceId, 
      date: a.date, time: a.time, status: a.status, total_price: a.priceAtTime, shop_id: shopId 
    }]).select();
    if (data) {
      const newAppt = { ...a, id: data[0].id, isNewForPro: true };
      setAppointments(prev => [...prev, newAppt]);
      return newAppt;
    }
    return null;
  };
  const updateAppointment = async (id: string, a: Partial<Appointment>) => {
    await supabase.from('appointments').update({ status: a.status }).eq('id', id);
    setAppointments(prev => prev.map(i => i.id === id ? {...i, ...a} : i));
  };
  const deleteAppointment = async (id: string) => {
    await supabase.from('appointments').delete().eq('id', id);
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  const clearProNotifications = (proId: string) => {
    setAppointments(prev => prev.map(a => a.professionalId === proId ? { ...a, isNewForPro: false } : a));
  };

  const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    await supabase.from('appointments').update({ status }).eq('id', id);
    setAppointments(prev => prev.map(a => {
      if (a.id === id) {
        if (status === 'completed' && a.status !== 'completed') {
          const client = clients.find(c => c.id === a.clientId);
          if (client) {
            supabase.from('clients').update({ 
              total_spent: (client.totalSpent || 0) + (a.priceAtTime || 0),
              last_visit: a.date
            }).eq('id', client.id).then();
          }
        }
        return { ...a, status, isNewForPro: false };
      }
      return a;
    }));
  };

  const updateConfig = async (newC: Partial<AppContextType['config']>) => {
    const { data } = await supabase.from('business_config').select('id').single();
    if (data?.id) {
        await supabase.from('business_config').update({ 
        business_name: newC.businessName, logo_url: newC.logoUrl, theme_color: newC.accentColor 
        }).eq('id', data.id);
    }
    setConfig(prev => ({ ...prev, ...newC }));
  };

  return (
    <AppContext.Provider value={{
      role, userId, shopId, shopData, setAuth, logout, services, products, appointments, profiles, clients,
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
