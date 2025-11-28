/**
 * Subscription State Machine
 * Defines valid states and transitions for the subscription lifecycle.
 */

export const SUBSCRIPTION_STATES = {
    TRIAL: 'trial',
    ACTIVE: 'active',
    PAST_DUE: 'past_due',
    UNPAID: 'unpaid',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    PAUSED: 'paused',
    PENDING: 'pending', // Initial state before payment
    CREATED: 'created',  // Razorpay subscription created but not charged
    SCHEDULED_DOWNGRADE: 'scheduled_downgrade' // Downgrade scheduled for end of period
};

const VALID_TRANSITIONS = {
    [SUBSCRIPTION_STATES.PENDING]: [SUBSCRIPTION_STATES.CREATED, SUBSCRIPTION_STATES.ACTIVE],
    [SUBSCRIPTION_STATES.CREATED]: [SUBSCRIPTION_STATES.ACTIVE, SUBSCRIPTION_STATES.PENDING],

    [SUBSCRIPTION_STATES.TRIAL]: [
        SUBSCRIPTION_STATES.ACTIVE,
        SUBSCRIPTION_STATES.CANCELLED,
        SUBSCRIPTION_STATES.EXPIRED
    ],

    [SUBSCRIPTION_STATES.ACTIVE]: [
        SUBSCRIPTION_STATES.PAST_DUE,
        SUBSCRIPTION_STATES.CANCELLED,
        SUBSCRIPTION_STATES.PAUSED,
        SUBSCRIPTION_STATES.EXPIRED,
        SUBSCRIPTION_STATES.SCHEDULED_DOWNGRADE
    ],

    [SUBSCRIPTION_STATES.SCHEDULED_DOWNGRADE]: [
        SUBSCRIPTION_STATES.ACTIVE, // Downgrade processed or cancelled
        SUBSCRIPTION_STATES.CANCELLED,
        SUBSCRIPTION_STATES.PAST_DUE,
        SUBSCRIPTION_STATES.EXPIRED
    ],

    [SUBSCRIPTION_STATES.PAST_DUE]: [
        SUBSCRIPTION_STATES.ACTIVE, // Payment recovered
        SUBSCRIPTION_STATES.UNPAID, // Retries exhausted
        SUBSCRIPTION_STATES.CANCELLED
    ],

    [SUBSCRIPTION_STATES.UNPAID]: [
        SUBSCRIPTION_STATES.ACTIVE, // Payment recovered
        SUBSCRIPTION_STATES.CANCELLED
    ],

    [SUBSCRIPTION_STATES.PAUSED]: [
        SUBSCRIPTION_STATES.ACTIVE,
        SUBSCRIPTION_STATES.CANCELLED
    ],

    [SUBSCRIPTION_STATES.CANCELLED]: [
        SUBSCRIPTION_STATES.ACTIVE // Reactivation
    ],

    [SUBSCRIPTION_STATES.EXPIRED]: [
        SUBSCRIPTION_STATES.ACTIVE // Reactivation
    ]
};

export class SubscriptionStateMachine {
    /**
     * Check if a transition is valid
     * @param {string} fromState 
     * @param {string} toState 
     * @returns {boolean}
     */
    static canTransition(fromState, toState) {
        // If states are same, it's valid (no-op)
        if (fromState === toState) return true;

        // If fromState is invalid/unknown, assume we can transition to anything (safety fallback)
        // or strictly enforce initial states. Let's be strict but allow 'default' fallback
        const allowed = VALID_TRANSITIONS[fromState] || [];
        return allowed.includes(toState);
    }

    /**
     * Validate and return the new state
     * @param {string} currentState 
     * @param {string} targetState 
     * @throws {Error} if transition is invalid
     * @returns {string} targetState
     */
    static transition(currentState, targetState) {
        if (!this.canTransition(currentState, targetState)) {
            throw new Error(`Invalid subscription state transition: ${currentState} -> ${targetState}`);
        }
        return targetState;
    }
}

export default SubscriptionStateMachine;
