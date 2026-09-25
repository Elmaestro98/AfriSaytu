import { getBaseClient } from "../src/server/db/client"
import { OPERATOR_CATALOG } from "../src/server/operators/catalog-data"

// Loads the global operator catalogue. Safe to run several times: rows are matched by code.
async function main() {
  const prisma = getBaseClient()

  for (const operator of OPERATOR_CATALOG) {
    await prisma.operatorCatalog.upsert({
      where: { code: operator.code },
      update: { name: operator.name, color: operator.color },
      create: { code: operator.code, name: operator.name, color: operator.color },
    })
    console.log(`Operator ready: ${operator.name}`)
  }

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
