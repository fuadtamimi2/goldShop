/**
 * Placeholder delivery service for future SMS / WhatsApp receipt integrations.
 * These stubs intentionally do not send messages yet.
 */

async function sendReceiptSmsPlaceholder({ to, receipt }) {
    return {
        sent: false,
        channel: "sms",
        to: to || null,
        message: "SMS receipt delivery is not implemented yet",
        receiptRef: receipt?.invoiceNumber || null,
    };
}

async function sendReceiptWhatsAppPlaceholder({ to, receipt }) {
    return {
        sent: false,
        channel: "whatsapp",
        to: to || null,
        message: "WhatsApp receipt delivery is not implemented yet",
        receiptRef: receipt?.invoiceNumber || null,
    };
}

module.exports = {
    sendReceiptSmsPlaceholder,
    sendReceiptWhatsAppPlaceholder,
};
