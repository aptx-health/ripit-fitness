import { BookOpen } from 'lucide-react'

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-2">Learn</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Articles and guides to help you get the most out of your training.
        </p>

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground text-sm">
            Content coming soon.
          </p>
        </div>
      </div>
    </div>
  )
}
