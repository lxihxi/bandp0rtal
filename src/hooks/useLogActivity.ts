import { supabase } from '@/lib/supabase'

export async function logActivity(action: string, entityType: string, entityName: string) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  await supabase.from('activity_log').insert({
    user_id: session.user.id,
    action,
    entity_type: entityType,
    entity_name: entityName,
  })
}
