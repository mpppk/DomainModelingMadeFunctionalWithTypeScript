import {EmailAddress, OrderId, OrderLineId, OrderQuantity, Price, ProductCode, String50} from "../simple-types";
import {Address, CustomerInfo} from "../compound-types";
import {
    createValidationError,
    OrderAcknowledgmentSent,
    PlaceOrderError, PlaceOrderEvent,
    PricedOrder,
    PricingError,
    UnvalidatedAddress, UnvalidatedCustomerInfo,
    UnvalidatedOrder, ValidationError
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
type InvalidFormat = {errType: 'InvalidFormat'};
type AddressNotFound = {errType: 'AddressNotFound'};
type AddressValidationError = InvalidFormat | AddressNotFound;

// FIXME
type CheckedAddress = Omit<UnvalidatedAddress, 'isValidated'> & {isValidated: true};

type CheckAddressExists = (unvalidatedAddress: UnvalidatedAddress) => Promise<CheckedAddress | AddressValidationError>

// ---------------------------
// Validated Order
// ---------------------------

interface ValidateOrderLine {
    orderLineId: OrderLineId
    productCode: ProductCode
    quantity: OrderQuantity
}

interface ValidatedOrder {
    orderId: OrderId
    customerInfo: CustomerInfo
    shippingAddress: Address
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
