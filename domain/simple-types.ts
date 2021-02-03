// ===============================
// Simple types and constrained types related to the OrderTaking domain.
// ===============================

export type FixMe = any;

// Constrained to be integer
export type Int = number

// Constrained to be decimal
export type Decimal = number;

// Constrained to be 50 chars or less, not null
export type String50 = string

// An email address
export type EmailAddress = string

// A zip code
export type ZipCode = string

// An Id for Orders. Constrained to be a non-empty string < 10 chars
export type OrderId = string

// And Id for OrderLines. Constrained to be a non-empty string < 10chars
export type OrderLineId = string

// The codes for Widgets start with a "W" and then four digits
export interface WidgetCode {productType: 'widget', code: string}

// The codes for Gizmos start with a "G" and then three digits.
export interface GizmoCode {productType: 'gizmo', code: string}

// A ProductCode is either a Widget or a Gizmo
export type ProductCode = WidgetCode | GizmoCode

// Constrained to be a integer between 1 and 1000
export type UnitQuantity = {quantityType: 'Unit', quantity: Int}

// Constrained to be a decimal between 0.05 and 100.00
export type KilogramQuantity = {quantityType: 'Kilogram', quantity: Decimal}

// A Quantity is either a Unit or a Kilogram
export type OrderQuantity = UnitQuantity | KilogramQuantity

// Constrained to be a decimal between 0.0 and 1000.00
export type Price = Decimal

// Constrained to be a decimal between 0.0 and 10000.00
export type BillingAmount = Decimal

// Represents a PDF attachment
export interface PdfAttachment {
    name: string
    bytes: ArrayBuffer
}

// ===============================
// Reusable constructors and getters for constrained types
// ===============================

type Err = {msg: string};

// Useful functions for constrained types
namespace ConstrainedType {
    export type CreateStringEmptyError = Err & {errType: 'Empty'}
    export type CreateStringTooLongError = Err & {errType: 'TooLong'}
    export type CreateStringError = CreateStringEmptyError | CreateStringTooLongError;

    const isEmptyString = (str: string): boolean => [null, undefined, ''].includes(str);

    // Create a constrained string using the constructor provided
    // Return Error if input is null, empty, or length > maxLen
    export const createString = (fieldName: string, maxLen: number, str: string): string | CreateStringError => {
        if (isEmptyString(str)) return {errType: 'Empty', msg: `${fieldName} must not be null or undefined or empty`}
        else if (str.length > maxLen) return {errType: 'TooLong', msg: `${fieldName} must not be more than ${maxLen} chars`}
        return str;
    };

    // Create a optional constrained string using the constructor provided
    // Return None if input is null, empty.
    // Return error if length > maxLen
    // Return Some if the input is valid
    export const createStringOption = (fieldName: string, maxLen: number, str: string):  string | null | CreateStringTooLongError => {
        const s = createString(fieldName, maxLen, str);
        if (typeof s === 'string') return s;
        switch (s.errType) {
            case 'Empty': return null;
            case 'TooLong': return s;
            default:
                const _: never = s;
        }
        return null; // never reached
    }

    export type CreateIntTooSmallError = Err & {errType: 'TooSmall'}
    export type CreateIntTooBigError = Err & {errType: 'TooBig'}
    export type CreateIntNotIntError = Err & {errType: 'NotInt'}
    export type CreateIntError = CreateIntTooSmallError | CreateIntTooBigError | CreateIntNotIntError;

    // Create a constrained integer using the constructor provided
    // Return Error if input is less than minVal or more than maxVal
    export const createInt =  (fieldName: string, minVal: number, maxVal: number, i: number): Int | CreateIntError => {
        if (i < minVal) return {errType: "TooSmall", msg: `${i}: Must not be less than ${minVal}`};
        if (i > maxVal) return {errType: "TooBig", msg: `${i}: Must not be greater than ${maxVal}`};
        if (!Number.isInteger(i)) return {errType: "NotInt", msg: `${i}: Must be integer`};
        return i;
    }

    export type CreateDecimalTooSmallError = Err & {errType: 'TooSmall'}
    export type CreateDecimalTooBigError = Err & {errType: 'TooBig'}
    export type CreateDecimalNotDecimalError = Err & {errType: 'NotDecimal'}
    export type CreateDecimalError = CreateDecimalTooSmallError | CreateDecimalTooBigError | CreateDecimalNotDecimalError;

    // Create a constrained decimal using the constructor provided
    // Return Error if input is less than minVal or more than maxVal
    export const createDecimal =  (fieldName: string, minVal: number, maxVal: number, i: number): Decimal | CreateDecimalError => {
        if (i < minVal) return {errType: "TooSmall", msg: `${i}: Must not be less than ${minVal}`};
        if (i > maxVal) return {errType: "TooBig", msg: `${i}: Must not be greater than ${maxVal}`};
        if (!Number.isInteger(i)) return {errType: "NotDecimal", msg: `${i}: Must be decimal`};
        return i;
    }

    export type CreateLikeEmptyError = Err & {errType: 'Empty'}
    export type CreateLikeDoesNotMatchError = Err & {errType: 'DoesNotMatch'};
    export type CreateLikeError = CreateLikeEmptyError | CreateLikeDoesNotMatchError;

    /// Create a constrained string using the constructor provided
    /// Return Error if input is null. empty, or does not match the regex pattern
    export const createLike = (fieldName: string, pattern: RegExp, str: string): string | CreateLikeError => {
        if (isEmptyString(str)) return {errType: "Empty", msg: `${str}: Must not be null or empty`};
        if (!pattern.test(str)) return {errType: "DoesNotMatch", msg: `${str}: Must not be null or empty`};
        return str;
    }
}

