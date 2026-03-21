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
        else console.log('Resultado Parcela:', data?.length ? 'SUCESSO' : 'NÃO ENCONTRADA')
    } else {
        console.log(`Atualizando Negócio ID: "${dealId}"`)
        const { data, error } = await supabase
          .from('lead_deals')
          .update({ payment_status: 'Pago' })
          .eq('id', dealId)
          .select()
        
        if (error) {
            console.error('ERRO AO ATUALIZAR lead_deals:', JSON.stringify(error))
        } else if (data && data.length > 0) {
            console.log('SUCESSO: Negócio atualizado no banco.')
        } else {
            console.warn(`AVISO: O ID "${dealId}" não foi encontrado em lead_deals. Verifique se ele está completo.`)
        }
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('FALHA GERAL:', err)
    return new Response('Error', { status: 200 })
  }
})
