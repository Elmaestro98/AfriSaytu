import { BrandMark } from "@/components/business/brand-mark"
import { cn } from "@/lib/utils"

export type StepInfo = { short: string; title: string; help: string }

type OnboardingHeaderProps = {
  steps: readonly StepInfo[]
  current: number
}

// Brand band with the four named steps: done and current steps are gold.
export function OnboardingHeader({ steps, current }: OnboardingHeaderProps) {
  const step = steps[current]

  return (
    <header className="bg-primary px-4 pt-5 pb-6 text-primary-foreground">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <div className="flex items-center gap-3">
          <BrandMark priority className="size-10 rounded-lg" />
          <p className="text-sm font-medium text-primary-foreground/80">
            Configuration · étape {current + 1} sur {steps.length}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl leading-tight font-extrabold">{step.title}</h1>
          <p className="text-primary-foreground/85">{step.help}</p>
        </div>

        <ol className="grid grid-cols-4 gap-2" aria-label="Étapes">
          {steps.map((item, index) => (
            <li key={item.short} aria-current={index === current ? "step" : undefined} className="flex flex-col gap-1.5">
              <span
                className={cn(
                  "h-1.5 rounded-full",
                  index <= current ? "bg-brand-accent" : "bg-primary-foreground/25",
                )}
              />
              <span
                className={cn(
                  "truncate text-xs",
                  index === current ? "font-bold" : "text-primary-foreground/70",
                )}
              >
                {item.short}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </header>
  )
}
