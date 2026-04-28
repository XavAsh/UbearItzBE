import { OrderStatus, UserRole } from "@prisma/client";
import { prisma } from "../src/prisma.js";
import bcrypt from "bcryptjs";

async function main() {
  const devPasswordHash = await bcrypt.hash("dev-only", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@ubearitz.local" },
    update: { passwordHash: devPasswordHash },
    create: {
      email: "admin@ubearitz.local",
      passwordHash: devPasswordHash,
      role: UserRole.ADMIN,
      firstName: "Admin",
      lastName: "Ubearitz",
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@ubearitz.local" },
    update: { passwordHash: devPasswordHash },
    create: {
      email: "owner@ubearitz.local",
      passwordHash: devPasswordHash,
      role: UserRole.RESTAURANT,
      firstName: "Olivia",
      lastName: "Owner",
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@ubearitz.local" },
    update: { passwordHash: devPasswordHash },
    create: {
      email: "customer@ubearitz.local",
      passwordHash: devPasswordHash,
      role: UserRole.USER,
      firstName: "Camille",
      lastName: "Customer",
    },
  });

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "pasta-palace" },
    update: {},
    create: {
      name: "Pasta Palace",
      slug: "pasta-palace",
      address: "1 rue du Dév, 74000 Annecy",
      ownerId: owner.id,
      dishes: {
        create: [
          {
            name: "Spaghetti bolognese",
            description: "Sauce tomate, boeuf, parmesan",
            priceCents: 1290,
          },
          {
            name: "Penne pesto",
            description: "Basilic, pignons, parmesan",
            priceCents: 1090,
          },
        ],
      },
    },
    include: { dishes: true },
  });

  const [dish1, dish2] = restaurant.dishes;

  const order = await prisma.order.create({
    data: {
      userId: customer.id,
      restaurantId: restaurant.id,
      status: "CONFIRMED" as OrderStatus,
      items: {
        create: [
          {
            dishId: dish1.id,
            quantity: 1,
            unitPriceCents: dish1.priceCents,
          },
          {
            dishId: dish2.id,
            quantity: 2,
            unitPriceCents: dish2.priceCents,
          },
        ],
      },
    },
    include: { items: true },
  });

  const total = await prisma.orderItem.aggregate({
    where: { orderId: order.id },
    _sum: { quantity: true, unitPriceCents: true },
  });

  // Recompute total in a DB-consistent way (quantity * unitPrice)
  const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
  const totalCents = items.reduce((acc, i) => acc + i.quantity * i.unitPriceCents, 0);

  await prisma.order.update({
    where: { id: order.id },
    data: { totalCents },
  });

  console.log({
    seeded: true,
    users: { admin: admin.email, owner: owner.email, customer: customer.email },
    restaurant: restaurant.slug,
    orderId: order.id,
    totalCents,
    debug: total._sum,
  });
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

