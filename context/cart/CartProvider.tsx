import { FC, useEffect, useReducer } from "react";

import Cookie from "js-cookie";

import { ICartProduct, ShippingAddress, IOrder } from "../../interfaces";
import { CartContex, cartReducer } from "./";
import { charroApi } from "../../api";
import axios from "axios";

export interface CartState {
  isLoaded: boolean;
  cart: ICartProduct[];
  numberOfItems: number;
  subTotal: number;
  tax: number;
  total: number;

  shippingAddress?: ShippingAddress;
}

const CART_INITIAL_STATE: CartState = {
  isLoaded: false,
  cart: [],
  numberOfItems: 0,
  subTotal: 0,
  tax: 0,
  total: 0,
  shippingAddress: undefined,
};

export const CartProvider: FC = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, CART_INITIAL_STATE);

  //Effect
  //Lea la cookie y lea el carrito
  useEffect(() => {
    try {
      const cookieProducts = Cookie.get("cart")
        ? JSON.parse(Cookie.get("cart")!)
        : [];
      dispatch({
        type: "[Cart] - Load cart from cookies | storage",
        payload: cookieProducts,
      });
    } catch (error) {
      dispatch({
        type: "[Cart] - Load cart from cookies | storage",
        payload: [],
      });
    }
  }, []);

  useEffect(() => {
    // if (Cookie.get("fistName")) {
    const ship = {
      firstName: Cookie.get("firstName") || "",
      lastName: Cookie.get("lastName") || "",
      address: Cookie.get("address") || "",
      address2: Cookie.get("address2") || "",
      zip: Cookie.get("zip") || "",
      city: Cookie.get("city") || "",
      country: Cookie.get("country") || "",
      phone: Cookie.get("phone") || "",
    };
    dispatch({ type: "[Cart] - Load Address from cookies", payload: ship });
    // }
  }, []);

  useEffect(() => {
    Cookie.set("cart", JSON.stringify(state.cart));
  }, [state.cart]);

  useEffect(() => {
    const numberOfItems = state.cart.reduce(
      (prev, curr) => curr.quantity + prev,
      0
    );
    const subTotal = state.cart.reduce(
      (prev, curr) => curr.price * curr.quantity + prev,
      0
    );
    const taxRate =
      (numberOfItems > 0 && Number(process.env.NEXT_PUBLIC_TAX_RATE)) || 0;
    // const total = Number(subTotal + taxRate);

    const orderSummary = {
      numberOfItems,
      subTotal,
      tax: taxRate,
      total: taxRate + subTotal,
    };
    // console.log(orderSummary);

    dispatch({ type: "[Cart] - Update order summary", payload: orderSummary });
  }, [state.cart]);

  const addProductToCart = (product: ICartProduct) => {
    //! Nivel 1
    // dispatch({ type: '[Cart] - Add Product', payload: product });

    //! Nivel 2
    // const productsInCart = state.cart.filter( p => p._id !== product._id && p.size !== product.size );
    // dispatch({ type: '[Cart] - Add Product', payload: [...productsInCart, product] })

    //! Nivel Final
    const productInCart = state.cart.some((p) => p._id === product._id);
    if (!productInCart)
      return dispatch({
        type: "[Cart] - Update products in cart",
        payload: [...state.cart, product],
      });

    const productInCartButDifferentSize = state.cart.some(
      (p) => p._id === product._id && p.size === product.size
    );
    if (!productInCartButDifferentSize)
      return dispatch({
        type: "[Cart] - Update products in cart",
        payload: [...state.cart, product],
      });

    // Acumular
    const updatedProducts = state.cart.map((p) => {
      if (p._id !== product._id) return p;
      if (p.size !== product.size) return p;

      // Actualizar la cantidad
      p.quantity += product.quantity;
      return p;
    });

    dispatch({
      type: "[Cart] - Update products in cart",
      payload: updatedProducts,
    });
  };

  const updateCartQuantity = (product: ICartProduct) => {
    dispatch({ type: "[Cart] -Chance product quantity", payload: product });
  };

  const removeCartProduct = (product: ICartProduct) => {
    dispatch({ type: "[Cart] - Remove product in cart", payload: product });
  };

  const updateAddress = (address: ShippingAddress) => {
    Cookie.set("firstName", address.firstName);
    Cookie.set("lastName", address.lastName);
    Cookie.set("address", address.address);
    Cookie.set("address2", address.address2 || "");
    Cookie.set("zip", address.zip);
    Cookie.set("city", address.city);
    Cookie.set("country", address.country);
    Cookie.set("phone", address.phone);

    dispatch({ type: "[Cart] - Update Address", payload: address });
  };

  const createOrder = async (): Promise<{
    hasError: boolean;
    message: string;
  }> => {
    if (!state.shippingAddress) {
      throw new Error("No hay direccion de entrega");
    }

    const body: IOrder = {
      orderItems: state.cart.map((p) => ({
        ...p,
        size: p.size!,
      })),

      shippingAddress: state.shippingAddress,
      numberOfItems: state.numberOfItems,
      subTotal: state.subTotal,
      tax: state.tax,
      total: state.total,
      isPaid: false,
    };

    try {
      const { data } = await charroApi.post<IOrder>("/orders", body);

      //TODO Dispatch
      dispatch({ type: "[Cart] - Order completed" });

      return {
        hasError: false,
        message: data._id!,
      };

      // console.log({ data });
    } catch (error) {
      // console.log(error);
      if (axios.isAxiosError(error)) {
        return {
          hasError: true,
          message: error.response?.data.message,
        };
      }

      return {
        hasError: true,
        message: " Error no controlado, hable con el administrador",
      };
    }
  };

  return (
    <CartContex.Provider
      value={{
        ...state,

        //Methods
        addProductToCart,
        updateCartQuantity,
        removeCartProduct,
        updateAddress,

        //Orders
        createOrder,
      }}
    >
      {children}
    </CartContex.Provider>
  );
};