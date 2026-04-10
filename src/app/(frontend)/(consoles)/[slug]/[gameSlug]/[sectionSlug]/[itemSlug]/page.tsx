import StatsBoard from '@/app/component/stats-board'
import { getItemInfo } from '@/app/api'
import Btn from '@/app/component/btn'
import SceneWrapper from '@/app/component/scene/scene-wrapper'

export const dynamic = 'force-dynamic'

interface params {
  slug: string
  gameSlug: string
  sectionSlug: string
  itemSlug: string
}

const formatSize = (kb: number) => {
  if (kb >= 1_073_741_824) return `${(kb / 1_073_741_824).toFixed(1)} TB`
  if (kb >= 1_048_576) return `${(kb / 1_048_576).toFixed(1)} GB`
  if (kb >= 1_024) return `${(kb / 1_024).toFixed(1)} MB`
  return `${kb} KB`
}

export default async function ItemPage({ params }: { params: Promise<params> }) {
  const { slug, gameSlug, sectionSlug, itemSlug } = await params

  const dataItem = await getItemInfo(slug, gameSlug, sectionSlug, itemSlug)

  const rawSize = parseFloat(dataItem?.zipSizeFormatted ?? '0')
  const formattedSize = isNaN(rawSize) ? '—' : formatSize(rawSize)

  const rows_data_item = [
    ['Name', dataItem?.name ?? '—'],
    ['Size', formattedSize],
    ['Game', dataItem?.gameName ?? '—'],
  ]

  const downloadUrl = dataItem?.downloadUrl ?? '/404'
  const zipUrl = dataItem?.zipUrl ?? ''

  return (
    <main className="flex flex-col h-full">
      <StatsBoard rows={rows_data_item} title={dataItem?.gameName ?? gameSlug} />
      <div className="flex justify-center mb-6">
        <Btn href={downloadUrl} title={'Download'} />
      </div>
      <div className="flex flex-1 min-h-0 mb-5">
        <SceneWrapper zipUrl={zipUrl} />
      </div>
    </main>
  )
}
