import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed workers
  await prisma.worker.createMany({
    data: [
      { id: "A001", name: "陈勇", project: "汇龙配电所改造" },
      { id: "A002", name: "李明", project: "汇龙配电所改造" },
      { id: "A003", name: "张伟", project: "汇龙配电所改造" },
      { id: "A004", name: "王建国", project: "汇龙配电所改造" },
      { id: "A005", name: "刘强", project: "汇龙配电所改造" },
      { id: "B001", name: "赵磊", project: "下马坪主线施工" },
      { id: "B002", name: "孙浩", project: "下马坪主线施工" },
    ],
  });

  // Seed visas
  await prisma.visa.createMany({
    data: [
      {
        title: "增加电缆沟开挖深度至1.2m",
        amount: 8500,
        submitter: "项目部",
        project: "汇龙配电所改造",
        status: "pending",
      },
      {
        title: "变更电缆规格 3×70→3×95mm²",
        amount: 12000,
        submitter: "监理方",
        project: "汇龙配电所改造",
        status: "pending",
      },
      {
        title: "增设临时照明系统",
        amount: 3200,
        submitter: "项目部",
        project: "汇龙配电所改造",
        status: "approved",
      },
      {
        title: "新增接地网扩展段",
        amount: 5800,
        submitter: "项目部",
        project: "下马坪主线施工",
        status: "pending",
      },
    ],
  });

  // Seed projects
  const projectData = [
    { name: "汇龙配电所改造", code: "HLD-001", budget: 280000, spent: 134000, profitRate: 19.2, status: "active" },
    { name: "下马坪10kV主线", code: "XMP-002", budget: 196000, spent: 89000, profitRate: 17.1, status: "active" },
    { name: "铁画溪开关站",   code: "THS-003", budget: 340000, spent: 0,      profitRate: 0,    status: "pending" },
  ];
  for (const p of projectData) {
    await prisma.project.upsert({ where: { code: p.code }, update: p, create: p });
  }

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
