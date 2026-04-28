export const schema = `
  type Restaurant {
    id: ID!
    name: String!
    slug: String!
    address: String
    imageUrl: String
    ownerId: ID!
    createdAt: String!
    updatedAt: String!
    dishes: [Dish!]!
  }

  type Dish {
    id: ID!
    restaurantId: ID!
    name: String!
    description: String
    priceCents: Int!
    imageUrl: String
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type OrderItem {
    id: ID!
    orderId: ID!
    dishId: ID!
    quantity: Int!
    unitPriceCents: Int!
  }

  enum OrderStatus {
    PENDING
    CONFIRMED
    PAID
    PREPARING
    READY
    DELIVERED
    CANCELLED
  }

  type Order {
    id: ID!
    userId: ID!
    restaurantId: ID!
    status: OrderStatus!
    totalCents: Int!
    createdAt: String!
    updatedAt: String!
    items: [OrderItem!]!
  }

  type Query {
    restaurants: [Restaurant!]!
    restaurant(id: ID!): Restaurant
    restaurantDishes(restaurantId: ID!): [Dish!]!
  }
`;

