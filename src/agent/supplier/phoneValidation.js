const LITHUANIAN_E164_PATTERN = /^\+370\d{8}$/;

export function isLithuanianE164Phone(phone) {
    return typeof phone === "string" && LITHUANIAN_E164_PATTERN.test(phone);
}

export function validateLithuanianE164Phone(phone, label = "phone") {
    if (typeof phone !== "string" || phone.trim() === "") {
        throw new Error(`${label} is required`);
    }

    if (!isLithuanianE164Phone(phone)) {
        throw new Error(`${label} must be an E.164 Lithuanian number starting with +370`);
    }

    return phone;
}
