import mongoose from 'mongoose';

const AutomationRuleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    scope: {
        type: String,
        enum: ['global', 'project', 'user'],
        default: 'project',
        required: true
    },
    scopeId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'scopeModel',
        required: function () { return this.scope !== 'global'; }
    },
    scopeModel: {
        type: String,
        enum: ['Project', 'User']
    },
    triggerType: {
        type: String,
        enum: ['file.created', 'comment.created', 'invoice.updated', 'file.version_created'],
        required: true
    },
    conditions: [{
        field: { type: String, required: true },
        operator: {
            type: String,
            enum: ['contains', 'equals', 'regex', 'startsWith', 'endsWith'],
            required: true
        },
        value: { type: String, required: true }
    }],
    actions: [{
        type: {
            type: String,
            enum: ['add_tag', 'create_task', 'send_notification', 'auto_complete_task'],
            required: true
        },
        params: { type: mongoose.Schema.Types.Mixed }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    priority: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Indexes for faster rule lookup during event processing
AutomationRuleSchema.index({ scope: 1, scopeId: 1, triggerType: 1, isActive: 1 });
AutomationRuleSchema.index({ triggerType: 1, isActive: 1 }); // For global rules

const AutomationRule = mongoose.model('AutomationRule', AutomationRuleSchema);

export default AutomationRule;