export namespace String50 {
    import CreateStringError = ConstrainedType.CreateStringError;
    export const value = (str: String50): string => str;
    export const create = (fieldName: string, str: string): String50 | CreateStringError  =>
        ConstrainedType.createString(fieldName, 50, str);
}

export namespace EmailAddress {
    import CreateLikeError = ConstrainedType.CreateLikeError;
    export const value = (str: EmailAddress): string => str;
    export const create = (fieldName: string, str: string): EmailAddress | CreateLikeError  =>
        ConstrainedType.createLike(fieldName, new RegExp('.+@.+]'), str);
}

export namespace ZipCode {
    import CreateLikeError = ConstrainedType.CreateLikeError;
    export const value = (str: ZipCode): string => str;
    export const create = (fieldName: string, str: string): ZipCode | CreateLikeError  =>
        ConstrainedType.createLike(fieldName, new RegExp('\d{5}'), str);
}

export namespace OrderId {
    import CreateStringError = ConstrainedType.CreateStringError;
    export const value = (str: OrderId): string => str;
    export const create = (fieldName: string, str: string): OrderId | CreateStringError  =>
        ConstrainedType.createString(fieldName, 50, str);
}

export namespace OrderLineId {
    import CreateStringError = ConstrainedType.CreateStringError;
    export const value = (str: OrderLineId): string => str;
    export const create = (fieldName: string, str: string): OrderLineId | CreateStringError  =>
        ConstrainedType.createString(fieldName, 50, str);
}

export namespace WidgetCode {
    import CreateLikeError = ConstrainedType.CreateLikeError;
    export const value = (widgetCode: WidgetCode): string => widgetCode.code;
    export const create = (fieldName: string, str: string): WidgetCode | CreateLikeError  => {
        const code = ConstrainedType.createLike(fieldName, new RegExp('W\d{4}'), str);
        return typeof code === 'string' ? {productType: "widget", code} : code;
    }
}

export namespace GizmoCode {
    import CreateLikeError = ConstrainedType.CreateLikeError;
    export const value = (str: GizmoCode): string => str.code;
    export const create = (fieldName: string, str: string): GizmoCode | CreateLikeError  => {
        const code = ConstrainedType.createLike(fieldName, new RegExp('G\d{3}'), str);
        return typeof code === 'string' ? {productType: "gizmo", code} : code;
    }
}

export namespace ProductCode {
    import CreateLikeError = ConstrainedType.CreateLikeError;
    export type CreateProductCodeUnknownFormatError = Err & {errType: 'UnknownFormat'}
    export type CreateProductCodeError = CreateLikeError | CreateProductCodeUnknownFormatError

    export const value = (productCode: ProductCode): string => productCode.code;
    export const create = (fieldName: string, code: string): ProductCode | CreateProductCodeError  => {
        if (code.startsWith('W')) return WidgetCode.create(fieldName, code);
        if (code.startsWith('G')) return GizmoCode.create(fieldName, code);
        return {errType: "UnknownFormat", msg: `${fieldName}: Format not recognized '${code}'`}
    }
}

export namespace UnitQuantity {
    import CreateIntError = ConstrainedType.CreateIntError;
    import CreateDecimalError = ConstrainedType.CreateDecimalError;
    export const value = (v: UnitQuantity): number => v.quantity;
    export const create = (fieldName: string, v: number): UnitQuantity | CreateIntError  => {
        const quantity = ConstrainedType.createInt(fieldName, 1, 1000, v);
        return typeof quantity === 'number' ? {quantityType: 'Unit', quantity} : quantity;
    }
}

export namespace KilogramQuantity {
    import CreateDecimalError = ConstrainedType.CreateDecimalError;
    export const value = (v: KilogramQuantity): number => v.quantity;
    export const create = (fieldName: string, v: number): KilogramQuantity | CreateDecimalError  => {
        const quantity = ConstrainedType.createDecimal(fieldName, 0.5, 100, v);
        return typeof quantity === 'number' ? {quantityType: 'Kilogram', quantity} : quantity;
    }
}

export namespace OrderQuantity {
    import CreateIntError = ConstrainedType.CreateIntError;
    import CreateDecimalError = ConstrainedType.CreateDecimalError;
    export const value = (qty: OrderQuantity) => qty.quantity;
        export const create = (fieldName: string, productCode: ProductCode, v: number): OrderQuantity | CreateIntError | CreateDecimalError  => {
        switch(productCode.productType) {
            case "widget": return UnitQuantity.create(fieldName, v);
            case "gizmo": return KilogramQuantity.create(fieldName, v);
            default: const _: never = productCode;
        }
        return null as unknown as OrderQuantity; // never reached
    }
}

export namespace Price {
    import CreateDecimalError = ConstrainedType.CreateDecimalError;
    export const value = (v: Price): number => v;
    export const create = (v: number): Price | CreateDecimalError  =>
        ConstrainedType.createDecimal('Price', 0, 1000, v);

    export const unsafeCreate = (v: number) => {
        const price = create(v)
        if (typeof price !== 'number') throw price;
        return price;
    }

    export const multiply = (qty: OrderQuantity, price: Price) => create(qty.quantity*price);
}

export namespace BillingAmount {
    import CreateDecimalError = ConstrainedType.CreateDecimalError;
    export const value = (v: BillingAmount): number => v;
    export const create = (v: number): BillingAmount | CreateDecimalError  =>
        ConstrainedType.createDecimal('BillingAmount', 0, 10000, v);
}