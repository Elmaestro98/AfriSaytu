// A shared phone locks after 5 minutes without activity (the owner's choice): known by the server
// (actor cookie) and by the phone (its own timer), so both agree.
export const SHARED_IDLE_MS = 5 * 60_000
