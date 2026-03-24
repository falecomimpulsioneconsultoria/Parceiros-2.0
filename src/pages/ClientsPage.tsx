import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Mail, Phone, UserPlus, CheckCircle2, X, Package, AlertCircle, CreditCard, Plus, Trash2, ShoppingBag, ChevronDown, ChevronRight, TrendingUp, Clock, PlayCircle, PauseCircle, CheckCircle, XCircle, Info, ExternalLink, DollarSign, Link as LinkIcon, Copy, Edit3, Eye, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'] & {
  profiles?: { full_name: string, email: string } | null;
  captador?: { full_name: string, email: string } | null;
  lead_deals?: LeadDeal[];
  captador_id?: string | null;
};
type Product = Database['public']['Tables']['products']['Row'];
type LeadDeal = Database['public']['Tables']['lead_deals']['Row'] & {
  products?: { name: string, image_url: string | null } | null;
  captador_id?: string | null;
  payment_status?: 'Pendente' | 'Em Pagamento' | 'Pago' | 'Cancelado' | null;
  completion_estimate_days?: number | null;
};

type DealFormRow = {
  id?: string;
  product_id: string;
  status: string;
  value: string;
  payment_method: string;
  notes: string;
  execution_status: string;
  pending_description: string;
  pending_document_url: string;
  partner_role: string;
  payment_status: 'Pendente' | 'Em Pagamento' | 'Pago' | 'Cancelado';
  completion_estimate_days: number;
};

const STATUS_STYLE: Record<string, string> = {
  'Fechado':       'bg-emerald-50/50 text-emerald-600 border-emerald-100/30',
  'Em Negociação': 'bg-amber-50/50 text-amber-600 border-amber-100/30',
  'Lead':          'bg-blue-50/50 text-blue-600 border-blue-100/30',
  'Perdido':       'bg-red-50/50 text-red-600 border-red-100/30',
};

const EXECUTION_STATUS_STYLE: Record<string, { color: string, icon: any }> = {
  'A iniciar':    { color: 'bg-slate-50 text-slate-500 border-slate-100/50',   icon: Clock },
  'Em andamento': { color: 'bg-blue-50 text-blue-600 border-blue-100/30',    icon: PlayCircle },
  'Pendenciado':  { color: 'bg-amber-50 text-amber-700 border-amber-100/30',   icon: PauseCircle },
  'Concluido':    { color: 'bg-emerald-50 text-emerald-600 border-emerald-100/30', icon: CheckCircle },
  'Cancelado':    { color: 'bg-red-50 text-red-700 border-red-100/30',      icon: XCircle },
};

const PAYMENT_STATUS_STYLE: Record<string, { color: string, icon: any }> = {
  'Pago':         { color: 'bg-emerald-50/50 text-emerald-700 border-emerald-200/50', icon: CheckCircle2 },
  'Pendente':     { color: 'bg-amber-50/50 text-amber-700 border-amber-200/50',  icon: Clock },
  'Em Pagamento': { color: 'bg-violet-50 text-violet-600 border-violet-200/50',   icon: CreditCard },
  'Cancelado':    { color: 'bg-red-50/50 text-red-700 border-red-200/50',    icon: XCircle },
};

type KanbanStage = {
  id: string;
  name: string;
  color: string;
};

