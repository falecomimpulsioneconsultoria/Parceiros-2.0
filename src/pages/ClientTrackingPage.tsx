import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Avatar, 
  Chip, 
  Divider, 
  IconButton, 
  CircularProgress, 
  Alert,
  alpha,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Card,
  CardContent,
  Stack,
  Tooltip,
  styled,
  LinearProgress,
  Fade
} from '@mui/material';
import { 
  Phone, 
  CheckCircle, 
  Package, 
  Clock, 
  PlayCircle, 
  PauseCircle, 
  XCircle, 
  Info, 
  ExternalLink, 
  ArrowRight, 
  ShieldCheck, 
  Truck, 
  CreditCard 
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// Custom Theme for Premium Look
const theme = createTheme({
  palette: {
    primary: {
      main: '#6366f1', // Indigo 600
      light: '#818cf8',
      dark: '#4f46e5',
    },
    secondary: {
      main: '#10b981', // Emerald 500
    },
    background: {
      default: '#f8fafc', // Slate 50
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    }
  },
  typography: {
    fontFamily: '"Outfit", "Inter", sans-serif',
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600, letterSpacing: '-0.02em' },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    body1: { fontWeight: 400 },
    body2: { fontWeight: 400 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.05em' },
  },
  shape: {
    borderRadius: 20,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '12px 24px',
          boxShadow: 'none',
          borderRadius: 16,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.1), 0 4px 6px -2px rgba(99, 102, 241, 0.05)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          }
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          border: '1px solid #f1f5f9',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        }
      }
    }
  },
});

const GlassCard = styled(Paper)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.03)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 40,
  padding: theme.spacing(6),
  color: '#fff',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
}));

const StatusBadge = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'statusColor',
})<{ statusColor: string }>(({ statusColor }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: '12px',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  backgroundColor: alpha(statusColor, 0.08),
  color: statusColor,
  border: `1px solid ${alpha(statusColor, 0.15)}`,
  letterSpacing: '0.05em',
}));

const DealCard = styled(Card)(({ theme }) => ({
  borderRadius: 32,
  border: '1px solid #f1f5f9',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.02), 0 8px 10px -6px rgb(0 0 0 / 0.02)',
    borderColor: alpha('#6366f1', 0.2),
  },
}));

type DealInfo = {
  id: string;
  status: string;
  value: number;
  execution_status: string | null;
  pending_description: string | null;
  pending_document_url: string | null;
  created_at: string;
  products: { name: string } | null;
};

type LeadInfo = {
  name: string;
  email: string;
  phone: string;
  lead_deals: DealInfo[];
};

const EXECUTION_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  'A iniciar':    { color: '#64748b', icon: Clock,           label: 'Aguardando Início' },
  'Em andamento': { color: '#6366f1', icon: PlayCircle,      label: 'Em Andamento' },
  'Pendenciado':  { color: '#f59e0b', icon: PauseCircle,     label: 'Pendência Técnica' },
  'Concluido':    { color: '#10b981', icon: CheckCircle,     label: 'Concluído' },
  'Cancelado':    { color: '#ef4444', icon: XCircle,         label: 'Cancelado' },
};

const COMMERCIAL_CONFIG: Record<string, { color: string; label: string }> = {
  'Lead':          { color: '#6366f1',   label: 'Em Análise' },
  'Em Negociação': { color: '#f59e0b',   label: 'Em Negociação' },
  'Fechado':       { color: '#10b981',   label: 'Contrato Ativo' },
  'Perdido':       { color: '#ef4444',   label: 'Cancelado' },
};

