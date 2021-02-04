// We are defining types and submodules, so we can use a namespace
// rather than a module at the top level

import {
    BillingAmount, EmailAddress,
    FixMe,
    OrderId,
    OrderLineId,
    OrderQuantity,
    Price,
    ProductCode
} from "../simple-types";
import {Address, CustomerInfo} from "../compound-types";

export interface UnvalidatedCustomerInfo {
    firstName: string
    lastName: string
    emailAddress: string
    vipStatus: string
}

export interface UnvalidatedAddress {
    isValidated: false
    addressLine1: string
    addressLine2: string
    addressLine3: string
    addressLine4: string
    city: string
    zipCode: string
    state: string
    country: string
}

export interface UnvalidatedOrderLine {
    orderLineId: string
    productCode: string
    quantity: number
}

export interface UnvalidatedOrder {
    orderId: string
    customerInfo: UnvalidatedCustomerInfo
    shippingAddress: UnvalidatedAddress
    billingAddress: UnvalidatedAddress
    lines: UnvalidatedOrderLine[]
}

// ------------------------------------
// outputs from the workflow (success case)

/// Event will be created if the Acknowledgment was successfully posted
export interface OrderAcknowledgmentSent {
    orderId: OrderId
    emailAddress: EmailAddress
}

// priced state
export interface PricedOrderLine {
    orderLineId: OrderLineId
    productCode: ProductCode
    quantity: OrderQuantity
    linePrice: Price
}

export interface PricedOrder {
    orderId: OrderId
    customerInfo: CustomerInfo
    shippingAddress: Address
    billingAddress: Address
    amountToBill: BillingAmount
    lines: PricedOrderLine[]
}

// Event to send to shipping context
export type OrderPlaced = PricedOrder

// Event to send to billing context
// Will only be created if the AmountToBill is not zero
export interface BillableOrderPlaced {
    orderId: OrderId
    billingAddress: Address
    amountToBill: BillingAmount
}

// The possible events resulting from the PlacedOrder workflow
// Not all events will occur, depending on the logic of the workflow
export type PlaceOrderEvent = OrderPlaced | BillableOrderPlaced | OrderAcknowledgmentSent

// ------------------------------------
// error outputs

// All the things that can go wrong in this workflow
export type ValidationError = {errType: 'Validation', msg: string}
export const createValidationError = (msg: string): ValidationError => ({errType: 'Validation', msg});

export type PricingError = {errType: 'Pricing', msg: string}
export const createPricingError = (msg: string): PricingError => ({errType: 'Pricing', msg})


export type URI = string
export interface ServiceInfo {
    name: string
    endpoint: URI
}

export interface RemoteServiceError {errType: 'RemoteService', service: ServiceInfo, exception: FixMe}

export type PlaceOrderError = ValidationError | PricingError | RemoteServiceError

// ------------------------------------
// the workflow itself

type PlaceOrder = (unvalidatedOrder: UnvalidatedOrder) => Promise<PlaceOrderEvent[] | PlaceOrderError>