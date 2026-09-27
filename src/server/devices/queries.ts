import type { ActorContext } from "@/server/auth/actor"
import { currentDevice } from "@/server/devices/current"

// Réglages -> Téléphones partagés (owner, managers): their branches, the shared phones of those
// branches, whether THIS phone is one, and which agents have a code.

export type DeviceRow = { id: string; name: string; branchName: string; createdBy: string; createdAt: Date; lastSeenAt: Date | null; isThisPhone: boolean }
export type AgentPinRow = { id: string; name: string; branchNames: string[]; hasPin: boolean; lockedUntil: Date | null }

export type DevicesView = {
  branches: { id: string; name: string }[]
  devices: DeviceRow[]
  thisPhone: { id: string; name: string; branchName: string } | null
  agents: AgentPinRow[]
}

export async function loadDevicesView(ctx: ActorContext): Promise<DevicesView> {
  const inBranches = ctx.actor.role === "OWNER" ? {} : { id: { in: [...ctx.actor.branchIds] } }
  const branches = await ctx.db.branch.findMany({ where: { isActive: true, ...inBranches }, orderBy: { name: "asc" }, select: { id: true, name: true } })
  const branchIds = branches.map((branch) => branch.id)

  const [devices, agents, current] = await Promise.all([
    ctx.db.sharedDevice.findMany({
      where: { branchId: { in: branchIds }, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, createdAt: true, lastSeenAt: true, branch: { select: { name: true } }, createdBy: { select: { name: true } } },
    }),
    ctx.db.member.findMany({
      // Nested filters are not scoped by the tenant client: the branch must be this organization's.
      where: { role: "AGENT", isActive: true, branches: { some: { branchId: { in: branchIds }, branch: { organizationId: ctx.organizationId } } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, pinHash: true, pinLockedUntil: true, branches: { select: { branch: { select: { name: true } } } } },
    }),
    currentDevice(ctx),
  ])

  const now = new Date()
  return {
    branches,
    devices: devices.map((device) => ({
      id: device.id,
      name: device.name,
      branchName: device.branch.name,
      createdBy: device.createdBy.name,
      createdAt: device.createdAt,
      lastSeenAt: device.lastSeenAt,
      isThisPhone: device.id === current?.id,
    })),
    thisPhone: current ? { id: current.id, name: current.name, branchName: current.branch.name } : null,
    agents: agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      branchNames: agent.branches.map((item) => item.branch.name),
      hasPin: agent.pinHash !== null,
      lockedUntil: agent.pinLockedUntil && agent.pinLockedUntil > now ? agent.pinLockedUntil : null,
    })),
  }
}

export async function hasOwnPin(ctx: ActorContext): Promise<boolean> {
  const member = await ctx.db.member.findFirst({ where: { id: ctx.actor.memberId }, select: { pinHash: true } })
  return Boolean(member?.pinHash)
}
