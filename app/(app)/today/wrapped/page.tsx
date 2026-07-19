import { getPeriodWrapped, type PeriodType } from '@/actions/period'
import PeriodWrappedView from '@/components/today/PeriodWrappedView'

export const metadata = { title: 'Wrapped | ZenTrade' }

export default async function WrappedPage({
    searchParams,
}: {
    searchParams: Promise<{ account?: string; period?: string; start?: string }>
}) {
    const sp = await searchParams
    const period: PeriodType = sp.period === 'month' ? 'month' : 'week'
    const data = await getPeriodWrapped(sp.account, period, sp.start ?? '')
    return <PeriodWrappedView initial={data} />
}