export function ClientsPage() {
  const [searchTerm, setSearchTerm]       = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Lead | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [expandedRows, setExpandedRows]   = useState<Set<string>>(new Set());
  const [viewMode, setViewMode]           = useState<'list' | 'kanban'>('list');
  const [stages, setStages]               = useState<KanbanStage[]>([
    { id: 'Lead', name: 'Lead', color: '#3b82f6' },
    { id: 'Em Negociação', name: 'Em Negociação', color: '#f59e0b' },
    { id: 'Fechado', name: 'Fechado', color: '#10b981' },
    { id: 'Perdido', name: 'Perdido', color: '#ef4444' }
  ]);

  const [leads, setLeads]           = useState<Lead[]>([]);
  const [networkLeads, setNetworkLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDeals, setSavingDeals] = useState(false);
  const [dealInstallments, setDealInstallments] = useState<Record<string, any[]>>({});
  const [loadingInstallments, setLoadingInstallments] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Estados para Gestão de Vencimento
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30); // Padrão: 30 dias a partir de hoje
    return d.toISOString().split('T')[0];
  });
  const [dealToClose, setDealToClose] = useState<{ id: string; newStatus: string } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  const { user, role, partnerType: authPartnerType, loading: authLoading } = useAuth();
  const isAdmin = role === 'admin';
  const isVendedor = role === 'partner' && authPartnerType?.toLowerCase() === 'vendedor';
  const isCaptador = role === 'partner' && authPartnerType?.toLowerCase() === 'captador';
  const isPartner = role === 'partner';

  // Client form — personal info only
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '',
    cpf: '',
    rg: '',
    birth_date: '',
    gender: '',
    address_zip_code: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: ''
  });
  // Deals sub-form rows
  const [dealRows, setDealRows] = useState<DealFormRow[]>([]);

  // Deal Pop-up Modal states
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [editingDealIdx, setEditingDealIdx] = useState<number | null>(null);
  const [tempDeal, setTempDeal] = useState<DealFormRow>({
    product_id: '',
    status: 'Lead',
    value: '0',
    payment_method: '',
    notes: '',
    execution_status: 'A iniciar',
    pending_description: '',
    pending_document_url: '',
    partner_role: 'Vendedor',
    payment_status: 'Pendente',
    completion_estimate_days: 0
  });

  useEffect(() => { 
    if (user?.id && !authLoading) { 
      loadData(); 
    } 
  }, [user?.id, role, authLoading]);

  // ─── Data loading ───────────────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: productsData }, { data: leadsData, error: leadsError }, { data: settingsData }] = await Promise.all([
        supabase.from('products').select('*').eq('status', 'Ativo'),
        supabase.from('leads').select(`
          *,
          lead_deals (
            id, status, value, payment_method, notes, product_id, created_at,
            execution_status, pending_description, pending_document_url, payment_status, payment_link,
            completion_estimate_days,
            products (name, image_url, payment_type)
          )
        `).order('created_at', { ascending: false }),
        supabase.from('system_settings').select('lead_stages').eq('id', 1).single()
      ]);

      if (leadsError) throw leadsError;
      if (productsData) setProducts(productsData);
      if (settingsData?.lead_stages) {
        setStages(settingsData.lead_stages as unknown as KanbanStage[]);
      }

      // Manual Fetch of Profiles (Bypassing Join Cache Error)
      const allLeads = leadsData || [];
      const profileIds = Array.from(new Set([
        ...allLeads.map(l => l.partner_id),
        ...allLeads.map(l => l.captador_id)
      ].filter(Boolean)));

      let profilesMap: Record<string, { full_name: string, email: string }> = {};
      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', profileIds);
        
        if (profilesData) {
          profilesData.forEach(p => {
            profilesMap[p.id] = { full_name: p.full_name || '', email: p.email || '' };
          });
        }
      }

      // Merge profiles into leads
      const processedLeads = allLeads.map(lead => ({
        ...lead,
        profiles: lead.partner_id ? profilesMap[lead.partner_id] : null,
        captador: lead.captador_id ? profilesMap[lead.captador_id] : null
      }));

      setLeads(processedLeads as any);

    } catch (error: any) {
      console.error('Erro ao buscar dados:', error);
      setMessage({ type: 'error', text: `Erro ao carregar dados: ${error.message || 'Erro desconhecido'}` });
    } finally {
      setLoading(false);
    }
  };

  const loadDealsForClient = async (leadId: string) => {
    const { data } = await supabase
      .from('lead_deals')
      .select('*, products (name, image_url)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true });

    setDealRows((data || []).map((d: any) => ({
      id: d.id,
      product_id: d.product_id || '',
      status: d.status,
      value: d.value?.toString() || '0',
      payment_method: d.payment_method || '',
      notes: d.notes || '',
      execution_status: d.execution_status || 'A iniciar',
      pending_description: d.pending_description || '',
      pending_document_url: d.pending_document_url || '',
      partner_role: d.partner_role || 'Vendedor',
      payment_status: d.payment_status || 'Pendente',
      completion_estimate_days: d.completion_estimate_days || 0,
    })));
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      let leadId = selectedClient?.id;
      if (selectedClient) {
        const { error } = await supabase.from('leads')
          .update({ 
            name: formData.name.trim(), 
            email: formData.email.trim(), 
            phone: formData.phone.trim() || null,
            cpf: formData.cpf.trim() || null,
            rg: formData.rg.trim() || null,
            birth_date: formData.birth_date || null,
            gender: formData.gender || null,
            address_zip_code: formData.address_zip_code || null,
            address_street: formData.address_street || null,
            address_number: formData.address_number || null,
            address_complement: formData.address_complement || null,
            address_neighborhood: formData.address_neighborhood || null,
            address_city: formData.address_city || null,
            address_state: formData.address_state || null
          })
          .eq('id', selectedClient.id);
        if (error) throw error;
      } else {
        // Se for parceiro, verifica se tem um vendedor acima (referred_by)
        const { data: profile } = await supabase.from('profiles').select('referred_by').eq('id', user?.id).single();
        const referrerId = profile?.referred_by;

        const { data, error } = await supabase.from('leads')
          .insert([{ 
            partner_id: isPartner && !isVendedor && referrerId ? referrerId : (user?.id as string),
            captador_id: isPartner && !isVendedor && referrerId ? user?.id : null,
            name: formData.name.trim(), 
            email: formData.email.trim(), 
            phone: formData.phone.trim() || null,
            cpf: formData.cpf.trim() || null,
            rg: formData.rg.trim() || null,
            birth_date: formData.birth_date || null,
            gender: formData.gender || null,
            address_zip_code: formData.address_zip_code || null,
            address_street: formData.address_street || null,
            address_number: formData.address_number || null,
            address_complement: formData.address_complement || null,
            address_neighborhood: formData.address_neighborhood || null,
            address_city: formData.address_city || null,
            address_state: formData.address_state || null
          }])
          .select().single();
        if (error) throw error;
        leadId = data.id;
      }
      await saveDeals(leadId as string);
      setMessage({ type: 'success', text: selectedClient ? 'Cliente atualizado!' : 'Cliente adicionado!' });
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      await loadData();
      resetForm();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar cliente.' });
    } finally {
      setLoading(false);
    }
  };

  const saveDeals = async (leadId: string) => {
    setSavingDeals(true);
    try {
      for (const row of dealRows) {
        if (row.id) {
          // Busca o status anterior para detectar mudança para Fechado
          const previousStatus = (selectedClient?.lead_deals || []).find(d => d.id === row.id)?.status;
          const isClosingDeal = isAdmin && row.status === 'Fechado' && previousStatus !== 'Fechado';

          // UPDATE: nunca sobrescreve partner_id
          const upd: any = {
            product_id: row.product_id || null,
            value: parseFloat(row.value.replace(',', '.')) || 0,
            pending_document_url: row.pending_document_url || null,
            partner_role: row.partner_role || 'Vendedor',
            completion_estimate_days: row.completion_estimate_days || 0,
          };
          if (isAdmin) {
            upd.status = row.status;
            upd.payment_method = row.payment_method || null;
            upd.payment_status = row.payment_status || 'Pendente'; // Added for admin
          } else if (row.status !== 'Fechado') {
            upd.status = row.status;
          }
          await supabase.from('lead_deals').update(upd).eq('id', row.id);

          // Auto-comissão: quando admin fecha o negócio
          if (isClosingDeal) {
            const correctPartnerId = selectedClient?.partner_id;
            if (correctPartnerId && row.product_id) {
              const { data: prodData } = await supabase
                .from('products')
                .select('payment_type, installment_config, commission_direct, commission_value, commission_captador, commission_indicator, commission_lvl1, commission_lvl2')
                .eq('id', row.product_id)
                .single();

              if (prodData?.payment_type === 'parcelado' && prodData?.installment_config) {
                const installments = (prodData.installment_config as any[])
                  .filter(inst => (inst.value || 0) > 0)
                  .map((inst, idx) => ({
                    deal_id: row.id,
                    installment_number: idx,
                    label: inst.label,
                    value: inst.value,
                    status: 'Pendente',
                    commissions_config: inst.commissions
                  }));
                if (installments.length > 0) {
                  await (supabase as any).from('deal_installments').insert(installments);
                }
              } else {
                // Para "À Vista", cria uma parcela única com as configurações de comissão
                const singleInstallment = {
                  deal_id: row.id,
                  installment_number: 0,
                  label: 'À Vista',
                  value: parseFloat(row.value.replace(',', '.')) || 0,
                  status: 'Pendente',
                  commissions_config: {
                    vendedor: prodData?.commission_direct || prodData?.commission_value || 0,
                    captador: prodData?.commission_captador || 0,
                    indicador: prodData?.commission_indicator || 0,
                    lvl1: prodData?.commission_lvl1 || 0,
                    lvl2: prodData?.commission_lvl2 || 0
                  }
                };
                await (supabase as any).from('deal_installments').insert([singleInstallment]);
              }
            }
          }
        } else {
          const correctPartnerId = selectedClient?.partner_id || user?.id as string;
          const leadCaptadorId = selectedClient?.captador_id;
          const ins: any = {
            lead_id: leadId,
            partner_id: correctPartnerId,
            captador_id: leadCaptadorId || null,
            product_id: row.product_id || null,
            value: parseFloat(row.value.replace(',', '.')) || 0,
            notes: row.notes || null,
            status: (!isAdmin && row.status === 'Fechado' ? 'Lead' : row.status),
            execution_status: row.execution_status || 'A iniciar',
            pending_description: row.pending_description || null,
            pending_document_url: row.pending_document_url || null,
            partner_role: row.partner_role || 'Vendedor',
            completion_estimate_days: row.completion_estimate_days || 0,
          };
          if (isAdmin) {
            ins.payment_method = row.payment_method || null;
            ins.payment_status = row.payment_status || 'Pendente'; // Added for admin
          }
          await supabase.from('lead_deals').insert([ins]);
        }
      }
    } finally {
      setSavingDeals(false);
    }
  };

  const handleDeleteDeal = async (dealId: string | undefined, idx: number) => {
    if (dealId) await supabase.from('lead_deals').delete().eq('id', dealId);
    setDealRows(r => r.filter((_, i) => i !== idx));
  };

  const handleDeleteLead = (id: string) => {
    setClientToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteLead = async () => {
    if (!clientToDelete) return;
    try {
      // 1. Localizar negócios deste cliente
      const { data: deals } = await supabase.from('lead_deals').select('id').eq('lead_id', clientToDelete);
      
      if (deals && deals.length > 0) {
        const dealIds = deals.map(d => d.id);
        
        // 2. Deletar parcelas vinculadas a estes negócios
        await supabase.from('deal_installments').delete().in('deal_id', dealIds);
        
        // 3. Deletar comissões vinculadas a estes negócios
        await supabase.from('commissions').delete().in('deal_id', dealIds);
        
        // 4. Deletar os negócios
        await supabase.from('lead_deals').delete().in('id', dealIds);
      }
      
      // 5. Deletar quaisquer comissões diretas ao cliente
      await supabase.from('commissions').delete().eq('lead_id', clientToDelete);

      // 6. Deletar o cliente
      const { error } = await supabase.from('leads').delete().eq('id', clientToDelete);
      
      if (error) throw error;

      setLeads(l => l.filter(x => x.id !== clientToDelete));
      setIsEditModalOpen(false);
      setDeleteConfirmOpen(false);
      setClientToDelete(null);
      setMessage({ type: 'success', text: 'Cliente excluído com sucesso.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting lead:', error);
      setMessage({ type: 'error', text: 'Erro ao excluir. O cliente possui vínculos pendentes.' });
    }
  };

  const addDealRow = () =>
    setDealRows(r => [...r, { 
      product_id: '', 
      status: 'Lead', 
      value: '0', 
      payment_method: '', 
      notes: '',
      execution_status: 'A iniciar',
      pending_description: '',
      pending_document_url: '',
      partner_role: 'Vendedor',
      payment_status: 'Pendente',
      completion_estimate_days: 0
    }]);

  const updRow = (i: number, f: keyof DealFormRow, v: string) =>
    setDealRows(r => r.map((row, idx) => idx === i ? { ...row, [f]: v } : row));

  const openDealModal = (deal?: DealFormRow, index?: number) => {
    if (deal && typeof index === 'number') {
      setTempDeal({ ...deal });
      setEditingDealIdx(index);
    } else {
      setTempDeal({
        product_id: '',
        status: 'Lead',
        value: '0',
        payment_method: '',
        notes: '',
        execution_status: 'A iniciar',
        pending_description: '',
        pending_document_url: '',
        partner_role: 'Vendedor',
        payment_status: 'Pendente',
        completion_estimate_days: 0
      });
      setEditingDealIdx(null);
    }
    setIsDealModalOpen(true);
  };

  const saveTempDeal = () => {
    if (editingDealIdx !== null) {
      setDealRows(r => r.map((row, idx) => idx === editingDealIdx ? tempDeal : row));
    } else {
      setDealRows(r => [...r, tempDeal]);
    }
    setIsDealModalOpen(false);
  };

  const resetForm = () => { 
    setFormData({ 
      name: '', email: '', phone: '',
      cpf: '', rg: '', birth_date: '', gender: '',
      address_zip_code: '', address_street: '', address_number: '',
      address_complement: '', address_neighborhood: '', address_city: '', address_state: ''
    }); 
    setDealRows([]); 
    setSelectedClient(null); 
  };

  const openAddModal = () => { resetForm(); setIsAddModalOpen(true); };
  const openEditModal = async (client: Lead) => {
    setSelectedClient(client);
    setFormData({ 
      name: client.name, 
      email: client.email, 
      phone: client.phone || '',
      cpf: (client as any).cpf || '',
      rg: (client as any).rg || '',
      birth_date: (client as any).birth_date || '',
      gender: (client as any).gender || '',
      address_zip_code: (client as any).address_zip_code || '',
      address_street: (client as any).address_street || '',
      address_number: (client as any).address_number || '',
      address_complement: (client as any).address_complement || '',
      address_neighborhood: (client as any).address_neighborhood || '',
      address_city: (client as any).address_city || '',
      address_state: (client as any).address_state || ''
    });
    await loadDealsForClient(client.id);
    setIsEditModalOpen(true);
  };

  const loadInstallments = async (dealId: string) => {
    setLoadingInstallments(prev => ({ ...prev, [dealId]: true }));
    const { data } = await (supabase as any)
      .from('deal_installments')
      .select('*')
      .eq('deal_id', dealId)
      .order('installment_number', { ascending: true });
    if (data) setDealInstallments(prev => ({ ...prev, [dealId]: data }));
    setLoadingInstallments(prev => ({ ...prev, [dealId]: false }));
  };

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else {
        s.add(id);
        // Ao expandir um cliente, podemos carregar parcelas de seus negócios fechados
        const lead = leads.find(l => l.id === id);
        lead?.lead_deals?.forEach(d => {
          if (d.status === 'Fechado') loadInstallments(d.id);
        });
      }
      return s;
    });
  };

  const filteredClients = React.useMemo(() => {
    return leads.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leads, searchTerm]);

  const allDeals = React.useMemo(() => {
    return leads.flatMap(lead => 
      (lead.lead_deals || []).map(deal => ({
        ...deal,
        lead_name: lead.name,
        lead_id: lead.id,
        partner_id: lead.partner_id,
        vendedor_name: (lead as any).profiles?.full_name || (lead as any).profiles?.email || 'Sist.',
        captador_name: (lead as any).captador?.full_name || (lead as any).captador?.email || null,
      }))
    ).filter(deal => 
      deal.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (deal.products?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leads, searchTerm]);

  const updateDealStatus = async (dealId: string, newStatus: string, date?: string) => {
    try {
      const deal = allDeals.find(d => d.id === dealId);
      const lead = leads.find(l => l.id === deal?.lead_id);
      if (!deal || !lead) return;

      const previousStatus = deal.status;
      if (!isAdmin && newStatus === 'Fechado') {
        throw new Error('Apenas administradores podem fechar negócios.');
      }

      const { data: prodData } = await supabase
        .from('products')
        .select('payment_type, installment_config, commission_value, commission_direct, commission_captador, commission_indicator, commission_lvl1, commission_lvl2')
        .eq('id', deal.product_id)
        .single();

      // Se for fechamento de produto parcelado e não temos a data, abrimos o modal
      if (isAdmin && newStatus === 'Fechado' && previousStatus !== 'Fechado' && prodData?.payment_type === 'parcelado' && !date) {
        setDealToClose({ id: dealId, newStatus });
        setIsClosingModalOpen(true);
        return;
      }

      const isClosingDeal = isAdmin && newStatus === 'Fechado' && previousStatus !== 'Fechado';

      const { error } = await supabase
        .from('lead_deals')
        .update({ 
          status: newStatus,
          payment_status: isClosingDeal ? 'Em Pagamento' : deal.payment_status
        })
        .eq('id', dealId);

      if (error) throw error;

      if (isClosingDeal && deal.product_id) {
        // Busca as configurações da InfinitePay
        const { data: settings } = await supabase.from('system_settings').select('infinitepay_tag').eq('id', 1).single();
        const infiniteTag = settings?.infinitepay_tag;

        // Prepara os dados do cliente para pré-preencher o checkout
        const formatPhone = (phone: string | null) => {
          if (!phone) return undefined;
          const digits = phone.replace(/\D/g, '');
          return digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
        };
        const customer = {
          name: lead.name || undefined,
          email: lead.email || undefined,
          phone_number: formatPhone(lead.phone)
        };

        if (prodData?.payment_type === 'parcelado' && prodData?.installment_config) {
          const startDate = date ? new Date(date) : new Date();
          const installments = [];
          const configArray = prodData.installment_config as any[];
          for (let idx = 0; idx < configArray.length; idx++) {
            const inst = configArray[idx];
            const value = inst.value;
            if (value <= 0) continue; // Skip zerored installments
            
            const dueDate = new Date(startDate);
            dueDate.setMonth(startDate.getMonth() + idx);
            
            let payment_link = null;
            if (infiniteTag) {
              try {
                // Chamada à Edge Function para gerar link dinâmico e real
                const { data: linkData, error: linkError } = await supabase.functions.invoke('generate-infinitepay-link', {
                  body: { 
                    dealId: deal.id, 
                    installmentIndex: idx, 
                    amount: value,
                    description: `Parcela ${idx + 1} - ${(prodData as any)?.name || 'Produto'}`,
                    customer
                  }
                });
                if (!linkError && linkData?.url) {
                  payment_link = linkData.url;
                } else {
                  console.error('Erro ao gerar link via API:', linkError);
                  // Fallback para link estático se a API falhar (com o novo formato detectado)
                  const formattedValue = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, useGrouping: false }).format(value);
                  payment_link = `https://pay.infinitepay.io/${infiniteTag}/${formattedValue}?metadata=${dealId}_${idx}`;
                }
              } catch (e) {
                console.error('Falha na invocação da função:', e);
              }
            }

            installments.push({
              deal_id: deal.id,
              installment_number: idx,
              label: inst.label,
              value: value,
              status: 'Pendente',
              due_date: dueDate.toISOString(),
              commissions_config: inst.commissions,
              payment_link: payment_link,
              payment_provider: 'infinitepay'
            });
          }
          if (installments.length > 0) {
            await (supabase as any).from('deal_installments').insert(installments);
          }
        } else {
          // Lógica À Vista vira 1 parcela única
          const startDate = date ? new Date(date) : new Date();

          let payment_link = null;
          if (infiniteTag && deal.value > 0) {
            try {
              const { data: linkData, error: linkError } = await supabase.functions.invoke('generate-infinitepay-link', {
                body: { 
                  dealId: deal.id, 
                  installmentIndex: 0, 
                  amount: deal.value,
                  description: `Pagamento à Vista - ${(prodData as any)?.name || 'Produto'}`,
                  customer
                }
              });
              if (!linkError && linkData?.url) {
                payment_link = linkData.url;
              } else {
                const formattedValue = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, useGrouping: false }).format(deal.value);
                payment_link = `https://pay.infinitepay.io/${infiniteTag}/${formattedValue}?metadata=${dealId}_0`;
              }
            } catch (e) {
              console.error('Erro link à vista:', e);
            }
          }
          
          if (payment_link) {
            await supabase.from('lead_deals').update({ payment_link }).eq('id', dealId);
          }
          
          const singleInstallment = {
              deal_id: deal.id,
              installment_number: 0,
              label: 'À Vista',
              value: deal.value,
              status: 'Pendente',
              due_date: startDate.toISOString(),
              commissions_config: {
                 vendedor: prodData?.commission_direct || prodData?.commission_value || 0,
                 captador: prodData?.commission_captador || 0,
                 indicador: prodData?.commission_indicator || 0,
                 lvl1: prodData?.commission_lvl1 || 0,
                 lvl2: prodData?.commission_lvl2 || 0
              },
              payment_link: payment_link,
              payment_provider: 'infinitepay'
          };
          
          await (supabase as any).from('deal_installments').insert([singleInstallment]);
        }
      }

      await loadData();
      setMessage({ type: 'success', text: 'Status atualizado!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar status.' });
    }
  };

  const copyTrackingLink = (leadId: string) => {
    const link = `${window.location.origin}/acompanhar/${leadId}`;
    navigator.clipboard.writeText(link);
    setMessage({ type: 'success', text: 'Link de acompanhamento copiado!' });
    setTimeout(() => setMessage(null), 3000);
  };


  const handleFaturarParcela = async (installment: any, deal: any, leadId: string) => {
    try {
      if (installment.status === 'Pago') return;
      setLoading(true);

      // 1. Marcar parcela como paga
      const { error: updError } = await (supabase as any)
        .from('deal_installments')
        .update({ status: 'Pago', paid_at: new Date().toISOString() })
        .eq('id', installment.id);
      if (updError) throw updError;

      // 2. Gerar comissões configuradas para esta parcela via RPC (unificado)
      const { error: rpcError } = await (supabase as any).rpc('fn_generate_commissions_for_installment', { 
        p_installment_id: installment.id 
      });

      if (rpcError) {
        throw new Error('Falha ao gerar comissões via RPC: ' + rpcError.message);
      }

      setMessage({ type: 'success', text: 'Parcela faturada e comissões geradas!' });
      loadInstallments(deal.id);
      await loadData();
    } catch (error: any) {
      console.error('Erro ao faturar parcela:', error);
      setMessage({ type: 'error', text: 'Erro ao faturar parcela: ' + error.message });
    } finally {
      setLoading(false);
    }
  };
  
  // ─── Input Masking ────────────────────────────────────────────────────────
  const maskCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').substring(0, 14);
  const maskPhone = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 15);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-full mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Meus Clientes</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-indigo-500/70" />
            Gerenciamento simplificado da sua carteira comercial.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
            <button onClick={() => setViewMode('list')}
              className={cn("px-4 py-2 text-xs font-semibold rounded-lg transition-all", 
                viewMode === 'list' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50")}>
              Lista
            </button>
            <button onClick={() => setViewMode('kanban')}
              className={cn("px-4 py-2 text-xs font-semibold rounded-lg transition-all", 
                viewMode === 'kanban' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50")}>
              Kanban
            </button>
          </div>
          <button onClick={openAddModal} className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-sm active:scale-[0.98] text-sm whitespace-nowrap">
            <UserPlus className="w-5 h-5 mr-2" />Novo Cliente
          </button>
        </div>
      </div>

      {/* Quick Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50/50 flex items-center justify-center group-hover:bg-indigo-600 transition-colors duration-300">
            <Users className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total de Clientes</p>
            <p className="text-xl font-semibold text-slate-900">{leads.length}</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-amber-50/50 flex items-center justify-center group-hover:bg-amber-600 transition-colors duration-300">
            <TrendingUp className="w-6 h-6 text-amber-600 group-hover:text-white transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Negócios Ativos</p>
            <p className="text-xl font-semibold text-slate-900">
              {leads.reduce((acc, lead) => acc + (lead.lead_deals?.filter(d => d.status !== 'Fechado' && d.status !== 'Perdido').length || 0), 0)}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50/50 flex items-center justify-center group-hover:bg-emerald-600 transition-colors duration-300">
            <DollarSign className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Valor em Pipeline</p>
            <p className="text-xl font-semibold text-slate-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                leads.reduce((acc, lead) => acc + (lead.lead_deals?.filter(d => d.status !== 'Fechado' && d.status !== 'Perdido').reduce((s, deal) => s + (Number(deal.value) || 0), 0) || 0), 0)
              )}
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className={cn("p-4 rounded-xl flex items-center gap-3 text-sm font-medium",
          message.type === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Clients Selection (List or Kanban) */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-50 bg-slate-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-indigo-500 rounded-full" />
              <h2 className="text-lg font-semibold text-slate-800">Carteira de Clientes</h2>
              <span className="text-[10px] font-semibold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full">{leads.length}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-80 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input type="text" placeholder="Pesquisar por nome ou e-mail..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 w-full transition-all" />
              </div>
              <button className="p-2 bg-white border border-slate-100 text-slate-400 rounded-xl hover:bg-slate-50 hover:text-slate-600 transition-all shadow-sm active:scale-[0.95]">
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 flex flex-col items-center text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                Carregando clientes...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum cliente encontrado.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/50 text-slate-400 font-medium border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3.5 w-8"></th>
                    <th className="px-4 py-3.5">Cliente</th>
                    <th className="px-4 py-3.5">Contato</th>
                    {isAdmin && <th className="px-4 py-3.5">Parceiro</th>}
                    <th className="px-4 py-3.5">Negócios</th>
                    <th className="px-4 py-3.5">Cadastro</th>
                    <th className="px-4 py-3.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => {
                    const deals = client.lead_deals || [];
                    const isExpanded = expandedRows.has(client.id);
                    return (
                      <React.Fragment key={client.id}>
                        {/* Client row */}
                        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <button onClick={() => toggleExpand(client.id)}
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <div className={cn("font-medium truncate", 
                              deals.some(d => d.payment_status === 'Em Pagamento') ? "text-violet-600" : "text-slate-900"
                            )}>
                              {client.name}
                            </div>
                          </td>
                          {(isAdmin || isPartner) && (
                            <td className="px-4 py-3 text-xs text-slate-600">
                              <div className="flex flex-col gap-2">
                                {/* Vendedor */}
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Vendedor</span>
                                  <span className="font-medium text-slate-700">
                                    {client.profiles?.full_name || client.profiles?.email || '-'}
                                  </span>
                                </div>
                                {/* Captador (se existir) */}
                                {client.captador && (
                                  <div className="flex flex-col pt-1 border-t border-slate-100/50">
                                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">Captador</span>
                                    <span className="font-medium text-slate-700">
                                      {Array.isArray(client.captador) 
                                        ? (client.captador[0]?.full_name || client.captador[0]?.email || '-')
                                        : ((client.captador as any).full_name || (client.captador as any).email || '-')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              {deals.length === 0 ? (
                                <span className="text-xs text-slate-400 italic">Nenhum negócio</span>
                              ) : (
                                <div className="space-y-3">
                                  {deals.slice(0, 2).map((d, idx) => (
                                    <div key={d.id} className={cn(
                                      "flex flex-col gap-1.5 pb-2",
                                      idx === 0 && deals.length > 1 ? "border-b border-slate-100/50" : ""
                                    )}>
                                      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider truncate max-w-[150px]">
                                        {d.products?.name || 'Produto'}
                                      </span>
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-tight border shadow-none", 
                                          STATUS_STYLE[d.status] || 'bg-slate-50 text-slate-500 border-slate-100/50'
                                        )}>
                                          {d.status}
                                        </span>
                                        <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase border shadow-none", 
                                            PAYMENT_STATUS_STYLE[d.payment_status || 'Pendente']?.color || 'bg-slate-50 text-slate-500 border-slate-100/50')}>
                                            {(() => {
                                              const Icon = PAYMENT_STATUS_STYLE[d.payment_status || 'Pendente']?.icon || Clock;
                                              return <Icon className="w-2.5 h-2.5" />;
                                            })()}
                                            {d.payment_status || 'Pendente'}
                                          </span>
                                        {d.status === 'Fechado' && (
                                          <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase border shadow-none", 
                                            EXECUTION_STATUS_STYLE[d.execution_status || 'A iniciar']?.color || 'bg-slate-50 text-slate-500 border-slate-100/50')}>
                                            {(() => {
                                              const Icon = EXECUTION_STATUS_STYLE[d.execution_status || 'A iniciar']?.icon || Clock;
                                              return <Icon className="w-2.5 h-2.5" />;
                                            })()}
                                            {d.execution_status || 'A iniciar'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  {deals.length > 2 && (
                                    <div className="pt-1">
                                      <span className="bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full text-[8px] font-semibold border border-slate-100">
                                        +{deals.length - 2} mais negócios
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {new Date(client.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => openEditModal(client)}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
                              {isCaptador ? 'Visualizar' : 'Editar'}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded deals rows */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={isAdmin ? 7 : 6} className="px-8 py-8">
                              <div className="animate-in slide-in-from-top-2 duration-300 ease-out">
                                <div className="w-full">
                                  <div className="flex items-center justify-between mb-4">
                                    <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                      <ShoppingBag className="w-4 h-4 text-indigo-500/60" /> Histórico de Negociações
                                    </h5>
                                    <button onClick={() => openEditModal(client)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50/50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100/50">
                                      <Plus className="w-3.5 h-3.5" />Gerenciar Negócios
                                    </button>
                                  </div>

                                  {deals.length === 0 ? (
                                    <div className="bg-slate-50/50 rounded-2xl border border-dashed border-slate-100 p-8 text-center">
                                      <Package className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                                      <p className="text-sm text-slate-400 font-medium">Nenhum negócio registrado ainda.</p>
                                    </div>
                                  ) : (
                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                      <table className="w-full text-xs text-left">
                                        <thead>
                                          <tr className="bg-slate-50/50 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
                                            <th className="px-5 py-3.5">Produto / Serviço</th>
                                            <th className="px-5 py-3.5">Status Comercial</th>
                                            <th className="px-5 py-3.5">Execução</th>
                                            <th className="px-5 py-3.5">Valor Bruto</th>
                                            {isAdmin && <th className="px-5 py-3.5">Pagamento</th>}
                                            <th className="px-5 py-3.5 text-right">Ação</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                          {deals.map((d) => (
                                            <React.Fragment key={d.id}>
                                              <tr className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-5 py-4 max-w-[300px]">
                                                  <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-slate-50 rounded overflow-hidden flex items-center justify-center shrink-0 border border-slate-100">
                                                      {d.products?.image_url ? (
                                                        <img src={d.products.image_url} alt={d.products.name} className="w-full h-full object-cover" />
                                                      ) : (
                                                        <Package className="w-4 h-4 text-slate-300" />
                                                      )}
                                                    </div>
                                                    <div className="min-w-0">
                                                      <div className="font-semibold text-slate-800 tracking-tight truncate">{d.products?.name || '—'}</div>
                                                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{d.notes || 'Sem observações'}</div>
                                                    </div>
                                                  </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                  <span className={cn("inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-tighter border", 
                                                    STATUS_STYLE[d.status] || 'bg-slate-100 text-slate-700 border-slate-100')}>
                                                    {d.status}
                                                  </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                  <div className="flex items-center gap-2">
                                                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border shadow-none", 
                                                      EXECUTION_STATUS_STYLE[d.execution_status || 'A iniciar']?.color || 'bg-slate-50 text-slate-500 border-slate-100/50')}>
                                                      {(() => {
                                                        const Icon = EXECUTION_STATUS_STYLE[d.execution_status || 'A iniciar']?.icon || Clock;
                                                        return <Icon className="w-3 h-3" />;
                                                      })()}
                                                      {d.execution_status || 'A iniciar'}
                                                    </span>
                                                    {d.execution_status === 'Pendenciado' && d.pending_description && (
                                                      <div className="group/info relative">
                                                        <Info className="w-4 h-4 text-amber-500 cursor-help transition-transform hover:scale-110" />
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-900 text-white text-[11px] rounded-xl opacity-0 group-hover/info:opacity-100 transition-all pointer-events-none z-[70] shadow-2xl">
                                                          <p className="font-black mb-1.5 text-amber-400 uppercase tracking-widest text-[9px]">Motivo da Pendência</p>
                                                          <p className="font-medium text-slate-300 leading-relaxed">{d.pending_description}</p>
                                                          {d.pending_document_url && (
                                                            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                                                              <span className="text-white/40">Anexo disponível</span>
                                                              <a href={d.pending_document_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 pointer-events-auto flex items-center gap-1 font-bold">
                                                                Ver Doc <ExternalLink className="w-3 h-3" />
                                                              </a>
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="px-5 py-4 font-semibold text-slate-600 tabular-nums">
                                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.value)}
                                                </td>
                                                {isAdmin && <td className="px-5 py-4 text-slate-400 font-medium text-[10px]">{d.payment_method || '—'}</td>}
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                      {d.payment_link && (
                                                        <>
                                                          <button 
                                                            onClick={() => {
                                                              navigator.clipboard.writeText(d.payment_link);
                                                              setMessage({ type: 'success', text: 'Link de pagamento copiado!' });
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                            title="Copiar Link de Pagamento"
                                                          >
                                                            <Copy className="w-4 h-4" />
                                                          </button>
                                                          <a 
                                                            href={d.payment_link} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                            title="Abrir Checkout"
                                                          >
                                                            <ExternalLink className="w-4 h-4" />
                                                          </a>
                                                        </>
                                                      )}
                                                      <button onClick={() => copyTrackingLink(client.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100" title="Link de Acompanhamento">
                                                        <LinkIcon className="w-4 h-4" />
                                                      </button>
                                                    {isAdmin && d.status === 'Fechado' && !dealInstallments[d.id] && (
                                                      <button 
                                                        onClick={async () => {
                                                          const { data: insts } = await (supabase as any).from('deal_installments').select('id, status').eq('deal_id', d.id);
                                                          const pending = insts?.find((i: any) => i.status !== 'Pago');
                                                          if (pending) {
                                                            handleFaturarParcela(pending, d, client.id);
                                                          } else {
                                                            setMessage({ type: 'success', text: 'Todas as parcelas já estão pagas.' });
                                                          }
                                                        }}
                                                        className="px-3 py-1.5 bg-indigo-600/90 text-white rounded-lg text-[10px] font-semibold hover:bg-indigo-700 transition-all shadow-sm uppercase tracking-tighter"
                                                      >
                                                        Faturar
                                                      </button>
                                                    )}
                                                  </div>
                                                </td>
                                              </tr>
                                              {/* Installments Sub-table */}
                                              {dealInstallments[d.id] && (
                                                <tr className="bg-slate-50/30">
                                                  <td colSpan={isAdmin ? 6 : 5} className="px-10 py-4">
                                                    <div className="border border-indigo-100/30 rounded-xl overflow-hidden bg-white/50">
                                                      <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-100/30 flex justify-between items-center">
                                                        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">Cronograma de Parcelas</span>
                                                        <div className="flex items-center gap-3">
                                                          <span className="text-[9px] text-slate-500">Compra: <strong className="text-slate-700">{new Date(d.created_at).toLocaleDateString('pt-BR')}</strong></span>
                                                          {loadingInstallments[d.id] && <div className="w-3 h-3 border border-indigo-600 border-t-transparent animate-spin rounded-full" />}
                                                        </div>
                                                      </div>
                                                      <table className="w-full text-[10px]">
                                                        <thead>
                                                          <tr className="text-slate-400 border-b border-slate-100">
                                                            <th className="px-4 py-2 font-semibold">Parcela</th>
                                                            <th className="px-4 py-2 font-semibold">Vencimento</th>
                                                            <th className="px-4 py-2 font-semibold">Valor</th>
                                                            <th className="px-4 py-2 font-semibold">Status</th>
                                                            {isAdmin && <th className="px-4 py-2 text-right">Ação</th>}
                                                          </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                          {dealInstallments[d.id].map((inst) => (
                                                            <tr key={inst.id} className="hover:bg-white/80 transition-colors">
                                                              <td className="px-4 py-2 font-medium text-slate-700">{inst.label}</td>
                                                              <td className="px-4 py-2 text-slate-500">
                                                                {inst.due_date ? new Date(inst.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'}
                                                              </td>
                                                              <td className="px-4 py-2 font-bold text-slate-900">
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.value)}
                                                              </td>
                                                              <td className="px-4 py-2 text-center items-center">
                                                                <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-bold uppercase", 
                                                                  inst.status === 'Pago' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                                                                  {inst.status}
                                                                </span>
                                                              </td>
                                                              {isAdmin && (
                                                                <td className="px-4 py-2 text-right">
                                                                  <div className="flex items-center justify-end gap-2">
                                                                    {inst.payment_link && inst.status !== 'Pago' && (
                                                                      <>
                                                                        <button 
                                                                          onClick={() => {
                                                                            navigator.clipboard.writeText(inst.payment_link);
                                                                            setMessage({ type: 'success', text: 'Link copiado!' });
                                                                          }}
                                                                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                                                                          title="Copiar Link"
                                                                        >
                                                                          <Copy className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <a 
                                                                          href={inst.payment_link} 
                                                                          target="_blank" 
                                                                          rel="noopener noreferrer"
                                                                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                          title="Abrir Checkout"
                                                                        >
                                                                          <ExternalLink className="w-3.5 h-3.5" />
                                                                        </a>
                                                                      </>
                                                                    )}
                                                                    {inst.status !== 'Pago' ? (
                                                                      <button 
                                                                        onClick={() => handleFaturarParcela(inst, d, client.id)}
                                                                        className="px-2 py-1 bg-slate-900 text-white rounded md text-[8px] font-bold hover:bg-black uppercase tracking-tighter"
                                                                      >
                                                                        Faturar
                                                                      </button>
                                                                    ) : (
                                                                      <span className="text-emerald-500 font-bold text-[8px] uppercase tracking-widest">Quitado</span>
                                                                    )}
                                                                  </div>
                                                                </td>
                                                              )}
                                                            </tr>
                                                          ))}
                                                        </tbody>
                                                      </table>
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}
                                            </React.Fragment>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-indigo-500 rounded-full" />
              <h2 className="text-lg font-semibold text-slate-800">Pipeline de Negócios</h2>
              <span className="text-[10px] font-semibold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full">{allDeals.length}</span>
            </div>
            <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
              <input type="text" placeholder="Filtrar por cliente ou produto..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 w-full transition-all shadow-sm" />
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
            {stages.map(stage => {
              const stageDeals = allDeals.filter(d => d.status === (stage.id === 'negociacao' ? 'Em Negociação' : stage.name));
              return (
                <div key={stage.id} className="flex-shrink-0 w-80 flex flex-col bg-slate-50/50 rounded-2xl border border-slate-100 max-h-[75vh] shadow-sm">
                  <div className="p-4 border-b border-slate-100 bg-white/50 rounded-t-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.15em]">{stage.name}</h3>
                      </div>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-lg border border-slate-100">{stageDeals.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 tracking-tight">
                      <span className="text-slate-400 font-medium text-[10px]">Total:</span>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0)
                      )}
                    </div>
                  </div>

                  <div className="p-3 space-y-4 overflow-y-auto custom-scrollbar">
                    {(stageDeals as any[]).map(deal => (
                      <div key={deal.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: stage.color }} />
                        
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-[9px] text-slate-300 font-semibold uppercase tracking-wider mb-0.5">Cliente</p>
                            <div className="flex flex-col gap-1">
                              <p className={cn("text-sm font-semibold line-clamp-1 leading-tight tracking-tight", 
                                deal.payment_status === 'Em Pagamento' ? "text-violet-600" : "text-slate-700"
                              )}>
                                {deal.lead_name}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 flex items-center gap-1">
                                  <div className="w-1 h-1 rounded-full bg-slate-300" /> VENDEDOR: {deal.vendedor_name || 'Sist.'}
                                </span>
                                {deal.captador_name && (
                                  <span className="text-[7px] font-bold text-violet-600 uppercase tracking-widest bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100/50 flex items-center gap-1">
                                    <div className="w-1 h-1 rounded-full bg-violet-400" /> CAPTADOR: {deal.captador_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 translate-x-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                copyTrackingLink(deal.lead_id);
                              }}
                              className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Copiar Link"
                            >
                              <LinkIcon className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => {
                              const l = leads.find(x => x.id === deal.lead_id);
                              if (l) openEditModal(l);
                            }} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                               <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100/50">
                            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 overflow-hidden shrink-0">
                              {deal.products?.image_url ? (
                                <img src={deal.products.image_url} alt={deal.products.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-5 h-5 text-indigo-500/70" />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-medium text-slate-500 line-clamp-1">{deal.products?.name || 'Sem Produto'}</span>
                              {deal.products?.payment_type && (
                                <span className={cn("text-[7px] font-bold uppercase tracking-widest w-fit px-1 rounded",
                                  deal.products.payment_type === 'parcelado' ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50"
                                )}>
                                  {deal.products.payment_type === 'parcelado' ? 'Parcelado' : 'À Vista'}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <p className="text-[9px] text-slate-300 font-semibold uppercase tracking-wider">Valor do Negócio</p>
                              <span className="text-sm font-semibold text-slate-700 tabular-nums">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.value)}
                              </span>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold uppercase tracking-tighter border shadow-sm", 
                                EXECUTION_STATUS_STYLE[deal.execution_status || 'A iniciar']?.color || 'bg-slate-50 text-slate-500 border-slate-100')}>
                                {deal.execution_status || 'A iniciar'}
                              </span>
                              <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase border shadow-sm", 
                                PAYMENT_STATUS_STYLE[deal.payment_status || 'Pendente']?.color || 'bg-slate-50 text-slate-500 border-slate-100')}>
                                {(() => {
                                  const Icon = PAYMENT_STATUS_STYLE[deal.payment_status || 'Pendente']?.icon || Clock;
                                  return <Icon className="w-2.5 h-2.5" />;
                                })()}
                                {deal.payment_status || 'Pendente'}
                              </span>
                            </div>
                          </div>
                          
                          <div className={cn("pt-2 space-y-2", !isAdmin && deal.status === 'Fechado' && "hidden")}>
                            <div className="relative group/select">
                              <select 
                                value={deal.status}
                                onChange={(e) => updateDealStatus(deal.id, !isAdmin && e.target.value === 'Fechado' ? deal.status : e.target.value)}
                                className="w-full appearance-none bg-slate-50/50 border border-slate-100 hover:border-indigo-200 rounded-xl px-3 py-2 text-[10px] font-semibold text-slate-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-center uppercase tracking-widest cursor-pointer"
                              >
                                {stages.filter(s => isAdmin || (s.id !== 'Fechado' && s.name !== 'Fechado')).map(s => (
                                  <option key={s.id} value={s.id === 'negociacao' ? 'Em Negociação' : s.name}>
                                    MOVER: {s.name}
                                  </option>
                                ))}
                              </select>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover/select:text-indigo-400 transition-colors">
                                <ChevronDown className="w-3 h-3" />
                              </div>
                            </div>

                            {isAdmin && deal.status === 'Fechado' && deal.payment_status !== 'Pago' && (
                              <button 
                                onClick={async () => {
                                  // Se for à vista, faturar a parcela correspondente
                                  const { data: insts } = await (supabase as any).from('deal_installments').select('id, status').eq('deal_id', deal.id);
                                  const pending = insts?.find((i: any) => i.status !== 'Pago');
                                  if (pending) {
                                    handleFaturarParcela(pending, deal, deal.lead_id);
                                  } else {
                                    setMessage({ type: 'success', text: 'Todas as parcelas já estão pagas.' });
                                  }
                                }}
                                className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-[10px] font-semibold hover:bg-black transition-all shadow-sm uppercase tracking-[0.2em] flex items-center justify-center gap-2 group/btn"
                              >
                                <TrendingUp className="w-3.5 h-3.5 text-indigo-400/80 group-hover:scale-110 transition-transform" />
                                Faturar Proposta
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {stageDeals.length === 0 && (
                      <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-lg">
                        <p className="text-[10px] text-slate-400">Nenhum negócio aqui</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}




      {/* Add/Edit Client Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[4px] animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 border border-slate-100">
            <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600/90 rounded-2xl flex items-center justify-center shadow-sm">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 tracking-tight">
                    {isEditModalOpen ? 'Gestão de Cliente' : 'Novo Alinhamento Comercial'}
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                    {isEditModalOpen ? 'Atualize as informações do parceiro' : 'Preencha os dados do novo lead estratégico'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                className="text-slate-300 hover:text-slate-900 p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveLead}>
              <div className="p-8 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Personal info */}
                <div className="space-y-10">
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Informações de Contato</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { label: 'Nome Completo', field: 'name', type: 'text', placeholder: 'Ex: João Silva' },
                        { label: 'E-mail Corporativo', field: 'email', type: 'email', placeholder: 'joao@empresa.com' },
                        { label: 'WhatsApp / Celular', field: 'phone', type: 'tel', placeholder: '(00) 00000-0000' },
                      ].map(({ label, field, type, placeholder }) => (
                        <div key={field} className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">{label}</label>
                          <input type={type} required={field !== 'phone'} placeholder={placeholder}
                            value={(formData as any)[field]}
                            onChange={e => {
                              let val = e.target.value;
                              if (field === 'phone') val = maskPhone(val);
                              setFormData({ ...formData, [field]: val });
                            }}
                            readOnly={isCaptador && isEditModalOpen}
                            className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all placeholder:text-slate-300 read-only:opacity-70 read-only:cursor-default" />
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Documentação Pessoal</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">CPF</label>
                        <input type="text" placeholder="000.000.000-00"
                          value={formData.cpf}
                          onChange={e => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                          readOnly={isCaptador && isEditModalOpen}
                          className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all read-only:opacity-70" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">RG</label>
                        <input type="text" placeholder="00.000.000-0"
                          value={formData.rg}
                          onChange={e => setFormData({ ...formData, rg: e.target.value })}
                          readOnly={isPartner && isEditModalOpen}
                          className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all read-only:opacity-70" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Data de Nascimento</label>
                        <input type="date"
                          value={formData.birth_date}
                          onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                          readOnly={isPartner && isEditModalOpen}
                          className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all read-only:opacity-70" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Gênero</label>
                        <select
                          value={formData.gender}
                          onChange={e => setFormData({ ...formData, gender: e.target.value })}
                          disabled={isCaptador && isEditModalOpen}
                          className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all appearance-none cursor-pointer disabled:opacity-70"
                        >
                          <option value="">Selecione...</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                          <option value="Outro">Outro</option>
                          <option value="Prefiro não dizer">Prefiro não dizer</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-1 h-4 bg-amber-500 rounded-full" />
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Endereço Residencial</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-6">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">CEP</label>
                        <input type="text" placeholder="00000-000"
                          value={formData.address_zip_code}
                          onChange={e => setFormData({ ...formData, address_zip_code: e.target.value })}
                          readOnly={isPartner && isEditModalOpen}
                          className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all read-only:opacity-70" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-3">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Logradouro</label>
                        <input type="text" placeholder="Nome da rua ou avenida"
                          value={formData.address_street}
                          onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                          readOnly={isPartner && isEditModalOpen}
                          className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all read-only:opacity-70" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Nº</label>
                        <input type="text" placeholder="Ex: 123"
                          value={formData.address_number}
                          onChange={e => setFormData({ ...formData, address_number: e.target.value })}
                          readOnly={isPartner && isEditModalOpen}
                          className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all read-only:opacity-70" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Complemento</label>
                        <input type="text" placeholder="Apto, Bloco, etc."
                          value={formData.address_complement}
                          onChange={e => setFormData({ ...formData, address_complement: e.target.value })}
                          readOnly={isPartner && isEditModalOpen}
                          className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all read-only:opacity-70" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Bairro</label>
                        <input type="text" placeholder="Ex: Centro"
                          value={formData.address_neighborhood}
                          onChange={e => setFormData({ ...formData, address_neighborhood: e.target.value })}
                          readOnly={isPartner && isEditModalOpen}
                          className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all read-only:opacity-70" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Cidade</label>
                        <input type="text"
                          value={formData.address_city}
                          onChange={e => setFormData({ ...formData, address_city: e.target.value })}
                          readOnly={isPartner && isEditModalOpen}
                          className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all read-only:opacity-70" />
                      </div>
                      <div className="space-y-1.5 text-center">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">UF</label>
                        <input type="text" maxLength={2} placeholder="SP"
                          value={formData.address_state}
                          onChange={e => setFormData({ ...formData, address_state: e.target.value.toUpperCase() })}
                          className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all text-center uppercase" />
                      </div>
                    </div>
                  </section>
                </div>

                <hr className="border-slate-100" />

                {/* Business History area refined */}
                <section className="mt-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-4 bg-indigo-900/60 rounded-full" />
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Histórico de Produtos / Serviços
                        <span className="text-[10px] font-semibold text-white bg-indigo-500 px-2 py-0.5 rounded-md">{dealRows.length}</span>
                      </h4>
                    </div>
                    {(!isCaptador || isAddModalOpen) && (
                      <button type="button" onClick={() => openDealModal()}
                        className="inline-flex items-center px-4 py-2 text-[11px] font-semibold text-indigo-600 bg-indigo-50/50 rounded-xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100/50 uppercase tracking-tighter shadow-sm">
                        <Plus className="w-4 h-4 mr-1.5" />Adicionar Lançamento
                      </button>
                    )}
                  </div>

                  {dealRows.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200/60 p-8">
                      <Package className="w-10 h-10 mx-auto mb-3 text-slate-300 opacity-50" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhuma proposta ativa para este cliente</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dealRows.map((deal, i) => (
                        <div key={deal.id || i} 
                          className="bg-white border border-slate-100 p-5 rounded-[1.5rem] hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden">
                          <div className={cn("absolute top-0 right-0 p-3 opacity-5", 
                            deal.status === 'Fechado' ? 'text-emerald-500' : 'text-amber-500')}>
                            <ShoppingBag className="w-12 h-12" />
                          </div>
                          
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1 min-w-0">
                               <p className="text-[9px] text-slate-300 font-semibold uppercase tracking-wider mb-0.5">Solução / Produto</p>
                               <p className="text-sm font-semibold text-slate-700 truncate mb-2">
                               {products.find(p => p.id === deal.product_id)?.name || 'Produto Não Identificado'}
                              </p>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-wider bg-indigo-50/50 px-1.5 py-0.5 rounded border border-indigo-100/50">
                                  {deal.partner_role || 'Vendedor'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={cn("px-2.5 py-0.5 rounded-lg text-[9px] font-semibold uppercase tracking-tighter border shadow-sm",
                                  deal.status === 'Fechado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                  deal.status === 'Perdido' ? 'bg-red-50 text-red-600 border-red-100' :
                                  'bg-amber-50 text-amber-600 border-amber-100'
                                )}>
                                  {deal.status}
                                </span>
                                <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase border shadow-sm",
                                  PAYMENT_STATUS_STYLE[deal.payment_status || 'Pendente']?.color || 'bg-slate-50 text-slate-500 border-slate-100'
                                )}>
                                  {(() => {
                                    const Icon = PAYMENT_STATUS_STYLE[deal.payment_status || 'Pendente']?.icon || Clock;
                                    return <Icon className="w-3 h-3" />;
                                  })()}
                                  {deal.payment_status || 'Pendente'}
                                </span>
                                <span className="text-xs font-semibold text-slate-900 tabular-nums ml-auto">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(deal.value) || 0)}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => openDealModal(deal, i)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-md rounded-xl transition-all border border-transparent hover:border-slate-100">
                                {(isCaptador || isVendedor) ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                              </button>
                              {!(isCaptador || isVendedor) && (
                                <button type="button" onClick={() => handleDeleteDeal(deal.id, i)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-white hover:shadow-md rounded-xl transition-all border border-transparent hover:border-slate-100">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          {deal.notes && (
                            <p className="text-[11px] text-slate-500 italic leading-relaxed line-clamp-2 border-t border-slate-50 pt-3">
                              "{deal.notes}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Footer refined */}
            <div className="p-8 bg-slate-50/50 backdrop-blur-sm border-t border-slate-100 flex justify-between items-center rounded-b-[2rem]">
                {isEditModalOpen && selectedClient ? (
                  <button type="button" onClick={() => handleDeleteLead(selectedClient.id)}
                    className="text-[10px] font-semibold text-red-300 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-2">
                    <Trash2 className="w-3.5 h-3.5" /> Excluir Cliente Permanente
                  </button>
                ) : <div />}
                <div className="flex gap-6 items-center">
                  <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">
                    {(isCaptador || isVendedor) && isEditModalOpen ? 'Fechar' : 'Descartar Alterações'}
                  </button>
                  <button type="submit" disabled={loading || savingDeals}
                    className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-sm transition-all uppercase tracking-[0.1em] text-[11px] disabled:opacity-50 active:scale-[0.98]">
                    {loading || savingDeals ? 'Sincronizando...' : 'Confirmar e Salvar Dados'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deal Pop-up Modal */}
      {isDealModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[4px] animate-in fade-in duration-300">
          <div className="bg-white rounded-[1.5rem] shadow-xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="flex items-center justify-between p-7 border-b border-slate-100 bg-slate-50/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600/90 rounded-xl flex items-center justify-center shadow-sm">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 tracking-tight">
                    {editingDealIdx !== null ? 'Configurar Negócio' : 'Novo Lançamento'}
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Defina os parâmetros financeiros</p>
                </div>
              </div>
              <button onClick={() => setIsDealModalOpen(false)} className="text-slate-300 hover:text-slate-900 p-2 rounded-xl hover:bg-white transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-7 space-y-7 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Solução / Produto</label>
                  <select 
                    value={tempDeal.product_id}
                    onChange={e => {
                      const productId = e.target.value;
                      const prod = products.find(p => p.id === productId);
                      setTempDeal({
                        ...tempDeal,
                        product_id: productId,
                        value: prod?.price ? prod.price.toString() : (tempDeal.value || '0')
                      });
                    }}
                    disabled={(!isAdmin && !isVendedor) && !!tempDeal.id}
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">Selecione o produto estratégico...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Papel no Negócio</label>
                  <select 
                    value={tempDeal.partner_role}
                    onChange={e => setTempDeal({...tempDeal, partner_role: e.target.value})}
                    disabled={(isCaptador || isVendedor) && isEditModalOpen}
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all appearance-none cursor-pointer uppercase tracking-tighter disabled:opacity-70"
                  >
                    <option value="Vendedor">Sou o Vendedor</option>
                    <option value="Captador">Sou o Captador</option>
                    <option value="Indicador">Sou o Indicador</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Estágio Atual</label>
                  {!isAdmin && tempDeal.status === 'Fechado' ? (
                    <div className="px-4 py-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl text-sm font-semibold text-emerald-600 flex items-center gap-2 uppercase tracking-tighter shadow-sm">
                      <CheckCircle2 className="w-4 h-4" /> STATUS: Fechado
                    </div>
                  ) : (
                    <select 
                      value={tempDeal.status}
                      onChange={e => setTempDeal({...tempDeal, status: e.target.value})}
                      disabled={(isCaptador || isVendedor) && isEditModalOpen}
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all appearance-none cursor-pointer uppercase tracking-tighter disabled:opacity-70"
                    >
                      <option value="Lead">Lead</option>
                      <option value="Em Negociação">Em Negociação</option>
                      {isAdmin && <option value="Fechado">Fechado</option>}
                      <option value="Perdido">Perdido</option>
                    </select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Valor Unitário / Total</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-semibold group-focus-within:text-indigo-500 transition-colors">R$</span>
                    <input 
                      type="number" step="0.01"
                      value={tempDeal.value}
                      onChange={e => setTempDeal({...tempDeal, value: e.target.value})}
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all tabular-nums"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Prazo de Conclusão (Dias Úteis)</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="number" min="0"
                      value={tempDeal.completion_estimate_days}
                      onChange={e => setTempDeal({...tempDeal, completion_estimate_days: parseInt(e.target.value) || 0})}
                      placeholder="Ex: 5"
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-xl pl-11 pr-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {(isAdmin || isVendedor) && (
                <div className="space-y-6 pt-6 border-t border-slate-100">
                   <div className="flex items-center gap-3 mb-2">
                    <div className="w-1 h-3.5 bg-emerald-500 rounded-full" />
                    <h5 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em]">Painel de Controle Admin</h5>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Status de Pagamento</label>
                      <select 
                        value={tempDeal.payment_status}
                        onChange={e => setTempDeal({...tempDeal, payment_status: e.target.value as any})}
                        className={cn("w-full border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all cursor-pointer uppercase tracking-tight",
                          tempDeal.payment_status === 'Pago' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          tempDeal.payment_status === 'Cancelado' ? "bg-red-50 text-red-700 border-red-200" :
                          "bg-amber-50 text-amber-700 border-amber-200"
                        )}
                      >
                        <option value="Pendente">🟡 Pendente</option>
                        <option value="Pago">🟢 Pago</option>
                        <option value="Cancelado">🔴 Cancelado</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Meio de Recebimento</label>
                      <select 
                        value={tempDeal.payment_method}
                        onChange={e => setTempDeal({...tempDeal, payment_method: e.target.value})}
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all cursor-pointer"
                      >
                        <option value="">— Formato —</option>
                        <option value="Pix">Pix</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Boleto">Boleto</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Transferência Bancária">Transferência Bancária</option>
                        <option value="Parcelado">Parcelado (outro)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Execução Técnica</label>
                      <select 
                        value={tempDeal.execution_status}
                        onChange={e => setTempDeal({...tempDeal, execution_status: e.target.value})}
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all cursor-pointer"
                      >
                        {Object.keys(EXECUTION_STATUS_STYLE).map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </div>
                  </div>

                  {tempDeal.execution_status === 'Pendenciado' && (
                    <div className="bg-amber-50/30 p-6 rounded-2xl border border-amber-100/50 space-y-5 animate-in slide-in-from-top-1 duration-300">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider ml-1">Detalhamento da Pendência</label>
                        <textarea 
                          value={tempDeal.pending_description}
                          onChange={e => setTempDeal({...tempDeal, pending_description: e.target.value})}
                          placeholder="Quais documentos ou ações faltam?"
                          className="w-full bg-white border border-amber-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500/30 min-h-[80px] transition-all resize-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider ml-1">Link para Gestão Doc</label>
                        <div className="relative group">
                          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-300 w-4 h-4" />
                          <input 
                            type="url"
                            value={tempDeal.pending_document_url}
                            onChange={e => setTempDeal({...tempDeal, pending_document_url: e.target.value})}
                            placeholder="https://..."
                            className="w-full bg-white border border-amber-100 rounded-xl pl-11 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500/30 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Notas e Considerações</label>
                <textarea 
                  value={tempDeal.notes}
                  onChange={e => setTempDeal({...tempDeal, notes: e.target.value})}
                  placeholder="Observações importantes sobre este contrato..."
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500/30 transition-all min-h-[120px] resize-none"
                />
              </div>
            </div>

            <div className="p-7 bg-slate-50/50 backdrop-blur-sm border-t border-slate-100 flex justify-between items-center">
              <button 
                onClick={() => setIsDealModalOpen(false)}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
              >
                Voltar
              </button>
              <button 
                onClick={saveTempDeal}
                className="px-8 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-black shadow-sm transition-all uppercase tracking-[0.1em] text-[11px] active:scale-[0.98]"
              >
                Confirmar Lançamento
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Closing Schedule Modal */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">Agendar Vencimentos</h3>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Defina a data do 1º vencimento</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data da Primeira Parcela</label>
                <input 
                  type="date" 
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:bg-white focus:border-emerald-500/30 transition-all shadow-inner"
                />
              </div>

              <div className="bg-amber-50 rounded-2xl p-4 flex gap-3 border border-amber-100/50">
                <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                  As demais <strong>12 parcelas</strong> serão geradas automaticamente mês a mês a partir desta data.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => {
                  setIsClosingModalOpen(false);
                  setDealToClose(null);
                }}
                className="flex-1 py-3.5 text-[11px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (dealToClose) {
                    updateDealStatus(dealToClose.id, dealToClose.newStatus, firstDueDate);
                    setIsClosingModalOpen(false);
                    setDealToClose(null);
                  }
                }}
                className="flex-[2] py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all uppercase tracking-widest text-[11px] active:scale-[0.98]"
              >
                Confirmar e Gerar
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Excluir Cliente"
        description="Tem certeza que deseja excluir este cliente e todos os seus negócios? Esta ação é irreversível."
        onConfirm={confirmDeleteLead}
        confirmText="Excluir"
        variant="destructive"
      />
    </div>
  );
}
