const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const result = await p.job.groupBy({
    by: ["department"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  console.log(`Total unique departments: ${result.length}`);
  console.log("---");
  for (const r of result) {
    console.log(`${String(r._count.id).padStart(4)} | ${r.department}`);
  }
}

main().finally(() => p.$disconnect());
