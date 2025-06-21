const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeAdmin() {
  const email = "sheamusticals@gmail.com"; 

  const user = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });

  console.log("User updated:", user);
}

makeAdmin()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
