import { Prisma, PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const client = new PrismaClient();

  // Recursive function to convert Decimal to number
  const convertDecimalToNumber = (item: any): any => {
    if (item === null || item === undefined) return item;
    if (typeof item !== 'object') return item;
    
    if (item instanceof Prisma.Decimal) {
      return item.toNumber();
    }
    
    if (Array.isArray(item)) {
      return item.map(convertDecimalToNumber);
    }
    
    // Skip Date objects
    if (item instanceof Date) {
      return item;
    }
    
    return Object.fromEntries(
      Object.entries(item).map(([key, value]) => [key, convertDecimalToNumber(value)])
    );
  };

  // Middleware to convert Decimal to number for specific fields
  client.$use(async (params, next) => {
    const result = await next(params);

    // Fix the condition grouping with proper parentheses
    if ((
      params.model === "Tasks" || 
      params.model === "JobOrders" || 
      params.model === "Employees" || 
      params.model === "Schedules" ||
      params.model === "EmployeeSchedules"
    ) && (
      params.action === "findMany" || 
      params.action === "findUnique" ||
      params.action === "findFirst"
    )) {
      return convertDecimalToNumber(result);
    }

    return result;
  });

  return client;
};

/* eslint-disable no-var */
declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}
/* eslint-enable no-var */
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;