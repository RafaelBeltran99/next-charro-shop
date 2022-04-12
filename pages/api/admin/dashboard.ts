import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../../database";
import { Order, Product, User } from "../../../models";

type Data = {
  numberOfOrders: number;
  paidOrders: number; // isPaid: true
  notPaidOrders: number;
  numberOfClient: number; // role: client
  numberOfProducts: number;
  productsWithNoInventory: number; // 0
  lowInventory: number; //Productos con 3 o menos
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  await db.connect();

  //   const numberOfOrders = await Order.count();
  //   const paidOrders = await Order.find({ isPaid: true }).count();
  //   const numberOfClient = await User.find({ role: "client" }).count();
  //   const numberOfProducts = await Product.count();
  //   const productsWithNoInventory = await Product.find({ inStock: 0 }).count();
  //   const lowInventory = await Product.find({ inStock: { $lte: 3 } }).count();

  //   const notPaidOrders = await Order.find({ isPaid: false }).count();

  const [
    numberOfOrders,
    paidOrders,
    numberOfClient,
    numberOfProducts,
    productsWithNoInventory,
    lowInventory,
  ] = await Promise.all([
    Order.count(),
    Order.find({ isPaid: true }).count(),
    User.find({ role: "client" }).count(),
    Product.count(),
    Product.find({ inStock: 0 }).count(),
    Product.find({ inStock: { $lte: 3 } }).count(),
  ]);

  await db.disconnect();

  return res.status(200).json({
    numberOfOrders,
    paidOrders,
    notPaidOrders: numberOfOrders - paidOrders,
    numberOfClient,
    numberOfProducts,
    productsWithNoInventory,
    lowInventory,
  });
}
