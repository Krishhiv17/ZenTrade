import { getReviewData } from '@/actions/review'
import ReviewFlow from '@/components/today/ReviewFlow'

export const metadata = { title: 'End of Day Review | ZenTrade' }

export default async function ReviewPage({
    searchParams,
}: {
    searchParams: Promise<{ account?: string; date?: string }>
}) {
    const sp = await searchParams
    const data = await getReviewData(sp.account, sp.date)
    return <ReviewFlow initial={data} />
}
