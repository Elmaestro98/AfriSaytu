"use client"

import { CircleCheck, CircleAlert, Info, LoaderCircle, TriangleAlert } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query"

// Success toasts (sonner), in the brand's colours. Phone: just below the page header (never over
// its back arrow or title: touching a toast keeps it open, so it must not sit on a control), clear
// of the bottom navigation and the entry button; desktop: bottom right. Short, large, swipe away.
// Errors stay next to what they are about, never only in a toast.
export function Toaster(props: ToasterProps) {
  const desktop = useMediaQuery(DESKTOP_QUERY)
  return (
    <Sonner
      position={desktop ? "bottom-right" : "top-center"}
      duration={3000}
      visibleToasts={3}
      mobileOffset={{ top: 76, left: 12, right: 12 }} // header: 64 px (h-16) + a gap
      icons={{
        success: <CircleCheck className="size-5 text-primary" />,
        info: <Info className="size-5 text-primary" />,
        warning: <TriangleAlert className="size-5 text-brand-accent-strong" />,
        error: <CircleAlert className="size-5 text-destructive" />,
        loading: <LoaderCircle className="size-5 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !border !shadow-lg !gap-3 !px-4 !py-3.5",
          title: "!text-[15px] !font-semibold !leading-snug",
          description: "!text-sm !text-muted-foreground",
        },
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}
