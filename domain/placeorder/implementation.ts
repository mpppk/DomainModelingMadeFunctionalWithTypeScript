import {
    BillingAmount,
    EmailAddress,
    Err,
    isErr,
    OrderId,
    OrderLineId,
    OrderQuantity,
    Price,
    ProductCode,
    splitErr,
    String50,
    ZipCode
} from "../simple-types";
import {Address, CustomerInfo} from "../compound-types";
import {
    BillableOrderPlaced,
    createPricingError,
    createValidationError,
    OrderAcknowledgmentSent,
    OrderPlaced,
    PlaceOrder,
    PlaceOrderEvent,
    PricedOrder,
    PricedOrderLine,
    PricingError,
    UnvalidatedAddress,
    UnvalidatedCustomerInfo,
    UnvalidatedOrder,
    UnvalidatedOrderLine,
    ValidationError
} from "./public-types";

// ======================================================
// This file contains the final implementation for the PlaceOrder workflow
//
// This represents the code in chapter 10, "Working with Errors"
//
// There are two parts:
// * the first section contains the (type-only) definitions for each step
// * the second section contains the implementations for each step
//   and the implementation of the overall workflow
// ======================================================


// ======================================================
// Section 1 : Define each step in the workflow using types
// ======================================================

// ---------------------------
// Validation step
// ---------------------------

// Product validation
type CheckProductCodeExists = (productCode: ProductCode) => boolean;

// Address validation
type InvalidFormat = Err & {errType: 'InvalidFormat'};
type AddressNotFound = Err & {errType: 'AddressNotFound'};
type AddressValidationError = InvalidFormat | AddressNotFound;

// FIXME
type CheckedAddress = Omit<UnvalidatedAddress, 'isValidated'> & {isValidated: true};

type CheckAddressExists = (unvalidatedAddress: UnvalidatedAddress) => Promise<CheckedAddress | AddressValidationError>

// ---------------------------
// Validated Order
// ---------------------------

interface ValidatedOrderLine {
    orderLineId: OrderLineId
    productCode: ProductCode
    quantity: OrderQuantity
}

interface ValidatedOrder {
    orderId: OrderId
    customerInfo: CustomerInfo
    shippingAddress: Address
    billingAddress: Address
    lines: ValidatedOrderLine[]
}

type ValidateOrder = (checkProductCodeExists: CheckProductCodeExists, checkAddressExists: CheckAddressExists, unvalidatedOrder: UnvalidatedOrder) => Promise<ValidatedOrder | ValidationError>

// ---------------------------
// Pricing step
// ---------------------------

type GetProductPrice = (productCode: ProductCode) => Price

// priced state is defined domain.workflow-types

type PriceOrder = (getProductPrice: GetProductPrice, validatedOrder: ValidatedOrder) => PricedOrder | PricingError

// ---------------------------
// Send OrderAcknowledgment
// ---------------------------

type HtmlString = string

interface OrderAcknowledgment {
    emailAddress: EmailAddress
    letter: HtmlString
}

type CreateOrderAcknowledgmentLetter = (pricedOrder: PricedOrder) => HtmlString

/// Send the order acknowledgement to the customer
/// Note that this does NOT generate an Result-type error (at least not in this workflow)
/// because on failure we will continue anyway.
/// On success, we will generate a OrderAcknowledgmentSent event,
/// but on failure we won't.

type SendResult = 'Sent' | 'NotSent';

type SendOrderAcknowledgment = (orderAcknowledgment: OrderAcknowledgment) => SendResult

type AcknowledgeOrder = (createOrderAcknowledgmentLetter: CreateOrderAcknowledgmentLetter, sendOrderAcknowledgment: SendOrderAcknowledgment, pricedOrder: PricedOrder) => OrderAcknowledgmentSent | null;

// ---------------------------
// Create events
// --------------------------

type CreateEvents = (pricedOrder: PricedOrder, orderAcknowledgmentSent: OrderAcknowledgmentSent | null) => PlaceOrderEvent[]

// ======================================================
// Section 2 : Implementation
// ======================================================

// ---------------------------
// ValidateOrder step
// --------------------------

const toCustomerInfo = (unvalidatedCustomerInfo: UnvalidatedCustomerInfo): CustomerInfo | ValidationError => {
    const firstName = String50.create('FirstName', unvalidatedCustomerInfo.firstName);
    if (typeof firstName !== 'string') {
        return createValidationError(firstName.msg);
    }

    const lastName = String50.create('LastName', unvalidatedCustomerInfo.lastName);
    if (typeof lastName !== 'string') {
        return createValidationError(lastName.msg);
    }

    const emailAddress = String50.create('EmailAddress', unvalidatedCustomerInfo.emailAddress);
    if (typeof emailAddress !== 'string') {
        return createValidationError(emailAddress.msg);
    }

    return {name: {firstName, lastName}, emailAddress};
};

