import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import StatisticsView from '@/components/admin/StatisticsView'

export const metadata = {
  title: 'Statistiques | Admin',
}

export default async function StatisticsPage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect('/admin/login')
  }

  return <StatisticsView />
}
