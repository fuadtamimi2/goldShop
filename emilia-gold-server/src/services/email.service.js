/**
 * email.service.js
 *
 * Placeholder for sending sale receipts by email.
 *
 * To activate email sending:
 *   1. Install nodemailer:  npm install nodemailer
 *   2. Set these environment variables in emilia-gold-server/.env:
 *        EMAIL_HOST=smtp.yourprovider.com
 *        EMAIL_PORT=587
 *        EMAIL_USER=your@email.com
 *        EMAIL_PASS=yourpassword
 *        EMAIL_FROM="Emilia Gold <your@email.com>"
 *   3. Uncomment the nodemailer block below and remove the placeholder return.
 *
 * Until then, calling sendReceiptEmail() logs a warning and returns
 * { sent: false, message: "..." } — it never throws.
 */

// const nodemailer = require("nodemailer");

/**
 * @param {object} options
 * @param {string} options.to        - Recipient email address
 * @param {object} options.receipt   - Receipt object from receipt.service.js
 * @returns {Promise<{ sent: boolean, message: string }>}
 */
async function sendReceiptEmail({ to, receipt }) {
    const configured =
        process.env.EMAIL_HOST &&
        process.env.EMAIL_USER &&
        process.env.EMAIL_PASS;

    if (!configured) {
        console.warn(
            `[email.service] Email not configured — receipt for ${to} was NOT sent. ` +
            "Set EMAIL_HOST, EMAIL_USER, EMAIL_PASS in your .env to enable sending."
        );
        return {
            sent: false,
            message: "Email service not configured. Receipt was not sent.",
        };
    }

    /* ── Uncomment when nodemailer is installed ────────────────────────────
    const transporter = nodemailer.createTransport({
        host:   process.env.EMAIL_HOST,
        port:   Number(process.env.EMAIL_PORT  || 587),
        secure: process.env.EMAIL_PORT === "465",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const itemRows = receipt.items
        .map(
            (item) =>
                `<tr>
                    <td>${item.productName}</td>
                    <td>${item.qty}</td>
                    <td>${item.weightInGrams}g</td>
                    <td>₪${item.pricePerGram}/g</td>
                    <td>₪${item.lineTotal.toLocaleString()}</td>
                </tr>`
        )
        .join("");

    const html = `
        <h2>Receipt — ${receipt.store.name}</h2>
        <p><strong>Invoice:</strong> ${receipt.invoiceNumber}</p>
        <p><strong>Date:</strong> ${new Date(receipt.date).toLocaleDateString()}</p>
        <p><strong>Customer:</strong> ${receipt.customer.name} (${receipt.customer.phone})</p>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
            <thead>
                <tr>
                    <th>Product</th><th>Qty</th><th>Weight</th><th>Price/g</th><th>Total</th>
                </tr>
            </thead>
            <tbody>${itemRows}</tbody>
        </table>
        <p><strong>Total weight:</strong> ${receipt.totalWeight}g</p>
        <p><strong>Avg price/g:</strong> ₪${receipt.averagePricePerGram.toFixed(2)}</p>
        <p><strong>Subtotal:</strong> ₪${receipt.subtotal.toLocaleString()}</p>
        ${receipt.discount ? `<p><strong>Discount:</strong> ₪${receipt.discount.toLocaleString()}</p>` : ""}
        <p><strong>Total:</strong> ₪${receipt.totalAmount.toLocaleString()}</p>
        <p><strong>Payment:</strong> ${receipt.paymentMethod} — ${receipt.paymentStatus}</p>
    `;

    await transporter.sendMail({
        from:    process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject: `Your receipt from ${receipt.store.name} — ${receipt.invoiceNumber}`,
        html,
    });

    return { sent: true, message: `Receipt sent to ${to}` };
    ── end nodemailer block ─────────────────────────────────────────────── */

    // Placeholder fallback (remove once nodemailer block is active)
    return {
        sent: false,
        message: "Email service not yet active. Please configure SMTP settings.",
    };
}

/**
 * Placeholder for WhatsApp / SMS receipt delivery.
 * Structure mirrors sendReceiptEmail for future parity.
 *
 * @param {object} options
 * @param {string} options.phone   - Recipient phone number
 * @param {object} options.receipt - Receipt object
 */
async function sendReceiptWhatsApp({ phone, receipt }) {
    console.warn(
        `[email.service] WhatsApp/SMS delivery not implemented. ` +
        `Receipt for ${phone} (sale ${receipt.invoiceNumber}) was not sent.`
    );
    return {
        sent: false,
        message: "WhatsApp/SMS delivery not yet implemented.",
    };
}

module.exports = { sendReceiptEmail, sendReceiptWhatsApp };