const toAddress = (checkedAddress: CheckedAddress): Address | ValidationError => {
    const addressLine1 = String50.create('AddressLine1', checkedAddress.addressLine1);
    if (typeof addressLine1 !== 'string') {
        return createValidationError(addressLine1.msg);
    }

    const addressLine2 = String50.create('AddressLine2', checkedAddress.addressLine2);
    if (typeof addressLine2 !== 'string') {
        return createValidationError(addressLine2.msg);
    }

    const addressLine3 = String50.create('AddressLine3', checkedAddress.addressLine3);
    if (typeof addressLine3 !== 'string') {
        return createValidationError(addressLine3.msg);
    }

    const addressLine4 = String50.create('AddressLine4', checkedAddress.addressLine4);
    if (typeof addressLine4 !== 'string') {
        return createValidationError(addressLine4.msg);
    }

    const city = String50.create('AddressLine4', checkedAddress.city);
    if (typeof city !== 'string') {
        return createValidationError(city.msg);
    }

    const zipCode = ZipCode.create('AddressLine4', checkedAddress.zipCode);
    if (typeof zipCode !== 'string') {
        return createValidationError(zipCode.msg);
    }

    return {addressLine1, addressLine2, addressLine3, addressLine4, city, zipCode};
}

// Call the checkAddressExists and convert the error to a ValidationError
const toCheckedAddress = async (checkAddress: CheckAddressExists, address: UnvalidatedAddress): Promise<CheckedAddress | ValidationError>  => {
    const checkedAddress = await checkAddress(address);
    if (isErr(checkedAddress)) return createValidationError(checkedAddress.msg)
    return checkedAddress;
};

const toOrderId = (orderIdStr: string): OrderId | ValidationError => {
    const orderId = OrderId.create('OrderId', orderIdStr);
    if (typeof orderId !== 'string') return createValidationError(orderId.msg);
    return orderId;
};

/// Helper function for validateOrder
const toOrderLineId = (orderId: string) => {
    const orderLineId = OrderLineId.create('OrderLineId', orderId);
    if (typeof orderLineId !== 'string') return createValidationError(orderLineId.msg);
    return orderLineId;
};

/// Helper function for validateOrder
const toProductCode = (checkProductCodeExists: CheckProductCodeExists, code: string) => {
    const checkProduct = (p: ProductCode) =>
        checkProductCodeExists(p) ? p : createValidationError('Invalid: ' + p);

    const productCode = ProductCode.create('ProductCode', code);
    if (isErr(productCode)) return createValidationError(productCode.msg);
    const checkedProductCode = checkProduct(productCode);
    return isErr(checkedProductCode) ? createValidationError(checkedProductCode.msg) : checkedProductCode;
}

const toOrderQuantity = (productCode: ProductCode, quantity: number) => {
    const orderQuantity = OrderQuantity.create('OrderQuantity', productCode, quantity);
    return isErr(orderQuantity) ? createValidationError(orderQuantity.msg) : orderQuantity;
}

const toValidateOrderLine = (checkProductExists: CheckProductCodeExists, unvalidatedOrderLine: UnvalidatedOrderLine) => {
    const orderLineId = toOrderLineId(unvalidatedOrderLine.orderLineId);
    if (isErr(orderLineId)) return orderLineId;
    const productCode = toProductCode(checkProductExists, unvalidatedOrderLine.productCode);
    if (isErr(productCode)) return productCode;
    const quantity = toOrderQuantity(productCode, unvalidatedOrderLine.quantity);
    if (isErr(quantity)) return quantity;
    return {orderLineId, productCode, quantity} as ValidatedOrderLine;
}

const validateOrder: ValidateOrder = async (checkProductCodeExists, checkAddressExists, unvalidatedOrder) => {
    const orderId = toOrderId(unvalidatedOrder.orderId);
    if (isErr(orderId)) return orderId;
    const customerInfo = toCustomerInfo(unvalidatedOrder.customerInfo);
    if (isErr(customerInfo)) return customerInfo;
    const checkedShippingAddress = await toCheckedAddress(checkAddressExists, unvalidatedOrder.shippingAddress);
    if (isErr(checkedShippingAddress)) return checkedShippingAddress;
    const shippingAddress = toAddress(checkedShippingAddress);
    if (isErr(shippingAddress)) return shippingAddress;
    const checkedBillingAddress = await toCheckedAddress(checkAddressExists, unvalidatedOrder.billingAddress);
    if (isErr(checkedBillingAddress)) return checkedBillingAddress;
    const billingAddress = toAddress(checkedBillingAddress);
    if (isErr(billingAddress)) return billingAddress;
    const [lines, errs] = splitErr<ValidatedOrderLine, ValidationError>(unvalidatedOrder.lines.map(toValidateOrderLine.bind(null, checkProductCodeExists)));
    if (errs.length > 0) return errs[0];
    return {orderId, customerInfo, shippingAddress, billingAddress, lines};
}

