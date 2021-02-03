import {EmailAddress, String50, ZipCode} from "./simple-types";

export interface PersonalName {
    firstName: String50
    lastName: String50
}

export interface CustomerInfo {
    name: PersonalName
    emailAddress: EmailAddress
}

export interface Address {
    addressLine1: String50
    addressLine2: String50 | null
    addressLine3: String50 | null
    addressLine4: String50 | null
    city : String50
    zipCode: ZipCode
}