export function ClientTrackingPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const [phone, setPhone] = useState('');
  const [leadData, setLeadData] = useState<LeadInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
    setError('');
  };

  const handleAccess = async () => {
    if (!leadId) return;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Digite um telefone válido com DDD.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('leads')
        .select(`
          name, email, phone,
          lead_deals (
            id, status, value, execution_status, pending_description, pending_document_url, created_at,
            products (name)
          )
        `)
        .eq('id', leadId)
        .single();

      if (dbError || !data) {
        setError('Negócio não encontrado ou link inválido.');
        return;
      }

      const leadPhone = (data.phone || '').replace(/\D/g, '');
      if (leadPhone !== digits) {
        setError('Telefone não corresponde aos dados cadastrados.');
        return;
      }

      setLeadData(data as LeadInfo);
      setAuthenticated(true);
    } catch (err) {
      setError('Ocorreu um erro ao buscar seus dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: authenticated ? 'background.default' : '#0f172a',
        py: authenticated ? 8 : 0,
        display: authenticated ? 'block' : 'flex',
        alignItems: 'center',
        background: authenticated 
          ? 'radial-gradient(circle at 0% 0%, #eef2ff 0%, #f8fafc 50%)'
          : 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)'
      }}>
        
        <Fade in={true} timeout={800}>
          <Box sx={{ width: '100%' }}>
            {!authenticated ? (
              <Container maxWidth="sm">
                <Box textAlign="center" mb={8}>
                  <Avatar sx={{ 
                    bgcolor: alpha('#6366f1', 0.1), 
                    width: 80, 
                    height: 80, 
                    mx: 'auto', 
                    mb: 4,
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <ShieldCheck size={36} color="#818cf8" />
                  </Avatar>
                  <Typography variant="h4" color="white" gutterBottom sx={{ fontWeight: 600 }}>
                    Acompanhe seu Pedido
                  </Typography>
                  <Typography variant="body1" sx={{ color: alpha('#fff', 0.5), fontWeight: 500, maxWidth: 300, mx: 'auto' }}>
                    Acesse o status em tempo real utilizando seu telefone cadastrado.
                  </Typography>
                </Box>

                <GlassCard elevation={0}>
                  <Stack spacing={5}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 700, letterSpacing: '0.2em', mb: 2, display: 'block', opacity: 0.8 }}>
                        TELEFONE DE CONTATO
                      </Typography>
                      <TextField
                        fullWidth
                        variant="standard"
                        placeholder="(00) 00000-0000"
                        value={phone}
                        onChange={handlePhoneChange}
                        onKeyDown={(e) => e.key === 'Enter' && handleAccess()}
                        InputProps={{
                          startAdornment: <Phone size={20} style={{ marginRight: 16, color: '#818cf8', opacity: 0.7 }} />,
                          sx: { 
                            color: '#fff', 
                            fontSize: '1.5rem', 
                            fontWeight: 500,
                            py: 1,
                            '&:before': { borderBottomColor: 'rgba(255,255,255,0.05)' },
                            '&:after': { borderBottomColor: '#6366f1' },
                            '& input': { letterSpacing: '0.05em' }
                          }
                        }}
                      />
                    </Box>

                    {error && (
                      <Alert severity="error" icon={<Info size={18} />} sx={{ 
                        borderRadius: 4, 
                        bgcolor: alpha('#ef4444', 0.1), 
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        '& .MuiAlert-icon': { color: '#f87171' }
                      }}>
                        {error}
                      </Alert>
                    )}

                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={handleAccess}
                      disabled={loading}
                      endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ArrowRight size={20} />}
                      sx={{ 
                        py: 2.5, 
                        fontSize: '0.9rem',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        boxShadow: '0 10px 20px -5px rgba(79, 70, 229, 0.3)'
                      }}
                    >
                      {loading ? 'Validando Acesso...' : 'Acessar Painel'}
                    </Button>
                  </Stack>
                </GlassCard>
                
                <Box textAlign="center" mt={6}>
                  <Typography variant="caption" sx={{ color: alpha('#fff', 0.3), fontWeight: 600, letterSpacing: '0.1em' }}>
                    AMBIENTE SEGURO & CRIPTOGRAFADO
                  </Typography>
                </Box>
              </Container>
            ) : (
              <Container maxWidth="md">
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={8}>
                  <Box>
                    <Typography variant="h4" sx={{ mb: 1, color: 'text.primary' }}>
                      Olá, <strong style={{ fontWeight: 700 }}>{leadData?.name?.split(' ')[0]}</strong>
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Acompanhe abaixo o andamento de seus contratos ativos.
                    </Typography>
                  </Box>
                  <Avatar sx={{ 
                    bgcolor: 'white', 
                    color: 'primary.main', 
                    width: 64, 
                    height: 64, 
                    fontWeight: 700,
                    fontSize: '1.5rem',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
                  }}>
                    {leadData?.name?.charAt(0)?.toUpperCase()}
                  </Avatar>
                </Box>

                <Stack spacing={4}>
                  {leadData?.lead_deals && leadData.lead_deals.length > 0 ? (
                    leadData.lead_deals.map((deal) => {
                      const exec = EXECUTION_CONFIG[deal.execution_status || 'A iniciar'] || EXECUTION_CONFIG['A iniciar'];
                      const comm = COMMERCIAL_CONFIG[deal.status] || { color: '#64748b', label: deal.status };
                      const ExecIcon = exec.icon;

                      return (
                        <DealCard key={deal.id} elevation={0}>
                          <CardContent sx={{ p: 5 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
                              <Stack direction="row" spacing={3} alignItems="center">
                                <Box sx={{ 
                                  width: 56, 
                                  height: 56, 
                                  bgcolor: alpha('#6366f1', 0.05), 
                                  color: 'primary.main',
                                  borderRadius: '18px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Package size={28} />
                                </Box>
                                <Box>
                                  <Typography variant="h6" sx={{ color: 'text.primary', mb: 0.5 }}>
                                    {deal.products?.name || 'Serviço Profissional'}
                                  </Typography>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.05em' }}>
                                      CONTRATO #{deal.id.slice(0, 8).toUpperCase()}
                                    </Typography>
                                    <Box sx={{ w: 3, h: 3, bgcolor: 'divider', borderRadius: 'full' }} />
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                      {new Date(deal.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                    </Typography>
                                  </Stack>
                                </Box>
                              </Stack>
                              <StatusBadge statusColor={comm.color}>
                                {comm.label}
                              </StatusBadge>
                            </Box>

                            <Box sx={{ 
                              p: 4, 
                              bgcolor: alpha(exec.color, 0.03), 
                              border: `1px solid ${alpha(exec.color, 0.08)}`, 
                              borderRadius: 6,
                              mb: 4
                            }}>
                              <Stack direction="row" spacing={2.5} alignItems="center" mb={3}>
                                <Box sx={{ 
                                  width: 40, 
                                  height: 40, 
                                  borderRadius: '12px', 
                                  bgcolor: alpha(exec.color, 0.1), 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center' 
                                }}>
                                  <ExecIcon size={20} color={exec.color} />
                                </Box>
                                <Box flex={1}>
                                  <Typography variant="subtitle2" sx={{ color: exec.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
                                    Status de Entrega
                                  </Typography>
                                  <Typography variant="h6" sx={{ color: 'text.primary', fontSize: '1rem' }}>
                                    {exec.label}
                                  </Typography>
                                </Box>
                                {deal.execution_status === 'Em andamento' && (
                                  <CircularProgress size={20} sx={{ color: exec.color, opacity: 0.5 }} thickness={5} />
                                )}
                              </Stack>
                              
                              <Box sx={{ position: 'relative', pt: 1 }}>
                                <LinearProgress 
                                  variant={deal.execution_status === 'Em andamento' ? "indeterminate" : "determinate"}
                                  value={deal.execution_status === 'Concluido' ? 100 : 15} 
                                  sx={{ 
                                    height: 10, 
                                    borderRadius: 5, 
                                    bgcolor: alpha(exec.color, 0.05), 
                                    '& .MuiLinearProgress-bar': { 
                                      bgcolor: exec.color,
                                      borderRadius: 5,
                                      boxShadow: `0 0 10px ${alpha(exec.color, 0.3)}`
                                    } 
                                  }}
                                />
                              </Box>
                            </Box>

                            {deal.execution_status === 'Pendenciado' && deal.pending_description && (
                              <Box sx={{ 
                                mb: 4, 
                                p: 4, 
                                bgcolor: alpha('#f59e0b', 0.03), 
                                border: '1px solid rgba(245, 158, 11, 0.15)', 
                                borderRadius: 6,
                                position: 'relative',
                                overflow: 'hidden'
                              }}>
                                <Box sx={{ 
                                  position: 'absolute', 
                                  top: 0, 
                                  left: 0, 
                                  bottom: 0, 
                                  width: 4, 
                                  bgcolor: '#f59e0b' 
                                }} />
                                <Typography variant="subtitle2" sx={{ color: '#92400e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                  <AlertCircle size={16} /> Atenção Necessária
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#b45309', mb: 3, lineHeight: 1.6, fontWeight: 500 }}>
                                  {deal.pending_description}
                                </Typography>
                                {deal.pending_document_url && (
                                  <Button 
                                    startIcon={<ExternalLink size={16} />} 
                                    variant="outlined"
                                    href={deal.pending_document_url} 
                                    target="_blank" 
                                    sx={{ 
                                      color: '#92400e', 
                                      borderColor: 'rgba(146, 64, 14, 0.2)',
                                      borderRadius: 3,
                                      '&:hover': {
                                        borderColor: '#92400e',
                                        bgcolor: 'rgba(146, 64, 14, 0.05)'
                                      }
                                    }}
                                  >
                                    Visualizar Documento
                                  </Button>
                                )}
                              </Box>
                            )}

                            <Divider sx={{ my: 4, opacity: 0.5 }} />

                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5, letterSpacing: '0.1em' }}>
                                  INVESTIMENTO TOTAL
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                  <span style={{ fontSize: '0.9rem', color: '#cbd5e1', marginRight: '4px' }}>R$</span>
                                  {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(deal.value)}
                                </Typography>
                              </Box>
                              <Tooltip title="Link seguro e autenticado">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #f1f5f9' }}>
                                  <ShieldCheck size={14} color="#10b981" />
                                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>AMBIENTE SEGURO</Typography>
                                </Box>
                              </Tooltip>
                            </Box>
                          </CardContent>
                        </DealCard>
                      );
                    })
                  ) : (
                    <Box textAlign="center" py={12} sx={{ bgcolor: 'white', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                      <Truck size={64} color="#e2e8f0" />
                      <Typography variant="h6" color="text.primary" sx={{ mt: 3, fontWeight: 600 }}>Nenhum serviço em andamento</Typography>
                      <Typography variant="body2" color="text.secondary">Entre em contato com seu consultor para mais informações.</Typography>
                    </Box>
                  )}
                </Stack>
                
                <Box textAlign="center" mt={10} mb={4}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, opacity: 0.5 }}>
                    © {new Date().getFullYear()} Parceiros 2.0 • Sistema de Gestão Financeira
                  </Typography>
                </Box>
              </Container>
            )}
          </Box>
        </Fade>
      </Box>
    </ThemeProvider>
  );
}