// ---------------------------
// PriceOrder step
// ---------------------------

const toPricedOrderLine = (getProductPrice: GetProductPrice, validatedOrderLine: ValidatedOrderLine): PricedOrderLine | PricingError => {
    const quantity = validatedOrderLine.quantity;
    const price = getProductPrice(validatedOrderLine.productCode);
    const linePrice = Price.multiply(quantity, price);
    if (isErr(linePrice)) return {errType: "Pricing", msg: linePrice.msg};
    return {
        orderLineId: validatedOrderLine.orderLineId,
        productCode: validatedOrderLine.productCode,
        quantity: validatedOrderLine.quantity,
        linePrice,
    }
}

const priceOrder: PriceOrder = (getProductPrice, validatedOrder) => {
    const [lines, errs] = splitErr<PricedOrderLine>(validatedOrder.lines.map(toPricedOrderLine.bind(null, getProductPrice)));
    if (errs.length > 0) return createPricingError(errs[0].msg);
    const prices = (lines as PricedOrderLine[]).map(l => l.linePrice)
    const amountToBill = BillingAmount.sumPrices(prices);
    if (isErr(amountToBill)) return createPricingError(amountToBill.msg);

    return {
        orderId: validatedOrder.orderId,
        customerInfo: validatedOrder.customerInfo,
        shippingAddress: validatedOrder.shippingAddress,
        billingAddress: validatedOrder.billingAddress,
        lines,
        amountToBill,
    }
}

// ---------------------------
// AcknowledgeOrder step
// ---------------------------

const acknowledgeOrder: AcknowledgeOrder = (createOrderAcknowledgmentLetter, sendOrderAcknowledgment, pricedOrder) => {
    const letter = createOrderAcknowledgmentLetter(pricedOrder);
    const acknowledgment = {emailAddress: pricedOrder.customerInfo.emailAddress, letter}

    // if the acknowledgement was successfully sent,
    // return the corresponding event, else return null
    switch (sendOrderAcknowledgment(acknowledgment)) {
        case "Sent":
            return {orderId: pricedOrder.orderId, emailAddress: pricedOrder.customerInfo.emailAddress};
        case "NotSent":
            return null;
    }
};

// ---------------------------
// Create events
// ---------------------------

const createOrderPlacedEvent = (placedOrder: PricedOrder): OrderPlaced => placedOrder;

const createBillingEvent = (placedOrder: PricedOrder): BillableOrderPlaced | null => {
    const billingAmount = BillingAmount.value(placedOrder.amountToBill);
    if (billingAmount > 0) {
        return {
            orderId: placedOrder.orderId,
            billingAddress: placedOrder.billingAddress,
            amountToBill: placedOrder.amountToBill
        }
    }
    return null;
}

// helper to convert an Option into a List
const listOfOption = <T>(opt: T | null): T[] =>  opt === null ? []: [opt];

const createEvents: CreateEvents = (pricedOrder, orderAcknowledgmentEventOpt) => {
    const acknowledgmentEvents = listOfOption(orderAcknowledgmentEventOpt);
    const orderPlacedEvents = [createOrderPlacedEvent(pricedOrder)];
    const billingEvents = listOfOption(createBillingEvent(pricedOrder));
    // return all the events
    return [...acknowledgmentEvents, ...orderPlacedEvents, ...billingEvents];
}

// ---------------------------
// overall workflow
// ---------------------------
export const placeOrder = (checkProductExists: CheckProductCodeExists,
                    checkAddressExists: CheckAddressExists,
                    getProductPrice: GetProductPrice,
                    createOrderAcknowledgmentLetter: CreateOrderAcknowledgmentLetter,
                    sendOrderAcknowledgment: SendOrderAcknowledgment): PlaceOrder => {
    return async (unvalidatedOrder: UnvalidatedOrder) => {
        const validatedOrder = await validateOrder(checkProductExists, checkAddressExists, unvalidatedOrder);
        if (isErr(validatedOrder)) return validatedOrder;
        const pricedOrder = priceOrder(getProductPrice, validatedOrder);
        if (isErr(pricedOrder)) return pricedOrder;
        const acknowledgementOption = acknowledgeOrder(createOrderAcknowledgmentLetter, sendOrderAcknowledgment, pricedOrder);
        return createEvents(pricedOrder, acknowledgementOption);
    }
}