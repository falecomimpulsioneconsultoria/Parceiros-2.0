import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { dealId, installmentIndex, amount, description, customer } = await req.json()
    console.log('Gerando link para:', { dealId, installmentIndex, amount, customer: customer?.name })
    
    // 1. Conecta ao Supabase para pegar as chaves
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: settings } = await supabase
      .from('system_settings')
      .select('infinitepay_tag')
      .eq('id', 1)
      .single()

    if (!settings?.infinitepay_tag) {
      throw new Error('InfiniteTag ausente. Por favor, configure no painel Admin.')
    }

    // 2. Prepara payload para a InfinitePay
    const orderNsu = installmentIndex !== undefined ? `${dealId}_${installmentIndex}` : dealId

    const payload: any = {
      handle: settings.infinitepay_tag,
      order_nsu: orderNsu,
      webhook_url: `https://${new URL(Deno.env.get('SUPABASE_URL') || '').hostname.split('.')[0]}.supabase.co/functions/v1/infinitepay-webhook`,
      items: [
        {
          quantity: 1,
          price: Math.round(amount * 100), // Valor em centavos
          description: description || 'Pagamento Impulsione Consultoria'
        }
      ]
    }

    // 3. Adiciona dados do cliente se disponíveis (pré-preenche o checkout)
    if (customer) {
      payload.customer = {}
      if (customer.name) payload.customer.name = customer.name
      if (customer.email) payload.customer.email = customer.email
      if (customer.phone_number) payload.customer.phone_number = customer.phone_number
    }

    console.log('Payload InfinitePay:', JSON.stringify(payload))

    // 4. Chama a API da InfinitePay (Endpoint Público)
    const response = await fetch('https://api.infinitepay.io/invoices/public/checkout/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    
    if (!response.ok) {
      console.error('Erro InfinitePay API:', result)
      throw new Error(result.message || 'Erro ao gerar link na InfinitePay.')
    }

    return new Response(JSON.stringify({ url: result.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Erro na função generate-infinitepay-link:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

