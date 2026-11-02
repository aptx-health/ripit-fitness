import ProgressView from '@/components/features/progress/ProgressView'
import PageTitle from '@/components/ui/PageTitle'

/** The Progress tab (replaces Learn). The (app) layout signs the user in. */
export default function ProgressPage() {
  return (
    <div className="bg-background">
      <div className="max-w-2xl mx-auto sm:px-6 py-4">
        <div className="px-4 sm:px-0 mb-4">
          <PageTitle>Progress</PageTitle>
        </div>
        <div className="px-4 sm:px-0">
          <ProgressView />
        </div>
      </div>
    </div>
  )
}
