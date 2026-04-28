function toIso(date: Date | string) {
  return date instanceof Date ? date.toISOString() : date;
}

export const resolvers = {
  Query: {
    restaurants: async (_parent: unknown, _args: unknown, ctx: any) => {
      const restaurants = await ctx.prisma.restaurant.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
          imageUrl: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return restaurants.map((r: any) => ({
        ...r,
        createdAt: toIso(r.createdAt),
        updatedAt: toIso(r.updatedAt),
      }));
    },

    restaurant: async (_parent: unknown, args: { id: string }, ctx: any) => {
      const r = await ctx.prisma.restaurant.findUnique({
        where: { id: args.id },
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
          imageUrl: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!r) return null;

      return {
        ...r,
        createdAt: toIso(r.createdAt),
        updatedAt: toIso(r.updatedAt),
      };
    },

    restaurantDishes: async (_parent: unknown, args: { restaurantId: string }, ctx: any) => {
      const dishes = await ctx.prisma.dish.findMany({
        where: { restaurantId: args.restaurantId, isActive: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          restaurantId: true,
          name: true,
          description: true,
          priceCents: true,
          imageUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return dishes.map((d: any) => ({
        ...d,
        createdAt: toIso(d.createdAt),
        updatedAt: toIso(d.updatedAt),
      }));
    },
  },

  Restaurant: {
    dishes: async (restaurant: { id: string }, _args: unknown, ctx: any) => {
      const dishes = await ctx.prisma.dish.findMany({
        where: { restaurantId: restaurant.id, isActive: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          restaurantId: true,
          name: true,
          description: true,
          priceCents: true,
          imageUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return dishes.map((d: any) => ({
        ...d,
        createdAt: toIso(d.createdAt),
        updatedAt: toIso(d.updatedAt),
      }));
    },
  },
};

