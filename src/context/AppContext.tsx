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
  password?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  promotionPrice?: number;
  commission: number;
  duration?: number;
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
  barcode?: string;
  itemCode?: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  serviceId: string;
  date: string;
  time: string;
  endTime?: string;
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

export interface SubscriptionPlan {
  id: string;
  name: string;
  servicesCount: number;
  price: number;
  active: boolean;
}

export interface Subscription {
  id: string;
  clientId: string;
  planId: string;
  status: 'active' | 'expired' | 'canceled' | 'pending';
  startDate: string;
  endDate: string;
  servicesUsed: number;
  servicesTotal: number;
}

export interface SubscriptionUsage {
  id: string;
  subscriptionId: string;
  appointmentId: string;
  usedAt: string;
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
  subscriptionPlans: SubscriptionPlan[];
  subscriptions: Subscription[];
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
  addProfile: (profile: Profile) => void;
  updateProfile: (id: string, profile: Partial<Profile>) => void;
  deleteProfile: (id: string) => void;
  addSubscriptionPlan: (plan: Omit<SubscriptionPlan, 'id'>) => void;
  updateSubscriptionPlan: (id: string, plan: Partial<SubscriptionPlan>) => void;
  deleteSubscriptionPlan: (id: string) => void;
  addSubscription: (sub: Omit<Subscription, 'id'>) => Promise<Subscription | null>;
  updateSubscription: (id: string, sub: Partial<Subscription>) => void;
  useSubscriptionCredit: (subscriptionId: string, appointmentId: string) => Promise<boolean>;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  updateAppointmentEndTime: (id: string, newEndTime: string) => void;
  clearProNotifications: (proId: string) => void;
  config: {
    businessName: string;
    logoUrl: string;
    primaryColor: string;
    accentColor: string;
    layoutConfig: {
      sections: string[];
      servicesOrder: string[];
      productsOrder: string[];
      sectionsMetadata?: {
        [key: string]: {
          name: string;
          icon: string;
        }
      };
    };
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
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [shopData, setShopData] = useState<any>(null);
  const [config, setConfig] = useState<{
    businessName: string;
    logoUrl: string;
    primaryColor: string;
    accentColor: string;
    layoutConfig: { 
      sections: string[]; 
      servicesOrder: string[]; 
      productsOrder: string[];
      sectionsMetadata?: {
        [key: string]: {
          name: string;
          icon: string;
        }
      }
    };
  }>({
    businessName: 'Barbearia Premium',
    logoUrl: '/logo3.png',
    primaryColor: '#050505',
    accentColor: '#d4af37',
    layoutConfig: { 
      sections: ['services', 'vipplans', 'products'], 
      servicesOrder: [], 
      productsOrder: [],
      sectionsMetadata: {
        services: { name: 'Serviços', icon: 'Scissors' },
        vipplans: { name: 'Planos VIP', icon: 'Crown' },
        products: { name: 'Produtos', icon: 'Package' }
      }
    }
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
          id: s.id, name: s.name, description: s.category || '', price: s.price, promotionPrice: s.promotion_price ?? undefined, commission: s.commission_rate ?? 0, duration: s.duration || 30
        })));

        // Fetch Products
        const { data: productsData } = await query(supabase.from('products').select('*'));
        if (productsData) setProducts(productsData.map((p: any) => ({
          id: p.id, name: p.name, description: p.category || '', price: p.price, promotionPrice: p.promotion_price ?? undefined, stock: p.stock, image: p.image_url, commission: p.commission_rate ?? 0,
          barcode: p.barcode || '', itemCode: p.item_code || ''
        })));

        // Fetch Clients
        const { data: clientsData } = await query(supabase.from('clients').select('*'));
        if (clientsData) setClients(clientsData.map((c: any) => ({
          id: c.id, name: c.name, phone: c.phone || '', email: c.email, lastVisit: c.last_visit, totalSpent: c.total_spent, appointmentsCount: 0
        })));

        // Fetch Subscription Plans
        const { data: plansData } = await query(supabase.from('subscription_plans').select('*'));
        if (plansData) setSubscriptionPlans(plansData.map((p: any) => ({
          id: p.id, name: p.name, servicesCount: p.services_count, price: p.price, active: p.active
        })));

        // Fetch Subscriptions
        const { data: subsData } = await query(supabase.from('subscriptions').select('*'));
        if (subsData) setSubscriptions(subsData.map((s: any) => ({
          id: s.id, clientId: s.client_id, planId: s.plan_id, status: s.status, 
          startDate: s.start_date, endDate: s.end_date, servicesUsed: s.services_used, servicesTotal: s.services_total
        })));

        // Fetch Professionals
        const { data: prosData } = await query(supabase.from('professionals').select('*'));
        if (prosData) setProfiles(prosData.map((p: any) => ({
          id: p.id, name: p.name, role: (p.role?.toLowerCase() === 'owner' ? 'owner' : 'professional') as UserRole, 
          avatar: p.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
          email: p.email
        })));

        // Fetch Appointments
        const { data: apptsData } = await query(supabase.from('appointments').select('*, clients(name)'));
        if (apptsData) setAppointments(apptsData.map((a: any) => ({
          id: a.id, clientId: a.client_id, clientName: (a.clients as any)?.name || 'Cliente', 
          professionalId: a.professional_id, serviceId: a.service_id, date: a.date, time: a.time, endTime: a.end_time || a.time,
          status: a.status as any, priceAtTime: a.total_price || 0, commissionAtTime: 0
        })));

        // Fetch Config
        let configData = null;
        if (currentShopId) {
          const { data } = await supabase
            .from('business_config')
            .select('*')
            .eq('shop_id', currentShopId)
            .maybeSingle();
          configData = data;
        }
        if (!configData) {
          const { data } = await supabase
            .from('business_config')
            .select('*')
            .is('shop_id', null)
            .maybeSingle();
          configData = data;
        }
        if (configData) {
          const rawLayout = configData.layout_config || {};
          setConfig({
            businessName: configData.business_name,
            logoUrl: configData.logo_url || '/logo3.png',
            primaryColor: '#050505',
            accentColor: configData.theme_color || '#d4af37',
            layoutConfig: {
              sections: rawLayout.sections || ['services', 'vipplans', 'products'],
              servicesOrder: rawLayout.servicesOrder || [],
              productsOrder: rawLayout.productsOrder || [],
              sectionsMetadata: rawLayout.sectionsMetadata || {
                services: { name: 'Serviços', icon: 'Scissors' },
                vipplans: { name: 'Planos VIP', icon: 'Crown' },
                products: { name: 'Produtos', icon: 'Package' }
              }
            }
          });
        }

      } catch (error) {
        console.error("Error fetching data from Supabase:", error);
      } finally {
        setIsReady(true);
      }
    };

    fetchData();
  }, []);

  // Real-time synchronization
  useEffect(() => {
    const channel = supabase
      .channel('realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        async (payload: any) => {
          const newRow = payload.new;
          const oldRow = payload.old;
          
          // Filter by shopId if active
          if (shopId && newRow?.shop_id && newRow.shop_id !== shopId) return;
          if (shopId && oldRow?.shop_id && oldRow.shop_id !== shopId) return;

          if (payload.eventType === 'INSERT') {
            // Fetch client name
            let clientName = 'Cliente Online';
            if (newRow.client_id) {
              const { data: cData } = await supabase.from('clients').select('name').eq('id', newRow.client_id).maybeSingle();
              if (cData) clientName = cData.name;
            }
            
            const newAppt: Appointment = {
              id: newRow.id,
              clientId: newRow.client_id || 'online-customer',
              clientName,
              professionalId: newRow.professional_id,
              serviceId: newRow.service_id,
              date: newRow.date,
              time: newRow.time,
              // Only store end_time if it's different from start time (otherwise resolveApptEndTime will compute it)
              endTime: (newRow.end_time && newRow.end_time !== newRow.time) ? newRow.end_time : undefined,
              status: newRow.status as any,
              priceAtTime: newRow.total_price || 0,
              commissionAtTime: 0,
              isNewForPro: true
            };

            setAppointments(prev => {
              if (prev.some(a => a.id === newAppt.id)) return prev;
              return [...prev, newAppt];
            });
          } else if (payload.eventType === 'UPDATE') {
            setAppointments(prev => prev.map(a => {
              if (a.id === newRow.id) {
                return {
                  ...a,
                  clientId: newRow.client_id || a.clientId,
                  professionalId: newRow.professional_id,
                  serviceId: newRow.service_id,
                  date: newRow.date,
                  time: newRow.time,
                  endTime: newRow.end_time || newRow.time,
                  status: newRow.status as any,
                  priceAtTime: newRow.total_price || 0
                };
              }
              return a;
            }));
          } else if (payload.eventType === 'DELETE') {
            setAppointments(prev => prev.filter(a => a.id !== oldRow.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        (payload: any) => {
          const newRow = payload.new;
          const oldRow = payload.old;

          if (shopId && newRow?.shop_id && newRow.shop_id !== shopId) return;
          if (shopId && oldRow?.shop_id && oldRow.shop_id !== shopId) return;

          if (payload.eventType === 'INSERT') {
            const newClient: Client = {
              id: newRow.id,
              name: newRow.name,
              phone: newRow.phone || '',
              email: newRow.email || '',
              lastVisit: newRow.last_visit,
              totalSpent: newRow.total_spent || 0,
              appointmentsCount: 0
            };
            setClients(prev => {
              if (prev.some(c => c.id === newClient.id)) return prev;
              return [...prev, newClient];
            });
          } else if (payload.eventType === 'UPDATE') {
            setClients(prev => prev.map(c => {
              if (c.id === newRow.id) {
                return {
                  ...c,
                  name: newRow.name,
                  phone: newRow.phone || '',
                  email: newRow.email || '',
                  lastVisit: newRow.last_visit,
                  totalSpent: newRow.total_spent || 0
                };
              }
              return c;
            }));
          } else if (payload.eventType === 'DELETE') {
            setClients(prev => prev.filter(c => c.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId]);

  const addService = async (s: Omit<Service, 'id'>) => {
    const { data, error } = await supabase.from('services').insert([{ 
      name: s.name, price: s.price, duration: s.duration || 30, category: s.description,
      commission_rate: s.commission, shop_id: shopId,
      promotion_price: s.promotionPrice ?? null
    }]).select();
    if (data) setServices(prev => [...prev, { ...s, id: data[0].id, duration: s.duration || 30 }]);
  };
  const updateService = async (id: string, s: Partial<Service>) => {
    const updatePayload: any = { name: s.name, price: s.price };
    if (s.duration !== undefined) updatePayload.duration = s.duration;
    if (s.commission !== undefined) updatePayload.commission_rate = s.commission;
    updatePayload.promotion_price = s.promotionPrice ?? null;
    await supabase.from('services').update(updatePayload).eq('id', id);
    setServices(prev => prev.map(i => i.id === id ? {...i, ...s} : i));
  };
  const deleteService = async (id: string) => {
    await supabase.from('services').delete().eq('id', id);
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const addProduct = async (p: Omit<Product, 'id'>) => {
    const { data } = await supabase.from('products').insert([{ 
      name: p.name, price: p.price, stock: p.stock, category: p.description, image_url: p.image, shop_id: shopId,
      barcode: p.barcode || null, item_code: p.itemCode || null, commission_rate: p.commission ?? 0,
      promotion_price: p.promotionPrice ?? null
    }]).select();
    if (data) setProducts(prev => [...prev, { ...p, id: data[0].id }]);
  };
  const updateProduct = async (id: string, p: Partial<Product>) => {
    const updatePayload: any = {};
    if (p.name !== undefined) updatePayload.name = p.name;
    if (p.price !== undefined) updatePayload.price = p.price;
    if (p.stock !== undefined) updatePayload.stock = p.stock;
    if (p.barcode !== undefined) updatePayload.barcode = p.barcode;
    if (p.itemCode !== undefined) updatePayload.item_code = p.itemCode;
    if (p.commission !== undefined) updatePayload.commission_rate = p.commission;
    updatePayload.promotion_price = p.promotionPrice !== undefined ? (p.promotionPrice ?? null) : undefined;
    if (updatePayload.promotion_price === undefined) delete updatePayload.promotion_price;
    await supabase.from('products').update(updatePayload).eq('id', id);
    setProducts(prev => prev.map(i => i.id === id ? {...i, ...p} : i));
  };
  const deleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addClient = async (c: Omit<Client, 'id'>) => {
    const { data, error } = await supabase.from('clients').insert([{ 
      name: c.name, 
      phone: c.phone || null, 
      email: c.email?.trim().toLowerCase() || null, 
      shop_id: shopId 
    }]).select();
    if (error) console.error("Error adding client:", error);
    if (data) setClients(prev => [...prev, { ...c, id: data[0].id }]);
  };
  const updateClient = async (id: string, c: Partial<Client>) => {
    const { error } = await supabase.from('clients').update({ 
      name: c.name, 
      phone: c.phone || null, 
      email: c.email?.trim().toLowerCase() || null 
    }).eq('id', id);
    if (error) console.error("Error updating client:", error);
    setClients(prev => prev.map(i => i.id === id ? {...i, ...c} : i));
  };
  const deleteClient = async (id: string) => {
    await supabase.from('clients').delete().eq('id', id);
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const addSubscriptionPlan = async (p: Omit<SubscriptionPlan, 'id'>) => {
    const { data } = await supabase.from('subscription_plans').insert([{ 
      name: p.name, services_count: p.servicesCount, price: p.price, active: p.active, shop_id: shopId 
    }]).select();
    if (data) setSubscriptionPlans(prev => [...prev, { ...p, id: data[0].id }]);
  };

  const updateSubscriptionPlan = async (id: string, p: Partial<SubscriptionPlan>) => {
    const updatePayload: any = {};
    if (p.name !== undefined) updatePayload.name = p.name;
    if (p.servicesCount !== undefined) updatePayload.services_count = p.servicesCount;
    if (p.price !== undefined) updatePayload.price = p.price;
    if (p.active !== undefined) updatePayload.active = p.active;
    await supabase.from('subscription_plans').update(updatePayload).eq('id', id);
    setSubscriptionPlans(prev => prev.map(i => i.id === id ? {...i, ...p} : i));
  };

  const deleteSubscriptionPlan = async (id: string) => {
    await supabase.from('subscription_plans').delete().eq('id', id);
    setSubscriptionPlans(prev => prev.filter(p => p.id !== id));
  };

  const addSubscription = async (s: Omit<Subscription, 'id'>) => {
    const { data } = await supabase.from('subscriptions').insert([{ 
      client_id: s.clientId, plan_id: s.planId, status: s.status, start_date: s.startDate, end_date: s.endDate,
      services_used: s.servicesUsed, services_total: s.servicesTotal, shop_id: shopId 
    }]).select();
    if (data) {
      const newSub = { ...s, id: data[0].id };
      setSubscriptions(prev => [...prev, newSub]);
      return newSub;
    }
    return null;
  };

  const updateSubscription = async (id: string, s: Partial<Subscription>) => {
    const updatePayload: any = {};
    if (s.status !== undefined) updatePayload.status = s.status;
    if (s.servicesUsed !== undefined) updatePayload.services_used = s.servicesUsed;
    await supabase.from('subscriptions').update(updatePayload).eq('id', id);
    setSubscriptions(prev => prev.map(i => i.id === id ? {...i, ...s} : i));
  };

  const useSubscriptionCredit = async (subscriptionId: string, appointmentId: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId);
    if (!sub || sub.servicesUsed >= sub.servicesTotal || sub.status !== 'active') return false;

    const newUsed = sub.servicesUsed + 1;
    await supabase.from('subscriptions').update({ services_used: newUsed }).eq('id', subscriptionId);
    await supabase.from('subscription_usage').insert([{ subscription_id: subscriptionId, appointment_id: appointmentId }]);
    
    setSubscriptions(prev => prev.map(s => s.id === subscriptionId ? { ...s, servicesUsed: newUsed } : s));
    return true;
  };

  const addProfile = async (p: Profile) => {
    // Professionals.tsx handles both Auth and DB insert. Just update state here.
    setProfiles(prev => [...prev, p]);
  };
  const updateProfile = async (id: string, p: Partial<Profile>) => {
    const payload: any = { name: p.name, role: p.role, photo_url: p.avatar };
    if (p.email !== undefined) payload.email = p.email;
    await supabase.from('professionals').update(payload).eq('id', id);
    setProfiles(prev => prev.map(i => i.id === id ? {...i, ...p} : i));
  };
  const deleteProfile = async (id: string) => {
    const { data, error } = await supabase.from('professionals').delete().eq('id', id).select();
    if (error || !data || data.length === 0) {
      alert("Não foi possível excluir o profissional. O registro já pode ter sido excluído ou há vínculos pendentes.");
    } else {
      setProfiles(prev => prev.filter(p => p.id !== id));
    }
  };
  
  const addAppointment = async (a: Omit<Appointment, 'id'>) => {
    let resolvedClientId: string | null = a.clientId;
    
    // Determine shopId by checking the professional if current shopId is null
    let resolvedShopId = shopId;
    if (!resolvedShopId && a.professionalId) {
      const { data: proData, error: proError } = await supabase.from('professionals').select('shop_id').eq('id', a.professionalId).maybeSingle();
      if (proError) console.error("Error fetching professional shop_id:", proError);
      if (proData && proData.shop_id) {
        resolvedShopId = proData.shop_id;
      }
    }
    
    if (!a.clientId || a.clientId === 'online-customer' || a.clientId.length < 10) {
      const { data: newClient, error: clientError } = await supabase.from('clients').insert([{
        name: a.clientName || 'Cliente Online',
        phone: null,
        email: null,
        shop_id: resolvedShopId
      }]).select();
      
      if (clientError) {
        console.error("Error creating new client for appointment:", clientError);
      }
      
      if (newClient && newClient.length > 0) {
        resolvedClientId = newClient[0].id;
      } else {
        resolvedClientId = null;
      }
    }

    // Compute end_time: use provided endTime, or calculate from service duration
    let computedEndTime = a.endTime;
    if (!computedEndTime || computedEndTime === a.time) {
      const svc = services.find(s => s.id === a.serviceId);
      const duration = svc?.duration || 30;
      const [startH, startM] = a.time.split(':').map(Number);
      const endTotalMin = startH * 60 + startM + duration;
      computedEndTime = `${Math.floor(endTotalMin / 60).toString().padStart(2, '0')}:${(endTotalMin % 60).toString().padStart(2, '0')}`;
    }

    const { data, error: apptError } = await supabase.from('appointments').insert([{ 
      client_id: resolvedClientId, 
      professional_id: a.professionalId, 
      service_id: a.serviceId, 
      date: a.date, 
      time: a.time, 
      end_time: computedEndTime,
      status: a.status, 
      total_price: a.priceAtTime, 
      shop_id: resolvedShopId 
    }]).select();

    if (apptError) {
      console.error("Error creating appointment:", apptError);
    }

    if (data) {
      const newAppt = { 
        ...a, 
        id: data[0].id, 
        clientId: resolvedClientId || 'online-customer', 
        clientName: a.clientName || 'Cliente Online',
        isNewForPro: true 
      };
      setAppointments(prev => {
        if (prev.some(x => x.id === newAppt.id)) return prev;
        return [...prev, newAppt];
      });
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

  const updateAppointmentEndTime = async (id: string, newEndTime: string) => {
    await supabase.from('appointments').update({ end_time: newEndTime, status: 'completed' }).eq('id', id);
    setAppointments(prev => prev.map(a => {
      if (a.id === id) {
        if (a.status !== 'completed') {
          const client = clients.find(c => c.id === a.clientId);
          if (client) {
            supabase.from('clients').update({ 
              total_spent: (client.totalSpent || 0) + (a.priceAtTime || 0),
              last_visit: a.date
            }).eq('id', client.id).then();
          }
        }
        return { ...a, endTime: newEndTime, status: 'completed', isNewForPro: false };
      }
      return a;
    }));
  };

  const updateConfig = async (newC: Partial<AppContextType['config']>) => {
    try {
      if (!shopId) {
        // Fallback global sem shopId (não esperado em produção normal)
        const { data } = await supabase.from('business_config').select('id').single();
        if (data?.id) {
          const { error } = await supabase.from('business_config').update({ 
            business_name: newC.businessName !== undefined ? newC.businessName : config.businessName, 
            logo_url: newC.logoUrl !== undefined ? newC.logoUrl : config.logoUrl, 
            theme_color: newC.accentColor !== undefined ? newC.accentColor : config.accentColor,
            layout_config: newC.layoutConfig !== undefined ? newC.layoutConfig : config.layoutConfig
          }).eq('id', data.id);
          if (error) throw error;
        }
        setConfig(prev => ({ ...prev, ...newC }));
        return;
      }

      // Buscar configuração existente para esta barbearia específica
      const { data: existingConfig, error: fetchError } = await supabase
        .from('business_config')
        .select('id')
        .eq('shop_id', shopId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const updatePayload = {
        business_name: newC.businessName !== undefined ? newC.businessName : config.businessName, 
        logo_url: newC.logoUrl !== undefined ? newC.logoUrl : config.logoUrl, 
        theme_color: newC.accentColor !== undefined ? newC.accentColor : config.accentColor,
        layout_config: newC.layoutConfig !== undefined ? newC.layoutConfig : config.layoutConfig,
        shop_id: shopId
      };

      if (existingConfig?.id) {
        const { error: updateError } = await supabase
          .from('business_config')
          .update(updatePayload)
          .eq('id', existingConfig.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('business_config')
          .insert([updatePayload]);
        if (insertError) throw insertError;
      }

      setConfig(prev => ({ ...prev, ...newC }));
    } catch (error) {
      console.error("Erro ao salvar configurações de negócio no Supabase:", error);
      alert("Houve um erro ao persistir as configurações. Suas alterações podem não ter sido salvas no banco de dados.");
    }
  };

  return (
    <AppContext.Provider value={{
      role, userId, shopId, shopData, setAuth, logout, services, products, appointments, profiles, clients, subscriptionPlans, subscriptions,
      addService, updateService, deleteService,
      addProduct, updateProduct, deleteProduct,
      addAppointment, updateAppointment, deleteAppointment, updateAppointmentStatus, updateAppointmentEndTime, clearProNotifications,
      addClient, updateClient, deleteClient,
      addProfile, updateProfile, deleteProfile,
      addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan,
      addSubscription, updateSubscription, useSubscriptionCredit,
      config, updateConfig
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
