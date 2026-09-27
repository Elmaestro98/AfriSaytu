import { redirect } from "next/navigation"

import { SessionError } from "@/server/auth/session"
import { loadSwitchScreen } from "@/server/devices/switch"

import { SwitchScreen } from "./switch-screen"

// "Qui travaille ?": the home of a shared phone while nobody is at the controls. Outside the app
// frame (no navigation, no account menu): nobody acts yet.
export default async function SwitchPage() {
  let data
  try {
    data = await loadSwitchScreen()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }
  if (!data) redirect("/dashboard") // not a shared phone (or withdrawn): the ordinary app
  return <SwitchScreen {...data} />
}
