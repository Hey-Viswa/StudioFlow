import mongoose from 'mongoose';

const PaymentThreadSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'EUR', 'GBP']
    },
    type: {
        type: String,
        enum: ['milestone', 'fixed', 'hourly', 'retainer'],
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'pending', 'paid', 'cancelled', 'refunded', 'partially_refunded', 'route_failed'],
        default: 'draft',
        index: true
    },
    razorpayOrderId: {
        type: String,
        unique: true,
        sparse: true
    },
    razorpayPaymentId: {
        type: String,
        default: null
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectInvoice',
        default: null
    },
    // Payment rail discriminator to keep legacy defaults intact
    paymentRail: {
        type: String,
        enum: ['v1', 'v2'],
        default: 'v1',
        index: true
    },
    // Route transfer tracking (v2 only); nullable to avoid breaking existing records
    routeTransferId: {
        type: String,
        default: null
    },
    paidAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

export default mongoose.model('PaymentThread', PaymentThreadSchema);
