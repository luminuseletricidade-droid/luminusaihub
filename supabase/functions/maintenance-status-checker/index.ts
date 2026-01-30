import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Execute maintenance status checks
    const { data: result, error } = await supabase.rpc('run_maintenance_status_checks')

    if (error) {
      console.error('Error running maintenance checks:', error)
      throw error
    }

    console.log('Maintenance status check completed:', result)

    // Process pending notifications if any
    if (result?.pending_notifications && result.pending_notifications.length > 0) {
      for (const notification of result.pending_notifications) {
        await processNotification(supabase, notification)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in maintenance-status-checker:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

async function processNotification(supabase: any, notification: any) {
  const { maintenance_id, type, days_until } = notification

  // Get maintenance details with client info
  const { data: maintenance, error: maintenanceError } = await supabase
    .from('maintenances')
    .select(`
      *,
      contracts:contract_id (
        client_name,
        client_email,
        client_phone,
        clients:client_id (
          name,
          email,
          phone,
          contact_person
        )
      )
    `)
    .eq('id', maintenance_id)
    .single()

  if (maintenanceError || !maintenance) {
    console.error('Error fetching maintenance for notification:', maintenanceError)
    return
  }

  // Prepare notification message
  let message = ''
  const scheduledDate = new Date(maintenance.scheduled_date).toLocaleDateString('pt-BR')
  const clientName = maintenance.contracts?.client_name || maintenance.contracts?.clients?.name || 'Cliente'

  switch (type) {
    case '3_days_before':
      message = `Lembrete: Manutenção agendada para ${clientName} em ${scheduledDate} (em 3 dias). Por favor, confirme sua disponibilidade.`
      break
    case '1_day_before':
      message = `Atenção: Manutenção para ${clientName} agendada para amanhã (${scheduledDate}). Prepare os equipamentos necessários.`
      break
    case 'same_day':
      message = `HOJE: Manutenção para ${clientName}. Horário agendado: ${maintenance.scheduled_time || 'A definir'}.`
      break
  }

  // Create notification record
  const { error: notificationError } = await supabase
    .from('notifications')
    .insert({
      type: 'maintenance_reminder',
      title: `Manutenção - ${clientName}`,
      message: message,
      data: {
        maintenance_id: maintenance_id,
        notification_type: type,
        days_until: days_until,
        client_name: clientName,
        scheduled_date: maintenance.scheduled_date,
        scheduled_time: maintenance.scheduled_time
      },
      status: 'pending',
      created_at: new Date().toISOString()
    })

  if (notificationError) {
    console.error('Error creating notification:', notificationError)
  } else {
    // Mark notification as sent
    await supabase.rpc('mark_notification_sent', { p_maintenance_id: maintenance_id })
    console.log(`Notification created for maintenance ${maintenance_id} (${type})`)
  }

  // If we have contact info, we could send emails/SMS here
  // For now, just log that we would send
  const contactEmail = maintenance.contracts?.client_email || maintenance.contracts?.clients?.email
  const contactPhone = maintenance.contracts?.client_phone || maintenance.contracts?.clients?.phone

  if (contactEmail) {
    console.log(`Would send email to ${contactEmail}: ${message}`)
    // TODO: Integrate with email service
  }

  if (contactPhone) {
    console.log(`Would send SMS/WhatsApp to ${contactPhone}: ${message}`)
    // TODO: Integrate with SMS/WhatsApp service
  }
}