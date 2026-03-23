import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const rawBody = await req.text()
    const payload = JSON.parse(rawBody)
    
    console.log('--- DIAGNÓSTICO WEBHOOK v4 ---')
    console.log('Payload Bruto:', JSON.stringify(payload))
    
    const orderNsu = payload.order_nsu || payload.nsu || payload.data?.order_nsu || payload.data?.nsu || 
                     payload.metadata?.order_nsu || payload.metadata?.nsu || payload.external_id
                     
    if (!orderNsu) {
        console.warn('FALHA: Nenhum order_nsu/nsu encontrado no payload.')
        return new Response('No ID', { status: 200 })
    }

    console.log(`ID Recebido: "${orderNsu}" (Tamanho: ${String(orderNsu).length})`)

    const [dealId, installmentIndex] = String(orderNsu).split('_')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (installmentIndex !== undefined) {
        console.log(`Atualizando Parcela: Deal=${dealId}, Num=${installmentIndex}`)
        const { data, error } = await supabase
          .from('deal_installments')
          .update({ status: 'Pago', paid_at: new Date().toISOString() })
          .eq('deal_id', dealId)
          .eq('installment_number', parseInt(installmentIndex))
          .select()
        
        if (error) console.error('Erro Parcela:', error)
        else {
            console.log('Resultado Parcela:', data?.length ? 'SUCESSO' : 'NÃO ENCONTRADA')
            if (data && data.length > 0) {
               console.log(`Buscando RPC para comissões da parcela: ${data[0].id}`)
               const { error: rpcError } = await supabase.rpc('fn_generate_commissions_for_installment', { p_installment_id: data[0].id });
               if (rpcError) console.error('FALHA na geração da comissão (sequencial):', rpcError);
               else console.log('Comissões geradas com sucesso!');
            }
        }
        // A consolidação do status do negócio principal ('Pago' ou 'Em pagamento') 
        // agora é delegada totalmente para a rotina RPC 'fn_generate_commissions_for_installment'.
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('FALHA GERAL:', err)
    return new Response('Error', { status: 200 })
  }
})
