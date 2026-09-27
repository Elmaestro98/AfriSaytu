import { SignOutNow } from "./sign-out-now"

// After "Quitter le mode partagé": the phone is no longer shared; its account is signed out here,
// so only the account's password brings it back.
export default function ByePage() {
  return <SignOutNow />
}
